/**
 * Medical Terms types for PhysioFlow EMR
 *
 * Bilingual medical terminology with Vietnamese translations
 * and ICD-10 code associations.
 */

// -----------------------------------------------------------------------------
// Enums
// -----------------------------------------------------------------------------

export type TermCategory =
  | 'anatomy'
  | 'symptom'
  | 'condition'
  | 'treatment';

// -----------------------------------------------------------------------------
// Core Types
// -----------------------------------------------------------------------------

export interface MedicalTerm {
  id: string;
  termEn: string;
  termVi: string;
  definitionEn?: string;
  definitionVi?: string;
  category: TermCategory;
  icd10Code?: string;
  synonymsEn?: string[];
  synonymsVi?: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
}

export interface TermSearchResult {
  term: MedicalTerm;
  similarity: number;
}

// -----------------------------------------------------------------------------
// Request Types
// -----------------------------------------------------------------------------

export interface CreateMedicalTermRequest {
  termEn: string;
  termVi: string;
  definitionEn?: string;
  definitionVi?: string;
  category: TermCategory;
  icd10Code?: string;
  synonymsEn?: string[];
  synonymsVi?: string[];
}

export interface UpdateMedicalTermRequest {
  termEn?: string;
  termVi?: string;
  definitionEn?: string;
  definitionVi?: string;
  category?: TermCategory;
  icd10Code?: string;
  synonymsEn?: string[];
  synonymsVi?: string[];
  isActive?: boolean;
}

// -----------------------------------------------------------------------------
// Query Types
// -----------------------------------------------------------------------------

export interface MedicalTermSearchParams {
  query?: string;
  category?: TermCategory;
  icd10Code?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
}
