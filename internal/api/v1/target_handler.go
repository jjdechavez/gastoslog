package v1

import (
	"context"
	"gastoslog/internal/middleware"
	"gastoslog/internal/target"
	"strconv"

	"github.com/danielgtaylor/huma/v2"
)

type TargetHandler struct {
	targetService *target.Service
}

func NewTargetHandler(targetService *target.Service) *TargetHandler {
	return &TargetHandler{targetService: targetService}
}

type CreateTargetInput struct {
	Body struct {
		Name         string  `json:"name" minLength:"3" maxLength:"255"`
		TargetAmount float64 `json:"targetAmount" required:"true"`
		Type         string  `json:"type" required:"true" enum:"savings,debt,loan"`
		Direction    string  `json:"direction" required:"true" enum:"inbound,outbound"`
		DeadlineAt   string  `json:"deadlineAt,omitempty"`
	}
}

type CreateTargetOutput struct {
	Body struct {
		Data target.TargetResponse `json:"data" doc:"Created target"`
	}
}

func (h *TargetHandler) CreateTarget(ctx context.Context, input *CreateTargetInput) (*CreateTargetOutput, error) {
	userID, err := middleware.GetContextUserID(ctx)
	if err != nil {
		return nil, err
	}

	resp := &CreateTargetOutput{}
	createdTarget, err := h.targetService.CreateTarget(ctx, int64(userID), target.CreateTargetInput{
		Name:         input.Body.Name,
		TargetAmount: input.Body.TargetAmount,
		Type:         input.Body.Type,
		Direction:    input.Body.Direction,
		DeadlineAt:   input.Body.DeadlineAt,
	})
	if err != nil {
		return nil, huma.Error400BadRequest(err.Error())
	}

	resp.Body.Data = *createdTarget
	return resp, nil
}

type ListTargetInput struct {
	Page      int    `query:"page" default:"1" doc:"Page number"`
	Limit     int    `query:"limit" default:"10" doc:"Limit per page"`
	Status    string `query:"status,omitempty" enum:"active,completed,cancelled"`
	Direction string `query:"direction,omitempty" enum:"inbound,outbound"`
}

type ListTargetOutput struct {
	Body struct {
		Data []target.TargetResponse `json:"data" doc:"List of targets"`
		Meta PaginationMeta          `json:"meta"`
	}
}

func (h *TargetHandler) ListTargets(ctx context.Context, input *ListTargetInput) (*ListTargetOutput, error) {
	userID, err := middleware.GetContextUserID(ctx)
	if err != nil {
		return nil, err
	}

	targets, err := h.targetService.ListTargets(ctx, int64(userID), input.Page, input.Limit, target.ListTargetQs{Status: &input.Status, Direction: &input.Direction})
	if err != nil {
		return nil, huma.Error500InternalServerError("Failed to list targets", err)
	}

	resp := &ListTargetOutput{}
	resp.Body.Data = targets
	resp.Body.Meta.Page = input.Page
	resp.Body.Meta.Limit = input.Limit
	return resp, nil
}

type GetTargetInput struct {
	TargetID string `path:"targetId" doc:"Target ID"`
}

type GetTargetOutput struct {
	Body struct {
		Data target.TargetResponse `json:"data" doc:"Target detail"`
	}
}

func (h *TargetHandler) GetTarget(ctx context.Context, input *GetTargetInput) (*GetTargetOutput, error) {
	userID, err := middleware.GetContextUserID(ctx)
	if err != nil {
		return nil, err
	}

	targetID, err := strconv.ParseInt(input.TargetID, 10, 64)
	if err != nil {
		return nil, huma.Error400BadRequest("Invalid target ID")
	}

	t, err := h.targetService.GetTargetByID(ctx, targetID, int64(userID))
	if err != nil {
		return nil, huma.Error404NotFound("Target not found")
	}

	resp := &GetTargetOutput{}
	resp.Body.Data = *t
	return resp, nil
}

type UpdateTargetInput struct {
	TargetID string `path:"targetId" doc:"Target ID"`
	Body     struct {
		Name         string  `json:"name"`
		TargetAmount float64 `json:"targetAmount"`
		Status       string  `json:"status,omitempty" enum:"active,completed,cancelled"`
		Type         string  `json:"type" required:"true" enum:"savings,debt,loan"`
		Direction    string  `json:"direction" required:"true" enum:"inbound,outbound"`
		DeadlineAt   string  `json:"deadlineAt,omitempty"`
	}
}

type UpdateTargetOutput struct {
	Body struct {
		Data target.TargetResponse `json:"data" doc:"Updated target"`
	}
}

func (h *TargetHandler) UpdateTarget(ctx context.Context, input *UpdateTargetInput) (*UpdateTargetOutput, error) {
	userID, err := middleware.GetContextUserID(ctx)
	if err != nil {
		return nil, err
	}

	targetID, err := strconv.ParseInt(input.TargetID, 10, 64)
	if err != nil {
		return nil, huma.Error400BadRequest("Invalid target ID")
	}

	err = h.targetService.UpdateTarget(ctx, int64(userID), target.UpdateTargetInput{
		TargetID:     targetID,
		Name:         input.Body.Name,
		TargetAmount: input.Body.TargetAmount,
		Type:         input.Body.Type,
		Direction:    input.Body.Direction,
		Status:       input.Body.Status,
		DeadlineAt:   input.Body.DeadlineAt,
	})
	if err != nil {
		return nil, huma.Error400BadRequest(err.Error())
	}

	updatedTarget, err := h.targetService.GetTargetByID(ctx, targetID, int64(userID))
	if err != nil {
		return nil, huma.Error404NotFound("Target not found")
	}

	resp := &UpdateTargetOutput{}
	resp.Body.Data = *updatedTarget
	return resp, nil
}

type DeleteTargetInput struct {
	TargetID string `path:"targetId" doc:"Target ID"`
}

func (h *TargetHandler) DeleteTarget(ctx context.Context, input *DeleteTargetInput) (*struct{}, error) {
	userID, err := middleware.GetContextUserID(ctx)
	if err != nil {
		return nil, err
	}

	targetID, err := strconv.ParseInt(input.TargetID, 10, 64)
	if err != nil {
		return nil, huma.Error400BadRequest("Invalid target ID")
	}

	err = h.targetService.DeleteTarget(ctx, targetID, int64(userID))
	if err != nil {
		return nil, huma.Error400BadRequest(err.Error())
	}

	return nil, nil
}

type CreateTargetLogInput struct {
	TargetID string `path:"targetId" doc:"Target ID"`
	Body     struct {
		Amount    float64 `json:"amount" required:"true"`
		Notes     string  `json:"notes"`
		EntryDate string  `json:"entryDate" required:"true"`
	}
}

type CreateTargetLogOutput struct {
	Body struct {
		Data target.TargetLogResponse `json:"data" doc:"Created target log"`
	}
}

func (h *TargetHandler) CreateTargetLog(ctx context.Context, input *CreateTargetLogInput) (*CreateTargetLogOutput, error) {
	userID, err := middleware.GetContextUserID(ctx)
	if err != nil {
		return nil, err
	}

	targetID, err := strconv.ParseInt(input.TargetID, 10, 64)
	if err != nil {
		return nil, huma.Error400BadRequest("Invalid target ID")
	}

	createdLog, err := h.targetService.CreateTargetLog(ctx, int64(userID), target.CreateTargetLogInput{
		TargetID:  targetID,
		Amount:    input.Body.Amount,
		Notes:     input.Body.Notes,
		EntryDate: input.Body.EntryDate,
	})
	if err != nil {
		return nil, huma.Error400BadRequest(err.Error())
	}

	resp := &CreateTargetLogOutput{}
	resp.Body.Data = *createdLog
	return resp, nil
}

type ListTargetLogInput struct {
	TargetID string `path:"targetId" doc:"Target ID"`
	Page     int    `query:"page" default:"1" doc:"Page number"`
	Limit    int    `query:"limit" default:"10" doc:"Limit per page"`
}

type ListTargetLogOutput struct {
	Body struct {
		Data []target.TargetLogResponse `json:"data" doc:"List of target logs"`
		Meta PaginationMeta             `json:"meta"`
	}
}

func (h *TargetHandler) ListTargetLogs(ctx context.Context, input *ListTargetLogInput) (*ListTargetLogOutput, error) {
	userID, err := middleware.GetContextUserID(ctx)
	if err != nil {
		return nil, err
	}

	targetID, err := strconv.ParseInt(input.TargetID, 10, 64)
	if err != nil {
		return nil, huma.Error400BadRequest("Invalid target ID")
	}

	logs, err := h.targetService.ListTargetLogs(ctx, targetID, int64(userID), input.Page, input.Limit)
	if err != nil {
		return nil, huma.Error400BadRequest(err.Error())
	}

	resp := &ListTargetLogOutput{}
	resp.Body.Data = logs
	resp.Body.Meta.Page = input.Page
	resp.Body.Meta.Limit = input.Limit
	return resp, nil
}

type GetTargetLogInput struct {
	TargetID string `path:"targetId" doc:"Target ID"`
	LogID    string `path:"logId" doc:"Log ID"`
}

type GetTargetLogOutput struct {
	Body struct {
		Data target.TargetLogResponse `json:"data" doc:"Target log detail"`
	}
}

func (h *TargetHandler) GetTargetLog(ctx context.Context, input *GetTargetLogInput) (*GetTargetLogOutput, error) {
	userID, err := middleware.GetContextUserID(ctx)
	if err != nil {
		return nil, err
	}

	logID, err := strconv.ParseInt(input.LogID, 10, 64)
	if err != nil {
		return nil, huma.Error400BadRequest("Invalid log ID")
	}

	log, err := h.targetService.GetTargetLogByID(ctx, logID, int64(userID))
	if err != nil {
		return nil, huma.Error404NotFound("Target log not found")
	}

	resp := &GetTargetLogOutput{}
	resp.Body.Data = *log
	return resp, nil
}

type UpdateTargetLogInput struct {
	TargetID string `path:"targetId" doc:"Target ID"`
	LogID    string `path:"logId" doc:"Log ID"`
	Body     struct {
		Amount    float64 `json:"amount"`
		Notes     string  `json:"notes,omitempty"`
		EntryDate string  `json:"entryDate"`
	}
}

type UpdateTargetLogOutput struct {
	Body struct {
		Data target.TargetLogResponse `json:"data" doc:"Updated target log"`
	}
}

func (h *TargetHandler) UpdateTargetLog(ctx context.Context, input *UpdateTargetLogInput) (*UpdateTargetLogOutput, error) {
	userID, err := middleware.GetContextUserID(ctx)
	if err != nil {
		return nil, err
	}

	logID, err := strconv.ParseInt(input.LogID, 10, 64)
	if err != nil {
		return nil, huma.Error400BadRequest("Invalid log ID")
	}

	err = h.targetService.UpdateTargetLog(ctx, int64(userID), target.UpdateTargetLogInput{
		TargetLogID: logID,
		Amount:      input.Body.Amount,
		Notes:       input.Body.Notes,
		EntryDate:   input.Body.EntryDate,
	})
	if err != nil {
		return nil, huma.Error400BadRequest(err.Error())
	}

	updatedLog, err := h.targetService.GetTargetLogByID(ctx, logID, int64(userID))
	if err != nil {
		return nil, huma.Error404NotFound("Target log not found")
	}

	resp := &UpdateTargetLogOutput{}
	resp.Body.Data = *updatedLog
	return resp, nil
}

type DeleteTargetLogInput struct {
	TargetID string `path:"targetId" doc:"Target ID"`
	LogID    string `path:"logId" doc:"Log ID"`
}

func (h *TargetHandler) DeleteTargetLog(ctx context.Context, input *DeleteTargetLogInput) (*struct{}, error) {
	userID, err := middleware.GetContextUserID(ctx)
	if err != nil {
		return nil, err
	}

	logID, err := strconv.ParseInt(input.LogID, 10, 64)
	if err != nil {
		return nil, huma.Error400BadRequest("Invalid log ID")
	}

	err = h.targetService.DeleteTargetLog(ctx, logID, int64(userID))
	if err != nil {
		return nil, huma.Error400BadRequest(err.Error())
	}

	return nil, nil
}
