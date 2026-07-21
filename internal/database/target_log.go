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

type TargetLog struct {
	ID        int64     `db:"id"`
	UserID    int64     `db:"user_id"`
	TargetID  int64     `db:"target_id"`
	Amount    int64     `db:"amount"`
	Notes     string    `db:"note"`
	EntryDate time.Time ` db:"entry_date"`
	CreatedAt time.Time `db:"created_at"`
	UpdatedAt time.Time `db:"updated_at"`
	DeletedAt null.Time `db:"deleted_at"`
}

type TargetLogRepository interface {
	Create(ctx context.Context, input NewTargetLogInput) (*TargetLog, error)
	GetByID(ctx context.Context, id int64) (*RawTargetLog, error)
	Update(ctx context.Context, expense UpdateTargetLogInput) error
	Delete(ctx context.Context, id int64) error
	List(ctx context.Context, input ListTargetLogInput) ([]RawTargetLog, error)
	ExistWithUserID(ctx context.Context, input ExistTargetLogWithUserIDInput) (bool, error)
	SumAmountByTargetID(ctx context.Context, targetID int64) (int64, error)
}

type targetLogRepository struct {
	db *sqlx.DB
}

func NewTargetLogRepository(db *sqlx.DB) TargetLogRepository {
	return &targetLogRepository{db: db}
}

type NewTargetLogInput struct {
	UserID    int64
	TargetID  int64
	Amount    float64
	Notes     null.String
	EntryDate time.Time
}

func (r *targetLogRepository) Create(ctx context.Context, input NewTargetLogInput) (*TargetLog, error) {
	query := `
		INSERT INTO target_logs (user_id, target_id, amount, notes, entry_date)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id, user_id, target_id, amount, notes, entry_date, created_at, updated_at
	`

	target := &TargetLog{
		UserID:    input.UserID,
		TargetID:  input.TargetID,
		Amount:    int64(input.Amount * 100),
		Notes:     input.Notes.ValueOr(""),
		EntryDate: input.EntryDate,
	}

	err := r.db.QueryRowContext(ctx, query,
		target.UserID, target.TargetID, target.Amount, target.Notes, target.EntryDate,
	).Scan(&target.ID, &target.UserID, &target.TargetID, &target.Amount, &target.Notes, &target.EntryDate, &target.CreatedAt, &target.UpdatedAt)

	if err != nil {
		return nil, err
	}

	return target, nil
}

func (r *targetLogRepository) GetByID(ctx context.Context, id int64) (*RawTargetLog, error) {
	var target RawTargetLog
	query := `
		SELECT
			id,
			user_id,
			target_id,
			amount,
			notes,
			entry_date,
			created_at,
			updated_at
		FROM target_logs
		WHERE id = $1
		AND deleted_at IS NULL
	`
	err := r.db.GetContext(ctx, &target, query, id)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, errors.New("target log not found")
		}
		return nil, err
	}
	return &target, nil
}

type UpdateTargetLogInput struct {
	TargetLogID int64
	UserID      int64
	Amount      float64
	Notes       null.String
	EntryDate   time.Time
}

func (r *targetLogRepository) Update(ctx context.Context, updateWith UpdateTargetLogInput) error {
	query := `
		UPDATE target_logs
		SET amount = $1,
			notes = $2,
			entry_date = $3,
			updated_at = $4
		WHERE id = $5 AND user_id = $6`

	now := time.Now()

	_, err := r.db.ExecContext(ctx, query,
		int64(updateWith.Amount*100), updateWith.Notes.ValueOr(""), updateWith.EntryDate, now, updateWith.TargetLogID, updateWith.UserID,
	)
	return err
}

func (r *targetLogRepository) Delete(ctx context.Context, id int64) error {
	now := time.Now()
	query := `
		UPDATE target_logs
		SET deleted_at = $1
		WHERE id = $2`

	_, err := r.db.ExecContext(ctx, query, now, id)
	return err
}

type ListTargetLogInput struct {
	UserID   int64      `json:"user_id" doc:"User ID"`
	Page     int        `json:"page"`
	Limit    int        `json:"limit"`
	Date     *time.Time `json:"date"`
	TargetID null.Int64 `json:"target_id"`
}

type RawTargetLog struct {
	ID        int64     `db:"id"`
	UserID    int64     `db:"user_id"`
	TargetID  int64     `db:"target_id"`
	Notes     string    `db:"notes"`
	Amount    int64     `db:"amount"`
	EntryDate time.Time `db:"entry_date"`
	CreatedAt time.Time `db:"created_at"`
	UpdatedAt time.Time `db:"updated_at"`
}

func (r *targetLogRepository) List(ctx context.Context, input ListTargetLogInput) ([]RawTargetLog, error) {
	targets := []RawTargetLog{}

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
			id,
			user_id,
			target_id,
			amount,
			notes,
			entry_date,
			created_at,
			updated_at
		FROM target_logs
		WHERE deleted_at IS NULL
		AND user_id = $1		
	`

	args := []interface{}{input.UserID}
	conditions := []string{}

	if input.TargetID.Valid {
		condition := fmt.Sprintf("target_id = $%d", len(args)+1)
		conditions = append(conditions, condition)
		args = append(args, input.TargetID.Int64)
	}

	fullQuery := baseQuery

	if len(conditions) > 0 {
		fullQuery += " AND " + strings.Join(conditions, " AND ")
	}

	limitArgIndex := len(args) + 1
	offsetArgIndex := len(args) + 2

	fullQuery += fmt.Sprintf(`
			ORDER BY created_at DESC
			LIMIT $%d OFFSET $%d
		`, limitArgIndex, offsetArgIndex)

	args = append(args, input.Limit, offset)

	if err := r.db.SelectContext(ctx, &targets, fullQuery, args...); err != nil {
		return nil, err
	}

	return targets, nil
}

type ExistTargetLogWithUserIDInput struct {
	UserID      int64 `doc:"User ID"`
	TargetLogID int64 `doc:"TargetLog ID"`
}

func (r *targetLogRepository) ExistWithUserID(ctx context.Context, input ExistTargetLogWithUserIDInput) (bool, error) {
	var count int
	query := `
		SELECT
			COUNT(*)
		FROM target_logs
		WHERE id = $1
		AND user_id = $2
		AND deleted_at IS NULL
	`

	err := r.db.GetContext(ctx, &count, query, input.TargetLogID, input.UserID)
	if err != nil {
		return false, err
	}

	return count > 0, nil
}

func (r *targetLogRepository) SumAmountByTargetID(ctx context.Context, targetID int64) (int64, error) {
	var sum int64
	query := `
		SELECT
			COALESCE(SUM(amount), 0)
		FROM target_logs
		WHERE target_id = $1
		AND deleted_at IS NULL
	`

	err := r.db.GetContext(ctx, &sum, query, targetID)
	if err != nil {
		return 0, err
	}

	return sum, nil
}
