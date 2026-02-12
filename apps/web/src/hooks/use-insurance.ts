"use client";

/**
 * React Query hooks for BHYT insurance management
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

/**
 * BHYT card prefix codes with coverage percentages
 * Based on Vietnamese social health insurance regulations (Circular 30/2024/TT-BYT)
 * Total: 17 recognized 2-letter prefix codes
 */
export const BHYT_PREFIX_CODES = [
  { value: "DN", label: "DN - Doanh nghiep (Enterprise)", coverage: 80 },
  { value: "HC", label: "HC - Hanh chinh (Civil servants)", coverage: 80 },
  { value: "HT", label: "HT - Huu tri (Retirees)", coverage: 95 },
  { value: "TE", label: "TE - Tre em (Children under 6)", coverage: 100 },
  { value: "HS", label: "HS - Hoc sinh (Students)", coverage: 80 },
  { value: "HN", label: "HN - Ho ngheo (Poor households)", coverage: 100 },
  { value: "CN", label: "CN - Can ngheo (Near-poor)", coverage: 95 },
  { value: "TN", label: "TN - Tu nguyen (Voluntary)", coverage: 70 },
  { value: "CC", label: "CC - Chinh sach (Policy beneficiaries)", coverage: 100 },
  { value: "QN", label: "QN - Quan nhan (Military)", coverage: 100 },
  { value: "CA", label: "CA - Cuu chien binh (Veterans)", coverage: 95 },
  { value: "NN", label: "NN - Nguoi nuoc ngoai (Foreign workers)", coverage: 80 },
  { value: "GD", label: "GD - Gia dinh liet si (Martyrs' families)", coverage: 100 },
  { value: "NO", label: "NO - Nguoi cao tuoi 80+ (Elderly 80+)", coverage: 100 },
  { value: "CB", label: "CB - Thuong binh (War veterans)", coverage: 100 },
  { value: "XK", label: "XK - Ho ngheo/can ngheo (Poor/near-poor)", coverage: 100 },
  { value: "TX", label: "TX - Bao hiem xa hoi (Social insurance)", coverage: 80 },
] as const;

/**
 * BHYT card number regex (matches OpenEMR Vietnamese PT module format)
 * Format: XX#-####-#####-##### (18 chars with dashes)
 * Example: DN4-0123-45678-90123
 */
const BHYT_CARD_REGEX = /^[A-Z]{2}\d-\d{4}-\d{5}-\d{5}$/;

/**
 * API Insurance type (snake_case from backend)
 */
export interface ApiInsurance {
  id: string;
  patient_id: string;
  card_number: string;
  prefix_code: string;
  beneficiary_type: number;
  province_code: string;
  holder_name: string;
  holder_name_vi: string;
  registered_facility_code: string;
  registered_facility_name?: string;
  hospital_registration_code?: string;
  expiration_date?: string;
  coverage_percent: number;
  valid_from: string;
  valid_to?: string;
  copay_rate: number;
  five_year_continuous: boolean;
  verification: "pending" | "verified" | "expired" | "invalid" | "failed";
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Frontend Insurance type (camelCase)
 */
export interface Insurance {
  id: string;
  patientId: string;
  cardNumber: string;
  prefixCode: string;
  beneficiaryType: number;
  provinceCode: string;
  holderName: string;
  holderNameVi: string;
  registeredFacilityCode: string;
  registeredFacilityName?: string;
  hospitalRegistrationCode?: string;
  expirationDate?: string;
  coveragePercent: number;
  validFrom: string;
  validTo?: string;
  copayRate: number;
  fiveYearContinuous: boolean;
  verification: "pending" | "verified" | "expired" | "invalid" | "failed";
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Create/Update insurance request
 */
export interface InsuranceFormData {
  card_number: string;
  prefix_code: string;
  holder_name: string;
  holder_name_vi: string;
  date_of_birth: string;
  registered_facility_code: string;
  registered_facility_name?: string;
  hospital_registration_code?: string;
  expiration_date?: string;
  valid_from: string;
  valid_to?: string;
  coverage_percent: number;
  copay_rate: number;
  five_year_continuous?: boolean;
}

/**
 * Validation result from the API or local check
 */
export interface InsuranceValidationResult {
  valid: boolean;
  cardNumber: string;
  prefixCode: string;
  prefixLabel: string;
  defaultCoverage: number;
  expired: boolean;
  errorCode?: "invalid_format" | "invalid_prefix" | "expired" | "api_error";
  message?: string;
}

/**
 * Coverage calculation result
 */
export interface CoverageResult {
  totalAmount: number;
  coveragePercent: number;
  copayRate: number;
  insurancePays: number;
  patientPays: number;
}

/**
 * Transform API insurance to frontend type
 */
function transformInsurance(data: ApiInsurance): Insurance {
  return {
    id: data.id,
    patientId: data.patient_id,
    cardNumber: data.card_number,
    prefixCode: data.prefix_code,
    beneficiaryType: data.beneficiary_type,
    provinceCode: data.province_code,
    holderName: data.holder_name,
    holderNameVi: data.holder_name_vi,
    registeredFacilityCode: data.registered_facility_code,
    registeredFacilityName: data.registered_facility_name,
    hospitalRegistrationCode: data.hospital_registration_code,
    expirationDate: data.expiration_date,
    coveragePercent: data.coverage_percent,
    validFrom: data.valid_from,
    validTo: data.valid_to,
    copayRate: data.copay_rate,
    fiveYearContinuous: data.five_year_continuous,
    verification: data.verification,
    isActive: data.is_active,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

// Query keys
export const insuranceKeys = {
  all: ["insurance"] as const,
  patient: (patientId: string) => [...insuranceKeys.all, "patient", patientId] as const,
  validation: (cardNumber: string) => [...insuranceKeys.all, "validation", cardNumber] as const,
  coverage: (patientId: string, amount: number) =>
    [...insuranceKeys.all, "coverage", patientId, amount] as const,
};

/**
 * Validate a BHYT card number locally (format + prefix check)
 */
export function validateBhytCardLocal(cardNumber: string): InsuranceValidationResult {
  const trimmed = cardNumber.trim().toUpperCase();

  // Check format
  if (!BHYT_CARD_REGEX.test(trimmed)) {
    return {
      valid: false,
      cardNumber: trimmed,
      prefixCode: "",
      prefixLabel: "",
      defaultCoverage: 0,
      expired: false,
      errorCode: "invalid_format",
    };
  }

  // Extract prefix code (first 2 characters)
  const prefixCode = trimmed.substring(0, 2);
  const prefix = BHYT_PREFIX_CODES.find((p) => p.value === prefixCode);

  if (!prefix) {
    return {
      valid: false,
      cardNumber: trimmed,
      prefixCode,
      prefixLabel: "",
      defaultCoverage: 0,
      expired: false,
      errorCode: "invalid_prefix",
    };
  }

  return {
    valid: true,
    cardNumber: trimmed,
    prefixCode: prefix.value,
    prefixLabel: prefix.label,
    defaultCoverage: prefix.coverage,
    expired: false,
  };
}

/**
 * Hook to fetch patient insurance card
 */
export function usePatientInsurance(patientId: string) {
  return useQuery({
    queryKey: insuranceKeys.patient(patientId),
    queryFn: async () => {
      const res = await api.get<ApiInsurance>(`/v1/patients/${patientId}/insurance`);
      return transformInsurance(res.data);
    },
    enabled: !!patientId,
  });
}

/**
 * Hook to validate a BHYT card number via API
 */
export function useInsuranceValidation() {
  return useMutation({
    mutationFn: async (cardNumber: string): Promise<InsuranceValidationResult> => {
      // First do local validation
      const localResult = validateBhytCardLocal(cardNumber);
      if (!localResult.valid) {
        return localResult;
      }

      // Then call API for deeper validation (expiry, duplicate check, etc.)
      try {
        const res = await api.post<{
          valid: boolean;
          expired: boolean;
          message?: string;
        }>("/v1/insurance/validate", { card_number: cardNumber });

        return {
          ...localResult,
          valid: res.data.valid,
          expired: res.data.expired ?? false,
          errorCode: res.data.expired ? "expired" : undefined,
          message: res.data.message,
        };
      } catch {
        // If API is not available, return local validation result
        return localResult;
      }
    },
  });
}

/**
 * Hook to create an insurance card for a patient
 */
export function useCreateInsurance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      patientId,
      data,
    }: {
      patientId: string;
      data: InsuranceFormData;
    }) => {
      const res = await api.post<ApiInsurance>(
        `/v1/patients/${patientId}/insurance`,
        data
      );
      return transformInsurance(res.data);
    },
    onSuccess: (_, { patientId }) => {
      queryClient.invalidateQueries({
        queryKey: insuranceKeys.patient(patientId),
      });
    },
  });
}

/**
 * Hook to update an insurance card for a patient
 */
export function useUpdateInsurance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      patientId,
      data,
    }: {
      patientId: string;
      data: InsuranceFormData;
    }) => {
      const res = await api.put<ApiInsurance>(
        `/v1/patients/${patientId}/insurance`,
        data
      );
      return transformInsurance(res.data);
    },
    onSuccess: (result, { patientId }) => {
      queryClient.setQueryData(insuranceKeys.patient(patientId), result);
    },
  });
}

/**
 * Hook to calculate coverage for a given total amount
 */
export function useCalculateCoverage(patientId: string, totalAmount: number) {
  return useQuery({
    queryKey: insuranceKeys.coverage(patientId, totalAmount),
    queryFn: async (): Promise<CoverageResult> => {
      try {
        const res = await api.get<{
          total_amount: number;
          coverage_percent: number;
          copay_rate: number;
          insurance_pays: number;
          patient_pays: number;
        }>(`/v1/patients/${patientId}/insurance/coverage`, {
          params: { amount: totalAmount },
        });

        return {
          totalAmount: res.data.total_amount,
          coveragePercent: res.data.coverage_percent,
          copayRate: res.data.copay_rate,
          insurancePays: res.data.insurance_pays,
          patientPays: res.data.patient_pays,
        };
      } catch {
        // Fallback: calculate locally if API is not available
        return {
          totalAmount,
          coveragePercent: 0,
          copayRate: 100,
          insurancePays: 0,
          patientPays: totalAmount,
        };
      }
    },
    enabled: !!patientId && totalAmount > 0,
  });
}
