package database

import (
	"context"
	"database/sql"
	"errors"
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
	ExistWithUserID(ctx context.Context, input ExistExpenseWithUserIDInput) (bool, error)
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

	now := time.Now()

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
			updated_at = $3
		WHERE id = $4 AND user_id = $5`

	now := time.Now()
	_, err := r.db.ExecContext(ctx, query,
		updateWith.Amount, sql.NullString{String: updateWith.Description}, now, updateWith.CategoryID, updateWith.UserID,
	)
	return err
}

func (r *expenseRepository) Delete(ctx context.Context, id int64) error {
	now := time.Now()
	query := `
		UPDATE expenses
		SET deleted_at = $1
		WHERE id = $2`

	_, err := r.db.ExecContext(ctx, query, now, id)
	return err
}

type ListExpenseInput struct {
	UserID int64 `json:"user_id" doc:"User ID"`
	Page   int   `json:"page"`
	Limit  int   `json:"limit"`
}

type RawExpense struct {
	ID          int64          `db:"id"`
	Amount      int64          `db:"amount"`
	Description sql.NullString `db:"description"`
	CreatedAt   time.Time      `db:"created_at"`
	UpdatedAt   time.Time      `db:"updated_at"`

	CategoryID          int64     `db:"category_id"`
	CategoryName        string    `db:"category_name"`
	CategoryDescription string    `db:"category_description"`
	CategoryCreatedAt   time.Time `db:"category_created_at"`
	CategoryUpdatedAt   time.Time `db:"category_updated_at"`
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
		WHERE expenses.user_id = $1
		AND expenses.deleted_at IS NULL
		LIMIT $2 OFFSET $3;
	`

	if err := r.db.SelectContext(ctx, &expenses, query, input.UserID, input.Limit, offset); err != nil {
		return nil, err
	}

	return expenses, nil
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
