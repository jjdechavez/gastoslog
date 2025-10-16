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
	Page     int     `query:"page" default:"1" doc:"Page number of pagination"`
	Limit    int     `query:"limit" default:"10" doc:"Limit per page of pagination"`
	Date     string  `query:"date" doc:"Filter date for expense (YYYY-MM-DD format)"`
	Category []int64 `query:"category" doc:"Filter category"`
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

	var date *time.Time
	if input.Date != "" {
		parsedDate, err := time.Parse("2006-01-02", input.Date)
		if err != nil {
			return nil, huma.Error400BadRequest("Invalid date format. Use YYYY-MM-DD")
		}
		date = &parsedDate
	}

	list, err := c.expenseRepository.List(ctx, database.ListExpenseInput{
		UserID:   int64(userID),
		Page:     input.Page,
		Limit:    input.Limit,
		Date:     date,
		Category: input.Category,
	})

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
		Data ExpenseResponse `json:"data" doc:"Expense updated successfully"`
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
	payload := &database.UpdateExpenseInput{ExpenseID: expenseID, CategoryID: input.Body.CategoryID, UserID: int64(userID), Amount: amountCents, Description: input.Body.Description}

	err = c.expenseRepository.Update(ctx, *payload)
	if err != nil {
		return nil, huma.Error500InternalServerError("Failed to update expense", err)
	}

	updatedExpense, err := c.expenseRepository.GetByID(ctx, expenseID)
	if err != nil {
		return nil, err
	}

	resp := &UpdatedExpenseOutput{}
	resp.Body.Data = toExpenseResponse(*updatedExpense)
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

	expenseID := int64(input.ExpenseID)

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

	expense, err := c.expenseRepository.GetByID(ctx, expenseID)
	if err != nil {
		return nil, huma.Error500InternalServerError("Failed to get expense", err)
	}

	resp := &DetailExpenseOutput{}
	resp.Body.Data = toExpenseResponse(*expense)
	return resp, nil
}

type ExpenseOverviewInput struct {
	Period string `query:"period" enum:"today,month,year" default:"today" doc:"Period for overview (today, month, year)"`
	Date   string `query:"date" doc:"Custom date for overview (YYYY-MM-DD format)"`
}

type ExpenseOverviewOutput struct {
	Body struct {
		Data         []CategoryExpenseOverviewResponse `json:"data" doc:"Expense overview by category"`
		OverviewMeta struct {
			Period      string `json:"period" doc:"Period of the overview"`
			TotalAmount int64  `json:"totalAmount" doc:"Total amount for the period"`
			TotalCount  int64  `json:"totalCount" doc:"Total number of expenses for the period"`
		} `json:"meta"`
	}
}

type CategoryExpenseOverviewResponse struct {
	CategoryID   int64   `json:"categoryId"`
	CategoryName string  `json:"categoryName"`
	TotalAmount  float64 `json:"totalAmount"`
	Count        int64   `json:"count"`
	Percentage   float64 `json:"percentage"`
}

func (c *ExpenseHandler) GetExpenseOverview(ctx context.Context, input *ExpenseOverviewInput) (*ExpenseOverviewOutput, error) {
	userID, err := middleware.GetContextUserID(ctx)
	if err != nil {
		return nil, err
	}

	var customDate *time.Time
	if input.Date != "" {
		parsedDate, err := time.Parse("2006-01-02", input.Date)
		if err != nil {
			return nil, huma.Error400BadRequest("Invalid date format. Use YYYY-MM-DD")
		}
		customDate = &parsedDate
	}

	overviews, err := c.expenseRepository.GetOverviewByCategory(ctx, int64(userID), input.Period, customDate)
	if err != nil {
		return nil, huma.Error500InternalServerError("Failed to get expense overview", err)
	}

	// Calculate totals
	var totalAmount int64
	var totalCount int64
	for _, overview := range overviews {
		totalAmount += overview.TotalAmount
		totalCount += overview.Count
	}

	// Convert to response format
	responses := make([]CategoryExpenseOverviewResponse, len(overviews))
	for i, overview := range overviews {
		percentage := 0.0
		if totalAmount > 0 {
			percentage = float64(overview.TotalAmount) / float64(totalAmount) * 100
		}

		responses[i] = CategoryExpenseOverviewResponse{
			CategoryID:   overview.CategoryID,
			CategoryName: overview.CategoryName,
			TotalAmount:  float64(overview.TotalAmount) / 100, // Convert cents to dollars
			Count:        overview.Count,
			Percentage:   percentage,
		}
	}

	resp := &ExpenseOverviewOutput{}
	resp.Body.Data = responses
	resp.Body.OverviewMeta.Period = input.Period
	resp.Body.OverviewMeta.TotalAmount = totalAmount
	resp.Body.OverviewMeta.TotalCount = totalCount

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
		CategoryID:  expense.CategoryID,
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
