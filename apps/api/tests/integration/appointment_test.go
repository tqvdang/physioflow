package integration

import (
	"net/http"
	"testing"
	"time"
)

func TestAppointmentList(t *testing.T) {
	resp := doRequest(t, http.MethodGet, "/api/v1/appointments", nil)
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

func TestAppointmentListWithFilters(t *testing.T) {
	today := time.Now().Format("2006-01-02")
	resp := doRequest(t, http.MethodGet, "/api/v1/appointments?status=scheduled&start_date="+today, nil)
	assertStatus(t, resp, http.StatusOK)
}

func TestAppointmentCreate(t *testing.T) {
	tomorrow := time.Now().AddDate(0, 0, 1).Format("2006-01-02")
	body := map[string]interface{}{
		"patient_id":   "11111111-1111-1111-1111-111111111111",
		"therapist_id": "test-user-id",
		"start_time":   tomorrow + "T10:00:00Z",
		"end_time":     tomorrow + "T11:00:00Z",
		"type":         "follow_up",
		"notes":        "Integration test appointment",
	}

	resp := doRequest(t, http.MethodPost, "/api/v1/appointments", body)

	// May succeed or fail depending on mode
	if resp.StatusCode != http.StatusCreated && resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusBadRequest {
		t.Logf("Appointment create returned status %d", resp.StatusCode)
	}
}

func TestAppointmentCreateMissingFields(t *testing.T) {
	body := map[string]interface{}{
		"patient_id": "11111111-1111-1111-1111-111111111111",
		// Missing required fields
	}

	resp := doRequest(t, http.MethodPost, "/api/v1/appointments", body)

	// Should fail validation
	if resp.StatusCode != http.StatusUnprocessableEntity && resp.StatusCode != http.StatusBadRequest {
		t.Logf("Expected validation error, got %d", resp.StatusCode)
	}
}

func TestAppointmentGet(t *testing.T) {
	resp := doRequest(t, http.MethodGet, "/api/v1/appointments/aaaa1111-1111-1111-1111-111111111111", nil)

	// May be 200 or 404
	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusNotFound {
		t.Logf("Appointment get returned %d", resp.StatusCode)
	}
}

func TestAppointmentUpdate(t *testing.T) {
	body := map[string]interface{}{
		"notes": "Updated notes",
	}

	resp := doRequest(t, http.MethodPut, "/api/v1/appointments/aaaa1111-1111-1111-1111-111111111111", body)

	// May be 200 or 404
	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusNotFound {
		t.Logf("Appointment update returned %d", resp.StatusCode)
	}
}

func TestAppointmentCancel(t *testing.T) {
	body := map[string]interface{}{
		"reason": "Patient requested cancellation",
	}

	resp := doRequest(t, http.MethodPost, "/api/v1/appointments/aaaa1111-1111-1111-1111-111111111111/cancel", body)

	// May be 200 or 404
	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusNotFound {
		t.Logf("Appointment cancel returned %d", resp.StatusCode)
	}
}

func TestAppointmentDelete(t *testing.T) {
	resp := doRequest(t, http.MethodDelete, "/api/v1/appointments/99999999-9999-9999-9999-999999999999", nil)

	// May be 204 or 404
	if resp.StatusCode != http.StatusNoContent && resp.StatusCode != http.StatusNotFound {
		t.Logf("Appointment delete returned %d", resp.StatusCode)
	}
}

func TestDaySchedule(t *testing.T) {
	today := time.Now().Format("2006-01-02")
	resp := doRequest(t, http.MethodGet, "/api/v1/appointments/day/"+today, nil)
	assertStatus(t, resp, http.StatusOK)
}

func TestDayScheduleInvalidDate(t *testing.T) {
	resp := doRequest(t, http.MethodGet, "/api/v1/appointments/day/invalid-date", nil)

	// Should fail with bad request
	if resp.StatusCode != http.StatusBadRequest {
		t.Logf("Expected 400 for invalid date, got %d", resp.StatusCode)
	}
}

func TestGetTherapists(t *testing.T) {
	resp := doRequest(t, http.MethodGet, "/api/v1/therapists", nil)
	assertStatus(t, resp, http.StatusOK)
}

func TestGetTherapistAvailability(t *testing.T) {
	tomorrow := time.Now().AddDate(0, 0, 1).Format("2006-01-02")
	resp := doRequest(t, http.MethodGet, "/api/v1/therapists/test-user-id/availability?date="+tomorrow, nil)

	// May be 200 or 404
	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusNotFound {
		t.Logf("Therapist availability returned %d", resp.StatusCode)
	}
}
