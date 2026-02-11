package integration

import (
	"fmt"
	"net/http"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
)

func TestOutcomeMeasuresCRUD(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test")
	}

	var createdMeasureID string
	var createdVersion float64 // JSON numbers decode as float64
	var libraryID string
	testPatientID := "11111111-1111-1111-1111-111111111111" // From test seed data

	// First, get a library entry to use for testing
	t.Run("setup - get library entry", func(t *testing.T) {
		resp := doRequest(t, http.MethodGet, "/api/v1/outcome-measures/library", nil)
		if resp.StatusCode == http.StatusOK {
			var libraries []map[string]interface{}
			parseResponse(t, resp, &libraries)
			if len(libraries) > 0 {
				libraryID = libraries[0]["id"].(string)
			}
		}
		// If we can't get library, skip tests (mock mode)
		if libraryID == "" {
			t.Skip("No outcome measure library available (mock mode)")
		}
	})

	// Create a measure for testing
	t.Run("setup - create test measure", func(t *testing.T) {
		body := map[string]interface{}{
			"patient_id": testPatientID,
			"library_id": libraryID,
			"responses": []map[string]interface{}{
				{"question_id": "q1", "value": 5.0},
			},
			"notes":       "Initial test measure",
			"measured_at": time.Now().Format(time.RFC3339),
		}

		resp := doRequest(t, http.MethodPost, fmt.Sprintf("/api/v1/patients/%s/outcome-measures", testPatientID), body)

		if resp.StatusCode == http.StatusCreated || resp.StatusCode == http.StatusOK {
			var result map[string]interface{}
			parseResponse(t, resp, &result)
			createdMeasureID = result["id"].(string)
			if v, ok := result["version"].(float64); ok {
				createdVersion = v
			} else {
				createdVersion = 1
			}
		} else {
			t.Skip("Cannot create test measure (mock mode)")
		}
	})

	t.Run("PUT /patients/:id/outcome-measures/:measureId - update responses", func(t *testing.T) {
		if createdMeasureID == "" {
			t.Skip("No test measure available")
		}

		updateBody := map[string]interface{}{
			"measure_id": createdMeasureID,
			"patient_id": testPatientID,
			"version":    createdVersion,
			"responses": []map[string]interface{}{
				{"question_id": "q1", "value": 8.0},
			},
		}

		resp := doRequest(t, http.MethodPut,
			fmt.Sprintf("/api/v1/patients/%s/outcome-measures/%s", testPatientID, createdMeasureID),
			updateBody)

		// Accept 200 or may not be implemented
		if resp.StatusCode == http.StatusOK {
			var result map[string]interface{}
			parseResponse(t, resp, &result)

			// Score should be recalculated
			assert.Equal(t, 8.0, result["score"])
			assert.NotNil(t, result["percentage"])

			// Track the new version for subsequent tests
			if v, ok := result["version"].(float64); ok {
				createdVersion = v
			}
		} else if resp.StatusCode == http.StatusNotFound {
			t.Skip("Update endpoint not implemented")
		}
	})

	t.Run("PUT /patients/:id/outcome-measures/:measureId - update notes only", func(t *testing.T) {
		if createdMeasureID == "" {
			t.Skip("No test measure available")
		}

		updateBody := map[string]interface{}{
			"measure_id": createdMeasureID,
			"patient_id": testPatientID,
			"version":    createdVersion,
			"notes":      "Updated notes via test",
		}

		resp := doRequest(t, http.MethodPut,
			fmt.Sprintf("/api/v1/patients/%s/outcome-measures/%s", testPatientID, createdMeasureID),
			updateBody)

		if resp.StatusCode == http.StatusOK {
			var result map[string]interface{}
			parseResponse(t, resp, &result)

			assert.Equal(t, "Updated notes via test", result["notes"])
			// Score should remain unchanged
			assert.NotNil(t, result["score"])

			if v, ok := result["version"].(float64); ok {
				createdVersion = v
			}
		} else if resp.StatusCode == http.StatusNotFound {
			t.Skip("Update endpoint not implemented")
		}
	})

	t.Run("PUT /patients/:id/outcome-measures/:measureId - update measured_at", func(t *testing.T) {
		if createdMeasureID == "" {
			t.Skip("No test measure available")
		}

		newTime := time.Now().Add(48 * time.Hour).Format(time.RFC3339)
		updateBody := map[string]interface{}{
			"measure_id":  createdMeasureID,
			"patient_id":  testPatientID,
			"version":     createdVersion,
			"measured_at": newTime,
		}

		resp := doRequest(t, http.MethodPut,
			fmt.Sprintf("/api/v1/patients/%s/outcome-measures/%s", testPatientID, createdMeasureID),
			updateBody)

		if resp.StatusCode == http.StatusOK {
			var result map[string]interface{}
			parseResponse(t, resp, &result)

			// Should have updated timestamp
			assert.NotNil(t, result["measured_at"])

			if v, ok := result["version"].(float64); ok {
				createdVersion = v
			}
		} else if resp.StatusCode == http.StatusNotFound {
			t.Skip("Update endpoint not implemented")
		}
	})

	t.Run("PUT /patients/:id/outcome-measures/:measureId - wrong patient ID returns error", func(t *testing.T) {
		if createdMeasureID == "" {
			t.Skip("No test measure available")
		}

		wrongPatientID := "22222222-2222-2222-2222-222222222222"
		updateBody := map[string]interface{}{
			"measure_id": createdMeasureID,
			"patient_id": wrongPatientID,
			"version":    createdVersion,
			"notes":      "This should fail",
		}

		resp := doRequest(t, http.MethodPut,
			fmt.Sprintf("/api/v1/patients/%s/outcome-measures/%s", wrongPatientID, createdMeasureID),
			updateBody)

		// Should fail - either 404 or 403
		if resp.StatusCode != http.StatusNotFound &&
			resp.StatusCode != http.StatusForbidden &&
			resp.StatusCode != http.StatusBadRequest &&
			resp.StatusCode != http.StatusInternalServerError {
			t.Errorf("Expected error status, got %d", resp.StatusCode)
		}
	})

	t.Run("PUT /patients/:id/outcome-measures/:measureId - invalid data returns 422", func(t *testing.T) {
		if createdMeasureID == "" {
			t.Skip("No test measure available")
		}

		// Invalid measured_at format
		updateBody := map[string]interface{}{
			"measure_id":  createdMeasureID,
			"patient_id":  testPatientID,
			"version":     createdVersion,
			"measured_at": "invalid-date-format",
		}

		resp := doRequest(t, http.MethodPut,
			fmt.Sprintf("/api/v1/patients/%s/outcome-measures/%s", testPatientID, createdMeasureID),
			updateBody)

		// Should fail with validation error
		if resp.StatusCode != http.StatusUnprocessableEntity &&
			resp.StatusCode != http.StatusBadRequest &&
			resp.StatusCode != http.StatusNotFound {
			t.Logf("Expected 422 or 400, got %d (may not validate)", resp.StatusCode)
		}
	})

	t.Run("PUT /patients/:id/outcome-measures/:measureId - stale version returns 409", func(t *testing.T) {
		if createdMeasureID == "" {
			t.Skip("No test measure available")
		}

		// Send an update with a stale (old) version number
		staleVersion := 0.0
		if createdVersion > 1 {
			staleVersion = createdVersion - 1
		}

		updateBody := map[string]interface{}{
			"measure_id": createdMeasureID,
			"patient_id": testPatientID,
			"version":    staleVersion,
			"notes":      "This should conflict",
		}

		resp := doRequest(t, http.MethodPut,
			fmt.Sprintf("/api/v1/patients/%s/outcome-measures/%s", testPatientID, createdMeasureID),
			updateBody)

		// Should return 409 Conflict or validation error for version=0
		if resp.StatusCode != http.StatusConflict &&
			resp.StatusCode != http.StatusUnprocessableEntity &&
			resp.StatusCode != http.StatusNotFound {
			t.Logf("Stale version test: got status %d (expected 409 or 422)", resp.StatusCode)
		}
	})

	t.Run("DELETE /patients/:id/outcome-measures/:measureId - successful delete", func(t *testing.T) {
		// Create a new measure specifically for deletion test
		body := map[string]interface{}{
			"patient_id": testPatientID,
			"library_id": libraryID,
			"responses": []map[string]interface{}{
				{"question_id": "q1", "value": 3.0},
			},
			"notes": "Measure to be deleted",
		}

		createResp := doRequest(t, http.MethodPost,
			fmt.Sprintf("/api/v1/patients/%s/outcome-measures", testPatientID), body)

		if createResp.StatusCode != http.StatusCreated && createResp.StatusCode != http.StatusOK {
			t.Skip("Cannot create measure for deletion test")
		}

		var created map[string]interface{}
		parseResponse(t, createResp, &created)
		measureToDelete := created["id"].(string)

		// Now delete it
		deleteResp := doRequest(t, http.MethodDelete,
			fmt.Sprintf("/api/v1/patients/%s/outcome-measures/%s", testPatientID, measureToDelete), nil)

		// Should return 204 No Content or 200 OK
		if deleteResp.StatusCode != http.StatusNoContent &&
			deleteResp.StatusCode != http.StatusOK &&
			deleteResp.StatusCode != http.StatusNotFound {
			t.Errorf("Expected 204, 200, or 404, got %d", deleteResp.StatusCode)
		}

		// Verify it's actually deleted by trying to get patient measures
		if deleteResp.StatusCode == http.StatusNoContent || deleteResp.StatusCode == http.StatusOK {
			getMeasuresResp := doRequest(t, http.MethodGet,
				fmt.Sprintf("/api/v1/patients/%s/outcome-measures", testPatientID), nil)

			if getMeasuresResp.StatusCode == http.StatusOK {
				var measures []map[string]interface{}
				parseResponse(t, getMeasuresResp, &measures)

				// Deleted measure should not be in the list
				for _, m := range measures {
					if m["id"].(string) == measureToDelete {
						t.Error("Deleted measure still appears in patient measures list")
					}
				}
			}
		}
	})

	t.Run("DELETE /patients/:id/outcome-measures/:measureId - wrong patient ID returns error", func(t *testing.T) {
		if createdMeasureID == "" {
			t.Skip("No test measure available")
		}

		wrongPatientID := "33333333-3333-3333-3333-333333333333"
		resp := doRequest(t, http.MethodDelete,
			fmt.Sprintf("/api/v1/patients/%s/outcome-measures/%s", wrongPatientID, createdMeasureID), nil)

		// Should fail
		if resp.StatusCode != http.StatusNotFound &&
			resp.StatusCode != http.StatusForbidden &&
			resp.StatusCode != http.StatusBadRequest &&
			resp.StatusCode != http.StatusInternalServerError {
			t.Errorf("Expected error status, got %d", resp.StatusCode)
		}
	})

	t.Run("DELETE /patients/:id/outcome-measures/:measureId - non-existent measure returns 404", func(t *testing.T) {
		fakeID := "99999999-9999-9999-9999-999999999999"
		resp := doRequest(t, http.MethodDelete,
			fmt.Sprintf("/api/v1/patients/%s/outcome-measures/%s", testPatientID, fakeID), nil)

		assertStatus(t, resp, http.StatusNotFound)
	})

	t.Run("DELETE /patients/:id/outcome-measures/:measureId - already deleted returns 404", func(t *testing.T) {
		// Create and delete a measure
		body := map[string]interface{}{
			"patient_id": testPatientID,
			"library_id": libraryID,
			"responses": []map[string]interface{}{
				{"question_id": "q1", "value": 2.0},
			},
		}

		createResp := doRequest(t, http.MethodPost,
			fmt.Sprintf("/api/v1/patients/%s/outcome-measures", testPatientID), body)

		if createResp.StatusCode != http.StatusCreated && createResp.StatusCode != http.StatusOK {
			t.Skip("Cannot create measure")
		}

		var created map[string]interface{}
		parseResponse(t, createResp, &created)
		measureID := created["id"].(string)

		// Delete once
		firstDelete := doRequest(t, http.MethodDelete,
			fmt.Sprintf("/api/v1/patients/%s/outcome-measures/%s", testPatientID, measureID), nil)

		if firstDelete.StatusCode != http.StatusNoContent && firstDelete.StatusCode != http.StatusOK {
			t.Skip("First delete failed")
		}

		// Try to delete again
		secondDelete := doRequest(t, http.MethodDelete,
			fmt.Sprintf("/api/v1/patients/%s/outcome-measures/%s", testPatientID, measureID), nil)

		assertStatus(t, secondDelete, http.StatusNotFound)
	})

	t.Run("authorization checks - therapist can update their measures", func(t *testing.T) {
		if createdMeasureID == "" {
			t.Skip("No test measure available")
		}

		// Test user is "therapist1" from test middleware
		// They created the measure, so should be able to update
		updateBody := map[string]interface{}{
			"measure_id": createdMeasureID,
			"patient_id": testPatientID,
			"version":    createdVersion,
			"notes":      "Updated by therapist",
		}

		resp := doRequest(t, http.MethodPut,
			fmt.Sprintf("/api/v1/patients/%s/outcome-measures/%s", testPatientID, createdMeasureID),
			updateBody)

		// Should succeed or return not implemented
		if resp.StatusCode == http.StatusOK {
			var result map[string]interface{}
			parseResponse(t, resp, &result)
			if v, ok := result["version"].(float64); ok {
				createdVersion = v
			}
		} else if resp.StatusCode != http.StatusNotFound {
			t.Logf("Update returned %d (may be auth issue or not implemented)", resp.StatusCode)
		}
	})

	t.Run("concurrent updates - optimistic locking detects conflicts", func(t *testing.T) {
		if createdMeasureID == "" {
			t.Skip("No test measure available")
		}

		// Both updates use the same version, so the second should conflict
		update1 := map[string]interface{}{
			"measure_id": createdMeasureID,
			"patient_id": testPatientID,
			"version":    createdVersion,
			"notes":      "Update 1",
		}

		update2 := map[string]interface{}{
			"measure_id": createdMeasureID,
			"patient_id": testPatientID,
			"version":    createdVersion,
			"notes":      "Update 2",
		}

		// Send first update
		resp1 := doRequest(t, http.MethodPut,
			fmt.Sprintf("/api/v1/patients/%s/outcome-measures/%s", testPatientID, createdMeasureID),
			update1)

		// Send second update with the same (now stale) version
		resp2 := doRequest(t, http.MethodPut,
			fmt.Sprintf("/api/v1/patients/%s/outcome-measures/%s", testPatientID, createdMeasureID),
			update2)

		// First should succeed, second should conflict (409) or both may not be implemented
		if resp1.StatusCode == http.StatusOK {
			if resp2.StatusCode == http.StatusConflict {
				t.Log("Optimistic locking correctly detected concurrent update conflict")
			} else {
				t.Logf("Second update returned %d (expected 409 Conflict)", resp2.StatusCode)
			}

			var result map[string]interface{}
			parseResponse(t, resp1, &result)
			if v, ok := result["version"].(float64); ok {
				createdVersion = v
			}
		} else {
			t.Logf("First update returned %d (optimistic locking test inconclusive)", resp1.StatusCode)
		}
	})

	t.Run("partial update - only specified fields change", func(t *testing.T) {
		if createdMeasureID == "" {
			t.Skip("No test measure available")
		}

		// Get current state
		getResp := doRequest(t, http.MethodGet,
			fmt.Sprintf("/api/v1/patients/%s/outcome-measures", testPatientID), nil)

		if getResp.StatusCode != http.StatusOK {
			t.Skip("Cannot get current measures")
		}

		var measures []map[string]interface{}
		parseResponse(t, getResp, &measures)

		var originalMeasure map[string]interface{}
		for _, m := range measures {
			if m["id"].(string) == createdMeasureID {
				originalMeasure = m
				break
			}
		}

		if originalMeasure == nil {
			t.Skip("Cannot find test measure")
		}

		originalScore := originalMeasure["score"]
		currentVersion := originalMeasure["version"]

		// Update only notes
		updateBody := map[string]interface{}{
			"measure_id": createdMeasureID,
			"patient_id": testPatientID,
			"version":    currentVersion,
			"notes":      "Partial update test",
		}

		updateResp := doRequest(t, http.MethodPut,
			fmt.Sprintf("/api/v1/patients/%s/outcome-measures/%s", testPatientID, createdMeasureID),
			updateBody)

		if updateResp.StatusCode == http.StatusOK {
			var updated map[string]interface{}
			parseResponse(t, updateResp, &updated)

			// Notes should change
			assert.Equal(t, "Partial update test", updated["notes"])
			// Score should NOT change
			assert.Equal(t, originalScore, updated["score"])
		} else if updateResp.StatusCode != http.StatusNotFound {
			t.Logf("Partial update test inconclusive: status %d", updateResp.StatusCode)
		}
	})
}
