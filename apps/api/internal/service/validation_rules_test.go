package service

import (
	"testing"
	"time"

	"github.com/stretchr/testify/assert"

	valerr "github.com/tqvdang/physioflow/apps/api/internal/errors"
	"github.com/tqvdang/physioflow/apps/api/internal/model"
)

// =============================================================================
// Vietnamese Name Validation Tests
// =============================================================================

func TestIsValidVietnameseName(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		expected bool
	}{
		{"Simple Latin name", "Nguyen Van A", true},
		{"Vietnamese diacritics", "Nguyễn Văn Ả", true},
		{"Full Vietnamese name", "Trần Thị Hồng Phương", true},
		{"Vietnamese with d-bar", "Đặng Quốc Việt", true},
		{"All lowercase Vietnamese", "lê thị thu hằng", true},
		{"Single word", "Phúc", true},
		{"Empty string", "", false},
		{"Numbers in name", "Nguyen123", false},
		{"Special characters", "Nguyen @Van", false},
		{"Hyphen in name", "Nguyen-Van", false},
		{"Period in name", "Dr. Nguyen", false},
		{"Comma in name", "Last, First", false},
		{"Only spaces", "   ", false},
		{"Vietnamese with all tones", "ăắằẳẵặâấầẩẫậêếềểễệôốồổỗộơớờởỡợưứừửữự", true},
		{"Uppercase Vietnamese", "NGUYỄN VĂN A", true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := IsValidVietnameseName(tt.input)
			assert.Equal(t, tt.expected, result, "IsValidVietnameseName(%q)", tt.input)
		})
	}
}

// =============================================================================
// Vietnamese Phone Validation Tests
// =============================================================================

func TestIsValidVietnamesePhone(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		expected bool
	}{
		{"Valid 09x", "0912345678", true},
		{"Valid 03x", "0312345678", true},
		{"Valid 05x", "0512345678", true},
		{"Valid 07x", "0712345678", true},
		{"Valid 08x", "0812345678", true},
		{"Valid +84", "+84912345678", true},
		{"Valid +84 with 3", "+84312345678", true},
		{"Empty - optional", "", true},
		{"Too short", "091234567", false},
		{"Too long", "09123456789", false},
		{"Invalid start digit", "0112345678", false},
		{"Invalid country code", "+85912345678", false},
		{"Letters in number", "091234567a", false},
		{"With dashes (before normalize)", "091-234-5678", false},
		{"Starts with 02", "0212345678", false},
		{"Starts with 04", "0412345678", false},
		{"Starts with 06", "0612345678", false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := IsValidVietnamesePhone(tt.input)
			assert.Equal(t, tt.expected, result, "IsValidVietnamesePhone(%q)", tt.input)
		})
	}
}

// =============================================================================
// Outcome Measures Score Range Validation Tests
// =============================================================================

func TestValidateScoreRange(t *testing.T) {
	tests := []struct {
		name        string
		measureType model.MeasureType
		score       float64
		expectError bool
	}{
		// VAS: 0-10
		{"VAS valid low", model.MeasureTypeVAS, 0, false},
		{"VAS valid mid", model.MeasureTypeVAS, 5, false},
		{"VAS valid high", model.MeasureTypeVAS, 10, false},
		{"VAS too high", model.MeasureTypeVAS, 11, true},
		{"VAS negative", model.MeasureTypeVAS, -1, true},

		// NDI: 0-100
		{"NDI valid", model.MeasureTypeNDI, 50, false},
		{"NDI too high", model.MeasureTypeNDI, 101, true},

		// ODI: 0-100
		{"ODI valid", model.MeasureTypeODI, 75, false},
		{"ODI too high", model.MeasureTypeODI, 150, true},

		// LEFS: 0-80
		{"LEFS valid", model.MeasureTypeLEFS, 40, false},
		{"LEFS max", model.MeasureTypeLEFS, 80, false},
		{"LEFS too high", model.MeasureTypeLEFS, 81, true},

		// DASH: 0-100
		{"DASH valid", model.MeasureTypeDASH, 50, false},
		{"DASH too high", model.MeasureTypeDASH, 101, true},

		// BBS: 0-56
		{"BBS valid", model.MeasureTypeBBS, 30, false},
		{"BBS max", model.MeasureTypeBBS, 56, false},
		{"BBS too high", model.MeasureTypeBBS, 57, true},

		// FIM: 18-126
		{"FIM valid", model.MeasureTypeFIM, 72, false},
		{"FIM too low", model.MeasureTypeFIM, 17, true},
		{"FIM too high", model.MeasureTypeFIM, 127, true},

		// Custom: any score allowed
		{"Custom any score", model.MeasureTypeCustom, 999, false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := ValidateScoreRange(tt.measureType, tt.score)
			if tt.expectError {
				assert.Error(t, err)
				assert.True(t, valerr.IsValidationError(err))
			} else {
				assert.NoError(t, err)
			}
		})
	}
}

// =============================================================================
// MCID Threshold Validation Tests
// =============================================================================

func TestValidateMCIDThreshold(t *testing.T) {
	tests := []struct {
		name        string
		measureType model.MeasureType
		change      float64
		expected    bool
		expectError bool
	}{
		// VAS MCID = 2.0
		{"VAS meets MCID (positive)", model.MeasureTypeVAS, 2.0, true, false},
		{"VAS meets MCID (negative)", model.MeasureTypeVAS, -2.5, true, false},
		{"VAS does not meet MCID", model.MeasureTypeVAS, 1.5, false, false},
		{"VAS zero change", model.MeasureTypeVAS, 0, false, false},

		// NDI MCID = 10.0
		{"NDI meets MCID", model.MeasureTypeNDI, 12.0, true, false},
		{"NDI does not meet MCID", model.MeasureTypeNDI, 8.0, false, false},

		// ODI MCID = 10.0
		{"ODI meets MCID", model.MeasureTypeODI, -15.0, true, false},

		// LEFS MCID = 9.0
		{"LEFS meets MCID", model.MeasureTypeLEFS, 9.0, true, false},
		{"LEFS does not meet MCID", model.MeasureTypeLEFS, 5.0, false, false},

		// DASH MCID = 10.0
		{"DASH meets MCID", model.MeasureTypeDASH, 10.0, true, false},

		// Unknown type
		{"Unknown type", model.MeasureTypeCustom, 5.0, false, true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := ValidateMCIDThreshold(tt.measureType, tt.change)
			if tt.expectError {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
				assert.Equal(t, tt.expected, result)
			}
		})
	}
}

// =============================================================================
// Measure Type for Condition Matching Tests
// =============================================================================

func TestValidateMeasureTypeForCondition(t *testing.T) {
	tests := []struct {
		name        string
		measureType model.MeasureType
		bodyRegion  string
		expected    bool
	}{
		// NDI: cervical/neck
		{"NDI with cervical_spine", model.MeasureTypeNDI, "cervical_spine", true},
		{"NDI with neck", model.MeasureTypeNDI, "neck", true},
		{"NDI with knee (mismatch)", model.MeasureTypeNDI, "knee", false},

		// ODI: lumbar/lower_back
		{"ODI with lumbar_spine", model.MeasureTypeODI, "lumbar_spine", true},
		{"ODI with lower_back", model.MeasureTypeODI, "lower_back", true},
		{"ODI with shoulder (mismatch)", model.MeasureTypeODI, "shoulder", false},

		// DASH: upper extremity
		{"DASH with shoulder", model.MeasureTypeDASH, "shoulder", true},
		{"DASH with wrist", model.MeasureTypeDASH, "wrist", true},
		{"DASH with knee (mismatch)", model.MeasureTypeDASH, "knee", false},

		// LEFS: lower extremity
		{"LEFS with hip", model.MeasureTypeLEFS, "hip", true},
		{"LEFS with ankle", model.MeasureTypeLEFS, "ankle", true},
		{"LEFS with shoulder (mismatch)", model.MeasureTypeLEFS, "shoulder", false},

		// KOOS: knee
		{"KOOS with knee", model.MeasureTypeKOOS, "knee", true},
		{"KOOS with hip (mismatch)", model.MeasureTypeKOOS, "hip", false},

		// Global measures: apply to all
		{"VAS with any region", model.MeasureTypeVAS, "knee", true},
		{"NRS with any region", model.MeasureTypeNRS, "shoulder", true},
		{"SF36 with any region", model.MeasureTypeSF36, "hip", true},
		{"BBS with any region", model.MeasureTypeBBS, "ankle", true},

		// Empty body region: allow any
		{"NDI with empty region", model.MeasureTypeNDI, "", true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := ValidateMeasureTypeForCondition(tt.measureType, tt.bodyRegion)
			assert.Equal(t, tt.expected, result)
		})
	}
}

// =============================================================================
// ROM Joint-Specific Validation Tests
// =============================================================================

func TestROMJointSpecificMaxDegrees(t *testing.T) {
	tests := []struct {
		name      string
		joint     model.ROMJoint
		degree    float64
		tooHigh   bool
	}{
		// Shoulder: max 200
		{"Shoulder normal", model.ROMJointShoulder, 180, false},
		{"Shoulder hypermobile", model.ROMJointShoulder, 195, false},
		{"Shoulder exceeds max", model.ROMJointShoulder, 201, true},

		// Elbow: max 160
		{"Elbow normal", model.ROMJointElbow, 150, false},
		{"Elbow exceeds max", model.ROMJointElbow, 161, true},

		// Wrist: max 100
		{"Wrist normal", model.ROMJointWrist, 80, false},
		{"Wrist exceeds max", model.ROMJointWrist, 101, true},

		// Hip: max 140
		{"Hip normal", model.ROMJointHip, 120, false},
		{"Hip exceeds max", model.ROMJointHip, 141, true},

		// Knee: max 150
		{"Knee normal", model.ROMJointKnee, 135, false},
		{"Knee exceeds max", model.ROMJointKnee, 151, true},

		// Ankle: max 70
		{"Ankle normal", model.ROMJointAnkle, 50, false},
		{"Ankle exceeds max", model.ROMJointAnkle, 71, true},

		// Cervical spine: max 100
		{"Cervical normal", model.ROMJointCervicalSpine, 80, false},
		{"Cervical exceeds max", model.ROMJointCervicalSpine, 101, true},

		// Thoracic spine: max 60
		{"Thoracic normal", model.ROMJointThoracicSpine, 40, false},
		{"Thoracic exceeds max", model.ROMJointThoracicSpine, 61, true},

		// Lumbar spine: max 80
		{"Lumbar normal", model.ROMJointLumbarSpine, 60, false},
		{"Lumbar exceeds max", model.ROMJointLumbarSpine, 81, true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			maxDegree, exists := jointSpecificMaxDegrees[tt.joint]
			assert.True(t, exists, "joint %s should have a max degree defined", tt.joint)
			exceeded := tt.degree > maxDegree
			assert.Equal(t, tt.tooHigh, exceeded)
		})
	}
}

// =============================================================================
// Insurance Validation Tests
// =============================================================================

func TestAgeOnDate(t *testing.T) {
	tests := []struct {
		name      string
		birthDate time.Time
		refDate   time.Time
		expected  int
	}{
		{
			"Age 5 exactly",
			time.Date(2021, 2, 11, 0, 0, 0, 0, time.UTC),
			time.Date(2026, 2, 11, 0, 0, 0, 0, time.UTC),
			5,
		},
		{
			"Age 4 (day before birthday)",
			time.Date(2021, 2, 12, 0, 0, 0, 0, time.UTC),
			time.Date(2026, 2, 11, 0, 0, 0, 0, time.UTC),
			4,
		},
		{
			"Child under 6",
			time.Date(2021, 6, 15, 0, 0, 0, 0, time.UTC),
			time.Date(2026, 2, 11, 0, 0, 0, 0, time.UTC),
			4,
		},
		{
			"Exactly 6",
			time.Date(2020, 1, 1, 0, 0, 0, 0, time.UTC),
			time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC),
			6,
		},
		{
			"Newborn",
			time.Date(2026, 2, 10, 0, 0, 0, 0, time.UTC),
			time.Date(2026, 2, 11, 0, 0, 0, 0, time.UTC),
			0,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			age := ageOnDate(tt.birthDate, tt.refDate)
			assert.Equal(t, tt.expected, age)
		})
	}
}

func TestIsChildUnder6CopayExempt(t *testing.T) {
	// Child born 3 years ago - should be exempt
	child := time.Now().AddDate(-3, 0, 0)
	assert.True(t, IsChildUnder6CopayExempt(child))

	// Child born 6 years ago - should NOT be exempt
	older := time.Now().AddDate(-6, 0, 0)
	assert.False(t, IsChildUnder6CopayExempt(older))

	// Newborn - should be exempt
	newborn := time.Now()
	assert.True(t, IsChildUnder6CopayExempt(newborn))
}

// =============================================================================
// Protocol Validation Tests
// =============================================================================

func TestValidateProtocolEligibility(t *testing.T) {
	tests := []struct {
		name      string
		diagnoses []string
		patientDx string
		expected  bool
	}{
		{
			"No restrictions",
			[]string{},
			"any diagnosis",
			true,
		},
		{
			"Matching diagnosis",
			[]string{"stroke", "TBI"},
			"Post-Stroke rehabilitation",
			true,
		},
		{
			"Non-matching diagnosis",
			[]string{"stroke", "TBI"},
			"Lower back pain",
			false,
		},
		{
			"Case insensitive match",
			[]string{"ACL reconstruction"},
			"post acl reconstruction",
			true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			protocol := &model.ClinicalProtocolDB{
				ApplicableDiagnoses: tt.diagnoses,
			}
			result := ValidateProtocolEligibility(protocol, tt.patientDx)
			assert.Equal(t, tt.expected, result)
		})
	}
}

func TestCheckExerciseContraindications(t *testing.T) {
	tests := []struct {
		name       string
		condition  string
		exercises  []string
		hasWarning bool
	}{
		{
			"No contraindication",
			"lower back pain",
			[]string{"hip flexor stretch", "hamstring curl"},
			false,
		},
		{
			"Rotator cuff - shoulder abduction",
			"acute rotator cuff tear",
			[]string{"shoulder abduction", "bicep curl"},
			true,
		},
		{
			"Disc herniation - trunk flexion",
			"acute disc herniation",
			[]string{"trunk flexion", "planks"},
			true,
		},
		{
			"ACL reconstruction - deep squat",
			"post ACL reconstruction",
			[]string{"hamstring curl", "deep squat"},
			true,
		},
		{
			"Unrelated condition",
			"wrist sprain",
			[]string{"shoulder abduction"},
			false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			warnings := CheckExerciseContraindications(tt.condition, tt.exercises)
			if tt.hasWarning {
				assert.NotEmpty(t, warnings, "expected contraindication warnings")
			} else {
				assert.Empty(t, warnings, "expected no contraindication warnings")
			}
		})
	}
}

func TestPhaseProgressionValidation(t *testing.T) {
	svc := &protocolService{}

	protocol := &model.ClinicalProtocolDB{
		FrequencyPerWeek: 3,
		ProgressionCriteria: model.ProgressionCriteriaJSON{
			PhaseTransitions: []model.PhaseTransition{
				{FromPhase: "initial", ToPhase: "intermediate", TypicalWeek: 4},
				{FromPhase: "intermediate", ToPhase: "advanced", TypicalWeek: 8},
			},
		},
	}

	tests := []struct {
		name      string
		current   string
		newPhase  string
		sessions  int
		expected  bool
	}{
		{"Valid progression with enough sessions", "initial", "intermediate", 8, true},
		{"Progression with zero sessions", "initial", "intermediate", 0, false},
		{"Skip phase (initial -> advanced)", "initial", "advanced", 20, false},
		{"Same phase", "initial", "initial", 0, true},
		{"Unknown phases", "custom_a", "custom_b", 5, true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := svc.isPhaseProgressionValid(tt.current, tt.newPhase, tt.sessions, protocol)
			assert.Equal(t, tt.expected, result)
		})
	}
}

// =============================================================================
// Billing Validation Constants Tests
// =============================================================================

func TestBillingValidationErrors(t *testing.T) {
	// Verify all billing validation error types exist with proper codes
	assert.NotNil(t, valerr.ErrInvalidQuantity)
	assert.Equal(t, "BILLING_INVALID_QUANTITY", valerr.ErrInvalidQuantity.Code)

	assert.NotNil(t, valerr.ErrInvalidUnitPrice)
	assert.Equal(t, "BILLING_INVALID_UNIT_PRICE", valerr.ErrInvalidUnitPrice.Code)

	assert.NotNil(t, valerr.ErrPaymentExceedsBalance)
	assert.Equal(t, "BILLING_PAYMENT_EXCEEDS_BALANCE", valerr.ErrPaymentExceedsBalance.Code)

	assert.NotNil(t, valerr.ErrInvoiceNoLineItems)
	assert.Equal(t, "BILLING_NO_LINE_ITEMS", valerr.ErrInvoiceNoLineItems.Code)

	assert.NotNil(t, valerr.ErrServiceCodeInactive)
	assert.Equal(t, "BILLING_SERVICE_CODE_INACTIVE", valerr.ErrServiceCodeInactive.Code)

	assert.NotNil(t, valerr.ErrOverpaymentCredit)
	assert.Equal(t, "BILLING_OVERPAYMENT", valerr.ErrOverpaymentCredit.Code)
}

// =============================================================================
// Discharge Validation Constants Tests
// =============================================================================

func TestDischargeValidationErrors(t *testing.T) {
	assert.NotNil(t, valerr.ErrDischargeDateBeforeAdmission)
	assert.Equal(t, "DISCHARGE_DATE_BEFORE_ADMISSION", valerr.ErrDischargeDateBeforeAdmission.Code)

	assert.NotNil(t, valerr.ErrMinimumTreatmentDuration)
	assert.Equal(t, "DISCHARGE_MIN_DURATION", valerr.ErrMinimumTreatmentDuration.Code)

	assert.NotNil(t, valerr.ErrDischargeCriteriaNotMet)
	assert.Equal(t, "DISCHARGE_CRITERIA_NOT_MET", valerr.ErrDischargeCriteriaNotMet.Code)

	assert.NotNil(t, valerr.ErrFollowUpRequired)
	assert.Equal(t, "DISCHARGE_FOLLOWUP_REQUIRED", valerr.ErrFollowUpRequired.Code)
}

// =============================================================================
// Protocol Validation Constants Tests
// =============================================================================

func TestProtocolDurationConstants(t *testing.T) {
	assert.Equal(t, 4, minProtocolDurationWeeks)
	assert.Equal(t, 12, maxProtocolDurationWeeks)
	assert.Equal(t, 2, minSessionFrequency)
	assert.Equal(t, 5, maxSessionFrequency)
	assert.Equal(t, 3, minHEPExercises)
	assert.Equal(t, 5, maxHEPExercises)
}

// =============================================================================
// Reassessment Interval Tests
// =============================================================================

func TestMinReassessmentInterval(t *testing.T) {
	twoWeeks := 14 * 24 * time.Hour
	assert.Equal(t, twoWeeks, minReassessmentInterval)
}

// =============================================================================
// Minimum Treatment Duration Tests
// =============================================================================

func TestMinTreatmentDuration(t *testing.T) {
	twoWeeks := 14 * 24 * time.Hour
	assert.Equal(t, twoWeeks, minTreatmentDuration)
}
