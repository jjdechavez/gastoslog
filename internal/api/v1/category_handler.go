package v1

import (
	"context"
	"gastoslog/internal/database"
	"gastoslog/internal/middleware"
	"strconv"
	"time"

	"github.com/danielgtaylor/huma/v2"
)

type CategoryHandler struct {
	categoryRepository database.CategoryRepository
}

func NewCategoryHandler(categoryRepository database.CategoryRepository) *CategoryHandler {
	return &CategoryHandler{categoryRepository: categoryRepository}
}

type NewCategoryInput struct {
	Body struct {
		Name        string `json:"name" minLength:"2" maxLength:"255"`
		Description string `json:"description,omitempty"`
	}
}

type CreatedCategoryOutput struct {
	Body struct {
		Category CategoryResponse `json:"category" doc:"Category created successfully"`
	}
}

func (c *CategoryHandler) CreateCategory(ctx context.Context, input *NewCategoryInput) (*CreatedCategoryOutput, error) {
	userID, err := middleware.GetContextUserID(ctx)
	if err != nil {
		return nil, err
	}

	newCategoryInput := &database.NewCategoryInput{UserID: int64(userID), Name: input.Body.Name, Description: input.Body.Description}

	createdCategory, err := c.categoryRepository.Create(ctx, *newCategoryInput)
	if err != nil {
		return nil, huma.Error500InternalServerError("Failed to create category", err)
	}

	resp := &CreatedCategoryOutput{}
	resp.Body.Category = toCategoryResponse(*createdCategory)
	return resp, nil
}

type ListCategoryInput struct {
	Page   int    `query:"page" default:"1" doc:"Page number of pagination"`
	Limit  int    `query:"limit" default:"10" doc:"Limit per page of pagination"`
	Search string `query:"s" doc:"Search category name"`
}

type ListCategoryOutput struct {
	Body struct {
		Data []CategoryResponse `json:"data" doc:"List of Categories"`
		Meta struct {
			Page  int `json:"page" doc:"Page number of pagination"`
			Limit int `json:"limit" doc:"Limit per page of pagination"`
		} `json:"meta"`
	}
}

func (c *CategoryHandler) ListCategory(ctx context.Context, input *ListCategoryInput) (*ListCategoryOutput, error) {
	userID, err := middleware.GetContextUserID(ctx)
	if err != nil {
		return nil, err
	}

	list, err := c.categoryRepository.List(ctx, database.ListCategoryInput{
		UserID: int64(userID),
		Page:   input.Page,
		Limit:  input.Limit,
		Search: input.Search,
	})

	if err != nil {
		return nil, huma.Error500InternalServerError("Failed to list categories", err)
	}

	resp := &ListCategoryOutput{}
	resp.Body.Data = toCategoryResponseList(list)
	resp.Body.Meta.Page = input.Page
	resp.Body.Meta.Limit = input.Limit

	return resp, nil
}

type UpdateCategoryInput struct {
	CategoryID string `path:"categoryId" doc:"Cateogry ID"`
	Body       struct {
		Name        string `json:"name" minLength:"2" maxLength:"255"`
		Description string `json:"description,omitempty"`
	}
}

type UpdatedCategoryOutput struct {
	Body struct {
		Data CategoryResponse `json:"data" doc:"Category updated successfully"`
	}
}

func (c *CategoryHandler) UpdateCategory(ctx context.Context, input *UpdateCategoryInput) (*UpdatedCategoryOutput, error) {
	userID, err := middleware.GetContextUserID(ctx)
	if err != nil {
		return nil, err
	}

	categoryID, err := strconv.ParseInt(input.CategoryID, 10, 64)
	if err != nil {
		return nil, huma.Error400BadRequest("Failed to parse categoryID")
	}

	exist, err := c.categoryRepository.ExistWithUserID(ctx, database.ExistWithUserIDInput{
		UserID:     int64(userID),
		CategoryID: categoryID,
	})
	if err != nil {
		return nil, err
	}
	if !exist {
		return nil, huma.Error404NotFound("Category not found")
	}

	payload := &database.UpdateCategoryInput{CategoryID: categoryID, UserID: int64(userID), Name: input.Body.Name, Description: input.Body.Description}

	err = c.categoryRepository.Update(ctx, *payload)
	if err != nil {
		return nil, huma.Error500InternalServerError("Failed to update category", err)
	}

	updatedCategory, err := c.categoryRepository.GetByID(ctx, categoryID)
	if err != nil {
		return nil, err
	}

	resp := &UpdatedCategoryOutput{}
	resp.Body.Data = toCategoryResponse(*updatedCategory)
	return resp, nil
}

type DeleteCategoryInput struct {
	CategoryID string `path:"categoryId" doc:"Category ID"`
}

func (c *CategoryHandler) DeleteCategory(ctx context.Context, input *DeleteCategoryInput) (*struct{}, error) {
	userID, err := middleware.GetContextUserID(ctx)
	if err != nil {
		return nil, err
	}

	categoryID, err := strconv.ParseInt(input.CategoryID, 10, 64)
	if err != nil {
		return nil, huma.Error400BadRequest("Failed to parse categoryID")
	}

	exist, err := c.categoryRepository.ExistWithUserID(ctx, database.ExistWithUserIDInput{
		UserID:     int64(userID),
		CategoryID: categoryID,
	})
	if err != nil {
		return nil, err
	}
	if !exist {
		return nil, huma.Error404NotFound("Category not found")
	}

	err = c.categoryRepository.Delete(ctx, categoryID)
	if err != nil {
		return nil, huma.Error500InternalServerError("Failed to delete category", err)
	}

	return nil, nil
}

type DetailCategoryInput struct {
	CategoryID int `path:"categoryId" doc:"Category ID"`
}

type DetailCategoryOutput struct {
	Body struct {
		Data CategoryResponse `json:"data" doc:"Category Detail"`
	}
}

func (c *CategoryHandler) DetailCategory(ctx context.Context, input *DetailCategoryInput) (*DetailCategoryOutput, error) {
	userID, err := middleware.GetContextUserID(ctx)
	if err != nil {
		return nil, err
	}

	exist, err := c.categoryRepository.ExistWithUserID(ctx, database.ExistWithUserIDInput{
		UserID:     int64(userID),
		CategoryID: int64(input.CategoryID),
	})
	if err != nil {
		return nil, err
	}

	if !exist {
		return nil, huma.Error404NotFound("Category not found")
	}

	detail, err := c.categoryRepository.GetByID(ctx, int64(input.CategoryID))

	if err != nil {
		return nil, huma.Error500InternalServerError("Failed to get category", err)
	}

	resp := &DetailCategoryOutput{}
	resp.Body.Data = toCategoryResponse(*detail)

	return resp, nil
}

type CategoryResponse struct {
	ID          int64     `json:"id"`
	Name        string    `json:"name"`
	Description string    `json:"description"`
	CreatedAt   time.Time `json:"createdAt"`
	UpdatedAt   time.Time `json:"updatedAt"`
}

func toCategoryResponse(category database.Category) CategoryResponse {
	return CategoryResponse{
		ID:          category.ID,
		Name:        category.Name,
		Description: category.Description.String,
		CreatedAt:   category.CreatedAt,
		UpdatedAt:   category.UpdatedAt,
	}
}

func toCategoryResponseList(categories []database.Category) []CategoryResponse {
	response := make([]CategoryResponse, len(categories))
	for index, category := range categories {
		response[index] = toCategoryResponse(category)
	}
	return response
}
