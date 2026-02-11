"use client";

/**
 * React Query hooks for financial report data
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "@/lib/api";

// =============================================================================
// Types
// =============================================================================

export type ReportPeriod = "daily" | "weekly" | "monthly" | "yearly";
export type AgingBucket = "0-30" | "31-60" | "61-90" | "90+";
export type ExportFormat = "csv" | "excel";
export type FinancialReportType =
  | "revenue"
  | "outstanding"
  | "services"
  | "productivity";

export interface RevenueByPeriod {
  date: string;
  periodType: ReportPeriod;
  totalRevenue: number;
  insuranceRevenue: number;
  cashRevenue: number;
  invoiceCount: number;
}

export interface RevenueReport {
  data: RevenueByPeriod[];
  totalRevenue: number;
  totalInvoices: number;
  startDate: string;
  endDate: string;
  periodType: ReportPeriod;
}

export interface OutstandingPayment {
  invoiceId: string;
  patientId: string;
  patientName: string;
  amountDue: number;
  daysOutstanding: number;
  agingBucket: AgingBucket;
  invoiceNumber: string;
  invoiceDate: string;
  totalAmount: number;
  status: string;
}

export interface AgingBucketSummary {
  bucket: AgingBucket;
  count: number;
  totalAmount: number;
}

export interface AgingReport {
  data: OutstandingPayment[];
  summary: AgingBucketSummary[];
  totalOutstanding: number;
  totalCount: number;
}

export interface ServiceRevenue {
  serviceCode: string;
  serviceName: string;
  serviceNameVi: string;
  quantitySold: number;
  totalRevenue: number;
  rank: number;
}

export interface ServiceReport {
  data: ServiceRevenue[];
  totalRevenue: number;
  totalServices: number;
}

export interface TherapistProductivity {
  therapistId: string;
  therapistName: string;
  sessionCount: number;
  totalRevenue: number;
  avgRevenuePerSession: number;
  period: string;
}

export interface ProductivityReport {
  data: TherapistProductivity[];
  totalSessions: number;
  totalRevenue: number;
  avgRevenuePerSession: number;
}

export interface ReportFilters {
  startDate?: string;
  endDate?: string;
  period?: ReportPeriod;
  therapistId?: string;
  serviceCode?: string;
  agingBucket?: AgingBucket;
  limit?: number;
  format?: ExportFormat;
}

// API response types (snake_case from Go)
interface ApiRevenueByPeriod {
  date: string;
  period_type: string;
  total_revenue: number;
  insurance_revenue: number;
  cash_revenue: number;
  invoice_count: number;
}

interface ApiRevenueReport {
  data: ApiRevenueByPeriod[];
  total_revenue: number;
  total_invoices: number;
  start_date: string;
  end_date: string;
  period_type: string;
}

interface ApiOutstandingPayment {
  invoice_id: string;
  patient_id: string;
  patient_name: string;
  amount_due: number;
  days_outstanding: number;
  aging_bucket: string;
  invoice_number: string;
  invoice_date: string;
  total_amount: number;
  status: string;
}

interface ApiAgingBucketSummary {
  bucket: string;
  count: number;
  total_amount: number;
}

interface ApiAgingReport {
  data: ApiOutstandingPayment[];
  summary: ApiAgingBucketSummary[];
  total_outstanding: number;
  total_count: number;
}

interface ApiServiceRevenue {
  service_code: string;
  service_name: string;
  service_name_vi: string;
  quantity_sold: number;
  total_revenue: number;
  rank: number;
}

interface ApiServiceReport {
  data: ApiServiceRevenue[];
  total_revenue: number;
  total_services: number;
}

interface ApiTherapistProductivity {
  therapist_id: string;
  therapist_name: string;
  session_count: number;
  total_revenue: number;
  avg_revenue_per_session: number;
  period: string;
}

interface ApiProductivityReport {
  data: ApiTherapistProductivity[];
  total_sessions: number;
  total_revenue: number;
  avg_revenue_per_session: number;
}

// =============================================================================
// Transformers
// =============================================================================

function transformRevenueReport(apiReport: ApiRevenueReport): RevenueReport {
  return {
    data: (apiReport.data ?? []).map((row) => ({
      date: row.date,
      periodType: row.period_type as ReportPeriod,
      totalRevenue: row.total_revenue,
      insuranceRevenue: row.insurance_revenue,
      cashRevenue: row.cash_revenue,
      invoiceCount: row.invoice_count,
    })),
    totalRevenue: apiReport.total_revenue,
    totalInvoices: apiReport.total_invoices,
    startDate: apiReport.start_date,
    endDate: apiReport.end_date,
    periodType: apiReport.period_type as ReportPeriod,
  };
}

function transformAgingReport(apiReport: ApiAgingReport): AgingReport {
  return {
    data: (apiReport.data ?? []).map((row) => ({
      invoiceId: row.invoice_id,
      patientId: row.patient_id,
      patientName: row.patient_name,
      amountDue: row.amount_due,
      daysOutstanding: row.days_outstanding,
      agingBucket: row.aging_bucket as AgingBucket,
      invoiceNumber: row.invoice_number,
      invoiceDate: row.invoice_date,
      totalAmount: row.total_amount,
      status: row.status,
    })),
    summary: (apiReport.summary ?? []).map((s) => ({
      bucket: s.bucket as AgingBucket,
      count: s.count,
      totalAmount: s.total_amount,
    })),
    totalOutstanding: apiReport.total_outstanding,
    totalCount: apiReport.total_count,
  };
}

function transformServiceReport(apiReport: ApiServiceReport): ServiceReport {
  return {
    data: (apiReport.data ?? []).map((row) => ({
      serviceCode: row.service_code,
      serviceName: row.service_name,
      serviceNameVi: row.service_name_vi,
      quantitySold: row.quantity_sold,
      totalRevenue: row.total_revenue,
      rank: row.rank,
    })),
    totalRevenue: apiReport.total_revenue,
    totalServices: apiReport.total_services,
  };
}

function transformProductivityReport(
  apiReport: ApiProductivityReport
): ProductivityReport {
  return {
    data: (apiReport.data ?? []).map((row) => ({
      therapistId: row.therapist_id,
      therapistName: row.therapist_name,
      sessionCount: row.session_count,
      totalRevenue: row.total_revenue,
      avgRevenuePerSession: row.avg_revenue_per_session,
      period: row.period,
    })),
    totalSessions: apiReport.total_sessions,
    totalRevenue: apiReport.total_revenue,
    avgRevenuePerSession: apiReport.avg_revenue_per_session,
  };
}

// =============================================================================
// Query Keys
// =============================================================================

export const reportKeys = {
  all: ["reports"] as const,
  revenue: (filters: ReportFilters) =>
    [...reportKeys.all, "revenue", filters] as const,
  outstanding: (filters: ReportFilters) =>
    [...reportKeys.all, "outstanding", filters] as const,
  services: (filters: ReportFilters) =>
    [...reportKeys.all, "services", filters] as const,
  productivity: (filters: ReportFilters) =>
    [...reportKeys.all, "productivity", filters] as const,
};

// =============================================================================
// Revenue Report Hook
// =============================================================================

export function useRevenueReport(filters: ReportFilters = {}, enabled = true) {
  return useQuery({
    queryKey: reportKeys.revenue(filters),
    queryFn: async () => {
      const response = await api.get<ApiRevenueReport>("/v1/reports/revenue", {
        params: {
          startDate: filters.startDate,
          endDate: filters.endDate,
          period: filters.period,
        },
      });
      return transformRevenueReport(response.data);
    },
    enabled,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

// =============================================================================
// Aging Report Hook
// =============================================================================

export function useAgingReport(filters: ReportFilters = {}, enabled = true) {
  return useQuery({
    queryKey: reportKeys.outstanding(filters),
    queryFn: async () => {
      const response = await api.get<ApiAgingReport>(
        "/v1/reports/outstanding",
        {
          params: {
            agingBucket: filters.agingBucket,
          },
        }
      );
      return transformAgingReport(response.data);
    },
    enabled,
    staleTime: 1000 * 60 * 5,
  });
}

// =============================================================================
// Services Report Hook
// =============================================================================

export function useServicesReport(filters: ReportFilters = {}, enabled = true) {
  return useQuery({
    queryKey: reportKeys.services(filters),
    queryFn: async () => {
      const response = await api.get<ApiServiceReport>(
        "/v1/reports/services/top",
        {
          params: {
            limit: filters.limit,
          },
        }
      );
      return transformServiceReport(response.data);
    },
    enabled,
    staleTime: 1000 * 60 * 5,
  });
}

// =============================================================================
// Productivity Report Hook
// =============================================================================

export function useProductivityReport(
  filters: ReportFilters = {},
  enabled = true
) {
  return useQuery({
    queryKey: reportKeys.productivity(filters),
    queryFn: async () => {
      const response = await api.get<ApiProductivityReport>(
        "/v1/reports/productivity",
        {
          params: {
            therapistId: filters.therapistId,
            startDate: filters.startDate,
            endDate: filters.endDate,
          },
        }
      );
      return transformProductivityReport(response.data);
    },
    enabled,
    staleTime: 1000 * 60 * 5,
  });
}

// =============================================================================
// Export Report Hook
// =============================================================================

export function useExportReport() {
  return useMutation({
    mutationFn: async ({
      reportType,
      filters,
    }: {
      reportType: FinancialReportType;
      filters?: ReportFilters;
    }) => {
      const token =
        typeof window !== "undefined"
          ? (await import("@/lib/auth")).ensureValidToken()
          : null;
      const tokenValue = await token;

      const params = new URLSearchParams();
      if (filters?.startDate) params.set("startDate", filters.startDate);
      if (filters?.endDate) params.set("endDate", filters.endDate);
      if (filters?.period) params.set("period", filters.period);
      if (filters?.limit) params.set("limit", String(filters.limit));
      if (filters?.therapistId)
        params.set("therapistId", filters.therapistId);
      params.set("format", "csv");

      const API_BASE_URL =
        process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:7011/api";
      const url = `${API_BASE_URL}/v1/reports/${reportType}/export?${params.toString()}`;

      const response = await fetch(url, {
        method: "GET",
        headers: {
          Accept: "text/csv",
          ...(tokenValue
            ? { Authorization: `Bearer ${tokenValue}` }
            : {}),
        },
      });

      if (!response.ok) {
        throw new ApiError("Failed to export report", response.status);
      }

      const blob = await response.blob();
      const contentDisposition = response.headers.get("Content-Disposition");
      let filename = `${reportType}_report.csv`;
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="?([^"]+)"?/);
        if (match?.[1]) {
          filename = match[1];
        }
      }

      // Trigger download
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    },
  });
}

// =============================================================================
// Refresh Views Hook
// =============================================================================

export function useRefreshViews() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      await api.post("/v1/reports/refresh");
    },
    onSuccess: () => {
      // Invalidate all report queries after refresh
      queryClient.invalidateQueries({ queryKey: reportKeys.all });
    },
  });
}

// =============================================================================
// Type guard
// =============================================================================

export function isReportApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}
