package model

import (
	"database/sql/driver"
	"encoding/json"
	"time"
)

// FeatureFlag represents a feature flag for gradual rollout
type FeatureFlag struct {
	ID                 int       `json:"id" db:"id"`
	Name               string    `json:"name" db:"name"`
	Description        string    `json:"description" db:"description"`
	Enabled            bool      `json:"enabled" db:"enabled"`
	RolloutPercentage  int       `json:"rollout_percentage" db:"rollout_percentage"`
	Environment        *string   `json:"environment,omitempty" db:"environment"`
	CreatedAt          time.Time `json:"created_at" db:"created_at"`
	UpdatedAt          time.Time `json:"updated_at" db:"updated_at"`
	CreatedBy          *string   `json:"created_by,omitempty" db:"created_by"`
	Metadata           Metadata  `json:"metadata" db:"metadata"`
}

// FeatureFlagUpdate represents fields that can be updated
type FeatureFlagUpdate struct {
	Description       *string `json:"description,omitempty"`
	Enabled           *bool   `json:"enabled,omitempty"`
	RolloutPercentage *int    `json:"rollout_percentage,omitempty"`
	Environment       *string `json:"environment,omitempty"`
	UpdatedBy         string  `json:"-"`
}

// FeatureFlagAuditLog tracks changes to feature flags
type FeatureFlagAuditLog struct {
	ID            int       `json:"id" db:"id"`
	FeatureFlagID int       `json:"feature_flag_id" db:"feature_flag_id"`
	Action        string    `json:"action" db:"action"`
	OldValue      *Metadata `json:"old_value,omitempty" db:"old_value"`
	NewValue      *Metadata `json:"new_value,omitempty" db:"new_value"`
	ChangedBy     *string   `json:"changed_by,omitempty" db:"changed_by"`
	ChangedAt     time.Time `json:"changed_at" db:"changed_at"`
	IPAddress     *string   `json:"ip_address,omitempty" db:"ip_address"`
	UserAgent     *string   `json:"user_agent,omitempty" db:"user_agent"`
}

// Metadata is a flexible JSON field for additional data
type Metadata map[string]interface{}

// Value implements driver.Valuer for database storage
func (m Metadata) Value() (driver.Value, error) {
	if m == nil {
		return "{}", nil
	}
	return json.Marshal(m)
}

// Scan implements sql.Scanner for database retrieval
func (m *Metadata) Scan(value interface{}) error {
	if value == nil {
		*m = Metadata{}
		return nil
	}

	bytes, ok := value.([]byte)
	if !ok {
		return json.Unmarshal([]byte(value.(string)), m)
	}
	return json.Unmarshal(bytes, m)
}

// IsEnabledForUser checks if a feature is enabled for a specific user
// Uses consistent hashing based on user ID for rollout percentage
func (f *FeatureFlag) IsEnabledForUser(userID string) bool {
	if !f.Enabled {
		return false
	}

	if f.RolloutPercentage >= 100 {
		return true
	}

	if f.RolloutPercentage <= 0 {
		return false
	}

	// Simple hash function for consistent user distribution
	hash := 0
	for _, char := range userID {
		hash = (hash*31 + int(char)) % 100
	}

	return hash < f.RolloutPercentage
}

// FeatureFlagRepository defines the interface for feature flag operations
type FeatureFlagRepository interface {
	GetAll(environment string) ([]FeatureFlag, error)
	GetByName(name string) (*FeatureFlag, error)
	Update(id int, update FeatureFlagUpdate) (*FeatureFlag, error)
	Create(flag FeatureFlag) (*FeatureFlag, error)
	Delete(id int) error
	GetAuditLog(featureFlagID int, limit int) ([]FeatureFlagAuditLog, error)
	LogChange(flagID int, action string, oldValue, newValue *Metadata, changedBy, ipAddress, userAgent string) error
}
