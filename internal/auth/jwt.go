package auth

import (
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

func GenerateJWTToken(secret []byte, userID int64, expiresIn time.Duration) (string, error) {
	if expiresIn == 0 {
		expiresIn = time.Hour
	}

	expiresAt := time.Now().Add(expiresIn)
	claims := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"sub": userID,          // Subject
		"iss": "gastoslog-app", // Issuer
		// "aud": "" // Audience or role
		"exp": expiresAt.Unix(),  // ExpiredAt
		"iat": time.Now().Unix(), // Issued At
	})

	tokenString, err := claims.SignedString(secret)

	if err != nil {
		return "", err
	}

	return tokenString, nil
}

func VerifyJWTToken(secret []byte, tokenString string) (*jwt.Token, error) {
	if tokenString == "" {
		return nil, fmt.Errorf("Empty header")
	}

	token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
		return secret, nil
	}, jwt.WithValidMethods([]string{jwt.SigningMethodHS256.Alg()}))

	if err != nil {
		return nil, err
	}

	if !token.Valid {
		return nil, fmt.Errorf("invalid token")
	}

	return token, nil
}
