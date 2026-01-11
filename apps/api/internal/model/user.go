package model

import "time"

// User represents a user in the system.
type User struct {
	ID            string    `json:"id" db:"id"`
	TenantID      string    `json:"tenant_id" db:"tenant_id"`
	ClinicID      string    `json:"clinic_id,omitempty" db:"clinic_id"`
	KeycloakID    string    `json:"keycloak_id" db:"keycloak_id"`
	Email         string    `json:"email" db:"email"`
	Username      string    `json:"username" db:"username"`
	FirstName     string    `json:"first_name" db:"first_name"`
	LastName      string    `json:"last_name" db:"last_name"`
	Roles         []string  `json:"roles" db:"-"`
	Active        bool      `json:"active" db:"active"`
	EmailVerified bool      `json:"email_verified" db:"email_verified"`
	Locale        string    `json:"locale" db:"locale"`
	CreatedAt     time.Time `json:"created_at" db:"created_at"`
	UpdatedAt     time.Time `json:"updated_at" db:"updated_at"`
}

// FullName returns the user's full name.
func (u *User) FullName() string {
	if u.FirstName == "" && u.LastName == "" {
		return u.Username
	}
	return u.FirstName + " " + u.LastName
}

// HasRole checks if the user has a specific role.
func (u *User) HasRole(role string) bool {
	for _, r := range u.Roles {
		if r == role {
			return true
		}
	}
	return false
}

// HasAnyRole checks if the user has any of the specified roles.
func (u *User) HasAnyRole(roles ...string) bool {
	for _, role := range roles {
		if u.HasRole(role) {
			return true
		}
	}
	return false
}

// Role constants
const (
	RoleSuperAdmin  = "super_admin"
	RoleClinicAdmin = "clinic_admin"
	RoleTherapist   = "therapist"
	RoleAssistant   = "assistant"
	RoleFrontDesk   = "front_desk"
	RolePatient     = "patient"
)

// StaffRoles contains all staff roles (non-patient).
var StaffRoles = []string{
	RoleSuperAdmin,
	RoleClinicAdmin,
	RoleTherapist,
	RoleAssistant,
	RoleFrontDesk,
}

// AdminRoles contains admin-level roles.
var AdminRoles = []string{
	RoleSuperAdmin,
	RoleClinicAdmin,
}

// ClinicalRoles contains roles that can access clinical data.
var ClinicalRoles = []string{
	RoleSuperAdmin,
	RoleClinicAdmin,
	RoleTherapist,
	RoleAssistant,
}

// IsStaff checks if the user is a staff member.
func (u *User) IsStaff() bool {
	return u.HasAnyRole(StaffRoles...)
}

// IsAdmin checks if the user has admin privileges.
func (u *User) IsAdmin() bool {
	return u.HasAnyRole(AdminRoles...)
}

// IsClinical checks if the user can access clinical data.
func (u *User) IsClinical() bool {
	return u.HasAnyRole(ClinicalRoles...)
}

// Tenant represents a tenant (clinic organization) in the multi-tenant system.
type Tenant struct {
	ID        string    `json:"id" db:"id"`
	Name      string    `json:"name" db:"name"`
	Subdomain string    `json:"subdomain" db:"subdomain"`
	Active    bool      `json:"active" db:"active"`
	Settings  *Settings `json:"settings,omitempty" db:"-"`
	CreatedAt time.Time `json:"created_at" db:"created_at"`
	UpdatedAt time.Time `json:"updated_at" db:"updated_at"`
}

// Settings represents tenant-specific settings.
type Settings struct {
	Timezone     string `json:"timezone"`
	Locale       string `json:"locale"`
	Currency     string `json:"currency"`
	DateFormat   string `json:"date_format"`
	TimeFormat   string `json:"time_format"`
	WorkingHours struct {
		Start string   `json:"start"`
		End   string   `json:"end"`
		Days  []string `json:"days"`
	} `json:"working_hours"`
}

// Clinic represents a physical clinic location within a tenant.
type Clinic struct {
	ID        string    `json:"id" db:"id"`
	TenantID  string    `json:"tenant_id" db:"tenant_id"`
	Name      string    `json:"name" db:"name"`
	Address   string    `json:"address" db:"address"`
	Phone     string    `json:"phone" db:"phone"`
	Email     string    `json:"email" db:"email"`
	Active    bool      `json:"active" db:"active"`
	CreatedAt time.Time `json:"created_at" db:"created_at"`
	UpdatedAt time.Time `json:"updated_at" db:"updated_at"`
}
