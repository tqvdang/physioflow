/**
 * Billing-related type definitions for PhysioFlow
 */

import { BaseEntity } from "./index";

/**
 * Invoice status
 */
export type InvoiceStatus =
  | "draft"
  | "pending"
  | "submitted"
  | "approved"
  | "rejected"
  | "paid"
  | "partially_paid"
  | "cancelled"
  | "void";

/**
 * Payment method
 */
export type PaymentMethod =
  | "cash"
  | "bank_transfer"
  | "credit_card"
  | "debit_card"
  | "momo"
  | "zalopay"
  | "vnpay"
  | "bhyt"
  | "other";

/**
 * Payment status
 */
export type PaymentStatus = "completed" | "refunded" | "failed";

/**
 * Service code category
 */
export type ServiceCodeCategory = "treatment" | "evaluation" | "home_care";

/**
 * PT Service Code (frontend format)
 */
export interface ServiceCode {
  id: string;
  code: string;
  serviceName: string;
  serviceNameVi: string;
  description?: string;
  descriptionVi?: string;
  unitPrice: number;
  currency: string;
  durationMinutes?: number;
  category?: ServiceCodeCategory;
  isBhytCovered: boolean;
  bhytReimbursementRate?: number;
  isActive: boolean;
}

/**
 * Invoice line item (frontend format)
 */
export interface InvoiceLineItem {
  id: string;
  serviceCodeId?: string;
  description: string;
  descriptionVi?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  isBhytCovered: boolean;
  insuranceCoveredAmount: number;
  sortOrder: number;
}

/**
 * Invoice (frontend format)
 */
export interface Invoice extends BaseEntity {
  clinicId: string;
  patientId: string;
  patientName?: string;
  patientMrn?: string;
  treatmentSessionId?: string;
  invoiceNumber: string;
  invoiceDate: string;
  subtotalAmount: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  insuranceAmount: number;
  copayAmount: number;
  balanceDue: number;
  currency: string;
  status: InvoiceStatus;
  bhytClaimNumber?: string;
  bhytClaimStatus?: string;
  notes?: string;
  lineItems?: InvoiceLineItem[];
}

/**
 * Payment (frontend format)
 */
export interface Payment extends BaseEntity {
  invoiceId: string;
  clinicId: string;
  amount: number;
  currency: string;
  paymentMethod: PaymentMethod;
  paymentDate: string;
  transactionReference?: string;
  receiptNumber?: string;
  status: PaymentStatus;
  refundAmount?: number;
  refundedAt?: string;
  notes?: string;
  // Joined fields
  invoiceNumber?: string;
  patientName?: string;
}

/**
 * Create invoice request
 */
export interface CreateInvoiceRequest {
  patientId: string;
  treatmentSessionId?: string;
  invoiceDate?: string;
  notes?: string;
  lineItems: {
    serviceCodeId?: string;
    description: string;
    descriptionVi?: string;
    quantity: number;
    unitPrice: number;
  }[];
}

/**
 * Record payment request
 */
export interface RecordPaymentRequest {
  invoiceId: string;
  amount: number;
  paymentMethod: PaymentMethod;
  paymentDate?: string;
  transactionReference?: string;
  notes?: string;
}

/**
 * Billing calculation preview
 */
export interface BillingPreview {
  subtotal: number;
  insuranceAmount: number;
  copay: number;
  total: number;
  lineItems: {
    serviceCodeId: string;
    code: string;
    serviceName: string;
    serviceNameVi: string;
    unitPrice: number;
    quantity: number;
    totalPrice: number;
    isBhytCovered: boolean;
    insuranceCoveredAmount: number;
  }[];
}

/**
 * Invoice list query parameters
 */
export interface InvoiceListParams {
  page?: number;
  pageSize?: number;
  patientId?: string;
  status?: InvoiceStatus;
  startDate?: string;
  endDate?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

/**
 * Payment list query parameters
 */
export interface PaymentListParams {
  page?: number;
  pageSize?: number;
  patientId?: string;
  startDate?: string;
  endDate?: string;
}

// =============================================================================
// API types (snake_case from backend)
// =============================================================================

export interface ApiServiceCode {
  id: string;
  clinic_id?: string;
  code: string;
  service_name: string;
  service_name_vi?: string;
  description?: string;
  description_vi?: string;
  unit_price: number;
  currency: string;
  duration_minutes?: number;
  category?: string;
  is_bhyt_covered: boolean;
  bhyt_reimbursement_rate?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ApiInvoiceLineItem {
  id: string;
  invoice_id: string;
  service_code_id?: string;
  description: string;
  description_vi?: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  is_bhyt_covered: boolean;
  insurance_covered_amount: number;
  sort_order: number;
}

export interface ApiInvoice {
  id: string;
  clinic_id: string;
  patient_id: string;
  patient_name?: string;
  patient_mrn?: string;
  treatment_session_id?: string;
  invoice_number: string;
  invoice_date: string;
  subtotal_amount: number;
  discount_amount: number;
  tax_amount: number;
  total_amount: number;
  insurance_amount: number;
  copay_amount: number;
  balance_due: number;
  currency: string;
  status: InvoiceStatus;
  bhyt_claim_number?: string;
  bhyt_claim_status?: string;
  notes?: string;
  line_items?: ApiInvoiceLineItem[];
  created_at: string;
  updated_at: string;
}

export interface ApiPayment {
  id: string;
  invoice_id: string;
  clinic_id: string;
  amount: number;
  currency: string;
  payment_method: PaymentMethod;
  payment_date: string;
  transaction_reference?: string;
  receipt_number?: string;
  status: PaymentStatus;
  refund_amount?: number;
  refunded_at?: string;
  notes?: string;
  invoice_number?: string;
  patient_name?: string;
  created_at: string;
  updated_at: string;
}

export interface ApiBillingPreview {
  subtotal: number;
  insurance_amount: number;
  copay: number;
  total: number;
  line_items: {
    service_code_id: string;
    code: string;
    service_name: string;
    service_name_vi: string;
    unit_price: number;
    quantity: number;
    total_price: number;
    is_bhyt_covered: boolean;
    insurance_covered_amount: number;
  }[];
}
