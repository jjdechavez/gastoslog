package database

import (
	"context"
	"database/sql"
	"errors"
	"time"

	"github.com/jmoiron/sqlx"
)

type User struct {
	ID              int64      `db:"id"`
	Email           string     `db:"email"`
	PasswordHash    string     `db:"password_hash"`
	Role            string     `db:"role"`
	EmailVerifiedAt *time.Time `db:"email_verified_at"`
	CreatedAt       time.Time  `db:"created_at"`
	UpdatedAt       time.Time  `db:"updated_at"`
	LastLoginAt     *time.Time `db:"last_login_at"`
}

type UserRepository interface {
	Create(ctx context.Context, email, password, role string) (*User, error)
	GetByID(ctx context.Context, id int64) (*User, error)
	GetByEmail(ctx context.Context, email string) (*User, error)
	Update(ctx context.Context, user *User) error
	UpdatePassword(ctx context.Context, id int64, newPassword string) error
	UpdateLastLogin(ctx context.Context, id int64) error
	VerifyEmail(ctx context.Context, id int64) error
}

type userRepository struct {
	db *sqlx.DB
}

func NewUserRepository(db *sqlx.DB) UserRepository {
	return &userRepository{db: db}
}

func (r *userRepository) Create(ctx context.Context, email, password, role string) (*User, error) {

	query := `
		INSERT INTO users (email, password_hash, role, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id, email_verified_at, created_at, updated_at, last_login_at`

	now := time.Now()
	assignedRole := "user"

	if role == "" {
		assignedRole = role
	}

	user := &User{
		Email:        email,
		PasswordHash: password,
		Role:         assignedRole,
		CreatedAt:    now,
		UpdatedAt:    now,
	}

	err := r.db.QueryRowContext(ctx, query,
		email, password, "user", now, now,
	).Scan(&user.ID, &user.EmailVerifiedAt, &user.CreatedAt, &user.UpdatedAt, &user.LastLoginAt)

	if err != nil {
		return nil, err
	}

	return user, nil
}

func (r *userRepository) GetByID(ctx context.Context, id int64) (*User, error) {
	var user User
	query := `SELECT * FROM users WHERE id = $1`
	err := r.db.GetContext(ctx, &user, query, id)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, errors.New("user not found")
		}
		return nil, err
	}
	return &user, nil
}

func (r *userRepository) GetByEmail(ctx context.Context, email string) (*User, error) {
	var user User
	query := `SELECT * FROM users WHERE email = $1`
	err := r.db.GetContext(ctx, &user, query, email)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, errors.New("user not found")
		}
		return nil, err
	}
	return &user, nil
}

func (r *userRepository) Update(ctx context.Context, user *User) error {
	query := `
		UPDATE users 
		SET email = $1,
			role = $2,
			updated_at = $3
		WHERE id = $4`

	user.UpdatedAt = time.Now()
	_, err := r.db.ExecContext(ctx, query,
		user.Email, user.Role, user.UpdatedAt, user.ID,
	)
	return err
}

func (r *userRepository) UpdatePassword(ctx context.Context, id int64, newPassword string) error {
	query := `
		UPDATE users 
		SET password_hash = $1,
			updated_at = $2
		WHERE id = $3`

	_, err := r.db.ExecContext(ctx, query,
		newPassword, time.Now(), id,
	)
	return err
}

func (r *userRepository) UpdateLastLogin(ctx context.Context, id int64) error {
	now := time.Now()
	query := `
		UPDATE users 
		SET last_login_at = $1
		WHERE id = $2`

	_, err := r.db.ExecContext(ctx, query, now, id)
	return err
}

func (r *userRepository) VerifyEmail(ctx context.Context, id int64) error {
	now := time.Now()
	query := `
		UPDATE users 
		SET email_verified_at = $1,
			updated_at = $1
		WHERE id = $2`

	_, err := r.db.ExecContext(ctx, query, now, id)
	return err
}
