package database

import (
	"context"
	"database/sql"
	"errors"
	"time"

	"github.com/jmoiron/sqlx"
)

type Category struct {
	ID          int64          `db:"id"`
	UserID      int64          `db:"user_id"`
	Name        string         `db:"name"`
	Description sql.NullString `db:"description"`
	CreatedAt   time.Time      `db:"created_at"`
	UpdatedAt   time.Time      `db:"updated_at"`
	DeletedAt   *time.Time     `db:"deleted_at"`
}

type CategoryRepository interface {
	Create(ctx context.Context, input NewCategoryInput) (*Category, error)
	GetByID(ctx context.Context, id int64) (*Category, error)
	Update(ctx context.Context, category UpdateCategoryInput) error
	Delete(ctx context.Context, id int64) error
	List(ctx context.Context, input ListCategoryInput) ([]Category, error)
	ExistWithUserID(ctx context.Context, input ExistWithUserIDInput) (bool, error)
}

type categoryRepository struct {
	db *sqlx.DB
}

func NewCategoryRepository(db *sqlx.DB) CategoryRepository {
	return &categoryRepository{db: db}
}

type NewCategoryInput struct {
	UserID      int64
	Name        string
	Description string
}

func (r *categoryRepository) Create(ctx context.Context, input NewCategoryInput) (*Category, error) {
	query := `
		INSERT INTO categories (user_id, name, description, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id, user_id, name, description, created_at, updated_at, deleted_at`

	now := time.Now()

	category := &Category{
		UserID:      input.UserID,
		Name:        input.Name,
		Description: sql.NullString{String: input.Description},
		CreatedAt:   now,
		UpdatedAt:   now,
	}

	err := r.db.QueryRowContext(ctx, query,
		input.UserID, input.Name, input.Description, now, now,
	).Scan(&category.ID, &category.UserID, &category.Name, &category.Description, &category.CreatedAt, &category.UpdatedAt, &category.DeletedAt)

	if err != nil {
		return nil, err
	}

	return category, nil
}

func (r *categoryRepository) GetByID(ctx context.Context, id int64) (*Category, error) {
	var category Category
	query := `SELECT * FROM categories WHERE id = $1`
	err := r.db.GetContext(ctx, &category, query, id)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, errors.New("category not found")
		}
		return nil, err
	}
	return &category, nil
}

type UpdateCategoryInput struct {
	CategoryID  int64
	UserID      int64
	Name        string
	Description string
}

func (r *categoryRepository) Update(ctx context.Context, updateWith UpdateCategoryInput) error {
	query := `
		UPDATE categories
		SET name = $1,
			description = $2,
			updated_at = $3
		WHERE id = $4 AND user_id = $5`

	now := time.Now()
	_, err := r.db.ExecContext(ctx, query,
		updateWith.Name, updateWith.Description, now, updateWith.CategoryID, updateWith.UserID,
	)
	return err
}

func (r *categoryRepository) Delete(ctx context.Context, id int64) error {
	now := time.Now()
	query := `
		UPDATE categories
		SET deleted_at = $1
		WHERE id = $2`

	_, err := r.db.ExecContext(ctx, query, now, id)
	return err
}

type ListCategoryInput struct {
	UserID int64 `json:"user_id" doc:"User ID"`
	Page   int   `json:"page"`
	Limit  int   `json:"limit"`
}

func (r *categoryRepository) List(ctx context.Context, input ListCategoryInput) ([]Category, error) {
	categories := []Category{}

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
			id,
			name,
			description,
			created_at,
			updated_at
		FROM categories
		WHERE user_id = $1
		AND deleted_at IS NULL
		LIMIT $2 OFFSET $3;
	`

	err := r.db.SelectContext(ctx, &categories, query, input.UserID, input.Limit, offset)
	if err != nil {
		return nil, err
	}

	return categories, nil
}

type ExistWithUserIDInput struct {
	UserID     int64 `doc:"User ID"`
	CategoryID int64 `doc:"Category ID"`
}

func (r *categoryRepository) ExistWithUserID(ctx context.Context, input ExistWithUserIDInput) (bool, error) {
	var count int
	query := `
		SELECT
			COUNT(*)
		FROM categories
		WHERE id = $1
		AND user_id = $2
		AND deleted_at IS NULL
	`

	err := r.db.GetContext(ctx, &count, query, input.CategoryID, input.UserID)
	if err != nil {
		return false, err
	}

	return count > 0, nil
}
