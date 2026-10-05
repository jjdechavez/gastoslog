package v1

import (
	"context"
	"strconv"

	"gastoslog/internal/database"
	"gastoslog/internal/middleware"
	"gastoslog/internal/validation"
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

// ensureCategoryOwnership confirms the category exists and belongs to the
// user. A lookup failure is a 500 (server-side problem); a nonexistent
// category is a field-scoped 422 pointing at body.categoryId (the caller's
// input was invalid, not "not found" in the resource sense).
func (c *ExpenseHandler) ensureCategoryOwnership(ctx context.Context, categoryID, userID int64) error {
	exists, err := c.categoryRespository.ExistWithUserID(ctx, database.ExistWithUserIDInput{CategoryID: categoryID, UserID: userID})
	if err != nil {
		return huma.Error500InternalServerError("Failed to verify category", err)
	}
	if !exists {
		return huma.Error422UnprocessableEntity("Validation failed", validation.NewFieldError("categoryId", "Category not found", categoryID))
	}
	return nil
}

type NewExpenseInput struct {
	Body struct {
		Amount      float64 `json:"amount" doc:"Expense amount" minimum:"1"`
		Description string  `json:"description,omitempty" doc:"Expense description"`
		CategoryID  int64   `json:"categoryId" required:"true" doc:"Category ID"`
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

	if err := c.ensureCategoryOwnership(ctx, input.Body.CategoryID, int64(userID)); err != nil {
		return nil, err
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

const expenseDateLayout = "2006-01-02"

// parseExpenseFilter turns query params into a database filter.
//
// `date` is a deprecated single-day alias kept so older clients keep working;
// when present it wins over from/to, since an exact day is the more specific
// request. Shared by ListExpense and GetExpenseSummary so the two endpoints
// cannot disagree about what a set of filter params means.
func parseExpenseFilter(from, to, date string, category []int64) (database.ExpenseFilter, error) {
	if date != "" {
		from, to = date, date
	}

	filter := database.ExpenseFilter{Category: category}

	if from != "" {
		parsed, err := time.Parse(expenseDateLayout, from)
		if err != nil {
			return filter, huma.Error400BadRequest("Invalid 'from' date format. Use YYYY-MM-DD")
		}
		filter.From = &parsed
	}

	if to != "" {
		parsed, err := time.Parse(expenseDateLayout, to)
		if err != nil {
			return filter, huma.Error400BadRequest("Invalid 'to' date format. Use YYYY-MM-DD")
		}
		filter.To = &parsed
	}

	// An inverted range matches nothing. Reject it rather than return an empty
	// list, which would read as "no expenses in this period" instead of
	// "this filter is invalid".
	if filter.From != nil && filter.To != nil && filter.To.Before(*filter.From) {
		return filter, huma.Error400BadRequest("'to' date must not be earlier than 'from'")
	}

	return filter, nil
}

type ListExpenseInput struct {
	Page  int    `query:"page" default:"1" doc:"Page number of pagination"`
	Limit int    `query:"limit" default:"10" doc:"Limit per page of pagination"`
	From  string `query:"from" doc:"Filter expenses created on or after this date (YYYY-MM-DD format, inclusive)"`
	To    string `query:"to" doc:"Filter expenses created on or before this date (YYYY-MM-DD format, inclusive)"`
	// Deprecated: single-day alias for from+to. Prefer from/to.
	Date string `query:"date" doc:"Deprecated: filter a single day (YYYY-MM-DD). Use from+to instead."`
	// NB: huma parses []int64 query params from a single comma-separated value
	// ("category=9,10"), NOT from repeated params. Repeating the key
	// ("category=9&category=10") is silently reduced to the first value even
	// though the generated OpenAPI implies otherwise — which fails quietly.
	Category []int64 `query:"category" doc:"Filter category, as comma-separated ids (e.g. category=9,10)"`
}

type ListExpenseOutput struct {
	Body struct {
		Data []ExpenseResponse `json:"data" doc:"List of Expenses"`
		Meta PaginationMeta    `json:"meta"`
	}
}

func (c *ExpenseHandler) ListExpense(ctx context.Context, input *ListExpenseInput) (*ListExpenseOutput, error) {
	userID, err := middleware.GetContextUserID(ctx)
	if err != nil {
		return nil, err
	}

	filter, err := parseExpenseFilter(input.From, input.To, input.Date, input.Category)
	if err != nil {
		return nil, err
	}

	list, err := c.expenseRepository.List(ctx, database.ListExpenseInput{
		UserID:        int64(userID),
		Page:          input.Page,
		Limit:         input.Limit,
		ExpenseFilter: filter,
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

type ExpenseSummaryInput struct {
	From string `query:"from" doc:"Filter expenses created on or after this date (YYYY-MM-DD format, inclusive)"`
	To   string `query:"to" doc:"Filter expenses created on or before this date (YYYY-MM-DD format, inclusive)"`
	// Deprecated: single-day alias for from+to. Prefer from/to.
	Date string `query:"date" doc:"Deprecated: filter a single day (YYYY-MM-DD). Use from+to instead."`
	// Comma-separated ids — see the note on ListExpenseInput.Category.
	Category []int64 `query:"category" doc:"Filter category, as comma-separated ids (e.g. category=9,10)"`
}

type ExpenseSummaryOutput struct {
	Body struct {
		// Cents, matching the expense list's amount field. Note the older
		// /expenses/overview endpoint returns its per-category rows in pesos —
		// don't copy that convention here.
		TotalAmount int64 `json:"totalAmount" doc:"Sum of matching expense amounts, in cents"`
		TotalCount  int64 `json:"totalCount" doc:"Number of matching expenses"`
	}
}

// GetExpenseSummary totals the expenses matching the given filter. Takes the
// same filter params as ListExpense and covers exactly the same set of rows,
// but aggregates in SQL — a client summing the pages it has loaded would only
// total what it happens to have scrolled through.
func (c *ExpenseHandler) GetExpenseSummary(ctx context.Context, input *ExpenseSummaryInput) (*ExpenseSummaryOutput, error) {
	userID, err := middleware.GetContextUserID(ctx)
	if err != nil {
		return nil, err
	}

	filter, err := parseExpenseFilter(input.From, input.To, input.Date, input.Category)
	if err != nil {
		return nil, err
	}

	total, err := c.expenseRepository.Sum(ctx, int64(userID), filter)
	if err != nil {
		return nil, huma.Error500InternalServerError("Failed to summarize expenses", err)
	}

	resp := &ExpenseSummaryOutput{}
	resp.Body.TotalAmount = total.TotalAmount
	resp.Body.TotalCount = total.TotalCount

	return resp, nil
}

type UpdateExpenseInput struct {
	ExpenseID string `path:"expenseId" doc:"Expense ID"`
	Body      struct {
		CategoryID  int64   `json:"categoryId" required:"true" doc:"Expense category"`
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

	if err := c.ensureCategoryOwnership(ctx, input.Body.CategoryID, int64(userID)); err != nil {
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

// The "today" period resolves a single UTC day. period=today&date=<YYYY-MM-DD>
// therefore means "the whole of that calendar day", which matches how the
// expense list's from/to pair behaves for a one-day range.
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
			// Per-category totals are reported in pesos while OverviewMeta.TotalAmount
			// stays in cents (see ExpenseTotal). The client compensates by
			// re-multiplying here (index.tsx), which is a genuine inconsistency —
			// not copied into /expenses/summary, which is cents throughout.
			TotalAmount: float64(overview.TotalAmount) / 100,
			Count:       overview.Count,
			Percentage:  percentage,
		}
	}

	resp := &ExpenseOverviewOutput{}
	resp.Body.Data = responses
	resp.Body.OverviewMeta.Period = input.Period
	// Cents — matches Expense.Amount and /expenses/summary, unlike the
	// per-category rows above which are pesos.
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
	// CategoryResponse.Description is a plain string, so an absent category
	// description becomes "" rather than null — matching how the list endpoint
	// reports it and keeping the client's zod schema (.optional().nullable())
	// satisfied either way.
	categoryDescription := ""
	if expense.CategoryDescription.Valid {
		categoryDescription = expense.CategoryDescription.String
	}

	category := &CategoryResponse{
		ID:          expense.CategoryID,
		Name:        expense.CategoryName,
		Description: categoryDescription,
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
