package validation

import "github.com/danielgtaylor/huma/v2"

// FieldError represents a business-rule validation failure tied to a single
// request body field. It implements huma.ErrorDetailer so passing it into
// huma.Error422UnprocessableEntity produces a field-scoped RFC 9457 error
// entry (location/message/value) instead of a flat message.
type FieldError struct {
	Field   string
	Message string
	Value   any
}

func NewFieldError(field, message string, value any) *FieldError {
	return &FieldError{Field: field, Message: message, Value: value}
}

func (e *FieldError) Error() string {
	return e.Message
}

func (e *FieldError) ErrorDetail() *huma.ErrorDetail {
	return &huma.ErrorDetail{
		Location: "body." + e.Field,
		Message:  e.Message,
		Value:    e.Value,
	}
}
