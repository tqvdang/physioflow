/**
 * BHYT (Vietnam Social Health Insurance) types for PhysioFlow EMR
 */

// -----------------------------------------------------------------------------
// Enums
// -----------------------------------------------------------------------------

export type BHYTPrefixCode =
  | 'DN'  // Doanh nghiep (Enterprise workers)
  | 'HC'  // Hanh chinh (Civil servants)
  | 'HT'  // Huu tri (Retirees)
  | 'TE'  // Tre em (Children under 6)
  | 'HS'  // Hoc sinh (Students)
  | 'HN'  // Ho ngheo (Poor households)
  | 'CN'  // Can ngheo (Near-poor households)
  | 'TN'  // Tu nguyen (Voluntary participants)
  | 'CC'  // Chinh sach (Policy beneficiaries)
  | 'QN'  // Quan nhan (Military)
  | 'CA'  // Cuu chien binh (Veterans)
  | 'NN'  // Nguoi nuoc ngoai (Foreign workers)
  | 'GD'  // Gia dinh liet si (Martyrs' families)
  | 'NO'  // Nguoi cao tuoi 80+ (Elderly 80+)
  | 'CB'  // Thuong binh (War veterans)
  | 'XK'  // Ho ngheo / can ngheo (Poor/near-poor households)
  | 'TX'; // Bao hiem xa hoi (Social insurance)

export type BHYTCoverageLevel =
  | 100
  | 95
  | 80
  | 70
  | 40;

// -----------------------------------------------------------------------------
// Core Types
// -----------------------------------------------------------------------------

export interface BHYTCard {
  id: string;
  patientId: string;
  cardNumber: string;
  prefixCode: BHYTPrefixCode;
  beneficiaryType: number;
  provinceCode: string;
  holderName: string;
  holderNameVi: string;
  dateOfBirth: string;
  registeredFacilityCode: string;
  registeredFacilityName?: string;
  hospitalRegistrationCode?: string;
  expirationDate?: string;
  coveragePercent: BHYTCoverageLevel;
  validFrom: string;
  validTo?: string;
  copayRate: number;
  fiveYearContinuous: boolean;
  verification: 'pending' | 'verified' | 'expired' | 'invalid' | 'failed';
  isActive: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
}

export interface BHYTValidationError {
  field: string;
  message: string;
  messageVi?: string;
}

export interface BHYTCoverageDetails {
  level: BHYTCoverageLevel;
  description: string;
  descriptionVi: string;
  copayRate: number;
}

export interface BHYTValidationResult {
  cardNumber: string;
  isValid: boolean;
  verification: 'pending' | 'verified' | 'expired' | 'invalid' | 'failed';
  prefix: string;
  beneficiaryType: number;
  provinceCode: string;
  coveragePercent: number;
  isExpired: boolean;
  isContinuous: boolean;
  facilityMismatch?: boolean;
  errors: string[];
  validatedAt: string;
}

export interface CoverageCalculation {
  bhytCardId: string;
  patientId: string;
  serviceTotal: number;
  coveragePercent: number;
  insurancePays: number;
  patientPays: number;
  isCorrectFacility: boolean;
  isReferral: boolean;
  referralAdjustment?: number;
  fiveYearBonus: boolean;
  fiveYearAdjustment?: number;
  calculatedAt: string;
}

// -----------------------------------------------------------------------------
// Request Types
// -----------------------------------------------------------------------------

export interface CreateBHYTCardRequest {
  patientId: string;
  cardNumber: string;
  holderName: string;
  holderNameVi: string;
  dateOfBirth: string;
  registeredFacilityCode: string;
  registeredFacilityName?: string;
  hospitalRegistrationCode?: string;
  expirationDate?: string;
  validFrom: string;
  validTo?: string;
  fiveYearContinuous?: boolean;
  notes?: string;
}

export interface UpdateBHYTCardRequest {
  cardNumber?: string;
  holderName?: string;
  holderNameVi?: string;
  registeredFacilityCode?: string;
  registeredFacilityName?: string;
  hospitalRegistrationCode?: string;
  expirationDate?: string;
  validFrom?: string;
  validTo?: string;
  fiveYearContinuous?: boolean;
  notes?: string;
  isActive?: boolean;
}

export interface ValidateBHYTCardRequest {
  cardNumber: string;
  visitDate?: string;
}

export interface CalculateCoverageRequest {
  totalAmount: number;
  facilityCode?: string;
  isCorrectFacility?: boolean;
  isReferral?: boolean;
}
