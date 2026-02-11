/**
 * BHYT Claim Submission types for PhysioFlow EMR
 *
 * Types for VSS (Vietnam Social Security) claim file generation
 * per Decision 5937/QD-BHXH.
 */

// -----------------------------------------------------------------------------
// Enums
// -----------------------------------------------------------------------------

export type BHYTClaimStatus = 'pending' | 'submitted' | 'approved' | 'rejected';

// -----------------------------------------------------------------------------
// Core Types
// -----------------------------------------------------------------------------

export interface BHYTClaim {
  id: string;
  clinicId: string;
  facilityCode: string;
  month: number;
  year: number;
  filePath?: string;
  fileName?: string;
  status: BHYTClaimStatus;
  totalAmount: number;
  totalInsuranceAmount: number;
  totalPatientAmount: number;
  lineItemCount: number;
  rejectionReason?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  submittedAt?: string;
  approvedAt?: string;
  rejectedAt?: string;
  lineItems?: BHYTClaimLineItem[];
}

export interface BHYTClaimLineItem {
  id: string;
  claimId: string;
  invoiceId?: string;
  patientId: string;
  patientName: string;
  bhytCardNumber: string;
  serviceCode: string;
  serviceNameVi: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  insurancePaid: number;
  patientPaid: number;
  serviceDate: string;
}

// -----------------------------------------------------------------------------
// API Response Types (snake_case from backend)
// -----------------------------------------------------------------------------

export interface ApiBHYTClaim {
  id: string;
  clinic_id: string;
  facility_code: string;
  month: number;
  year: number;
  file_path?: string;
  file_name?: string;
  status: BHYTClaimStatus;
  total_amount: number;
  total_insurance_amount: number;
  total_patient_amount: number;
  line_item_count: number;
  rejection_reason?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  submitted_at?: string;
  approved_at?: string;
  rejected_at?: string;
  line_items?: ApiBHYTClaimLineItem[];
}

export interface ApiBHYTClaimLineItem {
  id: string;
  claim_id: string;
  invoice_id?: string;
  patient_id: string;
  patient_name: string;
  bhyt_card_number: string;
  service_code: string;
  service_name_vi: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  insurance_paid: number;
  patient_paid: number;
  service_date: string;
}

// -----------------------------------------------------------------------------
// Request Types
// -----------------------------------------------------------------------------

export interface GenerateClaimRequest {
  facilityCode: string;
  month: number;
  year: number;
}

// -----------------------------------------------------------------------------
// Query Types
// -----------------------------------------------------------------------------

export interface BHYTClaimSearchParams {
  facilityCode?: string;
  status?: BHYTClaimStatus;
  year?: number;
  month?: number;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface BHYTClaimListResponse {
  data: BHYTClaim[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}
