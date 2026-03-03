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

type TargetStatus string
type TargetDirection string
type TargetType string

const (
	StatusActive    = "active"
	StatusCompleted = "completed"
	StatusCancelled = "cancelled"

	DirectionInbound  = "inbound"
	DirectionOutbound = "outbound"

	TypeSavings = "savings"
	TypeDebt    = "debt"
	TypeLoan    = "loan"
)

type Target struct {
	ID           int64           `db:"id"`
	UserID       int64           `db:"user_id"`
	Name         string          `db:"name"`
	TargetAmount int64           `db:"target_amount"`
	Type         TargetType      `db:"type"`
	Direction    TargetDirection ` db:"direction"`
	Status       TargetStatus    `db:"status"`
	DeadlineAt   null.Time       `db:"deadline_at"`
	CreatedAt    time.Time       `db:"created_at"`
	UpdatedAt    time.Time       `db:"updated_at"`
	DeletedAt    null.Time       `db:"deleted_at"`
}

type TargetRepository interface {
	Create(ctx context.Context, input NewTargetInput) (*Target, error)
	GetByID(ctx context.Context, id int64) (*RawTarget, error)
	Update(ctx context.Context, expense UpdateTargetInput) error
	Delete(ctx context.Context, id int64) error
	List(ctx context.Context, input ListTargetInput) ([]RawTarget, error)
	ExistWithUserID(ctx context.Context, input ExistTargetWithUserIDInput) (bool, error)
}

type targetRepository struct {
	db *sqlx.DB
}

func NewTargetRepository(db *sqlx.DB) TargetRepository {
	return &targetRepository{db: db}
}

type NewTargetInput struct {
	UserID       int64
	Name         string
	TargetAmount int64
	Type         TargetType
	Direction    TargetDirection
	DeadlineAt   null.Time
}

func (r *targetRepository) Create(ctx context.Context, input NewTargetInput) (*Target, error) {
	query := `
		INSERT INTO targets (user_id, name, target_amount, type, direction, status, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		RETURNING id, user_id, name, target_amount, type, direction, status, deadline_at, created_at, updated_at
	`

	now := time.Now()

	target := &Target{
		UserID:       input.UserID,
		Name:         input.Name,
		TargetAmount: input.TargetAmount,
		Type:         input.Type,
		Direction:    input.Direction,
		DeadlineAt:   input.DeadlineAt,
		CreatedAt:    now,
		UpdatedAt:    now,
	}

	fmt.Printf("Input: %v", input)
	fmt.Printf("Target: %v", target)
	err := r.db.QueryRowContext(ctx, query,
		input.UserID, input.Name, input.TargetAmount, input.Type, input.Direction, StatusActive, now, now,
	).Scan(&target.ID, &target.UserID, &target.Name, &target.TargetAmount, &target.Type, &target.Direction, &target.Status, &target.DeadlineAt, &target.CreatedAt, &target.UpdatedAt)

	if err != nil {
		return nil, err
	}

	return target, nil
}

func (r *targetRepository) GetByID(ctx context.Context, id int64) (*RawTarget, error) {
	var target RawTarget
	query := `
		SELECT
			targets.id,
			targets.name,
			targets.target_amount,
			targets.type,
			targets.direction,
			targets.status,
			targets.deadline_at,
			targets.created_at,
			targets.updated_at
		FROM targets
		WHERE targets.id = $1
		AND targets.deleted_at IS NULL
	`
	err := r.db.GetContext(ctx, &target, query, id)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, errors.New("target not found")
		}
		return nil, err
	}
	return &target, nil
}

type UpdateTargetInput struct {
	TargetID     int64
	UserID       int64
	Name         string
	TargetAmount int64
	Status       TargetStatus
	Type         TargetType
	Direction    TargetDirection
	DeadlineAt   null.Time
}

func (r *targetRepository) Update(ctx context.Context, updateWith UpdateTargetInput) error {
	query := `
		UPDATE targets
		SET target_amount= $1,
			name = $2,
			status = $3,
			type = $4,
			direction = $5,
			deadline_at = $6,
			updated_at = $7
		WHERE id = $8 AND user_id = $9`

	now := time.Now()
	name := ""
	if updateWith.Name != "" {
		name = updateWith.Name
	}

	_, err := r.db.ExecContext(ctx, query,
		updateWith.TargetAmount, name, updateWith.Status, updateWith.Status, updateWith.Direction, updateWith.DeadlineAt, now, updateWith.TargetID, updateWith.UserID,
	)
	return err
}

func (r *targetRepository) Delete(ctx context.Context, id int64) error {
	now := time.Now()
	query := `
		UPDATE targets
		SET deleted_at = $1
		WHERE id = $2`

	_, err := r.db.ExecContext(ctx, query, now, id)
	return err
}

type ListTargetInput struct {
	UserID    int64      `json:"user_id" doc:"User ID"`
	Page      int        `json:"page"`
	Limit     int        `json:"limit"`
	Date      *time.Time `json:"date"`
	Status    *string    `json:"status"`
	Direction *string    `json:"direction"`
}

type RawTarget struct {
	ID           int64           `db:"id"`
	UserId       int64           `db:"user_id"`
	Name         string          `db:"name"`
	TargetAmount int64           `db:"target_amount"`
	Type         TargetType      `db:"type"`
	Status       TargetStatus    `db:"status"`
	Direction    TargetDirection `db:"direction"`
	DeadlineAt   null.Time       `db:"deadline_at"`
	CreatedAt    time.Time       `db:"created_at"`
	UpdatedAt    time.Time       `db:"updated_at"`
}

func (r *targetRepository) List(ctx context.Context, input ListTargetInput) ([]RawTarget, error) {
	targets := []RawTarget{}

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
			targets.id,
			targets.name,
			targets.target_amount,
			targets.status,
			targets.direction,
			targets.type,
			targets.created_at,
			targets.updated_at
		FROM targets
		WHERE targets.deleted_at IS NULL
		AND targets.user_id = $1		
	`

	args := []interface{}{input.UserID}
	conditions := []string{}

	if input.Status != nil && *input.Status != "" {
		condition := fmt.Sprintf("targets.status = $%d", len(args)+1)
		conditions = append(conditions, condition)
		args = append(args, *input.Status)
	}

	if input.Direction != nil && *input.Direction != "" {
		condition := fmt.Sprintf("targets.direction = $%d", len(args)+1)
		conditions = append(conditions, condition)
		args = append(args, *input.Direction)
	}

	fullQuery := baseQuery

	if len(conditions) > 0 {
		fullQuery += " AND " + strings.Join(conditions, " AND ")
	}

	limitArgIndex := len(args) + 1
	offsetArgIndex := len(args) + 2

	fullQuery += fmt.Sprintf(`
			ORDER BY targets.created_at DESC
			LIMIT $%d OFFSET $%d
		`, limitArgIndex, offsetArgIndex)

	args = append(args, input.Limit, offset)

	fmt.Println(fullQuery)
	if err := r.db.SelectContext(ctx, &targets, fullQuery, args...); err != nil {
		return nil, err
	}

	return targets, nil
}

type ExistTargetWithUserIDInput struct {
	UserID   int64 `doc:"User ID"`
	TargetID int64 `doc:"Target ID"`
}

func (r *targetRepository) ExistWithUserID(ctx context.Context, input ExistTargetWithUserIDInput) (bool, error) {
	var count int
	query := `
		SELECT
			COUNT(*)
		FROM targets
		WHERE id = $1
		AND user_id = $2
		AND deleted_at IS NULL
	`

	err := r.db.GetContext(ctx, &count, query, input.TargetID, input.UserID)
	if err != nil {
		return false, err
	}

	return count > 0, nil
}
