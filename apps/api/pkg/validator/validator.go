package validator

import (
	"reflect"
	"strings"

	"github.com/go-playground/validator/v10"
)

var validate *validator.Validate

func init() {
	validate = validator.New()

	// Use JSON tag names for error messages
	validate.RegisterTagNameFunc(func(fld reflect.StructField) string {
		name := strings.SplitN(fld.Tag.Get("json"), ",", 2)[0]
		if name == "-" {
			return ""
		}
		return name
	})
}

// Validate validates a struct based on validate tags.
func Validate(s interface{}) error {
	return validate.Struct(s)
}

// FormatErrors converts validation errors to a map of field names to error messages.
func FormatErrors(err error) map[string]string {
	if err == nil {
		return nil
	}

	errors := make(map[string]string)

	if validationErrors, ok := err.(validator.ValidationErrors); ok {
		for _, e := range validationErrors {
			field := e.Field()
			errors[field] = formatError(e)
		}
	}

	return errors
}

func formatError(e validator.FieldError) string {
	switch e.Tag() {
	case "required":
		return "This field is required"
	case "email":
		return "Must be a valid email address"
	case "min":
		return "Must be at least " + e.Param() + " characters"
	case "max":
		return "Must be at most " + e.Param() + " characters"
	case "oneof":
		return "Must be one of: " + e.Param()
	case "datetime":
		return "Must be a valid date in format: " + e.Param()
	case "uuid":
		return "Must be a valid UUID"
	default:
		return "Invalid value"
	}
}

// ValidateVar validates a single variable against a tag.
func ValidateVar(field interface{}, tag string) error {
	return validate.Var(field, tag)
}
