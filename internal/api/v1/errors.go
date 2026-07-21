package v1

import (
	"errors"
	"gastoslog/internal/validation"

	"github.com/danielgtaylor/huma/v2"
)

// mapServiceError translates a service-layer error into a huma error. A
// *validation.FieldError becomes a field-scoped 422; anything else falls
// back to a flat 400.
func mapServiceError(err error) error {
	var fieldErr *validation.FieldError
	if errors.As(err, &fieldErr) {
		return huma.Error422UnprocessableEntity("Validation failed", fieldErr)
	}
	return huma.Error400BadRequest(err.Error())
}
