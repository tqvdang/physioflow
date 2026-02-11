package errors

import "fmt"

// ValidationError represents a structured validation error with a code, English message, and Vietnamese message.
type ValidationError struct {
	Code      string
	Message   string
	MessageVi string
}

func (e *ValidationError) Error() string {
	return e.Message
}

// NewValidationError creates a new ValidationError.
func NewValidationError(code, message, messageVi string) *ValidationError {
	return &ValidationError{
		Code:      code,
		Message:   message,
		MessageVi: messageVi,
	}
}

// NewValidationErrorf creates a new ValidationError with formatted messages.
func NewValidationErrorf(code, message, messageVi string, args ...interface{}) *ValidationError {
	return &ValidationError{
		Code:      code,
		Message:   fmt.Sprintf(message, args...),
		MessageVi: fmt.Sprintf(messageVi, args...),
	}
}

// IsValidationError checks whether an error is a ValidationError.
func IsValidationError(err error) bool {
	_, ok := err.(*ValidationError)
	return ok
}

// AsValidationError extracts a ValidationError from an error, returning nil if it is not one.
func AsValidationError(err error) *ValidationError {
	ve, ok := err.(*ValidationError)
	if ok {
		return ve
	}
	return nil
}

// --- Insurance validation errors ---

var (
	ErrDuplicateCardNumber = &ValidationError{
		Code:      "INSURANCE_DUPLICATE_CARD",
		Message:   "this BHYT card number is already registered to another patient",
		MessageVi: "So the BHYT nay da duoc dang ky cho benh nhan khac",
	}
	ErrChildCopayExemption = &ValidationError{
		Code:      "INSURANCE_CHILD_COPAY",
		Message:   "children under 6 years old are exempt from co-payment (copay must be 0)",
		MessageVi: "Tre em duoi 6 tuoi duoc mien dong chi tra (dong chi tra phai bang 0)",
	}
	ErrFiveYearBonusIneligible = &ValidationError{
		Code:      "INSURANCE_FIVE_YEAR_BONUS",
		Message:   "five-year continuous enrollment bonus requires card age >= 5 years",
		MessageVi: "Thuong 5 nam lien tuc yeu cau tuoi the >= 5 nam",
	}
	ErrHospitalRegistrationMismatch = &ValidationError{
		Code:      "INSURANCE_HOSPITAL_MISMATCH",
		Message:   "hospital registration code does not match the clinic facility code",
		MessageVi: "Ma KCB ban dau khong khop voi ma co so kham chua benh",
	}
)

// --- Outcome measures validation errors ---

var (
	ErrInvalidScoreRange = &ValidationError{
		Code:      "OUTCOME_INVALID_SCORE_RANGE",
		Message:   "score is outside the valid range for this measure type",
		MessageVi: "Diem so nam ngoai pham vi hop le cua loai do luong nay",
	}
	ErrBaselineRequired = &ValidationError{
		Code:      "OUTCOME_BASELINE_REQUIRED",
		Message:   "a baseline measurement is required before recording interim or discharge scores",
		MessageVi: "Can co phep do ban dau truoc khi ghi nhan diem giua ky hoac xuat vien",
	}
	ErrReassessmentTooSoon = &ValidationError{
		Code:      "OUTCOME_REASSESSMENT_TOO_SOON",
		Message:   "minimum 2 weeks required between re-assessments of the same measure type",
		MessageVi: "Can toi thieu 2 tuan giua cac lan tai danh gia cung loai do luong",
	}
	ErrTargetScoreUnrealistic = &ValidationError{
		Code:      "OUTCOME_TARGET_UNREALISTIC",
		Message:   "target score exceeds the maximum possible score for this measure",
		MessageVi: "Diem muc tieu vuot qua diem toi da co the dat duoc cua do luong nay",
	}
	ErrMeasureTypeConditionMismatch = &ValidationError{
		Code:      "OUTCOME_MEASURE_CONDITION_MISMATCH",
		Message:   "measure type does not match the patient's condition or body region",
		MessageVi: "Loai do luong khong phu hop voi tinh trang hoac vung co the cua benh nhan",
	}
	ErrMCIDNotMet = &ValidationError{
		Code:      "OUTCOME_MCID_NOT_MET",
		Message:   "change does not meet the Minimal Clinically Important Difference threshold",
		MessageVi: "Thay doi khong dat nguong Khac biet Lam sang Toi thieu Quan trong",
	}
)

// --- Billing validation errors ---

var (
	ErrInvalidQuantity = &ValidationError{
		Code:      "BILLING_INVALID_QUANTITY",
		Message:   "invoice line item quantity must be greater than 0",
		MessageVi: "So luong muc hoa don phai lon hon 0",
	}
	ErrInvalidUnitPrice = &ValidationError{
		Code:      "BILLING_INVALID_UNIT_PRICE",
		Message:   "unit price must be greater than 0 VND",
		MessageVi: "Don gia phai lon hon 0 VND",
	}
	ErrPaymentExceedsBalance = &ValidationError{
		Code:      "BILLING_PAYMENT_EXCEEDS_BALANCE",
		Message:   "payment amount exceeds the invoice balance due",
		MessageVi: "So tien thanh toan vuot qua so du cua hoa don",
	}
	ErrInvoiceNoLineItems = &ValidationError{
		Code:      "BILLING_NO_LINE_ITEMS",
		Message:   "invoice must contain at least one line item",
		MessageVi: "Hoa don phai co it nhat mot muc",
	}
	ErrServiceCodeInactive = &ValidationError{
		Code:      "BILLING_SERVICE_CODE_INACTIVE",
		Message:   "service code is not active or has expired",
		MessageVi: "Ma dich vu khong con hieu luc hoac da het han",
	}
	ErrOverpaymentCredit = &ValidationError{
		Code:      "BILLING_OVERPAYMENT",
		Message:   "payment exceeds balance; overpayment will be applied as credit",
		MessageVi: "Thanh toan vuot qua so du; phan thua se duoc ghi nhan la credit",
	}
)

// --- Protocol validation errors ---

var (
	ErrProtocolDurationInvalid = &ValidationError{
		Code:      "PROTOCOL_DURATION_INVALID",
		Message:   "protocol duration must be between 4 and 12 weeks",
		MessageVi: "Thoi gian phac do phai tu 4 den 12 tuan",
	}
	ErrProtocolFrequencyInvalid = &ValidationError{
		Code:      "PROTOCOL_FREQUENCY_INVALID",
		Message:   "session frequency must be between 2 and 5 times per week",
		MessageVi: "Tan suat buoi tap phai tu 2 den 5 lan moi tuan",
	}
	ErrProtocolEligibility = &ValidationError{
		Code:      "PROTOCOL_ELIGIBILITY",
		Message:   "patient diagnosis does not match protocol eligibility criteria",
		MessageVi: "Chan doan benh nhan khong phu hop voi tieu chi phac do",
	}
	ErrExerciseContraindication = &ValidationError{
		Code:      "PROTOCOL_CONTRAINDICATION",
		Message:   "exercise is contraindicated for the patient's current condition",
		MessageVi: "Bai tap chong chi dinh voi tinh trang hien tai cua benh nhan",
	}
	ErrProgressionCriteriaNotMet = &ValidationError{
		Code:      "PROTOCOL_PROGRESSION_NOT_MET",
		Message:   "progression criteria have not been met for advancing to the next phase",
		MessageVi: "Chua dat tieu chi tien trien de chuyen sang giai doan tiep theo",
	}
	ErrHEPExerciseCount = &ValidationError{
		Code:      "PROTOCOL_HEP_EXERCISE_COUNT",
		Message:   "home exercise program should contain between 3 and 5 exercises",
		MessageVi: "Chuong trinh tap tai nha nen co tu 3 den 5 bai tap",
	}
)

// --- Discharge validation errors ---

var (
	ErrDischargeDateBeforeAdmission = &ValidationError{
		Code:      "DISCHARGE_DATE_BEFORE_ADMISSION",
		Message:   "discharge date must be on or after the admission date",
		MessageVi: "Ngay xuat vien phai bang hoac sau ngay nhap vien",
	}
	ErrMinimumTreatmentDuration = &ValidationError{
		Code:      "DISCHARGE_MIN_DURATION",
		Message:   "minimum treatment duration of 2 weeks has not been met",
		MessageVi: "Chua dat thoi gian dieu tri toi thieu 2 tuan",
	}
	ErrDischargeCriteriaNotMet = &ValidationError{
		Code:      "DISCHARGE_CRITERIA_NOT_MET",
		Message:   "discharge criteria have not been met (goals achieved, plateaued, or patient request required)",
		MessageVi: "Chua dat tieu chi xuat vien (can dat muc tieu, on dinh, hoac yeu cau cua benh nhan)",
	}
	ErrFollowUpRequired = &ValidationError{
		Code:      "DISCHARGE_FOLLOWUP_REQUIRED",
		Message:   "follow-up recommendations are required when treatment goals have not been fully met",
		MessageVi: "Can co khuyen nghi theo doi khi muc tieu dieu tri chua dat duoc day du",
	}
)

// --- Assessment validation errors ---

var (
	ErrROMOutOfRange = &ValidationError{
		Code:      "ASSESSMENT_ROM_OUT_OF_RANGE",
		Message:   "ROM value exceeds the maximum expected range for this joint",
		MessageVi: "Gia tri ROM vuot qua pham vi du kien toi da cua khop nay",
	}
)

// --- Patient validation errors ---

var (
	ErrInvalidVietnameseName = &ValidationError{
		Code:      "PATIENT_INVALID_VN_NAME",
		Message:   "patient name contains invalid characters; only Vietnamese alphabet characters and spaces are allowed",
		MessageVi: "Ten benh nhan chua ky tu khong hop le; chi cho phep chu cai tieng Viet va dau cach",
	}
	ErrInvalidVietnamesePhone = &ValidationError{
		Code:      "PATIENT_INVALID_VN_PHONE",
		Message:   "phone number must match Vietnamese format: start with 0 or +84, followed by 3/5/7/8/9, then 8 digits",
		MessageVi: "So dien thoai phai dung dinh dang Viet Nam: bat dau bang 0 hoac +84, tiep theo la 3/5/7/8/9, roi 8 chu so",
	}
)
