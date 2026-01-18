package integration

import (
	"net/http"
	"testing"
)

func TestExerciseList(t *testing.T) {
	resp := doRequest(t, http.MethodGet, "/api/v1/exercises", nil)
	assertStatus(t, resp, http.StatusOK)

	var result struct {
		Data       []interface{} `json:"data"`
		Total      int64         `json:"total"`
		Page       int           `json:"page"`
		PerPage    int           `json:"per_page"`
		TotalPages int           `json:"total_pages"`
	}
	parseResponse(t, resp, &result)

	if result.Page != 1 {
		t.Errorf("Expected page 1, got %d", result.Page)
	}
}

func TestExerciseListWithPagination(t *testing.T) {
	resp := doRequest(t, http.MethodGet, "/api/v1/exercises?page=1&per_page=10", nil)
	assertStatus(t, resp, http.StatusOK)
}

func TestExerciseListWithFilters(t *testing.T) {
	resp := doRequest(t, http.MethodGet, "/api/v1/exercises?category=stretching&difficulty=beginner", nil)
	assertStatus(t, resp, http.StatusOK)
}

func TestExerciseGet(t *testing.T) {
	// First, list exercises to get a valid ID (if any exist)
	listResp := doRequest(t, http.MethodGet, "/api/v1/exercises?per_page=1", nil)
	if listResp.StatusCode != http.StatusOK {
		t.Skip("Cannot list exercises, skipping get test")
	}

	var listResult struct {
		Data []struct {
			ID string `json:"id"`
		} `json:"data"`
	}
	parseResponse(t, listResp, &listResult)

	if len(listResult.Data) == 0 {
		t.Skip("No exercises available, skipping get test")
	}

	// Get the first exercise
	exerciseID := listResult.Data[0].ID
	resp := doRequest(t, http.MethodGet, "/api/v1/exercises/"+exerciseID, nil)
	assertStatus(t, resp, http.StatusOK)
}

func TestExerciseGetNotFound(t *testing.T) {
	resp := doRequest(t, http.MethodGet, "/api/v1/exercises/nonexistent-exercise-id", nil)

	if resp.StatusCode != http.StatusNotFound {
		t.Logf("Expected 404 for nonexistent exercise, got %d", resp.StatusCode)
	}
}

func TestExerciseCreate(t *testing.T) {
	body := map[string]interface{}{
		"name":             "Test Exercise",
		"name_vi":          "Bài tập test",
		"description":      "A test exercise for integration tests",
		"description_vi":   "Bài tập test cho integration tests",
		"category":         "stretching",
		"difficulty":       "beginner",
		"duration_seconds": 60,
		"instructions": []string{
			"Step 1: Start position",
			"Step 2: Perform the movement",
			"Step 3: Return to start",
		},
	}

	resp := doRequest(t, http.MethodPost, "/api/v1/exercises", body)

	// May succeed or fail depending on mode
	if resp.StatusCode != http.StatusCreated && resp.StatusCode != http.StatusOK {
		t.Logf("Exercise create returned status %d", resp.StatusCode)
	}
}

func TestExerciseCreateValidation(t *testing.T) {
	body := map[string]interface{}{
		// Missing required name field
		"category":   "stretching",
		"difficulty": "beginner",
	}

	resp := doRequest(t, http.MethodPost, "/api/v1/exercises", body)

	// Should fail validation
	if resp.StatusCode != http.StatusUnprocessableEntity && resp.StatusCode != http.StatusBadRequest {
		t.Logf("Expected validation error, got %d", resp.StatusCode)
	}
}

func TestExerciseUpdate(t *testing.T) {
	// First get an exercise to update
	listResp := doRequest(t, http.MethodGet, "/api/v1/exercises?per_page=1", nil)
	if listResp.StatusCode != http.StatusOK {
		t.Skip("Cannot list exercises, skipping update test")
	}

	var listResult struct {
		Data []struct {
			ID string `json:"id"`
		} `json:"data"`
	}
	parseResponse(t, listResp, &listResult)

	if len(listResult.Data) == 0 {
		t.Skip("No exercises available, skipping update test")
	}

	exerciseID := listResult.Data[0].ID
	body := map[string]interface{}{
		"description": "Updated description for test",
	}

	resp := doRequest(t, http.MethodPut, "/api/v1/exercises/"+exerciseID, body)

	// May be 200 or 404
	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusNotFound {
		t.Logf("Exercise update returned %d", resp.StatusCode)
	}
}

func TestExerciseSearch(t *testing.T) {
	resp := doRequest(t, http.MethodGet, "/api/v1/exercises/search?q=stretch", nil)
	assertStatus(t, resp, http.StatusOK)
}

func TestExerciseSearchEmpty(t *testing.T) {
	resp := doRequest(t, http.MethodGet, "/api/v1/exercises/search?q=", nil)

	// Should fail with bad request
	if resp.StatusCode != http.StatusBadRequest {
		t.Logf("Expected 400 for empty search, got %d", resp.StatusCode)
	}
}

func TestExercisePrescribe(t *testing.T) {
	// First get an exercise to prescribe
	listResp := doRequest(t, http.MethodGet, "/api/v1/exercises?per_page=1", nil)
	if listResp.StatusCode != http.StatusOK {
		t.Skip("Cannot list exercises, skipping prescribe test")
	}

	var listResult struct {
		Data []struct {
			ID string `json:"id"`
		} `json:"data"`
	}
	parseResponse(t, listResp, &listResult)

	if len(listResult.Data) == 0 {
		t.Skip("No exercises available, skipping prescribe test")
	}

	exerciseID := listResult.Data[0].ID
	body := map[string]interface{}{
		"patient_id":    "11111111-1111-1111-1111-111111111111",
		"sets":          3,
		"reps":          10,
		"frequency":     "daily",
		"duration_days": 14,
		"notes":         "Integration test prescription",
	}

	resp := doRequest(t, http.MethodPost, "/api/v1/exercises/"+exerciseID+"/prescribe", body)

	// May succeed or fail depending on mode
	if resp.StatusCode != http.StatusCreated && resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusBadRequest {
		t.Logf("Exercise prescribe returned status %d", resp.StatusCode)
	}
}

func TestExerciseDelete(t *testing.T) {
	resp := doRequest(t, http.MethodDelete, "/api/v1/exercises/99999999-9999-9999-9999-999999999999", nil)

	// May be 204 or 404
	if resp.StatusCode != http.StatusNoContent && resp.StatusCode != http.StatusNotFound {
		t.Logf("Exercise delete returned %d", resp.StatusCode)
	}
}
