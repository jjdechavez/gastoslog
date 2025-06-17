package v1

import (
	"context"
	"gastoslog/internal/database"
	"gastoslog/internal/middleware"
	"strconv"
	"time"

	"github.com/danielgtaylor/huma/v2"
	"github.com/guregu/null/v6"
)

type ExpenseHandler struct {
	expenseRepository   database.ExpenseRepository
	categoryRespository database.CategoryRepository
}

func NewExpenseHandler(expenseRepo database.ExpenseRepository, categoryRepo database.CategoryRepository) *ExpenseHandler {
	return &ExpenseHandler{expenseRepository: expenseRepo, categoryRespository: categoryRepo}
}

type NewExpenseInput struct {
	Body struct {
		Amount      float64 `json:"amount" doc:"Expense amount" minimum:"1"`
		Description string  `json:"description,omitempty" doc:"Expense description"`
		CategoryID  int64   `json:"categoryId" doc:"Category ID"`
	}
}

type CreatedExpenseOutput struct {
	Body struct {
		Expense ExpenseResponse `json:"expense" doc:"Expense created successfully"`
	}
}

func (c *ExpenseHandler) CreateExpense(ctx context.Context, input *NewExpenseInput) (*CreatedExpenseOutput, error) {
	userID, err := middleware.GetContextUserID(ctx)
	if err != nil {
		return nil, err
	}

	existCategory, err := c.categoryRespository.ExistWithUserID(ctx, database.ExistWithUserIDInput{CategoryID: input.Body.CategoryID, UserID: int64(userID)})
	if err != nil || !existCategory {
		return nil, huma.Error404NotFound("Category not found")
	}

	amountCents := int64(input.Body.Amount * 100)
	newExpenseInput := &database.NewExpenseInput{UserID: int64(userID), CategoryID: input.Body.CategoryID, Amount: amountCents, Description: input.Body.Description}

	created, err := c.expenseRepository.Create(ctx, *newExpenseInput)
	if err != nil {
		return nil, huma.Error500InternalServerError("Failed to create expense", err)
	}

	createdExpense, err := c.expenseRepository.GetByID(ctx, created.ID)
	if err != nil {
		return nil, err
	}

	resp := &CreatedExpenseOutput{}
	resp.Body.Expense = toExpenseResponse(*createdExpense)
	return resp, nil
}

type ListExpenseInput struct {
	Page  int `query:"page" default:"1" doc:"Page number of pagination"`
	Limit int `query:"limit" default:"10" doc:"Limit per page of pagination"`
}

type ListExpenseOutput struct {
	Body struct {
		Data []ExpenseResponse `json:"data" doc:"List of Expenses"`
		Meta struct {
			Page  int `json:"page" doc:"Page number of pagination"`
			Limit int `json:"limit" doc:"Limit per page of pagination"`
		} `json:"meta"`
	}
}

func (c *ExpenseHandler) ListExpense(ctx context.Context, input *ListExpenseInput) (*ListExpenseOutput, error) {
	userID, err := middleware.GetContextUserID(ctx)
	if err != nil {
		return nil, err
	}

	list, err := c.expenseRepository.List(ctx, database.ListExpenseInput{
		UserID: int64(userID),
		Page:   input.Page,
		Limit:  input.Limit,
	})
	println(list)

	if err != nil {
		return nil, huma.Error500InternalServerError("Failed to list expenses", err)
	}

	resp := &ListExpenseOutput{}
	resp.Body.Data = toExpenseResponseList(list)
	resp.Body.Meta.Page = input.Page
	resp.Body.Meta.Limit = input.Limit

	return resp, nil
}

type UpdateExpenseInput struct {
	ExpenseID string `path:"expenseId" doc:"Expense ID"`
	Body      struct {
		CategoryID  int64   `json:"categoryId" doc:"Expense category"`
		Amount      float64 `json:"amount" minimum:"1"`
		Description string  `json:"description,omitempty"`
	}
}

type UpdatedExpenseOutput struct {
	Body struct {
		Expense ExpenseResponse `json:"expense" doc:"Expense updated successfully"`
	}
}

func (c *ExpenseHandler) UpdateExpense(ctx context.Context, input *UpdateExpenseInput) (*UpdatedExpenseOutput, error) {
	userID, err := middleware.GetContextUserID(ctx)
	if err != nil {
		return nil, err
	}

	existCategory, err := c.categoryRespository.ExistWithUserID(ctx, database.ExistWithUserIDInput{CategoryID: input.Body.CategoryID, UserID: int64(userID)})
	if err != nil || !existCategory {
		return nil, huma.Error404NotFound("Category not found")
	}

	expenseID, err := strconv.ParseInt(input.ExpenseID, 10, 64)
	if err != nil {
		return nil, huma.Error400BadRequest("Failed to parse expenseID")
	}

	exist, err := c.expenseRepository.ExistWithUserID(ctx, database.ExistExpenseWithUserIDInput{
		UserID:    int64(userID),
		ExpenseID: expenseID,
	})
	if err != nil {
		return nil, err
	}
	if !exist {
		return nil, huma.Error404NotFound("Expense not found")
	}

	amountCents := int64(input.Body.Amount * 100)
	payload := &database.UpdateExpenseInput{CategoryID: input.Body.CategoryID, UserID: int64(userID), Amount: amountCents, Description: input.Body.Description}

	err = c.expenseRepository.Update(ctx, *payload)
	if err != nil {
		return nil, huma.Error500InternalServerError("Failed to update expense", err)
	}

	updatedExpense, err := c.expenseRepository.GetByID(ctx, expenseID)
	if err != nil {
		return nil, err
	}

	resp := &UpdatedExpenseOutput{}
	resp.Body.Expense = toExpenseResponse(*updatedExpense)
	return resp, nil
}

type DeleteExpenseInput struct {
	ExpenseID string `path:"expenseId" doc:"Expense ID"`
}

func (c *ExpenseHandler) DeleteExpense(ctx context.Context, input *DeleteExpenseInput) (*struct{}, error) {
	userID, err := middleware.GetContextUserID(ctx)
	if err != nil {
		return nil, err
	}

	expenseID, err := strconv.ParseInt(input.ExpenseID, 10, 64)
	if err != nil {
		return nil, huma.Error400BadRequest("Failed to parse expenseID")
	}

	exist, err := c.expenseRepository.ExistWithUserID(ctx, database.ExistExpenseWithUserIDInput{
		UserID:    int64(userID),
		ExpenseID: expenseID,
	})
	if err != nil {
		return nil, err
	}
	if !exist {
		return nil, huma.Error404NotFound("Category not found")
	}

	err = c.expenseRepository.Delete(ctx, expenseID)
	if err != nil {
		return nil, huma.Error500InternalServerError("Failed to delete expense", err)
	}

	return nil, nil
}

type DetailExpenseInput struct {
	ExpenseID int `path:"expenseId" doc:"Expense ID"`
}

type DetailExpenseOutput struct {
	Body struct {
		Data ExpenseResponse `json:"data" doc:"Expense detail"`
	}
}

func (c *ExpenseHandler) DetailExpense(ctx context.Context, input *DetailExpenseInput) (*DetailExpenseOutput, error) {
	userID, err := middleware.GetContextUserID(ctx)
	if err != nil {
		return nil, err
	}

	exist, err := c.expenseRepository.ExistWithUserID(ctx, database.ExistExpenseWithUserIDInput{
		UserID:    int64(userID),
		ExpenseID: int64(input.ExpenseID),
	})

	if err != nil {
		return nil, huma.Error500InternalServerError("Failed to list expenses", err)
	}

	if !exist {
		return nil, huma.Error404NotFound("Expense not found")
	}

	detail, err := c.expenseRepository.GetByID(ctx, int64(input.ExpenseID))
	if err != nil {
		return nil, huma.Error500InternalServerError("Failed to get expense", err)
	}

	resp := &DetailExpenseOutput{}
	resp.Body.Data = toExpenseResponse(*detail)

	return resp, nil
}

type ExpenseResponse struct {
	ID          int64            `json:"id"`
	Amount      int64            `json:"amount"`
	Description null.String      `json:"description"`
	CategoryID  int64            `json:"categoryId"`
	Category    CategoryResponse `json:"category"`
	CreatedAt   time.Time        `json:"createdAt"`
	UpdatedAt   time.Time        `json:"updatedAt"`
}

func toExpenseResponse(expense database.RawExpense) ExpenseResponse {
	category := &CategoryResponse{
		ID:          expense.CategoryID,
		Name:        expense.CategoryName,
		Description: expense.CategoryDescription,
		CreatedAt:   expense.CategoryCreatedAt,
		UpdatedAt:   expense.CategoryUpdatedAt,
	}

	var description null.String
	if expense.Description.Valid {
		description = null.StringFrom(expense.Description.String)
	}

	return ExpenseResponse{
		ID:          expense.ID,
		Amount:      expense.Amount,
		Description: description,
		Category:    *category,
		CreatedAt:   expense.CreatedAt,
		UpdatedAt:   expense.UpdatedAt,
	}
}

func toExpenseResponseList(expenses []database.RawExpense) []ExpenseResponse {
	response := make([]ExpenseResponse, len(expenses))
	for index, expense := range expenses {
		response[index] = toExpenseResponse(expense)
	}
	return response
}
