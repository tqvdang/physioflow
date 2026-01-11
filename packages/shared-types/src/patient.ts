/**
 * Patient-related types for PhysioFlow EMR
 */

// -----------------------------------------------------------------------------
// Enums
// -----------------------------------------------------------------------------

export type Gender = 'male' | 'female' | 'other' | 'prefer_not_to_say';

export type LanguagePreference = 'vi' | 'en';

// -----------------------------------------------------------------------------
// Core Types
// -----------------------------------------------------------------------------

export interface EmergencyContact {
  name: string;
  phone: string;
  relationship: string;
}

export interface Patient {
  id: string;
  clinicId: string;
  mrn: string;
  firstName: string;
  lastName: string;
  firstNameVi?: string;
  lastNameVi?: string;
  dateOfBirth: string;
  gender: Gender;
  phone?: string;
  email?: string;
  address?: string;
  addressVi?: string;
  languagePreference: LanguagePreference;
  emergencyContact?: EmergencyContact;
  medicalAlerts?: string[];
  notes?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
}

// -----------------------------------------------------------------------------
// Insurance Types
// -----------------------------------------------------------------------------

export type InsuranceProviderType = 'BHYT' | 'private' | 'corporate';

export type InsuranceVerificationStatus = 'pending' | 'verified' | 'failed' | 'expired';

export interface InsuranceInfo {
  id: string;
  patientId: string;
  provider: string;
  providerType: InsuranceProviderType;
  policyNumber: string;
  groupNumber?: string;
  coveragePercentage: number;
  copayAmount?: number;
  validFrom: string;
  validTo?: string;
  isPrimary: boolean;
  isActive: boolean;
  verificationStatus: InsuranceVerificationStatus;
  verificationDate?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
}

// -----------------------------------------------------------------------------
// Request/Response Types
// -----------------------------------------------------------------------------

export interface CreatePatientRequest {
  clinicId: string;
  mrn: string;
  firstName: string;
  lastName: string;
  firstNameVi?: string;
  lastNameVi?: string;
  dateOfBirth: string;
  gender: Gender;
  phone?: string;
  email?: string;
  address?: string;
  addressVi?: string;
  languagePreference?: LanguagePreference;
  emergencyContact?: EmergencyContact;
  medicalAlerts?: string[];
  notes?: string;
}

export interface UpdatePatientRequest {
  firstName?: string;
  lastName?: string;
  firstNameVi?: string;
  lastNameVi?: string;
  dateOfBirth?: string;
  gender?: Gender;
  phone?: string;
  email?: string;
  address?: string;
  addressVi?: string;
  languagePreference?: LanguagePreference;
  emergencyContact?: EmergencyContact;
  medicalAlerts?: string[];
  notes?: string;
  isActive?: boolean;
}

export interface CreateInsuranceRequest {
  patientId: string;
  provider: string;
  providerType: InsuranceProviderType;
  policyNumber: string;
  groupNumber?: string;
  coveragePercentage: number;
  copayAmount?: number;
  validFrom: string;
  validTo?: string;
  isPrimary?: boolean;
  notes?: string;
}

export interface UpdateInsuranceRequest {
  provider?: string;
  providerType?: InsuranceProviderType;
  policyNumber?: string;
  groupNumber?: string;
  coveragePercentage?: number;
  copayAmount?: number;
  validFrom?: string;
  validTo?: string;
  isPrimary?: boolean;
  isActive?: boolean;
  notes?: string;
}

// -----------------------------------------------------------------------------
// Query Types
// -----------------------------------------------------------------------------

export interface PatientSearchParams {
  clinicId: string;
  query?: string;
  mrn?: string;
  phone?: string;
  email?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
}
