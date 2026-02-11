import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import {
  usePatientInsurance,
  useCreateInsurance,
  useUpdateInsurance,
  useInsuranceValidation,
  useCalculateCoverage,
  validateBhytCardLocal,
  BHYT_PREFIX_CODES,
} from '../use-insurance';
import { createWrapper, mockApiResponse } from '@/__tests__/utils';
import { createTestQueryClient } from '@/__tests__/utils';
import * as apiLib from '@/lib/api';

describe('use-insurance hooks', () => {
  let queryClient: ReturnType<typeof createTestQueryClient>;

  beforeEach(() => {
    queryClient = createTestQueryClient();
    vi.clearAllMocks();
  });

  afterEach(() => {
    queryClient.clear();
  });

  describe('validateBhytCardLocal', () => {
    it('validates correct card format', () => {
      const result = validateBhytCardLocal('DN4012345678901');

      expect(result.valid).toBe(true);
      expect(result.prefixCode).toBe('DN');
      expect(result.prefixLabel).toBe('DN - Doanh nghiep');
      expect(result.defaultCoverage).toBe(80);
      expect(result.expired).toBe(false);
    });

    it('rejects invalid format - too short', () => {
      const result = validateBhytCardLocal('DN401234567');

      expect(result.valid).toBe(false);
      expect(result.errorCode).toBe('invalid_format');
    });

    it('rejects invalid format - too long', () => {
      const result = validateBhytCardLocal('DN40123456789012');

      expect(result.valid).toBe(false);
      expect(result.errorCode).toBe('invalid_format');
    });

    it('rejects invalid format - wrong pattern', () => {
      const result = validateBhytCardLocal('D1N012345678901');

      expect(result.valid).toBe(false);
      expect(result.errorCode).toBe('invalid_format');
    });

    it('rejects unknown prefix code', () => {
      const result = validateBhytCardLocal('XX4012345678901');

      expect(result.valid).toBe(false);
      expect(result.errorCode).toBe('invalid_prefix');
      expect(result.prefixCode).toBe('XX');
    });

    it('handles lowercase input', () => {
      const result = validateBhytCardLocal('dn4012345678901');

      expect(result.valid).toBe(true);
      expect(result.cardNumber).toBe('DN4012345678901');
    });

    it('validates all known prefix codes', () => {
      BHYT_PREFIX_CODES.forEach((prefix) => {
        const cardNumber = `${prefix.value}4012345678901`;
        const result = validateBhytCardLocal(cardNumber);

        expect(result.valid).toBe(true);
        expect(result.prefixCode).toBe(prefix.value);
        expect(result.defaultCoverage).toBe(prefix.coverage);
      });
    });

    it('trims whitespace from input', () => {
      const result = validateBhytCardLocal('  DN4012345678901  ');

      expect(result.valid).toBe(true);
      expect(result.cardNumber).toBe('DN4012345678901');
    });
  });

  describe('usePatientInsurance', () => {
    it('fetches patient insurance successfully', async () => {
      const mockData = {
        id: '1',
        patient_id: 'patient-1',
        card_number: 'DN4012345678901',
        prefix_code: 'DN',
        valid_from: '2024-01-01',
        valid_to: '2024-12-31',
        coverage_percent: 80,
        copay_rate: 20,
        provider: 'BHYT',
        is_active: true,
        verification_status: 'verified' as const,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      vi.spyOn(apiLib.api, 'get').mockResolvedValue(mockApiResponse(mockData));

      const { result } = renderHook(() => usePatientInsurance('patient-1'), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual({
        id: '1',
        patientId: 'patient-1',
        cardNumber: 'DN4012345678901',
        prefixCode: 'DN',
        validFrom: '2024-01-01',
        validTo: '2024-12-31',
        coveragePercent: 80,
        copayRate: 20,
        provider: 'BHYT',
        isActive: true,
        verificationStatus: 'verified',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      });
    });

    it('does not fetch when patientId is empty', () => {
      const apiSpy = vi.spyOn(apiLib.api, 'get');

      renderHook(() => usePatientInsurance(''), {
        wrapper: createWrapper(queryClient),
      });

      expect(apiSpy).not.toHaveBeenCalled();
    });

    it('handles API error', async () => {
      vi.spyOn(apiLib.api, 'get').mockRejectedValue(new Error('API Error'));

      const { result } = renderHook(() => usePatientInsurance('patient-1'), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(result.current.data).toBeUndefined();
    });
  });

  describe('useInsuranceValidation', () => {
    it('validates card with valid format locally', async () => {
      const { result } = renderHook(() => useInsuranceValidation(), {
        wrapper: createWrapper(queryClient),
      });

      const validationResult = await result.current.mutateAsync('DN4012345678901');

      expect(validationResult.valid).toBe(true);
      expect(validationResult.prefixCode).toBe('DN');
      expect(validationResult.defaultCoverage).toBe(80);
    });

    it('calls API for deeper validation after local check', async () => {
      const mockApiValidation = {
        valid: true,
        expired: false,
        message: 'Card is valid',
      };

      vi.spyOn(apiLib.api, 'post').mockResolvedValue(mockApiResponse(mockApiValidation));

      const { result } = renderHook(() => useInsuranceValidation(), {
        wrapper: createWrapper(queryClient),
      });

      const validationResult = await result.current.mutateAsync('DN4012345678901');

      expect(validationResult.valid).toBe(true);
      expect(validationResult.expired).toBe(false);
      expect(apiLib.api.post).toHaveBeenCalledWith(
        '/v1/insurance/validate',
        { card_number: 'DN4012345678901' }
      );
    });

    it('returns local validation if API fails', async () => {
      vi.spyOn(apiLib.api, 'post').mockRejectedValue(new Error('API Error'));

      const { result } = renderHook(() => useInsuranceValidation(), {
        wrapper: createWrapper(queryClient),
      });

      const validationResult = await result.current.mutateAsync('DN4012345678901');

      expect(validationResult.valid).toBe(true);
      expect(validationResult.prefixCode).toBe('DN');
    });

    it('detects expired cards from API', async () => {
      const mockApiValidation = {
        valid: true,
        expired: true,
        message: 'Card has expired',
      };

      vi.spyOn(apiLib.api, 'post').mockResolvedValue(mockApiResponse(mockApiValidation));

      const { result } = renderHook(() => useInsuranceValidation(), {
        wrapper: createWrapper(queryClient),
      });

      const validationResult = await result.current.mutateAsync('DN4012345678901');

      expect(validationResult.valid).toBe(true);
      expect(validationResult.expired).toBe(true);
      expect(validationResult.errorCode).toBe('expired');
    });

    it('rejects invalid card format before API call', async () => {
      const apiSpy = vi.spyOn(apiLib.api, 'post');

      const { result } = renderHook(() => useInsuranceValidation(), {
        wrapper: createWrapper(queryClient),
      });

      const validationResult = await result.current.mutateAsync('INVALID');

      expect(validationResult.valid).toBe(false);
      expect(validationResult.errorCode).toBe('invalid_format');
      expect(apiSpy).not.toHaveBeenCalled();
    });
  });

  describe('useCreateInsurance', () => {
    it('creates insurance successfully', async () => {
      const mockCreatedInsurance = {
        id: '1',
        patient_id: 'patient-1',
        card_number: 'DN4012345678901',
        prefix_code: 'DN',
        valid_from: '2024-01-01',
        valid_to: '2024-12-31',
        coverage_percent: 80,
        copay_rate: 20,
        provider: 'BHYT',
        is_active: true,
        verification_status: 'verified' as const,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      vi.spyOn(apiLib.api, 'post').mockResolvedValue(mockApiResponse(mockCreatedInsurance));

      const { result } = renderHook(() => useCreateInsurance(), {
        wrapper: createWrapper(queryClient),
      });

      const insuranceData = {
        card_number: 'DN4012345678901',
        prefix_code: 'DN',
        valid_from: '2024-01-01',
        valid_to: '2024-12-31',
        coverage_percent: 80,
        copay_rate: 20,
      };

      const created = await result.current.mutateAsync({
        patientId: 'patient-1',
        data: insuranceData,
      });

      expect(created.cardNumber).toBe('DN4012345678901');
      expect(apiLib.api.post).toHaveBeenCalledWith(
        '/v1/patients/patient-1/insurance',
        insuranceData
      );
    });

    it('invalidates patient insurance query on success', async () => {
      const mockCreatedInsurance = {
        id: '1',
        patient_id: 'patient-1',
        card_number: 'DN4012345678901',
        prefix_code: 'DN',
        valid_from: '2024-01-01',
        valid_to: '2024-12-31',
        coverage_percent: 80,
        copay_rate: 20,
        provider: 'BHYT',
        is_active: true,
        verification_status: 'verified' as const,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      vi.spyOn(apiLib.api, 'post').mockResolvedValue(mockApiResponse(mockCreatedInsurance));

      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => useCreateInsurance(), {
        wrapper: createWrapper(queryClient),
      });

      await result.current.mutateAsync({
        patientId: 'patient-1',
        data: {
          card_number: 'DN4012345678901',
          prefix_code: 'DN',
          valid_from: '2024-01-01',
          valid_to: '2024-12-31',
          coverage_percent: 80,
          copay_rate: 20,
        },
      });

      expect(invalidateSpy).toHaveBeenCalled();
    });

    it('handles API error on create', async () => {
      vi.spyOn(apiLib.api, 'post').mockRejectedValue(new Error('API Error'));

      const { result } = renderHook(() => useCreateInsurance(), {
        wrapper: createWrapper(queryClient),
      });

      await expect(
        result.current.mutateAsync({
          patientId: 'patient-1',
          data: {
            card_number: 'DN4012345678901',
            prefix_code: 'DN',
            valid_from: '2024-01-01',
            valid_to: '2024-12-31',
            coverage_percent: 80,
            copay_rate: 20,
          },
        })
      ).rejects.toThrow('API Error');
    });
  });

  describe('useUpdateInsurance', () => {
    it('updates insurance successfully', async () => {
      const mockUpdatedInsurance = {
        id: '1',
        patient_id: 'patient-1',
        card_number: 'DN4012345678901',
        prefix_code: 'DN',
        valid_from: '2024-01-01',
        valid_to: '2025-12-31',
        coverage_percent: 85,
        copay_rate: 15,
        provider: 'BHYT',
        is_active: true,
        verification_status: 'verified' as const,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-06-01T00:00:00Z',
      };

      vi.spyOn(apiLib.api, 'put').mockResolvedValue(mockApiResponse(mockUpdatedInsurance));

      const { result } = renderHook(() => useUpdateInsurance(), {
        wrapper: createWrapper(queryClient),
      });

      const updated = await result.current.mutateAsync({
        patientId: 'patient-1',
        data: {
          card_number: 'DN4012345678901',
          prefix_code: 'DN',
          valid_from: '2024-01-01',
          valid_to: '2025-12-31',
          coverage_percent: 85,
          copay_rate: 15,
        },
      });

      expect(updated.coveragePercent).toBe(85);
      expect(updated.validTo).toBe('2025-12-31');
    });

    it('updates query cache on success', async () => {
      const mockUpdatedInsurance = {
        id: '1',
        patient_id: 'patient-1',
        card_number: 'DN4012345678901',
        prefix_code: 'DN',
        valid_from: '2024-01-01',
        valid_to: '2025-12-31',
        coverage_percent: 85,
        copay_rate: 15,
        provider: 'BHYT',
        is_active: true,
        verification_status: 'verified' as const,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-06-01T00:00:00Z',
      };

      vi.spyOn(apiLib.api, 'put').mockResolvedValue(mockApiResponse(mockUpdatedInsurance));

      const setQueryDataSpy = vi.spyOn(queryClient, 'setQueryData');

      const { result } = renderHook(() => useUpdateInsurance(), {
        wrapper: createWrapper(queryClient),
      });

      await result.current.mutateAsync({
        patientId: 'patient-1',
        data: {
          card_number: 'DN4012345678901',
          prefix_code: 'DN',
          valid_from: '2024-01-01',
          valid_to: '2025-12-31',
          coverage_percent: 85,
          copay_rate: 15,
        },
      });

      expect(setQueryDataSpy).toHaveBeenCalled();
    });
  });

  describe('useCalculateCoverage', () => {
    it('calculates coverage from API', async () => {
      const mockCoverage = {
        total_amount: 1000000,
        coverage_percent: 80,
        copay_rate: 20,
        insurance_pays: 800000,
        patient_pays: 200000,
      };

      vi.spyOn(apiLib.api, 'get').mockResolvedValue(mockApiResponse(mockCoverage));

      const { result } = renderHook(
        () => useCalculateCoverage('patient-1', 1000000),
        {
          wrapper: createWrapper(queryClient),
        }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual({
        totalAmount: 1000000,
        coveragePercent: 80,
        copayRate: 20,
        insurancePays: 800000,
        patientPays: 200000,
      });
    });

    it('returns fallback calculation on API error', async () => {
      vi.spyOn(apiLib.api, 'get').mockRejectedValue(new Error('API Error'));

      const { result } = renderHook(
        () => useCalculateCoverage('patient-1', 1000000),
        {
          wrapper: createWrapper(queryClient),
        }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual({
        totalAmount: 1000000,
        coveragePercent: 0,
        copayRate: 100,
        insurancePays: 0,
        patientPays: 1000000,
      });
    });

    it('does not fetch when amount is zero', () => {
      const apiSpy = vi.spyOn(apiLib.api, 'get');

      renderHook(() => useCalculateCoverage('patient-1', 0), {
        wrapper: createWrapper(queryClient),
      });

      expect(apiSpy).not.toHaveBeenCalled();
    });

    it('does not fetch when patientId is empty', () => {
      const apiSpy = vi.spyOn(apiLib.api, 'get');

      renderHook(() => useCalculateCoverage('', 1000000), {
        wrapper: createWrapper(queryClient),
      });

      expect(apiSpy).not.toHaveBeenCalled();
    });

    it('passes amount as query parameter', async () => {
      vi.spyOn(apiLib.api, 'get').mockResolvedValue(
        mockApiResponse({
          total_amount: 500000,
          coverage_percent: 80,
          copay_rate: 20,
          insurance_pays: 400000,
          patient_pays: 100000,
        })
      );

      renderHook(() => useCalculateCoverage('patient-1', 500000), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(apiLib.api.get).toHaveBeenCalledWith(
          '/v1/patients/patient-1/insurance/coverage',
          { params: { amount: 500000 } }
        );
      });
    });
  });
});
