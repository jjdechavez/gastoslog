package target

import (
	"context"
	"errors"
	"gastoslog/internal/database"
	"gastoslog/internal/validation"
	"time"

	"github.com/guregu/null/v6"
)

type Service struct {
	targetRepo    database.TargetRepository
	targetLogRepo database.TargetLogRepository
}

type TargetResponse struct {
	ID           int64      `json:"id"`
	Name         string     `json:"name"`
	TargetAmount int64      `json:"targetAmount"`
	Type         string     `json:"type"`
	Direction    string     `json:"direction"`
	Status       string     `json:"status"`
	DeadlineAt   *time.Time `json:"deadlineAt,omitempty"`
	CreatedAt    time.Time  `json:"createdAt"`
	UpdatedAt    time.Time  `json:"updatedAt"`
}

type TargetLogResponse struct {
	ID        int64     `json:"id"`
	TargetID  int64     `json:"targetId"`
	Amount    int64     `json:"amount"`
	Notes     string    `json:"notes,omitempty"`
	EntryDate time.Time `json:"entryDate"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

type CreateTargetInput struct {
	Name         string  `json:"name" minLength:"3" maxLength:"255"`
	TargetAmount float64 `json:"targetAmount" required:"true"`
	Type         string  `json:"type" required:"true" enum:"savings,debt,loan"`
	Direction    string  `json:"direction" required:"true" enum:"inbound,outbound"`
	DeadlineAt   string  `json:"deadlineAt"`
}

type UpdateTargetInput struct {
	TargetID     int64   `json:"targetId" required:"true"`
	Name         string  `json:"name"`
	TargetAmount float64 `json:"targetAmount"`
	Type         string  `json:"type" required:"true" enum:"savings,debt,loan"`
	Direction    string  `json:"direction" required:"true" enum:"inbound,outbound"`
	Status       string  `json:"status"`
	DeadlineAt   string  `json:"deadlineAt"`
}

type CreateTargetLogInput struct {
	TargetID  int64   `json:"targetId" required:"true"`
	Amount    float64 `json:"amount" required:"true"`
	Notes     string  `json:"notes"`
	EntryDate string  `json:"entryDate" required:"true"`
}

type UpdateTargetLogInput struct {
	TargetLogID int64   `json:"targetLogId" required:"true"`
	Amount      float64 `json:"amount"`
	Notes       string  `json:"notes"`
	EntryDate   string  `json:"entryDate"`
}

func NewService(targetRepo database.TargetRepository, targetLogRepo database.TargetLogRepository) *Service {
	return &Service{
		targetRepo:    targetRepo,
		targetLogRepo: targetLogRepo,
	}
}

func (s *Service) CreateTarget(ctx context.Context, userID int64, input CreateTargetInput) (*TargetResponse, error) {
	amount := int64(input.TargetAmount * 100)

	parsedDeadline := null.NewTime(time.Time{}, false)
	if input.DeadlineAt != "" {
		t, err := time.Parse(time.RFC3339, input.DeadlineAt)
		if err != nil {
			return nil, validation.NewFieldError("deadlineAt", "invalid deadline, expected RFC3339 date-time", input.DeadlineAt)
		}
		parsedDeadline = null.NewTime(t, true)
	}

	newTarget, err := s.targetRepo.Create(ctx, database.NewTargetInput{
		UserID:       userID,
		Name:         input.Name,
		TargetAmount: amount,
		Type:         database.TargetType(input.Type),
		Direction:    database.TargetDirection(input.Direction),
		DeadlineAt:   parsedDeadline,
	})
	if err != nil {
		return nil, err
	}

	return toTargetResponse(newTarget), nil
}

func (s *Service) GetTargetByID(ctx context.Context, targetID, userID int64) (*TargetResponse, error) {
	exists, err := s.targetRepo.ExistWithUserID(ctx, database.ExistTargetWithUserIDInput{
		UserID:   userID,
		TargetID: targetID,
	})
	if err != nil {
		return nil, err
	}
	if !exists {
		return nil, errors.New("target not found")
	}

	rawTarget, err := s.targetRepo.GetByID(ctx, targetID)
	if err != nil {
		return nil, err
	}

	return toRawTargetResponse(rawTarget), nil
}

func (s *Service) UpdateTarget(ctx context.Context, userID int64, input UpdateTargetInput) error {
	exists, err := s.targetRepo.ExistWithUserID(ctx, database.ExistTargetWithUserIDInput{
		UserID:   userID,
		TargetID: input.TargetID,
	})
	if err != nil {
		return err
	}
	if !exists {
		return errors.New("target not found")
	}

	parsedDeadline := null.NewTime(time.Time{}, false)
	if input.DeadlineAt != "" {
		t, err := time.Parse(time.RFC3339, input.DeadlineAt)
		if err != nil {
			return validation.NewFieldError("deadlineAt", "invalid deadline, expected RFC3339 date-time", input.DeadlineAt)
		}
		parsedDeadline = null.NewTime(t, true)
	}

	err = s.targetRepo.Update(ctx, database.UpdateTargetInput{
		TargetID:     input.TargetID,
		UserID:       userID,
		Name:         input.Name,
		TargetAmount: int64(input.TargetAmount * 100),
		Type:         database.TargetType(input.Type),
		Direction:    database.TargetDirection(input.Direction),
		Status:       database.TargetStatus(input.Status),
		DeadlineAt:   parsedDeadline,
	})
	if err != nil {
		return err
	}

	return nil
}

func (s *Service) DeleteTarget(ctx context.Context, targetID, userID int64) error {
	exists, err := s.targetRepo.ExistWithUserID(ctx, database.ExistTargetWithUserIDInput{
		UserID:   userID,
		TargetID: targetID,
	})
	if err != nil {
		return err
	}
	if !exists {
		return errors.New("target not found")
	}

	err = s.targetRepo.Delete(ctx, targetID)
	if err != nil {
		return err
	}

	return nil
}

type ListTargetQs struct {
	Status    *string
	Direction *string
}

func (s *Service) ListTargets(ctx context.Context, userID int64, page, limit int, qs ListTargetQs) ([]TargetResponse, error) {
	rawTargets, err := s.targetRepo.List(ctx, database.ListTargetInput{
		UserID:    userID,
		Page:      page,
		Limit:     limit,
		Status:    qs.Status,
		Direction: qs.Direction,
	})
	if err != nil {
		return nil, err
	}

	targets := make([]TargetResponse, len(rawTargets))
	for i, raw := range rawTargets {
		rt := toRawTargetResponse(&raw)
		targets[i] = *rt
	}

	return targets, nil
}

func (s *Service) CreateTargetLog(ctx context.Context, userID int64, input CreateTargetLogInput) (*TargetLogResponse, error) {
	exists, err := s.targetRepo.ExistWithUserID(ctx, database.ExistTargetWithUserIDInput{
		UserID:   userID,
		TargetID: input.TargetID,
	})
	if err != nil {
		return nil, err
	}
	if !exists {
		return nil, errors.New("target not found")
	}

	if input.Amount <= 0 {
		return nil, validation.NewFieldError("amount", "amount must be greater than zero", input.Amount)
	}

	entryDate, err := time.Parse(time.RFC3339, input.EntryDate)
	if err != nil {
		return nil, validation.NewFieldError("entryDate", "invalid entry date, expected RFC3339 date-time", input.EntryDate)
	}

	notes := null.NewString(input.Notes, input.Notes != "")

	targetLog, err := s.targetLogRepo.Create(ctx, database.NewTargetLogInput{
		UserID:    userID,
		TargetID:  input.TargetID,
		Amount:    input.Amount,
		Notes:     notes,
		EntryDate: entryDate,
	})
	if err != nil {
		return nil, err
	}

	return toTargetLogResponse(targetLog), nil
}

func (s *Service) GetTargetLogByID(ctx context.Context, logID, userID int64) (*TargetLogResponse, error) {
	exists, err := s.targetLogRepo.ExistWithUserID(ctx, database.ExistTargetLogWithUserIDInput{
		UserID:      userID,
		TargetLogID: logID,
	})
	if err != nil {
		return nil, err
	}
	if !exists {
		return nil, errors.New("target log not found")
	}

	rawTargetLog, err := s.targetLogRepo.GetByID(ctx, logID)
	if err != nil {
		return nil, err
	}

	return toRawTargetLogResponse(rawTargetLog), nil
}

func (s *Service) ListTargetLogs(ctx context.Context, targetID, userID int64, page, limit int) ([]TargetLogResponse, error) {
	exists, err := s.targetRepo.ExistWithUserID(ctx, database.ExistTargetWithUserIDInput{
		UserID:   userID,
		TargetID: targetID,
	})
	if err != nil {
		return nil, err
	}
	if !exists {
		return nil, errors.New("target not found")
	}

	rawTargetLogs, err := s.targetLogRepo.List(ctx, database.ListTargetLogInput{
		UserID: userID,
		Page:   page,
		Limit:  limit,
	})
	if err != nil {
		return nil, err
	}

	targetLogs := make([]TargetLogResponse, len(rawTargetLogs))
	for i, raw := range rawTargetLogs {
		rtl := toRawTargetLogResponse(&raw)
		targetLogs[i] = *rtl
	}

	return targetLogs, nil
}

func (s *Service) UpdateTargetLog(ctx context.Context, userID int64, input UpdateTargetLogInput) error {
	exists, err := s.targetLogRepo.ExistWithUserID(ctx, database.ExistTargetLogWithUserIDInput{
		UserID:      userID,
		TargetLogID: input.TargetLogID,
	})
	if err != nil {
		return err
	}
	if !exists {
		return errors.New("target log not found")
	}

	if input.Amount <= 0 {
		return validation.NewFieldError("amount", "amount must be greater than zero", input.Amount)
	}

	entryDate, err := time.Parse(time.RFC3339, input.EntryDate)
	if err != nil {
		return validation.NewFieldError("entryDate", "invalid entry date, expected RFC3339 date-time", input.EntryDate)
	}

	notes := null.NewString(input.Notes, input.Notes != "")

	err = s.targetLogRepo.Update(ctx, database.UpdateTargetLogInput{
		TargetLogID: input.TargetLogID,
		UserID:      userID,
		Amount:      input.Amount,
		Notes:       notes,
		EntryDate:   entryDate,
	})
	if err != nil {
		return err
	}

	return nil
}

func (s *Service) DeleteTargetLog(ctx context.Context, logID, userID int64) error {
	exists, err := s.targetLogRepo.ExistWithUserID(ctx, database.ExistTargetLogWithUserIDInput{
		UserID:      userID,
		TargetLogID: logID,
	})
	if err != nil {
		return err
	}
	if !exists {
		return errors.New("target log not found")
	}

	err = s.targetLogRepo.Delete(ctx, logID)
	if err != nil {
		return err
	}

	return nil
}

func toTargetResponse(target *database.Target) *TargetResponse {
	resp := &TargetResponse{
		ID:           target.ID,
		Name:         target.Name,
		TargetAmount: target.TargetAmount,
		Type:         string(target.Type),
		Direction:    string(target.Direction),
		Status:       string(target.Status),
		CreatedAt:    target.CreatedAt,
		UpdatedAt:    target.UpdatedAt,
	}
	if target.DeadlineAt.Valid {
		resp.DeadlineAt = &target.DeadlineAt.Time
	}
	return resp
}

func toRawTargetResponse(target *database.RawTarget) *TargetResponse {
	resp := &TargetResponse{
		ID:           target.ID,
		Name:         target.Name,
		TargetAmount: target.TargetAmount,
		Type:         string(target.Type),
		Direction:    string(target.Direction),
		Status:       string(target.Status),
		CreatedAt:    target.CreatedAt,
		UpdatedAt:    target.UpdatedAt,
	}
	if target.DeadlineAt.Valid {
		resp.DeadlineAt = &target.DeadlineAt.Time
	}
	return resp
}

func toTargetLogResponse(targetLog *database.TargetLog) *TargetLogResponse {
	return &TargetLogResponse{
		ID:        targetLog.ID,
		TargetID:  targetLog.TargetID,
		Amount:    targetLog.Amount,
		Notes:     targetLog.Notes,
		EntryDate: targetLog.EntryDate,
		CreatedAt: targetLog.CreatedAt,
		UpdatedAt: targetLog.UpdatedAt,
	}
}

func toRawTargetLogResponse(targetLog *database.RawTargetLog) *TargetLogResponse {
	return &TargetLogResponse{
		ID:        targetLog.ID,
		TargetID:  targetLog.TargetID,
		Amount:    targetLog.Amount,
		Notes:     targetLog.Notes,
		EntryDate: targetLog.EntryDate,
		CreatedAt: targetLog.CreatedAt,
		UpdatedAt: targetLog.UpdatedAt,
	}
}
