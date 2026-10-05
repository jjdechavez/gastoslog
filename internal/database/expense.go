package database

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/guregu/null/v6"
	"github.com/jmoiron/sqlx"
)

type Expense struct {
	ID          int64     `db:"id"`
	UserID      int64     `db:"user_id"`
	CategoryID  int64     `db:"category_id"`
	Amount      int64     `db:"amount"`
	Description string    `db:"description"`
	CreatedAt   time.Time `db:"created_at"`
	UpdatedAt   time.Time `db:"updated_at"`
	DeletedAt   null.Time `db:"deleted_at"`
}

type ExpenseRepository interface {
	Create(ctx context.Context, input NewExpenseInput) (*Expense, error)
	GetByID(ctx context.Context, id int64) (*RawExpense, error)
	Update(ctx context.Context, expense UpdateExpenseInput) error
	Delete(ctx context.Context, id int64) error
	List(ctx context.Context, input ListExpenseInput) ([]RawExpense, error)
	Sum(ctx context.Context, userID int64, filter ExpenseFilter) (ExpenseTotal, error)
	ExistWithUserID(ctx context.Context, input ExistExpenseWithUserIDInput) (bool, error)
	GetOverviewByCategory(ctx context.Context, userID int64, period string, customDate *time.Time) ([]CategoryExpenseOverview, error)
}

type expenseRepository struct {
	db *sqlx.DB
}

func NewExpenseRepository(db *sqlx.DB) ExpenseRepository {
	return &expenseRepository{db: db}
}

type NewExpenseInput struct {
	UserID      int64
	CategoryID  int64
	Amount      int64
	Description string
}

func (r *expenseRepository) Create(ctx context.Context, input NewExpenseInput) (*Expense, error) {
	query := `
		INSERT INTO expenses (user_id, category_id, amount, description, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id, user_id, category_id, amount, description, created_at, updated_at
	`

	now := now()

	expense := &Expense{
		UserID:      input.UserID,
		CategoryID:  input.CategoryID,
		Amount:      input.Amount,
		Description: input.Description,
		CreatedAt:   now,
		UpdatedAt:   now,
	}
	err := r.db.QueryRowContext(ctx, query,
		input.UserID, input.CategoryID, input.Amount, input.Description, now, now,
	).Scan(&expense.ID, &expense.UserID, &expense.CategoryID, &expense.Amount, &expense.Description, &expense.CreatedAt, &expense.UpdatedAt)

	if err != nil {
		return nil, err
	}

	return expense, nil
}

func (r *expenseRepository) GetByID(ctx context.Context, id int64) (*RawExpense, error) {
	var expense RawExpense
	query := `
		SELECT
			expenses.id,
			expenses.amount,
			expenses.description,
			expenses.created_at,
			expenses.updated_at,
			expenses.category_id,
			categories.name as category_name,
			categories.description as category_description,
			categories.created_at as category_created_at,
			categories.updated_at as category_updated_at
		FROM expenses
		JOIN categories ON categories.id = expenses.category_id
		WHERE expenses.id = $1
		AND expenses.deleted_at IS NULL
	`
	err := r.db.GetContext(ctx, &expense, query, id)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, errors.New("expense not found")
		}
		return nil, err
	}
	return &expense, nil
}

type UpdateExpenseInput struct {
	ExpenseID   int64
	CategoryID  int64
	UserID      int64
	Amount      int64
	Description string
}

func (r *expenseRepository) Update(ctx context.Context, updateWith UpdateExpenseInput) error {
	query := `
		UPDATE expenses
		SET amount = $1,
			description = $2,
			updated_at = $3,
			category_id = $4
		WHERE id = $5 AND user_id = $6`

	now := now()
	description := ""
	if updateWith.Description != "" {
		description = updateWith.Description
	}

	_, err := r.db.ExecContext(ctx, query,
		updateWith.Amount, description, now, updateWith.CategoryID, updateWith.ExpenseID, updateWith.UserID,
	)
	return err
}

func (r *expenseRepository) Delete(ctx context.Context, id int64) error {
	now := now()
	query := `
		UPDATE expenses
		SET deleted_at = $1
		WHERE id = $2`

	_, err := r.db.ExecContext(ctx, query, now, id)
	return err
}

// ExpenseFilter narrows a user's expenses. From/To are inclusive bounds on
// expenses.created_at; either may be nil to leave that end open (nil From means
// "since forever", nil To means "up to and including that day").
type ExpenseFilter struct {
	From     *time.Time `json:"from" doc:"Inclusive start of date range"`
	To       *time.Time `json:"to" doc:"Inclusive end of date range"`
	Category []int64    `json:"category" doc:"Filter by category ids"`
}

type ListExpenseInput struct {
	UserID int64 `json:"user_id" doc:"User ID"`
	Page   int   `json:"page"`
	Limit  int   `json:"limit"`
	ExpenseFilter
}

// startOfUTCDay truncates t to midnight UTC of its own calendar day.
//
// Deliberately not t.Truncate(24 * time.Hour): Truncate rounds down relative to
// the zero time (year 1, Jan 1 UTC), so it only lines up with a calendar day by
// coincidence. Spelling the date out is what we actually mean.
func startOfUTCDay(t time.Time) time.Time {
	return time.Date(t.Year(), t.Month(), t.Day(), 0, 0, 0, 0, time.UTC)
}

// buildWhere produces the complete WHERE clause for a user's expenses —
// ownership, soft-delete, plus any filter clauses — together with its bind
// args.
//
// List and Sum both go through here on purpose: an aggregate that disagrees
// with the rows it claims to summarize is worse than no aggregate at all, so
// there is exactly one place where "which expenses are in scope" is decided.
func buildWhere(userID int64, filter ExpenseFilter) (string, []interface{}) {
	args := []interface{}{userID}
	conditions := []string{
		"expenses.deleted_at IS NULL",
		"expenses.user_id = $1",
	}

	if filter.From != nil {
		conditions = append(conditions, fmt.Sprintf("expenses.created_at >= $%d", len(args)+1))
		args = append(args, startOfUTCDay(*filter.From))
	}

	if filter.To != nil {
		// Half-open interval [from, to+1d): makes the upper bound inclusive
		// without the sub-millisecond fudging ("end of day" = start of next
		// day minus 1ms) that BETWEEN would otherwise need.
		conditions = append(conditions, fmt.Sprintf("expenses.created_at < $%d", len(args)+1))
		args = append(args, startOfUTCDay(*filter.To).AddDate(0, 0, 1))
	}

	if len(filter.Category) > 0 {
		placeholders := make([]string, len(filter.Category))
		for i := range filter.Category {
			placeholders[i] = fmt.Sprintf("$%d", len(args)+1+i)
		}
		conditions = append(conditions, fmt.Sprintf("expenses.category_id IN (%s)", strings.Join(placeholders, ",")))
		for _, catID := range filter.Category {
			args = append(args, catID)
		}
	}

	return " WHERE " + strings.Join(conditions, " AND "), args
}

type RawExpense struct {
	ID          int64          `db:"id"`
	Amount      int64          `db:"amount"`
	Description sql.NullString `db:"description"`
	CreatedAt   time.Time      `db:"created_at"`
	UpdatedAt   time.Time      `db:"updated_at"`

	CategoryID   int64  `db:"category_id"`
	CategoryName string `db:"category_name"`
	// categories.description is nullable, so this must be too — scanning NULL
	// into a plain string errors, which would fail the whole expense list.
	CategoryDescription sql.NullString `db:"category_description"`
	CategoryCreatedAt   time.Time      `db:"category_created_at"`
	CategoryUpdatedAt   time.Time      `db:"category_updated_at"`
}

func (r *expenseRepository) List(ctx context.Context, input ListExpenseInput) ([]RawExpense, error) {
	expenses := []RawExpense{}

	defaultLimit := 10
	if input.Limit == 0 {
		input.Limit = defaultLimit
	}

	defaultPage := 1
	if input.Page == 0 {
		input.Page = defaultPage
	}
	offset := (input.Page - 1) * input.Limit

	baseQuery := `
		SELECT
			expenses.id,
			expenses.amount,
			expenses.description,
			expenses.created_at,
			expenses.updated_at,
			expenses.category_id,
			categories.name as category_name,
			categories.description as category_description,
			categories.created_at as category_created_at,
			categories.updated_at as category_updated_at
		FROM expenses
		JOIN categories ON categories.id = expenses.category_id
	`

	whereClause, args := buildWhere(input.UserID, input.ExpenseFilter)

	limitArgIndex := len(args) + 1
	offsetArgIndex := len(args) + 2

	fullQuery := baseQuery + whereClause + fmt.Sprintf(`
			ORDER BY expenses.created_at DESC
			LIMIT $%d OFFSET $%d
		`, limitArgIndex, offsetArgIndex)

	args = append(args, input.Limit, offset)

	if err := r.db.SelectContext(ctx, &expenses, fullQuery, args...); err != nil {
		return nil, err
	}

	return expenses, nil
}

// ExpenseTotal is the aggregate over a set of expenses. TotalAmount is in
// cents, matching Expense.Amount (NOT the pesos that the older
// GetOverviewByCategory handler converts to).
type ExpenseTotal struct {
	TotalAmount int64 `db:"total_amount" json:"totalAmount" doc:"Sum of matching expense amounts, in cents"`
	TotalCount  int64 `db:"total_count" json:"totalCount" doc:"Number of matching expenses"`
}

// Sum totals the expenses matching filter. Uses the same buildWhere as List, so
// the total always covers exactly the rows the list endpoint would return for
// the same filter.
//
// Deliberately does not join categories: List's join is an INNER JOIN on id
// only (a soft-deleted category keeps its expenses visible), so joining here
// with a deleted_at predicate would silently drop rows the list still shows.
func (r *expenseRepository) Sum(ctx context.Context, userID int64, filter ExpenseFilter) (ExpenseTotal, error) {
	whereClause, args := buildWhere(userID, filter)

	query := `
		SELECT
			COALESCE(SUM(expenses.amount), 0) as total_amount,
			COUNT(*) as total_count
		FROM expenses
	` + whereClause

	var total ExpenseTotal
	if err := r.db.GetContext(ctx, &total, query, args...); err != nil {
		return ExpenseTotal{}, err
	}

	return total, nil
}

type ExistExpenseWithUserIDInput struct {
	UserID    int64 `doc:"User ID"`
	ExpenseID int64 `doc:"Expense ID"`
}

func (r *expenseRepository) ExistWithUserID(ctx context.Context, input ExistExpenseWithUserIDInput) (bool, error) {
	var count int
	query := `
		SELECT
			COUNT(*)
		FROM expenses
		WHERE id = $1
		AND user_id = $2
		AND deleted_at IS NULL
	`

	err := r.db.GetContext(ctx, &count, query, input.ExpenseID, input.UserID)
	if err != nil {
		return false, err
	}

	return count > 0, nil
}

type CategoryExpenseOverview struct {
	CategoryID   int64  `db:"category_id"`
	CategoryName string `db:"category_name"`
	TotalAmount  int64  `db:"total_amount"`
	Count        int64  `db:"count"`
}

func (r *expenseRepository) GetOverviewByCategory(ctx context.Context, userID int64, period string, customDate *time.Time) ([]CategoryExpenseOverview, error) {
	var query string
	var args []interface{}

	switch period {
	case "today":
		// Default to today (UTC) when no date is supplied. Previously this
		// dereferenced customDate unconditionally, so period=today with no
		// date panicked the handler.
		day := startOfUTCDay(now())
		if customDate != nil {
			day = startOfUTCDay(*customDate)
		}
		nextDay := day.AddDate(0, 0, 1)

		query = `
			SELECT 
				c.id as category_id,
				c.name as category_name,
				SUM(e.amount) as total_amount,
				COUNT(e.id) as count
			FROM categories c
			INNER JOIN expenses e ON c.id = e.category_id 
				AND e.user_id = $1 
				AND e.deleted_at IS NULL
				-- Half-open [day, nextDay): an inclusive upper bound. The previous
				-- form used DATE(e.created_at) <= DATE(nextDay), which truncated
				-- created_at to a date and so admitted every row on the *following*
				-- day as well — period=today reported two days of spending.
				AND e.created_at >= $2
				AND e.created_at < $3
			WHERE c.user_id = $1 
				AND c.deleted_at IS NULL
			GROUP BY c.id, c.name
			ORDER BY total_amount DESC
		`
		args = []interface{}{userID, day, nextDay}
	case "month":
		query = `
			SELECT 
				c.id as category_id,
				c.name as category_name,
				SUM(e.amount) as total_amount,
				COUNT(e.id) as count
			FROM categories c
			INNER JOIN expenses e ON c.id = e.category_id 
				AND e.user_id = $1 
				AND e.deleted_at IS NULL
				AND STRFTIME('%Y-%m', e.created_at) = STRFTIME('%Y-%m', COALESCE($2, CURRENT_DATE))
			WHERE c.user_id = $1 
				AND c.deleted_at IS NULL
			GROUP BY c.id, c.name
			ORDER BY total_amount DESC
		`
		args = []interface{}{userID, customDate}
	case "year":
		query = `
			SELECT 
				c.id as category_id,
				c.name as category_name,
				SUM(e.amount) as total_amount,
				COUNT(e.id) as count
			FROM categories c
			INNER JOIN expenses e ON c.id = e.category_id 
				AND e.user_id = $1 
				AND e.deleted_at IS NULL
				AND STRFTIME('%Y', e.created_at) = STRFTIME('%Y', COALESCE($2, CURRENT_DATE))
			WHERE c.user_id = $1 
				AND c.deleted_at IS NULL
			GROUP BY c.id, c.name
			ORDER BY total_amount DESC
		`
		args = []interface{}{userID, customDate}
	default:
		return nil, errors.New("invalid period. Must be 'today', 'month', or 'year'")
	}

	var overviews []CategoryExpenseOverview
	err := r.db.SelectContext(ctx, &overviews, query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to get overview by category: %w", err)
	}

	return overviews, nil
}
