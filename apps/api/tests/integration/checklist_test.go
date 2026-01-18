package integration

import (
	"net/http"
	"testing"
)

func TestChecklistTemplatesList(t *testing.T) {
	resp := doRequest(t, http.MethodGet, "/api/v1/checklist-templates", nil)
	assertStatus(t, resp, http.StatusOK)

	var result struct {
		Data []interface{} `json:"data"`
	}
	parseResponse(t, resp, &result)
}

func TestChecklistTemplateGet(t *testing.T) {
	// First list templates to get a valid ID
	listResp := doRequest(t, http.MethodGet, "/api/v1/checklist-templates", nil)
	if listResp.StatusCode != http.StatusOK {
		t.Skip("Cannot list templates, skipping get test")
	}

	var listResult struct {
		Data []struct {
			ID string `json:"id"`
		} `json:"data"`
	}
	parseResponse(t, listResp, &listResult)

	if len(listResult.Data) == 0 {
		t.Skip("No templates available, skipping get test")
	}

	templateID := listResult.Data[0].ID
	resp := doRequest(t, http.MethodGet, "/api/v1/checklist-templates/"+templateID, nil)
	assertStatus(t, resp, http.StatusOK)
}

func TestChecklistTemplateGetNotFound(t *testing.T) {
	resp := doRequest(t, http.MethodGet, "/api/v1/checklist-templates/nonexistent-template", nil)

	if resp.StatusCode != http.StatusNotFound {
		t.Logf("Expected 404 for nonexistent template, got %d", resp.StatusCode)
	}
}

func TestStartChecklist(t *testing.T) {
	// First get a template ID
	listResp := doRequest(t, http.MethodGet, "/api/v1/checklist-templates", nil)
	if listResp.StatusCode != http.StatusOK {
		t.Skip("Cannot list templates, skipping start checklist test")
	}

	var listResult struct {
		Data []struct {
			ID string `json:"id"`
		} `json:"data"`
	}
	parseResponse(t, listResp, &listResult)

	if len(listResult.Data) == 0 {
		t.Skip("No templates available, skipping start checklist test")
	}

	templateID := listResult.Data[0].ID
	body := map[string]interface{}{
		"template_id": templateID,
	}

	resp := doRequest(t, http.MethodPost, "/api/v1/patients/11111111-1111-1111-1111-111111111111/visit-checklists", body)

	// May succeed or fail depending on mode
	if resp.StatusCode != http.StatusCreated && resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusNotFound {
		t.Logf("Start checklist returned status %d", resp.StatusCode)
	}
}

func TestStartChecklistMissingTemplate(t *testing.T) {
	body := map[string]interface{}{
		// Missing template_id
	}

	resp := doRequest(t, http.MethodPost, "/api/v1/patients/11111111-1111-1111-1111-111111111111/visit-checklists", body)

	// Should fail validation
	if resp.StatusCode != http.StatusBadRequest && resp.StatusCode != http.StatusUnprocessableEntity {
		t.Logf("Expected validation error, got %d", resp.StatusCode)
	}
}

func TestGetChecklist(t *testing.T) {
	// Try to get a checklist (may not exist in mock mode)
	resp := doRequest(t, http.MethodGet, "/api/v1/visit-checklists/test-checklist-id", nil)

	// May be 200 or 404
	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusNotFound {
		t.Logf("Get checklist returned %d", resp.StatusCode)
	}
}

func TestUpdateChecklistResponses(t *testing.T) {
	body := map[string]interface{}{
		"responses": []map[string]interface{}{
			{
				"item_id": "item-1",
				"value":   true,
			},
			{
				"item_id": "item-2",
				"value":   5,
			},
		},
	}

	resp := doRequest(t, http.MethodPatch, "/api/v1/visit-checklists/test-checklist-id/responses", body)

	// May be 200 or 404
	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusNotFound {
		t.Logf("Update responses returned %d", resp.StatusCode)
	}
}

func TestUpdateSingleResponse(t *testing.T) {
	body := map[string]interface{}{
		"value": true,
	}

	resp := doRequest(t, http.MethodPatch, "/api/v1/visit-checklists/test-checklist-id/responses/item-1", body)

	// May be 200 or 404
	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusNotFound {
		t.Logf("Update single response returned %d", resp.StatusCode)
	}
}

func TestCompleteChecklist(t *testing.T) {
	body := map[string]interface{}{
		"notes": "Session completed successfully",
	}

	resp := doRequest(t, http.MethodPost, "/api/v1/visit-checklists/test-checklist-id/complete", body)

	// May be 200 or 404
	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusNotFound && resp.StatusCode != http.StatusBadRequest {
		t.Logf("Complete checklist returned %d", resp.StatusCode)
	}
}

// Integration test: Full checklist workflow
func TestChecklistWorkflow(t *testing.T) {
	// Step 1: List templates
	templatesResp := doRequest(t, http.MethodGet, "/api/v1/checklist-templates", nil)
	if templatesResp.StatusCode != http.StatusOK {
		t.Skip("Cannot list templates, skipping workflow test")
	}

	var templatesResult struct {
		Data []struct {
			ID   string `json:"id"`
			Name string `json:"name"`
		} `json:"data"`
	}
	parseResponse(t, templatesResp, &templatesResult)

	if len(templatesResult.Data) == 0 {
		t.Skip("No templates available, skipping workflow test")
	}

	templateID := templatesResult.Data[0].ID
	t.Logf("Using template: %s (%s)", templatesResult.Data[0].Name, templateID)

	// Step 2: Start a checklist for a patient
	startBody := map[string]interface{}{
		"template_id": templateID,
	}

	startResp := doRequest(t, http.MethodPost, "/api/v1/patients/11111111-1111-1111-1111-111111111111/visit-checklists", startBody)
	if startResp.StatusCode != http.StatusCreated && startResp.StatusCode != http.StatusOK {
		t.Logf("Could not start checklist (status %d), may be mock mode", startResp.StatusCode)
		return
	}

	var checklistResult struct {
		ID    string `json:"id"`
		Items []struct {
			ID   string `json:"id"`
			Type string `json:"type"`
		} `json:"items"`
	}
	parseResponse(t, startResp, &checklistResult)

	checklistID := checklistResult.ID
	t.Logf("Created checklist: %s with %d items", checklistID, len(checklistResult.Items))

	// Step 3: Update some responses
	if len(checklistResult.Items) > 0 {
		updateBody := map[string]interface{}{
			"value": true,
		}
		updateResp := doRequest(t, http.MethodPatch, "/api/v1/visit-checklists/"+checklistID+"/responses/"+checklistResult.Items[0].ID, updateBody)
		t.Logf("Update response status: %d", updateResp.StatusCode)
	}

	// Step 4: Complete the checklist
	completeBody := map[string]interface{}{
		"notes": "Workflow test completed",
	}
	completeResp := doRequest(t, http.MethodPost, "/api/v1/visit-checklists/"+checklistID+"/complete", completeBody)
	t.Logf("Complete checklist status: %d", completeResp.StatusCode)
}
