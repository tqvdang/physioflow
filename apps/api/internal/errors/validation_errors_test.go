package errors

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestValidationError_Error(t *testing.T) {
	err := NewValidationError("TEST_CODE", "test message", "thong bao test")

	assert.Equal(t, "test message", err.Error())
	assert.Equal(t, "TEST_CODE", err.Code)
	assert.Equal(t, "thong bao test", err.MessageVi)
}

func TestNewValidationErrorf(t *testing.T) {
	err := NewValidationErrorf("TEST_CODE", "score %.1f is invalid", "diem %.1f khong hop le", 5.5)

	assert.Equal(t, "score 5.5 is invalid", err.Error())
	assert.Equal(t, "diem 5.5 khong hop le", err.MessageVi)
}

func TestIsValidationError(t *testing.T) {
	ve := NewValidationError("CODE", "msg", "msg_vi")
	assert.True(t, IsValidationError(ve))

	regular := assert.AnError
	assert.False(t, IsValidationError(regular))
}

func TestAsValidationError(t *testing.T) {
	ve := NewValidationError("CODE", "msg", "msg_vi")
	result := AsValidationError(ve)
	assert.NotNil(t, result)
	assert.Equal(t, "CODE", result.Code)

	regular := assert.AnError
	assert.Nil(t, AsValidationError(regular))
}

func TestAllErrorsHaveCodesAndMessages(t *testing.T) {
	errors := []*ValidationError{
		ErrDuplicateCardNumber,
		ErrChildCopayExemption,
		ErrFiveYearBonusIneligible,
		ErrHospitalRegistrationMismatch,
		ErrInvalidScoreRange,
		ErrBaselineRequired,
		ErrReassessmentTooSoon,
		ErrTargetScoreUnrealistic,
		ErrMeasureTypeConditionMismatch,
		ErrMCIDNotMet,
		ErrInvalidQuantity,
		ErrInvalidUnitPrice,
		ErrPaymentExceedsBalance,
		ErrInvoiceNoLineItems,
		ErrServiceCodeInactive,
		ErrOverpaymentCredit,
		ErrProtocolDurationInvalid,
		ErrProtocolFrequencyInvalid,
		ErrProtocolEligibility,
		ErrExerciseContraindication,
		ErrProgressionCriteriaNotMet,
		ErrHEPExerciseCount,
		ErrDischargeDateBeforeAdmission,
		ErrMinimumTreatmentDuration,
		ErrDischargeCriteriaNotMet,
		ErrFollowUpRequired,
		ErrROMOutOfRange,
		ErrInvalidVietnameseName,
		ErrInvalidVietnamesePhone,
	}

	for _, err := range errors {
		t.Run(err.Code, func(t *testing.T) {
			assert.NotEmpty(t, err.Code, "error code should not be empty")
			assert.NotEmpty(t, err.Message, "English message should not be empty")
			assert.NotEmpty(t, err.MessageVi, "Vietnamese message should not be empty")
			assert.NotEmpty(t, err.Error(), "Error() should return non-empty string")
		})
	}
}
