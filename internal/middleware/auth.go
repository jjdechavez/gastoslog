package middleware

import (
	"context"
	"fmt"
	"gastoslog/internal/auth"
	"gastoslog/internal/config"
	"net/http"
	"strings"
	"time"

	"github.com/danielgtaylor/huma/v2"
	"github.com/golang-jwt/jwt/v5"
)

type SimpleClaims struct {
	UserID string `json:"userId"`
}

func NewBasicAuthMiddleware(api huma.API) func(ctx huma.Context, next func(huma.Context)) {
	return func(ctx huma.Context, next func(huma.Context)) {
		authRequired := false
		for _, opScheme := range ctx.Operation().Security {
			if _, ok := opScheme["bearer"]; ok {
				authRequired = true
				break
			}
		}

		if !authRequired {
			next(ctx)
			return
		}

		// Get and validate token
		authHeader := ctx.Header("Authorization")
		tokenStr := strings.TrimPrefix(authHeader, "Bearer ")
		if tokenStr == "" {
			huma.WriteErr(api, ctx, http.StatusUnauthorized, "Missing token")
			return
		}

		token, err := auth.VerifyJWTToken([]byte(config.AUTH_SECRET), tokenStr)

		if err != nil {
			fmt.Printf("Failed to verify token")
			huma.WriteErr(api, ctx, http.StatusUnauthorized, "Invalid token")
			return
		}

		claims, ok := token.Claims.(jwt.MapClaims)
		if !ok {
			huma.WriteErr(api, ctx, http.StatusUnauthorized, "Invalid token")
			return
		} else if exp := claims["exp"].(float64); int64(exp) < time.Now().Unix() {
			huma.WriteErr(api, ctx, http.StatusUnauthorized, "Expired token")
			return
		}

		if token != nil {
			// Store user ID in context for handlers to use
			ctx = huma.WithValue(ctx, "userID", claims["sub"])
			next(ctx)
			return
		}

		huma.WriteErr(api, ctx, http.StatusUnauthorized, "Invalid token claims")
	}
}

func GetContextUserID(ctx context.Context) (float64, error) {
	cUserID := ctx.Value("userID")
	userID, ok := cUserID.(float64)

	if !ok {
		return 0, huma.Error500InternalServerError("Failed to get userID on context")
	}

	return userID, nil
}
