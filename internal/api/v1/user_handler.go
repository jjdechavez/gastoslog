package v1

import (
	"context"
	"gastoslog/internal/account"
	"gastoslog/internal/auth"
	"os"

	"github.com/danielgtaylor/huma/v2"
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
		Token string `json:"token" doc:"JWT user token"`
	}
}

func (h *UserHandler) SignIn(ctx context.Context, input *SignInInput) (*SignInOutput, error) {
	user, err := h.userService.SignIn(ctx, input.Body.Email, input.Body.Password)
	if err != nil {
		return nil, err
	}

	resp := &SignInOutput{}

	authSecret := os.Getenv("AUTH_SECRET")

	if authSecret == "" {
		return nil, huma.Error500InternalServerError("Something went wrong")
	}

	token, err := auth.GenerateJWTToken([]byte(authSecret), user.ID)

	if err != nil {
		return nil, err
	}

	resp.Body.Token = token

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
	userID := ctx.Value("userID")
	fID, ok := userID.(float64)

	if !ok {
		return nil, huma.Error500InternalServerError("Something went wrong")
	}

	user, err := h.userService.GetUserById(ctx, int64(fID))

	if err != nil {
		return nil, huma.Error404NotFound("User not found")
	}

	resp := &MeOutput{}
	resp.Body.User = *user

	return resp, nil
}
