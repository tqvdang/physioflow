package service

import (
	"context"
	"encoding/xml"
	"fmt"
	"math"
	"time"

	"github.com/google/uuid"
	"github.com/rs/zerolog/log"

	"github.com/tqvdang/physioflow/apps/api/internal/model"
	"github.com/tqvdang/physioflow/apps/api/internal/repository"
)

// BHYTClaimService defines the interface for BHYT claim business logic.
type BHYTClaimService interface {
	// GenerateClaimFile queries billable services, builds XML per VSS spec, and stores the claim.
	GenerateClaimFile(ctx context.Context, clinicID, userID string, req *model.GenerateClaimRequest) (*model.BHYTClaim, error)

	// GetClaim retrieves a claim by ID with line items.
	GetClaim(ctx context.Context, id string) (*model.BHYTClaim, error)

	// ListClaims retrieves a paginated list of claims.
	ListClaims(ctx context.Context, params model.BHYTClaimSearchParams) (*model.BHYTClaimListResponse, error)

	// GetClaimXML generates XML bytes for a claim.
	GetClaimXML(ctx context.Context, id string) ([]byte, string, error)

	// UpdateClaimStatus updates claim status (for future VSS API integration).
	UpdateClaimStatus(ctx context.Context, id string, status model.BHYTClaimStatus, userID string) error
}

// bhytClaimService implements BHYTClaimService.
type bhytClaimService struct {
	claimRepo repository.BHYTClaimRepository
}

// NewBHYTClaimService creates a new BHYT claim service.
func NewBHYTClaimService(claimRepo repository.BHYTClaimRepository) BHYTClaimService {
	return &bhytClaimService{
		claimRepo: claimRepo,
	}
}

// GenerateClaimFile queries all billable services with BHYT coverage for a given
// facility/month/year, builds VSS-compliant XML, stores the claim record, and
// returns the claim with line items.
func (s *bhytClaimService) GenerateClaimFile(ctx context.Context, clinicID, userID string, req *model.GenerateClaimRequest) (*model.BHYTClaim, error) {
	// Query billable services for the period
	billableItems, err := s.claimRepo.GetBillableServices(ctx, clinicID, req.FacilityCode, req.Month, req.Year)
	if err != nil {
		return nil, fmt.Errorf("failed to query billable services: %w", err)
	}

	if len(billableItems) == 0 {
		return nil, fmt.Errorf("no billable services found for facility %s in %02d/%d", req.FacilityCode, req.Month, req.Year)
	}

	// Calculate totals
	var totalAmount, totalInsurance, totalPatient float64
	for _, item := range billableItems {
		totalAmount += item.TotalPrice
		totalInsurance += item.InsurancePaid
		totalPatient += item.PatientPaid
	}

	// Create claim record
	claimID := uuid.New().String()
	claim := &model.BHYTClaim{
		ID:                   claimID,
		ClinicID:             clinicID,
		FacilityCode:         req.FacilityCode,
		Month:                req.Month,
		Year:                 req.Year,
		Status:               model.BHYTClaimStatusPending,
		TotalAmount:          roundToVND(totalAmount),
		TotalInsuranceAmount: roundToVND(totalInsurance),
		TotalPatientAmount:   roundToVND(totalPatient),
		LineItemCount:        len(billableItems),
		CreatedBy:            &userID,
	}
	claim.FileName = claim.GenerateFileName()
	claim.FilePath = fmt.Sprintf("claims/%d/%02d/%s", req.Year, req.Month, claim.FileName)

	if err := s.claimRepo.CreateClaim(ctx, claim); err != nil {
		return nil, fmt.Errorf("failed to create claim record: %w", err)
	}

	// Create line items with references to the claim
	lineItems := make([]model.BHYTClaimLineItem, len(billableItems))
	for i, item := range billableItems {
		lineItems[i] = model.BHYTClaimLineItem{
			ID:             uuid.New().String(),
			ClaimID:        claimID,
			InvoiceID:      item.InvoiceID,
			PatientID:      item.PatientID,
			PatientName:    item.PatientName,
			BHYTCardNumber: item.BHYTCardNumber,
			ServiceCode:    item.ServiceCode,
			ServiceNameVi:  item.ServiceNameVi,
			Quantity:       item.Quantity,
			UnitPrice:      item.UnitPrice,
			TotalPrice:     item.TotalPrice,
			InsurancePaid:  item.InsurancePaid,
			PatientPaid:    item.PatientPaid,
			ServiceDate:    item.ServiceDate,
		}
	}

	if err := s.claimRepo.CreateLineItems(ctx, lineItems); err != nil {
		return nil, fmt.Errorf("failed to create claim line items: %w", err)
	}

	claim.LineItems = lineItems

	log.Info().
		Str("claim_id", claimID).
		Str("facility_code", req.FacilityCode).
		Int("month", req.Month).
		Int("year", req.Year).
		Int("line_items", len(lineItems)).
		Float64("total_amount", claim.TotalAmount).
		Float64("insurance_amount", claim.TotalInsuranceAmount).
		Str("file_name", claim.FileName).
		Str("created_by", userID).
		Msg("BHYT claim generated")

	return claim, nil
}

// GetClaim retrieves a claim by ID with line items.
func (s *bhytClaimService) GetClaim(ctx context.Context, id string) (*model.BHYTClaim, error) {
	return s.claimRepo.GetClaimByID(ctx, id)
}

// ListClaims retrieves a paginated list of claims.
func (s *bhytClaimService) ListClaims(ctx context.Context, params model.BHYTClaimSearchParams) (*model.BHYTClaimListResponse, error) {
	claims, total, err := s.claimRepo.ListClaims(ctx, params)
	if err != nil {
		return nil, fmt.Errorf("failed to list claims: %w", err)
	}

	totalPages := 0
	if params.Limit() > 0 {
		totalPages = int(math.Ceil(float64(total) / float64(params.Limit())))
	}

	return &model.BHYTClaimListResponse{
		Data:       claims,
		Total:      total,
		Page:       params.Page,
		PerPage:    params.Limit(),
		TotalPages: totalPages,
	}, nil
}

// GetClaimXML generates the VSS-compliant XML for a claim.
// Returns XML bytes, filename, and error.
func (s *bhytClaimService) GetClaimXML(ctx context.Context, id string) ([]byte, string, error) {
	claim, err := s.claimRepo.GetClaimByID(ctx, id)
	if err != nil {
		return nil, "", fmt.Errorf("failed to get claim: %w", err)
	}

	xmlData := BuildClaimXML(claim)
	xmlBytes, err := MarshalClaimXML(xmlData)
	if err != nil {
		return nil, "", fmt.Errorf("failed to marshal XML: %w", err)
	}

	return xmlBytes, claim.GenerateFileName(), nil
}

// UpdateClaimStatus updates the status of a claim.
func (s *bhytClaimService) UpdateClaimStatus(ctx context.Context, id string, status model.BHYTClaimStatus, userID string) error {
	return s.claimRepo.UpdateClaimStatus(ctx, id, status, &userID)
}

// BuildClaimXML builds the HoSoXML structure from a BHYTClaim.
func BuildClaimXML(claim *model.BHYTClaim) *model.HoSoXML {
	// Group line items by patient
	patientMap := make(map[string]*model.HoSoBenhNhan)
	patientOrder := make([]string, 0)

	for _, item := range claim.LineItems {
		key := item.PatientID
		if _, exists := patientMap[key]; !exists {
			patientMap[key] = &model.HoSoBenhNhan{
				MaBN:   item.PatientID,
				MaThe:  item.BHYTCardNumber,
				TenBN:  item.PatientName,
				DichVu: make([]model.ChiTietDichVu, 0),
			}
			patientOrder = append(patientOrder, key)
		}

		patientMap[key].DichVu = append(patientMap[key].DichVu, model.ChiTietDichVu{
			Ma:            item.ServiceCode,
			TenDV:         item.ServiceNameVi,
			SoLuong:       item.Quantity,
			DonGia:        item.UnitPrice,
			ThanhTien:     item.TotalPrice,
			BHYTThanhToan: item.InsurancePaid,
			BNThanhToan:   item.PatientPaid,
			NgayDV:        item.ServiceDate.Format("02/01/2006"),
		})
	}

	// Build ordered patient list
	patients := make([]model.HoSoBenhNhan, 0, len(patientOrder))
	for _, key := range patientOrder {
		patients = append(patients, *patientMap[key])
	}

	return &model.HoSoXML{
		MaCSKCB:      claim.FacilityCode,
		Thang:        claim.Month,
		Nam:          claim.Year,
		SoHoSo:       len(patients),
		TongTien:     claim.TotalAmount,
		TongBHYT:     claim.TotalInsuranceAmount,
		TongBNTT:     claim.TotalPatientAmount,
		DanhSachHoSo: patients,
	}
}

// MarshalClaimXML marshals the HoSoXML structure to XML bytes with proper encoding.
func MarshalClaimXML(data *model.HoSoXML) ([]byte, error) {
	output, err := xml.MarshalIndent(data, "", "  ")
	if err != nil {
		return nil, fmt.Errorf("failed to marshal claim XML: %w", err)
	}

	// Prepend XML declaration with UTF-8 encoding
	header := []byte(xml.Header)
	return append(header, output...), nil
}

// roundToVND rounds to whole VND (no decimals for Vietnamese Dong).
func roundToVND(amount float64) float64 {
	return math.Round(amount)
}

// ValidateClaimPeriod checks if the claim period is valid (not in the future).
func ValidateClaimPeriod(month, year int) error {
	now := time.Now()
	claimDate := time.Date(year, time.Month(month), 1, 0, 0, 0, 0, time.UTC)
	endOfMonth := claimDate.AddDate(0, 1, 0).Add(-time.Nanosecond)

	if endOfMonth.After(now) {
		return fmt.Errorf("claim period %02d/%d has not ended yet", month, year)
	}
	return nil
}
