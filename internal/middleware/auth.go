package middleware

import (
	"fmt"
	"gastoslog/internal/auth"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/danielgtaylor/huma/v2"
	"github.com/golang-jwt/jwt/v5"
)

type SimpleClaims struct {
	// jwt.Token
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

		authSecret := os.Getenv("AUTH_SECRET")

		if authSecret == "" {
			huma.WriteErr(api, ctx, http.StatusInternalServerError, "Missing auth secret")
			return
		}

		token, err := auth.VerifyJWTToken(authSecret, tokenStr)

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
