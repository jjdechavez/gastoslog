package server

import (
	"fmt"
	"gastoslog/internal/config"
	"gastoslog/internal/database"
	"net/http"
	"strconv"
	"time"
)

type Server struct {
	port int

	db database.Service
}

func NewServer() *http.Server {
	port, _ := strconv.Atoi(config.PORT)
	NewServer := &Server{
		port: port,

		db: database.New(),
	}

	// Declare Server config
	server := &http.Server{
		Addr:         fmt.Sprintf(":%d", NewServer.port),
		Handler:      NewServer.RegisterRoutes(),
		IdleTimeout:  time.Minute,
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 30 * time.Second,
	}

	return server
}
