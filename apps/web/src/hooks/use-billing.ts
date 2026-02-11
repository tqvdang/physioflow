"use client";

/**
 * React Query hooks for billing data management
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "@/lib/api";
import type {
  ServiceCode,
  Invoice,
  Payment,
  BillingPreview,
  InvoiceListParams,
  PaymentListParams,
  CreateInvoiceRequest,
  RecordPaymentRequest,
  ApiServiceCode,
  ApiInvoice,
  ApiInvoiceLineItem,
  ApiPayment,
  ApiBillingPreview,
} from "@/types/billing";
import type { PaginatedResponse } from "@/types";

// =============================================================================
// Transformers
// =============================================================================

function transformServiceCode(api: ApiServiceCode): ServiceCode {
  return {
    id: api.id,
    code: api.code,
    serviceName: api.service_name,
    serviceNameVi: api.service_name_vi ?? api.service_name,
    description: api.description,
    descriptionVi: api.description_vi,
    unitPrice: api.unit_price,
    currency: api.currency,
    durationMinutes: api.duration_minutes,
    category: api.category as ServiceCode["category"],
    isBhytCovered: api.is_bhyt_covered,
    bhytReimbursementRate: api.bhyt_reimbursement_rate,
    isActive: api.is_active,
  };
}

function transformInvoice(apiInvoice: ApiInvoice): Invoice {
  return {
    id: apiInvoice.id,
    clinicId: apiInvoice.clinic_id,
    patientId: apiInvoice.patient_id,
    patientName: apiInvoice.patient_name,
    patientMrn: apiInvoice.patient_mrn,
    treatmentSessionId: apiInvoice.treatment_session_id,
    invoiceNumber: apiInvoice.invoice_number,
    invoiceDate: apiInvoice.invoice_date,
    subtotalAmount: apiInvoice.subtotal_amount,
    discountAmount: apiInvoice.discount_amount,
    taxAmount: apiInvoice.tax_amount,
    totalAmount: apiInvoice.total_amount,
    insuranceAmount: apiInvoice.insurance_amount,
    copayAmount: apiInvoice.copay_amount,
    balanceDue: apiInvoice.balance_due,
    currency: apiInvoice.currency,
    status: apiInvoice.status,
    bhytClaimNumber: apiInvoice.bhyt_claim_number,
    bhytClaimStatus: apiInvoice.bhyt_claim_status,
    notes: apiInvoice.notes,
    lineItems: apiInvoice.line_items?.map((item: ApiInvoiceLineItem) => ({
      id: item.id,
      serviceCodeId: item.service_code_id,
      description: item.description,
      descriptionVi: item.description_vi,
      quantity: item.quantity,
      unitPrice: item.unit_price,
      totalPrice: item.total_price,
      isBhytCovered: item.is_bhyt_covered,
      insuranceCoveredAmount: item.insurance_covered_amount,
      sortOrder: item.sort_order,
    })),
    createdAt: apiInvoice.created_at,
    updatedAt: apiInvoice.updated_at,
  };
}

function transformPayment(apiPayment: ApiPayment): Payment {
  return {
    id: apiPayment.id,
    invoiceId: apiPayment.invoice_id,
    clinicId: apiPayment.clinic_id,
    amount: apiPayment.amount,
    currency: apiPayment.currency,
    paymentMethod: apiPayment.payment_method,
    paymentDate: apiPayment.payment_date,
    transactionReference: apiPayment.transaction_reference,
    receiptNumber: apiPayment.receipt_number,
    status: apiPayment.status,
    refundAmount: apiPayment.refund_amount,
    refundedAt: apiPayment.refunded_at,
    notes: apiPayment.notes,
    invoiceNumber: apiPayment.invoice_number,
    patientName: apiPayment.patient_name,
    createdAt: apiPayment.created_at,
    updatedAt: apiPayment.updated_at,
  };
}

function transformBillingPreview(apiPreview: ApiBillingPreview): BillingPreview {
  return {
    subtotal: apiPreview.subtotal,
    insuranceAmount: apiPreview.insurance_amount,
    copay: apiPreview.copay,
    total: apiPreview.total,
    lineItems: apiPreview.line_items.map((item) => ({
      serviceCodeId: item.service_code_id,
      code: item.code,
      serviceName: item.service_name,
      serviceNameVi: item.service_name_vi,
      unitPrice: item.unit_price,
      quantity: item.quantity,
      totalPrice: item.total_price,
      isBhytCovered: item.is_bhyt_covered,
      insuranceCoveredAmount: item.insurance_covered_amount,
    })),
  };
}

// =============================================================================
// Query Keys
// =============================================================================

export const billingKeys = {
  all: ["billing"] as const,
  serviceCodes: () => [...billingKeys.all, "service-codes"] as const,
  invoices: () => [...billingKeys.all, "invoices"] as const,
  invoiceList: (params: InvoiceListParams) => [...billingKeys.invoices(), "list", params] as const,
  invoiceDetail: (id: string) => [...billingKeys.invoices(), "detail", id] as const,
  patientInvoices: (patientId: string) => [...billingKeys.invoices(), "patient", patientId] as const,
  payments: () => [...billingKeys.all, "payments"] as const,
  paymentList: (params: PaymentListParams) => [...billingKeys.payments(), "list", params] as const,
  patientPayments: (patientId: string) => [...billingKeys.payments(), "patient", patientId] as const,
  billingPreview: (patientId: string, serviceCodeIds: string[]) =>
    [...billingKeys.all, "preview", patientId, serviceCodeIds] as const,
};

// =============================================================================
// Service Code Hooks
// =============================================================================

/**
 * Hook to fetch all PT service codes
 */
export function useServiceCodes(enabled = true) {
  return useQuery({
    queryKey: billingKeys.serviceCodes(),
    queryFn: async () => {
      const response = await api.get<ApiServiceCode[]>("/v1/billing/service-codes");
      const codes = Array.isArray(response.data) ? response.data : [];
      return codes.map(transformServiceCode);
    },
    enabled,
    staleTime: 1000 * 60 * 10, // 10 minutes - service codes don't change often
  });
}

// =============================================================================
// Invoice Hooks
// =============================================================================

/**
 * Hook to fetch invoices (global, with filters)
 */
export function useInvoices(params: InvoiceListParams = {}) {
  return useQuery({
    queryKey: billingKeys.invoiceList(params),
    queryFn: async () => {
      const response = await api.get<ApiInvoice[]>("/v1/billing/invoices", {
        params: {
          page: params.page,
          per_page: params.pageSize,
          patient_id: params.patientId,
          status: params.status,
          start_date: params.startDate,
          end_date: params.endDate,
          search: params.search,
          sort_by: params.sortBy,
          sort_order: params.sortOrder,
        },
      });

      const apiData = response.data as unknown as {
        data?: ApiInvoice[];
        total?: number;
        page?: number;
        per_page?: number;
        total_pages?: number;
      };

      // Handle both wrapped and unwrapped response formats
      const invoices = Array.isArray(apiData)
        ? (apiData as unknown as ApiInvoice[])
        : (apiData.data ?? []);

      const transformed = invoices.map(transformInvoice);

      const meta = Array.isArray(apiData)
        ? {
            page: params.page ?? 1,
            pageSize: params.pageSize ?? 10,
            total: transformed.length,
            totalPages: 1,
          }
        : {
            page: apiData.page ?? params.page ?? 1,
            pageSize: apiData.per_page ?? params.pageSize ?? 10,
            total: apiData.total ?? 0,
            totalPages: apiData.total_pages ?? 0,
          };

      return { data: transformed, meta } as PaginatedResponse<Invoice>;
    },
  });
}

/**
 * Hook to fetch invoices for a specific patient
 */
export function usePatientInvoices(patientId: string, enabled = true) {
  return useQuery({
    queryKey: billingKeys.patientInvoices(patientId),
    queryFn: async () => {
      const response = await api.get<ApiInvoice[]>(
        `/v1/patients/${patientId}/invoices`
      );
      const invoices = Array.isArray(response.data) ? response.data : [];
      return invoices.map(transformInvoice);
    },
    enabled: enabled && !!patientId,
  });
}

/**
 * Hook to fetch a single invoice by ID
 */
export function useInvoice(invoiceId: string, enabled = true) {
  return useQuery({
    queryKey: billingKeys.invoiceDetail(invoiceId),
    queryFn: async () => {
      const response = await api.get<ApiInvoice>(
        `/v1/billing/invoices/${invoiceId}`
      );
      return transformInvoice(response.data);
    },
    enabled: enabled && !!invoiceId,
  });
}

/**
 * Hook to create a new invoice
 */
export function useCreateInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateInvoiceRequest) => {
      const response = await api.post<ApiInvoice>("/v1/billing/invoices", {
        patient_id: data.patientId,
        treatment_session_id: data.treatmentSessionId,
        invoice_date: data.invoiceDate,
        notes: data.notes,
        line_items: data.lineItems.map((item) => ({
          service_code_id: item.serviceCodeId,
          description: item.description,
          description_vi: item.descriptionVi,
          quantity: item.quantity,
          unit_price: item.unitPrice,
        })),
      });
      return transformInvoice(response.data);
    },
    onSuccess: (invoice) => {
      queryClient.invalidateQueries({ queryKey: billingKeys.invoices() });
      queryClient.invalidateQueries({
        queryKey: billingKeys.patientInvoices(invoice.patientId),
      });
    },
  });
}

// =============================================================================
// Billing Preview Hook
// =============================================================================

/**
 * Hook to calculate billing preview (copay, insurance, totals)
 */
export function useCalculateBilling(
  patientId: string,
  serviceCodeIds: string[],
  enabled = true
) {
  return useQuery({
    queryKey: billingKeys.billingPreview(patientId, serviceCodeIds),
    queryFn: async () => {
      const response = await api.post<ApiBillingPreview>(
        `/v1/billing/preview`,
        {
          patient_id: patientId,
          service_code_ids: serviceCodeIds,
        }
      );
      return transformBillingPreview(response.data);
    },
    enabled: enabled && !!patientId && serviceCodeIds.length > 0,
    staleTime: 1000 * 30, // 30 seconds
  });
}

// =============================================================================
// Payment Hooks
// =============================================================================

/**
 * Hook to fetch payment history for a patient
 */
export function usePaymentHistory(
  patientId: string,
  params: Omit<PaymentListParams, "patientId"> = {},
  enabled = true
) {
  return useQuery({
    queryKey: billingKeys.patientPayments(patientId),
    queryFn: async () => {
      const response = await api.get<ApiPayment[]>(
        `/v1/patients/${patientId}/payments`,
        {
          params: {
            page: params.page,
            per_page: params.pageSize,
            start_date: params.startDate,
            end_date: params.endDate,
          },
        }
      );
      const payments = Array.isArray(response.data) ? response.data : [];
      return payments.map(transformPayment);
    },
    enabled: enabled && !!patientId,
  });
}

/**
 * Hook to record a payment for an invoice
 */
export function useRecordPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: RecordPaymentRequest) => {
      const response = await api.post<ApiPayment>(
        `/v1/billing/invoices/${data.invoiceId}/payments`,
        {
          amount: data.amount,
          payment_method: data.paymentMethod,
          payment_date: data.paymentDate,
          transaction_reference: data.transactionReference,
          notes: data.notes,
        }
      );
      return transformPayment(response.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: billingKeys.invoices() });
      queryClient.invalidateQueries({ queryKey: billingKeys.payments() });
    },
  });
}

/**
 * Type guard for API errors
 */
export function isBillingApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}
