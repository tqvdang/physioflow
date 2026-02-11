/**
 * Financial Reporting types for PhysioFlow EMR
 */

// -----------------------------------------------------------------------------
// Enums
// -----------------------------------------------------------------------------

export type ReportPeriod = 'daily' | 'weekly' | 'monthly' | 'yearly';

export type AgingBucket = '0-30' | '31-60' | '61-90' | '90+';

export type ExportFormat = 'csv' | 'excel';

export type FinancialReportType = 'revenue' | 'outstanding' | 'services' | 'productivity';

// -----------------------------------------------------------------------------
// Revenue Report
// -----------------------------------------------------------------------------

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

// -----------------------------------------------------------------------------
// Outstanding Payments / Aging Report
// -----------------------------------------------------------------------------

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

// -----------------------------------------------------------------------------
// Service Revenue Report
// -----------------------------------------------------------------------------

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

// -----------------------------------------------------------------------------
// Therapist Productivity Report
// -----------------------------------------------------------------------------

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

// -----------------------------------------------------------------------------
// Request / Filter Types
// -----------------------------------------------------------------------------

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

// -----------------------------------------------------------------------------
// API Response Types (snake_case matching Go backend)
// -----------------------------------------------------------------------------

export interface ApiRevenueByPeriod {
  date: string;
  period_type: string;
  total_revenue: number;
  insurance_revenue: number;
  cash_revenue: number;
  invoice_count: number;
}

export interface ApiRevenueReport {
  data: ApiRevenueByPeriod[];
  total_revenue: number;
  total_invoices: number;
  start_date: string;
  end_date: string;
  period_type: string;
}

export interface ApiOutstandingPayment {
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

export interface ApiAgingBucketSummary {
  bucket: string;
  count: number;
  total_amount: number;
}

export interface ApiAgingReport {
  data: ApiOutstandingPayment[];
  summary: ApiAgingBucketSummary[];
  total_outstanding: number;
  total_count: number;
}

export interface ApiServiceRevenue {
  service_code: string;
  service_name: string;
  service_name_vi: string;
  quantity_sold: number;
  total_revenue: number;
  rank: number;
}

export interface ApiServiceReport {
  data: ApiServiceRevenue[];
  total_revenue: number;
  total_services: number;
}

export interface ApiTherapistProductivity {
  therapist_id: string;
  therapist_name: string;
  session_count: number;
  total_revenue: number;
  avg_revenue_per_session: number;
  period: string;
}

export interface ApiProductivityReport {
  data: ApiTherapistProductivity[];
  total_sessions: number;
  total_revenue: number;
  avg_revenue_per_session: number;
}
