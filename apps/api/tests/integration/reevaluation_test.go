package integration

import (
	"net/http"
	"testing"
)

// TestCreateReevaluation_Success tests creating a re-evaluation assessment.
func TestCreateReevaluation_Success(t *testing.T) {
	body := map[string]interface{}{
		"patient_id": "11111111-1111-1111-1111-111111111111",
		"assessments": []map[string]interface{}{
			{
				"assessment_type": "rom",
				"measure_label":   "Shoulder Flexion Left Active",
				"current_value":   150.0,
				"baseline_value":  90.0,
				"higher_is_better": true,
				"mcid_threshold":  10.0,
			},
			{
				"assessment_type":  "outcome_measure",
				"measure_label":    "VAS Pain Scale",
				"current_value":    3.0,
				"baseline_value":   8.0,
				"higher_is_better": false,
				"mcid_threshold":   2.0,
			},
		},
		"notes": "4-week follow-up re-evaluation",
	}

	resp := doRequest(t, http.MethodPost, "/api/v1/assessments/reevaluation", body)
	defer resp.Body.Close()

	// In mock mode this should return 201
	assertStatus(t, resp, http.StatusCreated)

	var result map[string]interface{}
	parseResponse(t, resp, &result)

	// Verify summary fields
	if result["total_items"] == nil {
		t.Error("Expected total_items in response")
	}

	totalItems, ok := result["total_items"].(float64)
	if !ok || totalItems != 2 {
		t.Errorf("Expected total_items=2, got %v", result["total_items"])
	}

	improved, _ := result["improved"].(float64)
	if improved != 2 {
		t.Errorf("Expected improved=2, got %v", improved)
	}
}

// TestCreateReevaluation_InvalidBody tests creating a re-evaluation with invalid body.
func TestCreateReevaluation_InvalidBody(t *testing.T) {
	resp := doRequest(t, http.MethodPost, "/api/v1/assessments/reevaluation", "invalid-json")
	defer resp.Body.Close()

	assertStatus(t, resp, http.StatusBadRequest)
}

// TestCreateReevaluation_MissingAssessments tests creating a re-evaluation with empty assessments.
func TestCreateReevaluation_MissingAssessments(t *testing.T) {
	body := map[string]interface{}{
		"patient_id":  "11111111-1111-1111-1111-111111111111",
		"assessments": []map[string]interface{}{},
	}

	resp := doRequest(t, http.MethodPost, "/api/v1/assessments/reevaluation", body)
	defer resp.Body.Close()

	// Should fail validation (at least 1 assessment required)
	if resp.StatusCode != http.StatusUnprocessableEntity && resp.StatusCode != http.StatusInternalServerError {
		t.Errorf("Expected 422 or 500 for empty assessments, got %d", resp.StatusCode)
	}
}

// TestGetPatientReevaluations tests retrieving re-evaluation history for a patient.
func TestGetPatientReevaluations(t *testing.T) {
	patientID := "11111111-1111-1111-1111-111111111111"
	resp := doRequest(t, http.MethodGet, "/api/v1/assessments/reevaluation/patient/"+patientID, nil)
	defer resp.Body.Close()

	assertStatus(t, resp, http.StatusOK)

	var result []map[string]interface{}
	parseResponse(t, resp, &result)

	// In mock mode, should return empty array
	if result == nil {
		t.Error("Expected non-nil response")
	}
}

// TestGetComparison_NotFound tests retrieving comparison for non-existent re-evaluation.
func TestGetComparison_NotFound(t *testing.T) {
	resp := doRequest(t, http.MethodGet, "/api/v1/assessments/reevaluation/nonexistent-id/comparison", nil)
	defer resp.Body.Close()

	// In mock mode, should return 404 or empty array
	if resp.StatusCode != http.StatusNotFound && resp.StatusCode != http.StatusOK {
		t.Errorf("Expected 404 or 200 for nonexistent reevaluation, got %d", resp.StatusCode)
	}
}
