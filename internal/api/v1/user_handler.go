package v1

import (
	"context"
	"gastoslog/internal/account"
	"gastoslog/internal/auth"
	"gastoslog/internal/config"
	"gastoslog/internal/middleware"
	"time"

	"github.com/danielgtaylor/huma/v2"
	"github.com/golang-jwt/jwt/v5"
)

type UserHandler struct {
	userService *account.Service
}

func NewUserHandler(userService *account.Service) *UserHandler {
	return &UserHandler{userService: userService}
}

type SignUpInput struct {
	Body struct {
		Email    string `json:"email" format:"email" required:"true" doc:"User email"`
		Password string `json:"password" minLength:"3" maxLength:"255"`
	}
}

type SignUpOutput struct {
	Body struct {
		Message string `json:"message" example:"User created successfully" doc:"Message"`
	}
}

func (h *UserHandler) SignUp(ctx context.Context, input *SignUpInput) (*SignUpOutput, error) {
	_, err := h.userService.CreateUser(ctx, input.Body.Email, input.Body.Password)
	if err != nil {
		return nil, huma.Error400BadRequest("User already exist", err)
	}

	resp := &SignUpOutput{}
	resp.Body.Message = "User created successfully"

	return resp, nil
}

type SignInInput struct {
	Body struct {
		Email    string `json:"email" format:"email" required:"true" doc:"User email"`
		Password string `json:"password" required:"true" doc:"User password"`
	}
}

type SignInOutput struct {
	Body struct {
		Token        string `json:"token" doc:"JWT user token"`
		RefreshToken string `json:"refresh_token" doc:"JWT refresh token"`
	}
}

func (h *UserHandler) SignIn(ctx context.Context, input *SignInInput) (*SignInOutput, error) {
	user, err := h.userService.SignIn(ctx, input.Body.Email, input.Body.Password)
	if err != nil {
		return nil, err
	}

	resp := &SignInOutput{}

	token, err := auth.GenerateJWTToken([]byte(config.AUTH_SECRET), user.ID, time.Hour)

	if err != nil {
		return nil, err
	}

	refreshToken, err := auth.GenerateJWTToken([]byte(config.AUTH_SECRET), user.ID, time.Hour*24)

	if err != nil {
		return nil, err
	}

	resp.Body.Token = token
	resp.Body.RefreshToken = refreshToken

	return resp, nil
}

type MeInput struct {
}

type MeOutput struct {
	Body struct {
		User account.UserResponse `json:"user" doc:"User session"`
	}
}

func (h *UserHandler) Me(ctx context.Context, input *MeInput) (*MeOutput, error) {
	userID, err := middleware.GetContextUserID(ctx)
	if err != nil {
		return nil, err
	}

	user, err := h.userService.GetUserById(ctx, int64(userID))

	if err != nil {
		return nil, huma.Error404NotFound("User not found")
	}

	resp := &MeOutput{}
	resp.Body.User = *user

	return resp, nil
}

type RefreshTokenInput struct {
	Body struct {
		RefreshToken string `json:"refresh_token" doc:"JWT refresh token"`
	}
}

type RefreshTokenOutput struct {
	Body struct {
		Token string `json:"token" doc:"JWT user token"`
	}
}

func (h *UserHandler) RefreshToken(ctx context.Context, input *RefreshTokenInput) (*RefreshTokenOutput, error) {
	token, err := auth.VerifyJWTToken([]byte(config.AUTH_SECRET), input.Body.RefreshToken)
	if err != nil {
		return nil, huma.Error401Unauthorized("Invalid refresh token")
	}

	userID := token.Claims.(jwt.MapClaims)["sub"].(float64)

	user, err := h.userService.GetUserById(ctx, int64(userID))
	if err != nil {
		return nil, huma.Error404NotFound("User not found")
	}

	accessToken, err := auth.GenerateJWTToken([]byte(config.AUTH_SECRET), user.ID, time.Hour)
	if err != nil {
		return nil, err
	}

	resp := &RefreshTokenOutput{}
	resp.Body.Token = accessToken
	return resp, nil
}
