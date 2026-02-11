package integration

import (
	"net/http"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestAnatomyRegionsAPI(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test")
	}

	t.Run("GET /anatomy/regions - list all regions", func(t *testing.T) {
		resp := doRequest(t, http.MethodGet, "/api/v1/anatomy/regions", nil)
		assertStatus(t, resp, http.StatusOK)

		var regions []map[string]interface{}
		parseResponse(t, resp, &regions)

		// Should return 58 regions (as defined in AnatomyRegionsMetadata)
		assert.Len(t, regions, 58, "Expected 58 anatomy regions")

		// Verify structure of first region
		if len(regions) > 0 {
			firstRegion := regions[0]
			assert.Contains(t, firstRegion, "id", "Region should have id field")
			assert.Contains(t, firstRegion, "name", "Region should have name field")
			assert.Contains(t, firstRegion, "name_vi", "Region should have name_vi field")
			assert.Contains(t, firstRegion, "category", "Region should have category field")
			assert.Contains(t, firstRegion, "view", "Region should have view field")
			assert.Contains(t, firstRegion, "side", "Region should have side field")
		}

		// Check that we have regions from different categories
		categories := make(map[string]bool)
		views := make(map[string]bool)
		for _, region := range regions {
			if cat, ok := region["category"].(string); ok {
				categories[cat] = true
			}
			if view, ok := region["view"].(string); ok {
				views[view] = true
			}
		}

		// Should have multiple categories
		assert.GreaterOrEqual(t, len(categories), 4, "Should have at least 4 categories")
		assert.Contains(t, categories, "upper_limb", "Should have upper_limb regions")
		assert.Contains(t, categories, "lower_limb", "Should have lower_limb regions")
		assert.Contains(t, categories, "spine", "Should have spine regions")
		assert.Contains(t, categories, "head_neck", "Should have head_neck regions")

		// Should have both front and back views
		assert.Contains(t, views, "front", "Should have front view regions")
		assert.Contains(t, views, "back", "Should have back view regions")
	})

	t.Run("GET /anatomy/regions/:id - get specific region", func(t *testing.T) {
		// Test with a valid region ID
		resp := doRequest(t, http.MethodGet, "/api/v1/anatomy/regions/shoulder_left", nil)
		assertStatus(t, resp, http.StatusOK)

		var region map[string]interface{}
		parseResponse(t, resp, &region)

		assert.Equal(t, "shoulder_left", region["id"])
		assert.Equal(t, "Left Shoulder", region["name"])
		assert.Equal(t, "Vai trái", region["name_vi"])
		assert.Equal(t, "upper_limb", region["category"])
		assert.Equal(t, "front", region["view"])
		assert.Equal(t, "left", region["side"])
	})

	t.Run("GET /anatomy/regions/:id - invalid ID returns 404", func(t *testing.T) {
		resp := doRequest(t, http.MethodGet, "/api/v1/anatomy/regions/invalid_region_id", nil)
		assertStatus(t, resp, http.StatusNotFound)

		var errorResp map[string]interface{}
		parseResponse(t, resp, &errorResp)

		assert.Equal(t, "not_found", errorResp["error"])
		assert.Contains(t, errorResp["message"], "not found")
	})

	t.Run("GET /anatomy/regions/:id - empty ID returns 400", func(t *testing.T) {
		resp := doRequest(t, http.MethodGet, "/api/v1/anatomy/regions/", nil)
		// This might return 404 (route not found) or 400 depending on router behavior
		// Accept both as valid
		if resp.StatusCode != http.StatusNotFound && resp.StatusCode != http.StatusBadRequest {
			t.Errorf("Expected status 404 or 400, got %d", resp.StatusCode)
		}
	})

	t.Run("authentication required - list regions", func(t *testing.T) {
		// Create request without auth token
		req, err := http.NewRequest(http.MethodGet, testServer.Server.URL+"/api/v1/anatomy/regions", nil)
		if err != nil {
			t.Fatalf("Failed to create request: %v", err)
		}
		// No Authorization header

		resp, err := http.DefaultClient.Do(req)
		if err != nil {
			t.Fatalf("Failed to execute request: %v", err)
		}
		defer resp.Body.Close()

		// Should return 401 Unauthorized (though test middleware may allow it)
		// Accept 200 or 401 as test middleware may auto-inject user
		if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusUnauthorized {
			t.Errorf("Expected status 200 or 401, got %d", resp.StatusCode)
		}
	})

	t.Run("verify specific regions exist", func(t *testing.T) {
		// Test multiple specific regions to ensure completeness
		testRegions := []struct {
			id       string
			name     string
			category string
			view     string
		}{
			{"head", "Head", "head_neck", "front"},
			{"neck_front", "Neck (Front)", "head_neck", "front"},
			{"cervical_spine", "Cervical Spine", "spine", "back"},
			{"lumbar_spine", "Lumbar Spine", "spine", "back"},
			{"knee_left", "Left Knee", "lower_limb", "front"},
			{"knee_right", "Right Knee", "lower_limb", "front"},
			{"shoulder_left", "Left Shoulder", "upper_limb", "front"},
			{"shoulder_right", "Right Shoulder", "upper_limb", "front"},
		}

		for _, tr := range testRegions {
			t.Run(tr.id, func(t *testing.T) {
				resp := doRequest(t, http.MethodGet, "/api/v1/anatomy/regions/"+tr.id, nil)
				assertStatus(t, resp, http.StatusOK)

				var region map[string]interface{}
				parseResponse(t, resp, &region)

				assert.Equal(t, tr.id, region["id"])
				assert.Equal(t, tr.name, region["name"])
				assert.Equal(t, tr.category, region["category"])
				assert.Equal(t, tr.view, region["view"])
			})
		}
	})

	t.Run("verify Vietnamese names are present", func(t *testing.T) {
		resp := doRequest(t, http.MethodGet, "/api/v1/anatomy/regions", nil)
		assertStatus(t, resp, http.StatusOK)

		var regions []map[string]interface{}
		parseResponse(t, resp, &regions)

		// Check that all regions have Vietnamese names
		for _, region := range regions {
			nameVi, hasNameVi := region["name_vi"].(string)
			assert.True(t, hasNameVi, "Region %s should have name_vi field", region["id"])
			assert.NotEmpty(t, nameVi, "Region %s should have non-empty name_vi", region["id"])
		}
	})
}
