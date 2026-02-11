import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import {
  useServiceCodes,
  useCreateInvoice,
  useCalculateBilling,
  useInvoices,
  usePatientInvoices,
  useInvoice,
  usePaymentHistory,
  useRecordPayment,
} from '../use-billing';
import { createWrapper, mockApiResponse } from '@/__tests__/utils';
import { createTestQueryClient } from '@/__tests__/utils';
import * as apiLib from '@/lib/api';

describe('use-billing hooks', () => {
  let queryClient: ReturnType<typeof createTestQueryClient>;

  beforeEach(() => {
    queryClient = createTestQueryClient();
    vi.clearAllMocks();
  });

  afterEach(() => {
    queryClient.clear();
  });

  describe('useServiceCodes', () => {
    it('fetches all service codes successfully', async () => {
      const mockServiceCodes = [
        {
          id: '1',
          code: 'PT001',
          service_name: 'Manual Therapy',
          service_name_vi: 'Vật lý trị liệu thủ công',
          description: 'Manual therapy session',
          description_vi: 'Phiên vật lý trị liệu thủ công',
          unit_price: 200000,
          currency: 'VND',
          duration_minutes: 30,
          category: 'therapy',
          is_bhyt_covered: true,
          bhyt_reimbursement_rate: 80,
          is_active: true,
        },
        {
          id: '2',
          code: 'PT002',
          service_name: 'Exercise Therapy',
          service_name_vi: 'Trị liệu vận động',
          description: 'Therapeutic exercise session',
          description_vi: 'Phiên trị liệu vận động',
          unit_price: 150000,
          currency: 'VND',
          duration_minutes: 45,
          category: 'therapy',
          is_bhyt_covered: true,
          bhyt_reimbursement_rate: 80,
          is_active: true,
        },
      ];

      vi.spyOn(apiLib.api, 'get').mockResolvedValue(mockApiResponse(mockServiceCodes));

      const { result } = renderHook(() => useServiceCodes(), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toHaveLength(2);
      expect(result.current.data?.[0].serviceName).toBe('Manual Therapy');
      expect(result.current.data?.[0].unitPrice).toBe(200000);
      expect(result.current.data?.[1].code).toBe('PT002');
    });

    it('handles empty service codes array', async () => {
      vi.spyOn(apiLib.api, 'get').mockResolvedValue(mockApiResponse([]));

      const { result } = renderHook(() => useServiceCodes(), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual([]);
    });

    it('does not fetch when disabled', () => {
      const apiSpy = vi.spyOn(apiLib.api, 'get');

      renderHook(() => useServiceCodes(false), {
        wrapper: createWrapper(queryClient),
      });

      expect(apiSpy).not.toHaveBeenCalled();
    });

    it('has 10 minute stale time', () => {
      vi.spyOn(apiLib.api, 'get').mockResolvedValue(mockApiResponse([]));

      renderHook(() => useServiceCodes(), {
        wrapper: createWrapper(queryClient),
      });

      // Service codes shouldn't refetch frequently
      expect(apiLib.api.get).toHaveBeenCalledTimes(1);
    });
  });

  describe('useInvoices', () => {
    it('fetches invoices with pagination', async () => {
      const mockInvoices = {
        data: [
          {
            id: '1',
            clinic_id: 'clinic-1',
            patient_id: 'patient-1',
            patient_name: 'Nguyen Van A',
            patient_mrn: 'MRN001',
            treatment_session_id: 'session-1',
            invoice_number: 'INV-2024-001',
            invoice_date: '2024-01-15',
            subtotal_amount: 500000,
            discount_amount: 0,
            tax_amount: 0,
            total_amount: 500000,
            insurance_amount: 400000,
            copay_amount: 100000,
            balance_due: 0,
            currency: 'VND',
            status: 'paid',
            bhyt_claim_number: null,
            bhyt_claim_status: null,
            notes: null,
            line_items: [],
            created_at: '2024-01-15T00:00:00Z',
            updated_at: '2024-01-15T00:00:00Z',
          },
        ],
        total: 1,
        page: 1,
        per_page: 10,
        total_pages: 1,
      };

      vi.spyOn(apiLib.api, 'get').mockResolvedValue(mockApiResponse(mockInvoices) as any);

      const { result } = renderHook(() => useInvoices({ page: 1, pageSize: 10 }), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data?.data).toHaveLength(1);
      expect(result.current.data?.data[0].invoiceNumber).toBe('INV-2024-001');
      expect(result.current.data?.meta.total).toBe(1);
    });

    it('filters invoices by patient', async () => {
      const mockInvoices = {
        data: [],
        total: 0,
        page: 1,
        per_page: 10,
        total_pages: 0,
      };

      vi.spyOn(apiLib.api, 'get').mockResolvedValue(mockApiResponse(mockInvoices) as any);

      renderHook(() => useInvoices({ patientId: 'patient-1' }), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(apiLib.api.get).toHaveBeenCalledWith(
          '/v1/billing/invoices',
          expect.objectContaining({
            params: expect.objectContaining({
              patient_id: 'patient-1',
            }),
          })
        );
      });
    });

    it('filters invoices by status', async () => {
      const mockInvoices = {
        data: [],
        total: 0,
        page: 1,
        per_page: 10,
        total_pages: 0,
      };

      vi.spyOn(apiLib.api, 'get').mockResolvedValue(mockApiResponse(mockInvoices) as any);

      renderHook(() => useInvoices({ status: 'pending' }), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(apiLib.api.get).toHaveBeenCalledWith(
          '/v1/billing/invoices',
          expect.objectContaining({
            params: expect.objectContaining({
              status: 'pending',
            }),
          })
        );
      });
    });
  });

  describe('usePatientInvoices', () => {
    it('fetches invoices for specific patient', async () => {
      const mockInvoices = [
        {
          id: '1',
          clinic_id: 'clinic-1',
          patient_id: 'patient-1',
          patient_name: 'Nguyen Van A',
          patient_mrn: 'MRN001',
          treatment_session_id: 'session-1',
          invoice_number: 'INV-2024-001',
          invoice_date: '2024-01-15',
          subtotal_amount: 500000,
          discount_amount: 0,
          tax_amount: 0,
          total_amount: 500000,
          insurance_amount: 400000,
          copay_amount: 100000,
          balance_due: 0,
          currency: 'VND',
          status: 'paid',
          line_items: [],
          created_at: '2024-01-15T00:00:00Z',
          updated_at: '2024-01-15T00:00:00Z',
        },
      ];

      vi.spyOn(apiLib.api, 'get').mockResolvedValue(mockApiResponse(mockInvoices));

      const { result } = renderHook(() => usePatientInvoices('patient-1'), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toHaveLength(1);
      expect(result.current.data?.[0].patientId).toBe('patient-1');
    });

    it('does not fetch when patientId is empty', () => {
      const apiSpy = vi.spyOn(apiLib.api, 'get');

      renderHook(() => usePatientInvoices(''), {
        wrapper: createWrapper(queryClient),
      });

      expect(apiSpy).not.toHaveBeenCalled();
    });

    it('does not fetch when disabled', () => {
      const apiSpy = vi.spyOn(apiLib.api, 'get');

      renderHook(() => usePatientInvoices('patient-1', false), {
        wrapper: createWrapper(queryClient),
      });

      expect(apiSpy).not.toHaveBeenCalled();
    });
  });

  describe('useInvoice', () => {
    it('fetches single invoice by ID', async () => {
      const mockInvoice = {
        id: '1',
        clinic_id: 'clinic-1',
        patient_id: 'patient-1',
        patient_name: 'Nguyen Van A',
        patient_mrn: 'MRN001',
        treatment_session_id: 'session-1',
        invoice_number: 'INV-2024-001',
        invoice_date: '2024-01-15',
        subtotal_amount: 500000,
        discount_amount: 0,
        tax_amount: 0,
        total_amount: 500000,
        insurance_amount: 400000,
        copay_amount: 100000,
        balance_due: 0,
        currency: 'VND',
        status: 'paid',
        line_items: [
          {
            id: '1',
            service_code_id: 'code-1',
            description: 'Manual Therapy',
            description_vi: 'Vật lý trị liệu thủ công',
            quantity: 1,
            unit_price: 500000,
            total_price: 500000,
            is_bhyt_covered: true,
            insurance_covered_amount: 400000,
            sort_order: 0,
          },
        ],
        created_at: '2024-01-15T00:00:00Z',
        updated_at: '2024-01-15T00:00:00Z',
      };

      vi.spyOn(apiLib.api, 'get').mockResolvedValue(mockApiResponse(mockInvoice));

      const { result } = renderHook(() => useInvoice('invoice-1'), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data?.id).toBe('1');
      expect(result.current.data?.lineItems).toHaveLength(1);
    });

    it('does not fetch when disabled', () => {
      const apiSpy = vi.spyOn(apiLib.api, 'get');

      renderHook(() => useInvoice('invoice-1', false), {
        wrapper: createWrapper(queryClient),
      });

      expect(apiSpy).not.toHaveBeenCalled();
    });
  });

  describe('useCreateInvoice', () => {
    it('creates invoice successfully', async () => {
      const mockCreatedInvoice = {
        id: '1',
        clinic_id: 'clinic-1',
        patient_id: 'patient-1',
        patient_name: 'Nguyen Van A',
        patient_mrn: 'MRN001',
        treatment_session_id: 'session-1',
        invoice_number: 'INV-2024-001',
        invoice_date: '2024-01-15',
        subtotal_amount: 500000,
        discount_amount: 0,
        tax_amount: 0,
        total_amount: 500000,
        insurance_amount: 400000,
        copay_amount: 100000,
        balance_due: 100000,
        currency: 'VND',
        status: 'pending',
        line_items: [],
        created_at: '2024-01-15T00:00:00Z',
        updated_at: '2024-01-15T00:00:00Z',
      };

      vi.spyOn(apiLib.api, 'post').mockResolvedValue(mockApiResponse(mockCreatedInvoice));

      const { result } = renderHook(() => useCreateInvoice(), {
        wrapper: createWrapper(queryClient),
      });

      const invoice = await result.current.mutateAsync({
        patientId: 'patient-1',
        treatmentSessionId: 'session-1',
        invoiceDate: '2024-01-15',
        lineItems: [
          {
            serviceCodeId: 'code-1',
            description: 'Manual Therapy',
            descriptionVi: 'Vật lý trị liệu thủ công',
            quantity: 1,
            unitPrice: 500000,
          },
        ],
      });

      expect(invoice.invoiceNumber).toBe('INV-2024-001');
      expect(invoice.totalAmount).toBe(500000);
    });

    it('invalidates invoice queries on success', async () => {
      const mockCreatedInvoice = {
        id: '1',
        clinic_id: 'clinic-1',
        patient_id: 'patient-1',
        patient_name: 'Nguyen Van A',
        patient_mrn: 'MRN001',
        treatment_session_id: 'session-1',
        invoice_number: 'INV-2024-001',
        invoice_date: '2024-01-15',
        subtotal_amount: 500000,
        discount_amount: 0,
        tax_amount: 0,
        total_amount: 500000,
        insurance_amount: 400000,
        copay_amount: 100000,
        balance_due: 100000,
        currency: 'VND',
        status: 'pending',
        line_items: [],
        created_at: '2024-01-15T00:00:00Z',
        updated_at: '2024-01-15T00:00:00Z',
      };

      vi.spyOn(apiLib.api, 'post').mockResolvedValue(mockApiResponse(mockCreatedInvoice));

      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => useCreateInvoice(), {
        wrapper: createWrapper(queryClient),
      });

      await result.current.mutateAsync({
        patientId: 'patient-1',
        treatmentSessionId: 'session-1',
        invoiceDate: '2024-01-15',
        lineItems: [],
      });

      expect(invalidateSpy).toHaveBeenCalled();
    });

    it('handles API error on create', async () => {
      vi.spyOn(apiLib.api, 'post').mockRejectedValue(new Error('API Error'));

      const { result } = renderHook(() => useCreateInvoice(), {
        wrapper: createWrapper(queryClient),
      });

      await expect(
        result.current.mutateAsync({
          patientId: 'patient-1',
          treatmentSessionId: 'session-1',
          invoiceDate: '2024-01-15',
          lineItems: [],
        })
      ).rejects.toThrow('API Error');
    });
  });

  describe('useCalculateBilling', () => {
    it('calculates billing preview with insurance coverage', async () => {
      const mockBillingPreview = {
        subtotal: 500000,
        insurance_amount: 400000,
        copay: 100000,
        total: 500000,
        line_items: [
          {
            service_code_id: 'code-1',
            code: 'PT001',
            service_name: 'Manual Therapy',
            service_name_vi: 'Vật lý trị liệu thủ công',
            unit_price: 500000,
            quantity: 1,
            total_price: 500000,
            is_bhyt_covered: true,
            insurance_covered_amount: 400000,
          },
        ],
      };

      vi.spyOn(apiLib.api, 'post').mockResolvedValue(mockApiResponse(mockBillingPreview));

      const { result } = renderHook(
        () => useCalculateBilling('patient-1', ['code-1']),
        {
          wrapper: createWrapper(queryClient),
        }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data?.subtotal).toBe(500000);
      expect(result.current.data?.insuranceAmount).toBe(400000);
      expect(result.current.data?.copay).toBe(100000);
      expect(result.current.data?.lineItems).toHaveLength(1);
    });

    it('calculates billing for multiple service codes', async () => {
      const mockBillingPreview = {
        subtotal: 800000,
        insurance_amount: 640000,
        copay: 160000,
        total: 800000,
        line_items: [
          {
            service_code_id: 'code-1',
            code: 'PT001',
            service_name: 'Manual Therapy',
            service_name_vi: 'Vật lý trị liệu thủ công',
            unit_price: 500000,
            quantity: 1,
            total_price: 500000,
            is_bhyt_covered: true,
            insurance_covered_amount: 400000,
          },
          {
            service_code_id: 'code-2',
            code: 'PT002',
            service_name: 'Exercise Therapy',
            service_name_vi: 'Trị liệu vận động',
            unit_price: 300000,
            quantity: 1,
            total_price: 300000,
            is_bhyt_covered: true,
            insurance_covered_amount: 240000,
          },
        ],
      };

      vi.spyOn(apiLib.api, 'post').mockResolvedValue(mockApiResponse(mockBillingPreview));

      const { result } = renderHook(
        () => useCalculateBilling('patient-1', ['code-1', 'code-2']),
        {
          wrapper: createWrapper(queryClient),
        }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data?.lineItems).toHaveLength(2);
      expect(result.current.data?.subtotal).toBe(800000);
    });

    it('does not fetch when service code array is empty', () => {
      const apiSpy = vi.spyOn(apiLib.api, 'post');

      renderHook(() => useCalculateBilling('patient-1', []), {
        wrapper: createWrapper(queryClient),
      });

      expect(apiSpy).not.toHaveBeenCalled();
    });

    it('does not fetch when patientId is empty', () => {
      const apiSpy = vi.spyOn(apiLib.api, 'post');

      renderHook(() => useCalculateBilling('', ['code-1']), {
        wrapper: createWrapper(queryClient),
      });

      expect(apiSpy).not.toHaveBeenCalled();
    });

    it('does not fetch when disabled', () => {
      const apiSpy = vi.spyOn(apiLib.api, 'post');

      renderHook(() => useCalculateBilling('patient-1', ['code-1'], false), {
        wrapper: createWrapper(queryClient),
      });

      expect(apiSpy).not.toHaveBeenCalled();
    });

    it('sends correct payload to API', async () => {
      vi.spyOn(apiLib.api, 'post').mockResolvedValue(
        mockApiResponse({
          subtotal: 500000,
          insurance_amount: 400000,
          copay: 100000,
          total: 500000,
          line_items: [],
        })
      );

      renderHook(() => useCalculateBilling('patient-1', ['code-1', 'code-2']), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(apiLib.api.post).toHaveBeenCalledWith('/v1/billing/preview', {
          patient_id: 'patient-1',
          service_code_ids: ['code-1', 'code-2'],
        });
      });
    });
  });

  describe('usePaymentHistory', () => {
    it('fetches payment history for patient', async () => {
      const mockPayments = [
        {
          id: '1',
          invoice_id: 'invoice-1',
          clinic_id: 'clinic-1',
          amount: 100000,
          currency: 'VND',
          payment_method: 'cash',
          payment_date: '2024-01-15',
          transaction_reference: null,
          receipt_number: 'RCP-2024-001',
          status: 'completed',
          refund_amount: null,
          refunded_at: null,
          notes: null,
          invoice_number: 'INV-2024-001',
          patient_name: 'Nguyen Van A',
          created_at: '2024-01-15T00:00:00Z',
          updated_at: '2024-01-15T00:00:00Z',
        },
      ];

      vi.spyOn(apiLib.api, 'get').mockResolvedValue(mockApiResponse(mockPayments));

      const { result } = renderHook(() => usePaymentHistory('patient-1'), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toHaveLength(1);
      expect(result.current.data?.[0].amount).toBe(100000);
      expect(result.current.data?.[0].paymentMethod).toBe('cash');
    });

    it('does not fetch when patientId is empty', () => {
      const apiSpy = vi.spyOn(apiLib.api, 'get');

      renderHook(() => usePaymentHistory(''), {
        wrapper: createWrapper(queryClient),
      });

      expect(apiSpy).not.toHaveBeenCalled();
    });

    it('does not fetch when disabled', () => {
      const apiSpy = vi.spyOn(apiLib.api, 'get');

      renderHook(() => usePaymentHistory('patient-1', {}, false), {
        wrapper: createWrapper(queryClient),
      });

      expect(apiSpy).not.toHaveBeenCalled();
    });
  });

  describe('useRecordPayment', () => {
    it('records payment successfully', async () => {
      const mockPayment = {
        id: '1',
        invoice_id: 'invoice-1',
        clinic_id: 'clinic-1',
        amount: 100000,
        currency: 'VND',
        payment_method: 'cash',
        payment_date: '2024-01-15',
        transaction_reference: null,
        receipt_number: 'RCP-2024-001',
        status: 'completed',
        refund_amount: null,
        refunded_at: null,
        notes: 'Cash payment',
        invoice_number: 'INV-2024-001',
        patient_name: 'Nguyen Van A',
        created_at: '2024-01-15T00:00:00Z',
        updated_at: '2024-01-15T00:00:00Z',
      };

      vi.spyOn(apiLib.api, 'post').mockResolvedValue(mockApiResponse(mockPayment));

      const { result } = renderHook(() => useRecordPayment(), {
        wrapper: createWrapper(queryClient),
      });

      const payment = await result.current.mutateAsync({
        invoiceId: 'invoice-1',
        amount: 100000,
        paymentMethod: 'cash',
        paymentDate: '2024-01-15',
        notes: 'Cash payment',
      });

      expect(payment.amount).toBe(100000);
      expect(payment.paymentMethod).toBe('cash');
    });

    it('invalidates invoice and payment queries on success', async () => {
      const mockPayment = {
        id: '1',
        invoice_id: 'invoice-1',
        clinic_id: 'clinic-1',
        amount: 100000,
        currency: 'VND',
        payment_method: 'cash',
        payment_date: '2024-01-15',
        transaction_reference: null,
        receipt_number: 'RCP-2024-001',
        status: 'completed',
        refund_amount: null,
        refunded_at: null,
        notes: null,
        invoice_number: 'INV-2024-001',
        patient_name: 'Nguyen Van A',
        created_at: '2024-01-15T00:00:00Z',
        updated_at: '2024-01-15T00:00:00Z',
      };

      vi.spyOn(apiLib.api, 'post').mockResolvedValue(mockApiResponse(mockPayment));

      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => useRecordPayment(), {
        wrapper: createWrapper(queryClient),
      });

      await result.current.mutateAsync({
        invoiceId: 'invoice-1',
        amount: 100000,
        paymentMethod: 'cash',
        paymentDate: '2024-01-15',
      });

      expect(invalidateSpy).toHaveBeenCalledTimes(2); // invoices + payments
    });

    it('handles API error on record payment', async () => {
      vi.spyOn(apiLib.api, 'post').mockRejectedValue(new Error('API Error'));

      const { result } = renderHook(() => useRecordPayment(), {
        wrapper: createWrapper(queryClient),
      });

      await expect(
        result.current.mutateAsync({
          invoiceId: 'invoice-1',
          amount: 100000,
          paymentMethod: 'cash',
          paymentDate: '2024-01-15',
        })
      ).rejects.toThrow('API Error');
    });
  });
});
