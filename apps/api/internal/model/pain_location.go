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

// AnatomyRegion represents detailed metadata for an anatomy region.
type AnatomyRegion struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	NameVi      string `json:"name_vi"`
	Category    string `json:"category"` // "upper_limb", "lower_limb", "spine", "trunk", "head_neck"
	View        string `json:"view"`     // "front" or "back"
	Side        string `json:"side"`     // "left", "right", or "bilateral"
	Description string `json:"description,omitempty"`
}

// AnatomyRegionsMetadata contains detailed information for all anatomy regions.
var AnatomyRegionsMetadata = []AnatomyRegion{
	// Head and Neck - Front View
	{ID: "head", Name: "Head", NameVi: "Đầu", Category: "head_neck", View: "front", Side: "bilateral", Description: "Cranial region including forehead, temples, and scalp"},
	{ID: "neck_front", Name: "Neck (Front)", NameVi: "Cổ (Phía trước)", Category: "head_neck", View: "front", Side: "bilateral", Description: "Anterior cervical region"},

	// Upper Limb - Front View
	{ID: "shoulder_left", Name: "Left Shoulder", NameVi: "Vai trái", Category: "upper_limb", View: "front", Side: "left", Description: "Left glenohumeral joint and deltoid region"},
	{ID: "shoulder_right", Name: "Right Shoulder", NameVi: "Vai phải", Category: "upper_limb", View: "front", Side: "right", Description: "Right glenohumeral joint and deltoid region"},
	{ID: "upper_arm_left_front", Name: "Left Upper Arm (Front)", NameVi: "Cánh tay trên trái (Phía trước)", Category: "upper_limb", View: "front", Side: "left", Description: "Left anterior brachial region"},
	{ID: "upper_arm_right_front", Name: "Right Upper Arm (Front)", NameVi: "Cánh tay trên phải (Phía trước)", Category: "upper_limb", View: "front", Side: "right", Description: "Right anterior brachial region"},
	{ID: "elbow_left", Name: "Left Elbow", NameVi: "Khuỷu tay trái", Category: "upper_limb", View: "front", Side: "left", Description: "Left cubital region"},
	{ID: "elbow_right", Name: "Right Elbow", NameVi: "Khuỷu tay phải", Category: "upper_limb", View: "front", Side: "right", Description: "Right cubital region"},
	{ID: "forearm_left", Name: "Left Forearm", NameVi: "Cẳng tay trái", Category: "upper_limb", View: "front", Side: "left", Description: "Left antebrachial region"},
	{ID: "forearm_right", Name: "Right Forearm", NameVi: "Cẳng tay phải", Category: "upper_limb", View: "front", Side: "right", Description: "Right antebrachial region"},
	{ID: "wrist_hand_left", Name: "Left Wrist & Hand", NameVi: "Cổ tay & Bàn tay trái", Category: "upper_limb", View: "front", Side: "left", Description: "Left carpal and hand region"},
	{ID: "wrist_hand_right", Name: "Right Wrist & Hand", NameVi: "Cổ tay & Bàn tay phải", Category: "upper_limb", View: "front", Side: "right", Description: "Right carpal and hand region"},

	// Trunk - Front View
	{ID: "chest_left", Name: "Left Chest", NameVi: "Ngực trái", Category: "trunk", View: "front", Side: "left", Description: "Left thoracic region"},
	{ID: "chest_right", Name: "Right Chest", NameVi: "Ngực phải", Category: "trunk", View: "front", Side: "right", Description: "Right thoracic region"},
	{ID: "abdomen_upper", Name: "Upper Abdomen", NameVi: "Bụng trên", Category: "trunk", View: "front", Side: "bilateral", Description: "Epigastric and umbilical region"},
	{ID: "abdomen_lower", Name: "Lower Abdomen", NameVi: "Bụng dưới", Category: "trunk", View: "front", Side: "bilateral", Description: "Hypogastric and pelvic region"},

	// Lower Limb - Front View
	{ID: "hip_left", Name: "Left Hip", NameVi: "Hông trái", Category: "lower_limb", View: "front", Side: "left", Description: "Left hip joint and anterior pelvic region"},
	{ID: "hip_right", Name: "Right Hip", NameVi: "Hông phải", Category: "lower_limb", View: "front", Side: "right", Description: "Right hip joint and anterior pelvic region"},
	{ID: "groin_left", Name: "Left Groin", NameVi: "Bẹn trái", Category: "lower_limb", View: "front", Side: "left", Description: "Left inguinal region"},
	{ID: "groin_right", Name: "Right Groin", NameVi: "Bẹn phải", Category: "lower_limb", View: "front", Side: "right", Description: "Right inguinal region"},
	{ID: "thigh_left_front", Name: "Left Thigh (Front)", NameVi: "Đùi trái (Phía trước)", Category: "lower_limb", View: "front", Side: "left", Description: "Left anterior femoral region"},
	{ID: "thigh_right_front", Name: "Right Thigh (Front)", NameVi: "Đùi phải (Phía trước)", Category: "lower_limb", View: "front", Side: "right", Description: "Right anterior femoral region"},
	{ID: "knee_left", Name: "Left Knee", NameVi: "Gối trái", Category: "lower_limb", View: "front", Side: "left", Description: "Left patellofemoral and tibiofemoral joint"},
	{ID: "knee_right", Name: "Right Knee", NameVi: "Gối phải", Category: "lower_limb", View: "front", Side: "right", Description: "Right patellofemoral and tibiofemoral joint"},
	{ID: "lower_leg_left_front", Name: "Left Lower Leg (Front)", NameVi: "Chân dưới trái (Phía trước)", Category: "lower_limb", View: "front", Side: "left", Description: "Left anterior tibial region"},
	{ID: "lower_leg_right_front", Name: "Right Lower Leg (Front)", NameVi: "Chân dưới phải (Phía trước)", Category: "lower_limb", View: "front", Side: "right", Description: "Right anterior tibial region"},
	{ID: "ankle_left", Name: "Left Ankle", NameVi: "Cổ chân trái", Category: "lower_limb", View: "front", Side: "left", Description: "Left ankle joint"},
	{ID: "ankle_right", Name: "Right Ankle", NameVi: "Cổ chân phải", Category: "lower_limb", View: "front", Side: "right", Description: "Right ankle joint"},
	{ID: "foot_left", Name: "Left Foot", NameVi: "Bàn chân trái", Category: "lower_limb", View: "front", Side: "left", Description: "Left foot"},
	{ID: "foot_right", Name: "Right Foot", NameVi: "Bàn chân phải", Category: "lower_limb", View: "front", Side: "right", Description: "Right foot"},

	// Head and Neck - Back View
	{ID: "neck_back", Name: "Neck (Back)", NameVi: "Cổ (Phía sau)", Category: "head_neck", View: "back", Side: "bilateral", Description: "Posterior cervical region"},

	// Spine - Back View
	{ID: "cervical_spine", Name: "Cervical Spine", NameVi: "Cột sống cổ", Category: "spine", View: "back", Side: "bilateral", Description: "C1-C7 vertebrae"},
	{ID: "thoracic_spine_upper", Name: "Upper Thoracic Spine", NameVi: "Cột sống ngực trên", Category: "spine", View: "back", Side: "bilateral", Description: "T1-T6 vertebrae"},
	{ID: "thoracic_spine_lower", Name: "Lower Thoracic Spine", NameVi: "Cột sống ngực dưới", Category: "spine", View: "back", Side: "bilateral", Description: "T7-T12 vertebrae"},
	{ID: "lumbar_spine", Name: "Lumbar Spine", NameVi: "Cột sống thắt lưng", Category: "spine", View: "back", Side: "bilateral", Description: "L1-L5 vertebrae"},
	{ID: "sacrum", Name: "Sacrum", NameVi: "Xương cùng", Category: "spine", View: "back", Side: "bilateral", Description: "Sacral region"},

	// Upper Limb - Back View
	{ID: "upper_arm_left_back", Name: "Left Upper Arm (Back)", NameVi: "Cánh tay trên trái (Phía sau)", Category: "upper_limb", View: "back", Side: "left", Description: "Left posterior brachial region"},
	{ID: "upper_arm_right_back", Name: "Right Upper Arm (Back)", NameVi: "Cánh tay trên phải (Phía sau)", Category: "upper_limb", View: "back", Side: "right", Description: "Right posterior brachial region"},

	// Lower Limb - Back View
	{ID: "gluteal_left", Name: "Left Gluteal", NameVi: "Mông trái", Category: "lower_limb", View: "back", Side: "left", Description: "Left buttock region"},
	{ID: "gluteal_right", Name: "Right Gluteal", NameVi: "Mông phải", Category: "lower_limb", View: "back", Side: "right", Description: "Right buttock region"},
	{ID: "thigh_left_back", Name: "Left Thigh (Back)", NameVi: "Đùi trái (Phía sau)", Category: "lower_limb", View: "back", Side: "left", Description: "Left posterior femoral region"},
	{ID: "thigh_right_back", Name: "Right Thigh (Back)", NameVi: "Đùi phải (Phía sau)", Category: "lower_limb", View: "back", Side: "right", Description: "Right posterior femoral region"},
	{ID: "knee_left_back", Name: "Left Knee (Back)", NameVi: "Gối trái (Phía sau)", Category: "lower_limb", View: "back", Side: "left", Description: "Left popliteal region"},
	{ID: "knee_right_back", Name: "Right Knee (Back)", NameVi: "Gối phải (Phía sau)", Category: "lower_limb", View: "back", Side: "right", Description: "Right popliteal region"},
	{ID: "calf_left", Name: "Left Calf", NameVi: "Bắp chân trái", Category: "lower_limb", View: "back", Side: "left", Description: "Left posterior leg region"},
	{ID: "calf_right", Name: "Right Calf", NameVi: "Bắp chân phải", Category: "lower_limb", View: "back", Side: "right", Description: "Right posterior leg region"},
}

// GetAllAnatomyRegions returns all anatomy regions with metadata.
func GetAllAnatomyRegions() []AnatomyRegion {
	return AnatomyRegionsMetadata
}

// GetAnatomyRegion returns a specific anatomy region by ID.
func GetAnatomyRegion(id string) (AnatomyRegion, bool) {
	for _, region := range AnatomyRegionsMetadata {
		if region.ID == id {
			return region, true
		}
	}
	return AnatomyRegion{}, false
}
