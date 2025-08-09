package config

import (
	"fmt"
	"log"
	"os"

	"github.com/joho/godotenv"
)

var envs map[string]string

func LoadENV() {
	var err error
	appEnv := os.Getenv("APP_ENV")

	if appEnv == "local" {
		envs, err = godotenv.Read(".env")
		if err != nil {
			log.Fatalf("Error loading .env file: %v", err)
		}
		assignValuesByEnvFile()
	} else {
		assignValuesBySecret()
	}
}

// General
var (
	APP_ENV string
	HOST    string
	PORT    string
)

// JWT
var (
	AUTH_SECRET string
)

// Database
var (
	DB_URL string
)

func assignValuesByEnvFile() {
	// General
	APP_ENV = envs["APP_ENV"]
	HOST = envs["HOST"]
	PORT = envs["PORT"]

	// Database
	DB_URL = envs["BLUEPRINT_DB_URL"]

	// JWT
	if envs["AUTH_SECRET"] == "" {
		fmt.Printf("AUTH_SECRET env missing")
		os.Exit(1)
	} else {
		AUTH_SECRET = envs["AUTH_SECRET"]
	}
}

func assignValuesBySecret() {
	// General
	APP_ENV = os.Getenv("APP_ENV")
	HOST = os.Getenv("HOST")
	PORT = os.Getenv("PORT")

	// Database
	DB_URL = os.Getenv("BLUEPRINT_DB_URL")

	// JWT
	if os.Getenv("AUTH_SECRET") == "" {
		fmt.Printf("AUTH_SECRET env missing")
		os.Exit(1)
	} else {
		AUTH_SECRET = os.Getenv("AUTH_SECRET")
	}
}
