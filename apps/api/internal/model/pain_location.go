package model

import (
	"encoding/json"
)

// PainRegion represents a single pain location marked on the anatomy diagram.
type PainRegion struct {
	ID          string `json:"id" validate:"required"`
	Severity    int    `json:"severity" validate:"min=0,max=10"`
	Description string `json:"description,omitempty" validate:"max=500"`
}

// PainLocationData holds all pain locations for a visit.
// Stored as JSONB in the treatment_sessions table.
type PainLocationData struct {
	Regions []PainRegion `json:"regions"`
}

// PainLocationDataFromJSON parses JSONB data into PainLocationData.
func PainLocationDataFromJSON(data json.RawMessage) (*PainLocationData, error) {
	if data == nil || len(data) == 0 {
		return &PainLocationData{Regions: []PainRegion{}}, nil
	}
	var pld PainLocationData
	if err := json.Unmarshal(data, &pld); err != nil {
		return nil, err
	}
	if pld.Regions == nil {
		pld.Regions = []PainRegion{}
	}
	return &pld, nil
}

// ToJSON serializes PainLocationData to JSON for database storage.
func (p *PainLocationData) ToJSON() (json.RawMessage, error) {
	if p == nil {
		return json.Marshal(&PainLocationData{Regions: []PainRegion{}})
	}
	if p.Regions == nil {
		p.Regions = []PainRegion{}
	}
	return json.Marshal(p)
}

// UpdatePainLocationsRequest is the request body for updating pain locations on a visit.
type UpdatePainLocationsRequest struct {
	SessionID string       `json:"session_id" validate:"required,uuid"`
	Regions   []PainRegion `json:"regions" validate:"required,dive"`
}

// PainLocationsResponse is the API response for pain location data.
type PainLocationsResponse struct {
	SessionID string       `json:"session_id"`
	Regions   []PainRegion `json:"regions"`
}

// ValidAnatomyRegions lists all valid anatomy region IDs.
var ValidAnatomyRegions = map[string]bool{
	// Front view
	"head":                    true,
	"neck_front":              true,
	"shoulder_left":           true,
	"shoulder_right":          true,
	"upper_arm_left_front":    true,
	"upper_arm_right_front":   true,
	"elbow_left":              true,
	"elbow_right":             true,
	"forearm_left":            true,
	"forearm_right":           true,
	"wrist_hand_left":         true,
	"wrist_hand_right":        true,
	"chest_left":              true,
	"chest_right":             true,
	"abdomen_upper":           true,
	"abdomen_lower":           true,
	"hip_left":                true,
	"hip_right":               true,
	"groin_left":              true,
	"groin_right":             true,
	"thigh_left_front":        true,
	"thigh_right_front":       true,
	"knee_left":               true,
	"knee_right":              true,
	"lower_leg_left_front":    true,
	"lower_leg_right_front":   true,
	"ankle_left":              true,
	"ankle_right":             true,
	"foot_left":               true,
	"foot_right":              true,
	// Back view
	"neck_back":               true,
	"cervical_spine":          true,
	"thoracic_spine_upper":    true,
	"thoracic_spine_lower":    true,
	"lumbar_spine":            true,
	"sacrum":                  true,
	"upper_arm_left_back":     true,
	"upper_arm_right_back":    true,
	"gluteal_left":            true,
	"gluteal_right":           true,
	"thigh_left_back":         true,
	"thigh_right_back":        true,
	"knee_left_back":          true,
	"knee_right_back":         true,
	"calf_left":               true,
	"calf_right":              true,
}

// ValidateRegionID checks if a region ID is valid.
func ValidateRegionID(id string) bool {
	return ValidAnatomyRegions[id]
}
