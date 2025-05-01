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
	envs, err = godotenv.Read(".env")
	if err != nil {
		log.Fatalf("Error loading .env file: %v", err)
	}

	assignValues()
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

func assignValues() {
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
