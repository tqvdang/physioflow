"use client";

/**
 * React Query hooks for BHYT claim submission management
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "@/lib/api";
import type {
  BHYTClaim,
  BHYTClaimLineItem,
  BHYTClaimStatus,
  BHYTClaimSearchParams,
  ApiBHYTClaim,
  ApiBHYTClaimLineItem,
} from "@/types/bhyt-claims";

// =============================================================================
// Transformers
// =============================================================================

function transformClaim(apiClaim: ApiBHYTClaim): BHYTClaim {
  return {
    id: apiClaim.id,
    clinicId: apiClaim.clinic_id,
    facilityCode: apiClaim.facility_code,
    month: apiClaim.month,
    year: apiClaim.year,
    filePath: apiClaim.file_path,
    fileName: apiClaim.file_name,
    status: apiClaim.status,
    totalAmount: apiClaim.total_amount,
    totalInsuranceAmount: apiClaim.total_insurance_amount,
    totalPatientAmount: apiClaim.total_patient_amount,
    lineItemCount: apiClaim.line_item_count,
    rejectionReason: apiClaim.rejection_reason,
    notes: apiClaim.notes,
    createdAt: apiClaim.created_at,
    updatedAt: apiClaim.updated_at,
    submittedAt: apiClaim.submitted_at,
    approvedAt: apiClaim.approved_at,
    rejectedAt: apiClaim.rejected_at,
    lineItems: apiClaim.line_items?.map(transformClaimLineItem),
  };
}

function transformClaimLineItem(
  apiItem: ApiBHYTClaimLineItem
): BHYTClaimLineItem {
  return {
    id: apiItem.id,
    claimId: apiItem.claim_id,
    invoiceId: apiItem.invoice_id,
    patientId: apiItem.patient_id,
    patientName: apiItem.patient_name,
    bhytCardNumber: apiItem.bhyt_card_number,
    serviceCode: apiItem.service_code,
    serviceNameVi: apiItem.service_name_vi,
    quantity: apiItem.quantity,
    unitPrice: apiItem.unit_price,
    totalPrice: apiItem.total_price,
    insurancePaid: apiItem.insurance_paid,
    patientPaid: apiItem.patient_paid,
    serviceDate: apiItem.service_date,
  };
}

// =============================================================================
// Query Keys
// =============================================================================

export const bhytClaimKeys = {
  all: ["bhyt-claims"] as const,
  lists: () => [...bhytClaimKeys.all, "list"] as const,
  list: (params: BHYTClaimSearchParams) =>
    [...bhytClaimKeys.lists(), params] as const,
  details: () => [...bhytClaimKeys.all, "detail"] as const,
  detail: (id: string) => [...bhytClaimKeys.details(), id] as const,
};

// =============================================================================
// Types
// =============================================================================

export interface GenerateClaimRequest {
  facilityCode: string;
  month: number;
  year: number;
}

export interface ClaimListResponse {
  data: BHYTClaim[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

// Re-export types for convenience
export type {
  BHYTClaim,
  BHYTClaimLineItem,
  BHYTClaimStatus,
  BHYTClaimSearchParams,
};

// =============================================================================
// Hooks
// =============================================================================

/**
 * Hook to list BHYT claims with filters and pagination
 */
export function useBHYTClaims(params: BHYTClaimSearchParams = {}) {
  return useQuery({
    queryKey: bhytClaimKeys.list(params),
    queryFn: async (): Promise<ClaimListResponse> => {
      const response = await api.get<{
        data: ApiBHYTClaim[];
        total: number;
        page: number;
        per_page: number;
        total_pages: number;
      }>("/v1/billing/claims", {
        params: {
          facility_code: params.facilityCode,
          status: params.status,
          year: params.year,
          month: params.month,
          page: params.page,
          per_page: params.pageSize,
          sort_by: params.sortBy,
          sort_order: params.sortOrder,
        },
      });

      const apiData = response.data;
      const claims = (apiData.data ?? []).map(transformClaim);

      return {
        data: claims,
        meta: {
          page: apiData.page ?? params.page ?? 1,
          pageSize: apiData.per_page ?? params.pageSize ?? 20,
          total: apiData.total ?? 0,
          totalPages: apiData.total_pages ?? 0,
        },
      };
    },
  });
}

/**
 * Hook to get a single BHYT claim by ID
 */
export function useBHYTClaim(id: string, enabled = true) {
  return useQuery({
    queryKey: bhytClaimKeys.detail(id),
    queryFn: async () => {
      const response = await api.get<ApiBHYTClaim>(
        `/v1/billing/claims/${id}`
      );
      return transformClaim(response.data);
    },
    enabled: enabled && !!id,
  });
}

/**
 * Hook to generate a new BHYT claim
 */
export function useGenerateClaim() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: GenerateClaimRequest) => {
      const response = await api.post<ApiBHYTClaim>(
        "/v1/billing/claims/generate",
        {
          facility_code: data.facilityCode,
          month: data.month,
          year: data.year,
        }
      );
      return transformClaim(response.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bhytClaimKeys.lists() });
    },
  });
}

/**
 * Hook to download a claim XML file
 */
export function useDownloadClaim() {
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:7011/api"}/v1/billing/claims/${id}/download`,
        {
          headers: {
            Accept: "application/xml",
          },
        }
      );

      if (!response.ok) {
        throw new ApiError("Failed to download claim", response.status);
      }

      const blob = await response.blob();
      const fileName =
        response.headers
          .get("content-disposition")
          ?.match(/filename="(.+)"/)?.[1] ?? `claim_${id}.xml`;

      // Trigger browser download
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      return { fileName };
    },
  });
}

/**
 * Type guard for API errors
 */
export function isBHYTClaimApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}
