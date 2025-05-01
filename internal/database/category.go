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
	DeletedAt   *time.Time     `db:"delete_at"`
}

type CategoryRepository interface {
	Create(ctx context.Context, userID int64, name string, description sql.NullString) (*Category, error)
	GetByID(ctx context.Context, id int64) (*Category, error)
	Update(ctx context.Context, category *Category) error
	Delete(ctx context.Context, id int64) error
}

type categoryRepository struct {
	db *sqlx.DB
}

func NewCategoryRepository(db *sqlx.DB) CategoryRepository {
	return &categoryRepository{db: db}
}

func (r *categoryRepository) Create(ctx context.Context, userID int64, name string, description sql.NullString) (*Category, error) {

	query := `
		INSERT INTO categories (user_id, name, description, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id, user_id, name, description, created_at, updated_at, deleted_at`

	now := time.Now()

	category := &Category{
		UserID:      userID,
		Name:        name,
		Description: description,
		CreatedAt:   now,
		UpdatedAt:   now,
	}

	err := r.db.QueryRowContext(ctx, query,
		userID, name, description, now, now,
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

func (r *categoryRepository) Update(ctx context.Context, category *Category) error {
	query := `
		UPDATE categories
		SET name = $1,
			description = $2,
			updated_at = $3
		WHERE id = $4 AND user_id = $5`

	category.UpdatedAt = time.Now()
	_, err := r.db.ExecContext(ctx, query,
		category.Name, category.Description, category.UpdatedAt, category.ID, category.UserID,
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
