package model

import "time"

// TestCategory represents the body region a special test targets.
type TestCategory string

const (
	TestCategoryShoulder TestCategory = "shoulder"
	TestCategoryKnee     TestCategory = "knee"
	TestCategorySpine    TestCategory = "spine"
	TestCategoryHip      TestCategory = "hip"
	TestCategoryAnkle    TestCategory = "ankle"
	TestCategoryElbow    TestCategory = "elbow"
)

// ValidTestCategories returns all valid test category values.
func ValidTestCategories() []TestCategory {
	return []TestCategory{
		TestCategoryShoulder, TestCategoryKnee, TestCategorySpine,
		TestCategoryHip, TestCategoryAnkle, TestCategoryElbow,
	}
}

// IsValidTestCategory checks whether the given string is a valid test category.
func IsValidTestCategory(c string) bool {
	for _, v := range ValidTestCategories() {
		if string(v) == c {
			return true
		}
	}
	return false
}

// TestResult represents the outcome of a special test.
type TestResult string

const (
	TestResultPositive     TestResult = "positive"
	TestResultNegative     TestResult = "negative"
	TestResultInconclusive TestResult = "inconclusive"
)

// ValidTestResults returns all valid test result values.
func ValidTestResults() []TestResult {
	return []TestResult{
		TestResultPositive, TestResultNegative, TestResultInconclusive,
	}
}

// IsValidTestResult checks whether the given string is a valid test result.
func IsValidTestResult(r string) bool {
	for _, v := range ValidTestResults() {
		if string(v) == r {
			return true
		}
	}
	return false
}

// SpecialTest represents an orthopedic special test in the library.
type SpecialTest struct {
	ID                string       `json:"id" db:"id"`
	Name              string       `json:"name" db:"name"`
	NameVi            string       `json:"name_vi" db:"name_vi"`
	Category          TestCategory `json:"category" db:"category"`
	Description       string       `json:"description" db:"description"`
	DescriptionVi     string       `json:"description_vi" db:"description_vi"`
	PositiveFinding   string       `json:"positive_finding" db:"positive_finding"`
	PositiveFindingVi string       `json:"positive_finding_vi" db:"positive_finding_vi"`
	NegativeFinding   string       `json:"negative_finding" db:"negative_finding"`
	NegativeFindingVi string       `json:"negative_finding_vi" db:"negative_finding_vi"`
	Sensitivity       *int         `json:"sensitivity,omitempty" db:"sensitivity"`
	Specificity       *int         `json:"specificity,omitempty" db:"specificity"`
	CreatedAt         time.Time    `json:"created_at" db:"created_at"`
}

// PatientSpecialTestResult represents a recorded result of a special test for a patient.
type PatientSpecialTestResult struct {
	ID            string     `json:"id" db:"id"`
	PatientID     string     `json:"patient_id" db:"patient_id"`
	VisitID       *string    `json:"visit_id,omitempty" db:"visit_id"`
	SpecialTestID string     `json:"special_test_id" db:"special_test_id"`
	Result        TestResult `json:"result" db:"result"`
	Notes         string     `json:"notes,omitempty" db:"notes"`
	TherapistID   string     `json:"therapist_id" db:"therapist_id"`
	AssessedAt    time.Time  `json:"assessed_at" db:"assessed_at"`
	CreatedAt     time.Time  `json:"created_at" db:"created_at"`

	// Joined fields (populated by some queries)
	TestName     string       `json:"test_name,omitempty" db:"test_name"`
	TestNameVi   string       `json:"test_name_vi,omitempty" db:"test_name_vi"`
	TestCategory TestCategory `json:"test_category,omitempty" db:"test_category"`
}

// CreateSpecialTestResultRequest represents the request body for recording a special test result.
type CreateSpecialTestResultRequest struct {
	PatientID     string `json:"patient_id" validate:"required,uuid"`
	VisitID       string `json:"visit_id" validate:"omitempty,uuid"`
	SpecialTestID string `json:"special_test_id" validate:"required,uuid"`
	Result        string `json:"result" validate:"required,oneof=positive negative inconclusive"`
	Notes         string `json:"notes" validate:"max=2000"`
	AssessedAt    string `json:"assessed_at" validate:"omitempty,datetime=2006-01-02T15:04:05Z07:00"`
}
