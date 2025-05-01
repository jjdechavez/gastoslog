package account

import (
	"context"
	"errors"
	"gastoslog/internal/database"
	"gastoslog/internal/encryption"
	"time"
)

type Service struct {
	userRepo database.UserRepository
}

type UserResponse struct {
	ID              int64      `json:"id"`
	Email           string     `json:"email"`
	Role            string     `json:"role"`
	EmailVerifiedAt *time.Time `json:"email_verified_at,omitempty"`
	CreatedAt       time.Time  `json:"created_at"`
	UpdatedAt       time.Time  `json:"updated_at"`
	LastLoginAt     *time.Time `json:"last_login_at,omitempty"`
}

func NewService(userRepo database.UserRepository) *Service {
	return &Service{
		userRepo: userRepo,
	}
}

type UserFormInput struct {
	Body struct {
		Email    string `json:"email" format:"email" required:"true" doc:"User email"`
		Password string `json:"password" minLength:"3" maxLength:"255"`
	}
}

func (s *Service) CreateUser(ctx context.Context, email, password string) (*int64, error) {
	existingUser, _ := s.userRepo.GetByEmail(ctx, email)
	if existingUser != nil {
		return nil, errors.New("email already exists")
	}

	hashedPassword, err := encryption.Encrypt(password)
	if err != nil {
		return nil, err
	}

	createdUser, err := s.userRepo.Create(ctx, email, hashedPassword, "user")
	if err != nil {
		return nil, err
	}

	return &createdUser.ID, nil
}

func (s *Service) GetUserById(ctx context.Context, userID int64) (*UserResponse, error) {
	user, err := s.userRepo.GetByID(ctx, userID)
	if err != nil {
		return nil, err
	}

	return toUserResponse(user), nil
}

func (s *Service) SignIn(ctx context.Context, email, password string) (*UserResponse, error) {
	user, err := s.userRepo.GetByEmail(ctx, email)
	if err != nil {
		return nil, errors.New("invalid credentials")
	}

	if user == nil {
		return nil, errors.New("invalid credentials")
	}

	valid := encryption.CompareHash(password, user.PasswordHash)
	if !valid {
		return nil, errors.New("invalid credentials")
	}

	now := time.Now()
	user.LastLoginAt = &now
	err = s.userRepo.UpdateLastLogin(ctx, user.ID)
	if err != nil {
		return nil, err
	}

	return toUserResponse(user), nil
}

func toUserResponse(user *database.User) *UserResponse {
	return &UserResponse{
		ID:              user.ID,
		Email:           user.Email,
		Role:            user.Role,
		EmailVerifiedAt: user.EmailVerifiedAt,
		CreatedAt:       user.CreatedAt,
		UpdatedAt:       user.UpdatedAt,
		LastLoginAt:     user.LastLoginAt,
	}
}
