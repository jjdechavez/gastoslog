package server

import (
	"encoding/json"
	"gastoslog/internal/account"
	v1 "gastoslog/internal/api/v1"
	gastoslogMiddleware "gastoslog/internal/middleware"
	"log"
	"net/http"

	"github.com/danielgtaylor/huma/v2"
	"github.com/danielgtaylor/huma/v2/adapters/humachi"
	_ "github.com/danielgtaylor/huma/v2/formats/cbor"
	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
)

func (s *Server) RegisterRoutes() http.Handler {
	r := chi.NewMux()
	r.Use(middleware.Logger)

	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{"https://*", "http://*"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type"},
		AllowCredentials: true,
		MaxAge:           300,
	}))

	r.Get("/", s.HelloWorldHandler)
	r.Get("/health", s.healthHandler)

	humaConfig := huma.DefaultConfig("GastosLog API", "1.0.0")
	humaConfig.Components.SecuritySchemes = map[string]*huma.SecurityScheme{
		"bearer": {
			Type:         "http",
			Scheme:       "bearer",
			BearerFormat: "JWT",
		},
	}

	humaApi := humachi.New(r, humaConfig)

	api := huma.NewGroup(humaApi, "/api")
	apiV1 := huma.NewGroup(api, "/v1")

	apiV1.UseMiddleware(gastoslogMiddleware.NewBasicAuthMiddleware(apiV1))

	bearerSecurity := []map[string][]string{{"bearer": {}}}

	userService := account.NewService(s.db.UserRepository())
	userHandler := v1.NewUserHandler(userService)

	huma.Register(apiV1, huma.Operation{
		OperationID: "auth-sign-in",
		Method:      http.MethodPost,
		Path:        "/auth/sign-in",
		Summary:     "Sign In User",
		Tags:        []string{"Auth"},
	}, userHandler.SignIn)
	huma.Register(apiV1, huma.Operation{
		OperationID: "auth-sign-up",
		Method:      http.MethodPost,
		Path:        "/auth/sign-up",
		Summary:     "Sign Up User",
		Tags:        []string{"Auth"},
	}, userHandler.SignUp)

	huma.Register(apiV1, huma.Operation{
		OperationID: "auth-me",
		Method:      http.MethodGet,
		Path:        "/auth/me",
		Summary:     "Session user",
		Tags:        []string{"Auth"},
		Security:    bearerSecurity,
	}, userHandler.Me)

	categoryHandler := v1.NewCategoryHandler(s.db.CategoryRepository())

	huma.Register(apiV1, huma.Operation{
		OperationID: "category-list",
		Method:      http.MethodGet,
		Path:        "/categories",
		Summary:     "List categories",
		Tags:        []string{"Category"},
		Security:    bearerSecurity,
	}, categoryHandler.ListCategory)

	huma.Register(apiV1, huma.Operation{
		OperationID: "category-create",
		Method:      http.MethodPost,
		Path:        "/categories",
		Summary:     "Create category",
		Tags:        []string{"Category"},
		Security:    bearerSecurity,
	}, categoryHandler.CreateCategory)

	huma.Register(apiV1, huma.Operation{
		OperationID: "category-update",
		Method:      http.MethodPost,
		Path:        "/categories/{categoryId}",
		Summary:     "Update category",
		Tags:        []string{"Category"},
		Security:    bearerSecurity,
	}, categoryHandler.UpdateCategory)

	huma.Register(apiV1, huma.Operation{
		OperationID: "category-delete",
		Method:      http.MethodDelete,
		Path:        "/categories/{categoryId}",
		Summary:     "Delete category",
		Tags:        []string{"Category"},
		Security:    bearerSecurity,
	}, categoryHandler.DeleteCategory)

	expenseHandler := v1.NewExpenseHandler(s.db.ExpenseRepository(), s.db.CategoryRepository())

	huma.Register(apiV1, huma.Operation{
		OperationID: "expense-list",
		Method:      http.MethodGet,
		Path:        "/expenses",
		Summary:     "List expenses",
		Tags:        []string{"Expense"},
		Security:    bearerSecurity,
	}, expenseHandler.ListExpense)

	huma.Register(apiV1, huma.Operation{
		OperationID: "expense-create",
		Method:      http.MethodPost,
		Path:        "/expenses",
		Summary:     "Create expense",
		Tags:        []string{"Expense"},
		Security:    bearerSecurity,
	}, expenseHandler.CreateExpense)

	huma.Register(apiV1, huma.Operation{
		OperationID: "expense-update",
		Method:      http.MethodPost,
		Path:        "/expenses/{expenseId}",
		Summary:     "Update expense",
		Tags:        []string{"Expense"},
		Security:    bearerSecurity,
	}, expenseHandler.UpdateExpense)

	huma.Register(apiV1, huma.Operation{
		OperationID: "expense-delete",
		Method:      http.MethodDelete,
		Path:        "/expenses/{expenseId}",
		Summary:     "Delete expense",
		Tags:        []string{"Expense"},
		Security:    bearerSecurity,
	}, expenseHandler.DeleteExpense)

	return r
}

func (s *Server) HelloWorldHandler(w http.ResponseWriter, r *http.Request) {
	resp := make(map[string]string)
	resp["message"] = "Hello World"

	jsonResp, err := json.Marshal(resp)
	if err != nil {
		log.Fatalf("error handling JSON marshal. Err: %v", err)
	}

	_, _ = w.Write(jsonResp)
}

func (s *Server) healthHandler(w http.ResponseWriter, r *http.Request) {
	jsonResp, _ := json.Marshal(s.db.Health())
	_, _ = w.Write(jsonResp)
}
