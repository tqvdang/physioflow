/**
 * Billing types for PhysioFlow EMR
 */

// -----------------------------------------------------------------------------
// Enums
// -----------------------------------------------------------------------------

export type InvoiceStatus =
  | 'draft'
  | 'pending'
  | 'paid'
  | 'cancelled';

export type PaymentMethod =
  | 'cash'
  | 'card'
  | 'bank_transfer'
  | 'insurance';

// -----------------------------------------------------------------------------
// Core Types
// -----------------------------------------------------------------------------

export interface PTServiceCode {
  code: string;
  serviceName: string;
  serviceNameVi: string;
  description?: string;
  descriptionVi?: string;
  unitPrice: number;
  durationMinutes: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceServiceItem {
  serviceCode: string;
  serviceName: string;
  serviceNameVi: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  notes?: string;
}

export interface Invoice {
  id: string;
  patientId: string;
  clinicId: string;
  treatmentSessionId?: string;
  serviceItems: InvoiceServiceItem[];
  totalAmount: number;
  insuranceAmount: number;
  copayAmount: number;
  status: InvoiceStatus;
  notes?: string;
  notesVi?: string;
  createdDate: string;
  version: number;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
}

export interface Payment {
  id: string;
  invoiceId: string;
  amount: number;
  paymentMethod: PaymentMethod;
  paymentDate: string;
  referenceNumber?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

// -----------------------------------------------------------------------------
// Request Types
// -----------------------------------------------------------------------------

export interface CreateInvoiceRequest {
  patientId: string;
  clinicId: string;
  treatmentSessionId?: string;
  serviceItems: InvoiceServiceItem[];
  insuranceAmount?: number;
  notes?: string;
  notesVi?: string;
}

export interface UpdateInvoiceRequest {
  serviceItems?: InvoiceServiceItem[];
  insuranceAmount?: number;
  status?: InvoiceStatus;
  notes?: string;
  notesVi?: string;
}

export interface CreatePaymentRequest {
  invoiceId: string;
  amount: number;
  paymentMethod: PaymentMethod;
  paymentDate: string;
  referenceNumber?: string;
  notes?: string;
}

// -----------------------------------------------------------------------------
// Query Types
// -----------------------------------------------------------------------------

export interface InvoiceSearchParams {
  clinicId: string;
  patientId?: string;
  status?: InvoiceStatus;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

export interface PaymentSearchParams {
  invoiceId?: string;
  patientId?: string;
  paymentMethod?: PaymentMethod;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}
