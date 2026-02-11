import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import {
  usePatientMeasures,
  useRecordMeasure,
  useProgress,
  useTrending,
  useMeasureLibrary,
  getMeasureDefinition,
  MEASURE_LIBRARY,
} from '../use-outcome-measures';
import { createWrapper, mockApiResponse } from '@/__tests__/utils';
import { createTestQueryClient } from '@/__tests__/utils';
import * as apiLib from '@/lib/api';
import type { MeasureType } from '../use-outcome-measures';

describe('use-outcome-measures hooks', () => {
  let queryClient: ReturnType<typeof createTestQueryClient>;

  beforeEach(() => {
    queryClient = createTestQueryClient();
    vi.clearAllMocks();
  });

  afterEach(() => {
    queryClient.clear();
  });

  describe('MEASURE_LIBRARY', () => {
    it('contains all expected measure types', () => {
      const expectedTypes: MeasureType[] = [
        'VAS', 'NDI', 'ODI', 'LEFS', 'DASH', 'QuickDASH', 'PSFS', 'FIM'
      ];

      expectedTypes.forEach((type) => {
        const measure = MEASURE_LIBRARY.find((m) => m.type === type);
        expect(measure).toBeDefined();
      });
    });

    it('has valid MCID values for all measures', () => {
      MEASURE_LIBRARY.forEach((measure) => {
        expect(measure.mcid).toBeGreaterThan(0);
      });
    });

    it('has correct higherIsBetter flags', () => {
      const lowerIsBetter = MEASURE_LIBRARY.filter((m) => !m.higherIsBetter);
      const higherIsBetter = MEASURE_LIBRARY.filter((m) => m.higherIsBetter);

      // Pain/disability measures - lower is better
      expect(lowerIsBetter.map((m) => m.type)).toContain('VAS');
      expect(lowerIsBetter.map((m) => m.type)).toContain('NDI');
      expect(lowerIsBetter.map((m) => m.type)).toContain('ODI');

      // Function measures - higher is better
      expect(higherIsBetter.map((m) => m.type)).toContain('LEFS');
      expect(higherIsBetter.map((m) => m.type)).toContain('FIM');
      expect(higherIsBetter.map((m) => m.type)).toContain('PSFS');
    });
  });

  describe('getMeasureDefinition', () => {
    it('returns correct definition for VAS', () => {
      const vas = getMeasureDefinition('VAS');

      expect(vas).toBeDefined();
      expect(vas?.type).toBe('VAS');
      expect(vas?.minScore).toBe(0);
      expect(vas?.maxScore).toBe(10);
      expect(vas?.mcid).toBe(2);
      expect(vas?.higherIsBetter).toBe(false);
    });

    it('returns correct definition for LEFS', () => {
      const lefs = getMeasureDefinition('LEFS');

      expect(lefs).toBeDefined();
      expect(lefs?.type).toBe('LEFS');
      expect(lefs?.minScore).toBe(0);
      expect(lefs?.maxScore).toBe(80);
      expect(lefs?.mcid).toBe(9);
      expect(lefs?.higherIsBetter).toBe(true);
    });

    it('returns undefined for unknown measure type', () => {
      const unknown = getMeasureDefinition('UNKNOWN' as MeasureType);
      expect(unknown).toBeUndefined();
    });
  });

  describe('useMeasureLibrary', () => {
    it('returns the static measure library', async () => {
      const { result } = renderHook(() => useMeasureLibrary(), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(MEASURE_LIBRARY);
      expect(result.current.data).toHaveLength(8);
    });

    it('has infinite staleTime', () => {
      const { result } = renderHook(() => useMeasureLibrary(), {
        wrapper: createWrapper(queryClient),
      });

      // Library data should never be stale
      expect(result.current.isStale).toBe(false);
    });
  });

  describe('usePatientMeasures', () => {
    it('fetches all measures for a patient', async () => {
      const mockMeasurements = [
        {
          id: '1',
          patient_id: 'patient-1',
          measure_type: 'VAS',
          score: 7,
          date: '2024-01-01',
          phase: 'baseline',
          notes: 'Initial assessment',
          recorded_by: 'therapist-1',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
        {
          id: '2',
          patient_id: 'patient-1',
          measure_type: 'VAS',
          score: 4,
          date: '2024-02-01',
          phase: 'interim',
          notes: 'Mid-treatment',
          recorded_by: 'therapist-1',
          created_at: '2024-02-01T00:00:00Z',
          updated_at: '2024-02-01T00:00:00Z',
        },
      ];

      vi.spyOn(apiLib.api, 'get').mockResolvedValue(mockApiResponse(mockMeasurements));

      const { result } = renderHook(() => usePatientMeasures('patient-1'), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toHaveLength(2);
      expect(result.current.data?.[0].measureType).toBe('VAS');
      expect(result.current.data?.[0].score).toBe(7);
      expect(result.current.data?.[1].score).toBe(4);
    });

    it('handles empty measurements array', async () => {
      vi.spyOn(apiLib.api, 'get').mockResolvedValue(mockApiResponse([]));

      const { result } = renderHook(() => usePatientMeasures('patient-1'), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual([]);
    });

    it('does not fetch when disabled', () => {
      const apiSpy = vi.spyOn(apiLib.api, 'get');

      renderHook(() => usePatientMeasures('patient-1', false), {
        wrapper: createWrapper(queryClient),
      });

      expect(apiSpy).not.toHaveBeenCalled();
    });

    it('does not fetch when patientId is empty', () => {
      const apiSpy = vi.spyOn(apiLib.api, 'get');

      renderHook(() => usePatientMeasures(''), {
        wrapper: createWrapper(queryClient),
      });

      expect(apiSpy).not.toHaveBeenCalled();
    });

    it('handles non-array API response', async () => {
      vi.spyOn(apiLib.api, 'get').mockResolvedValue(mockApiResponse(null));

      const { result } = renderHook(() => usePatientMeasures('patient-1'), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual([]);
    });
  });

  describe('useRecordMeasure', () => {
    it('records a new measurement successfully', async () => {
      const mockCreatedMeasurement = {
        id: '1',
        patient_id: 'patient-1',
        measure_type: 'VAS',
        score: 7,
        date: '2024-01-01',
        phase: 'baseline',
        notes: 'Initial assessment',
        recorded_by: 'therapist-1',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      vi.spyOn(apiLib.api, 'post').mockResolvedValue(mockApiResponse(mockCreatedMeasurement));

      const { result } = renderHook(() => useRecordMeasure(), {
        wrapper: createWrapper(queryClient),
      });

      const measurement = await result.current.mutateAsync({
        patientId: 'patient-1',
        measureType: 'VAS',
        score: 7,
        date: '2024-01-01',
        phase: 'baseline',
        notes: 'Initial assessment',
      });

      expect(measurement.measureType).toBe('VAS');
      expect(measurement.score).toBe(7);
      expect(apiLib.api.post).toHaveBeenCalledWith(
        '/v1/patients/patient-1/outcome-measures',
        {
          measure_type: 'VAS',
          score: 7,
          date: '2024-01-01',
          phase: 'baseline',
          notes: 'Initial assessment',
        }
      );
    });

    it('invalidates patient measures on success', async () => {
      const mockCreatedMeasurement = {
        id: '1',
        patient_id: 'patient-1',
        measure_type: 'VAS',
        score: 7,
        date: '2024-01-01',
        phase: 'baseline',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      vi.spyOn(apiLib.api, 'post').mockResolvedValue(mockApiResponse(mockCreatedMeasurement));

      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => useRecordMeasure(), {
        wrapper: createWrapper(queryClient),
      });

      await result.current.mutateAsync({
        patientId: 'patient-1',
        measureType: 'VAS',
        score: 7,
        date: '2024-01-01',
        phase: 'baseline',
      });

      expect(invalidateSpy).toHaveBeenCalled();
    });

    it('handles API error on record', async () => {
      vi.spyOn(apiLib.api, 'post').mockRejectedValue(new Error('API Error'));

      const { result } = renderHook(() => useRecordMeasure(), {
        wrapper: createWrapper(queryClient),
      });

      await expect(
        result.current.mutateAsync({
          patientId: 'patient-1',
          measureType: 'VAS',
          score: 7,
          date: '2024-01-01',
          phase: 'baseline',
        })
      ).rejects.toThrow('API Error');
    });
  });

  describe('useProgress', () => {
    it('calculates progress with baseline and current scores', async () => {
      const mockMeasurements = [
        {
          id: '1',
          patient_id: 'patient-1',
          measure_type: 'VAS',
          score: 8,
          date: '2024-01-01',
          phase: 'baseline',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
        {
          id: '2',
          patient_id: 'patient-1',
          measure_type: 'VAS',
          score: 4,
          date: '2024-02-01',
          phase: 'interim',
          created_at: '2024-02-01T00:00:00Z',
          updated_at: '2024-02-01T00:00:00Z',
        },
      ];

      vi.spyOn(apiLib.api, 'get').mockResolvedValue(mockApiResponse(mockMeasurements));

      const { result } = renderHook(() => useProgress('patient-1', 'VAS'), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data?.baseline).toBe(8);
      expect(result.current.data?.current).toBe(4);
      expect(result.current.data?.changeFromBaseline).toBe(-4);
      expect(result.current.data?.mcidAchieved).toBe(true); // VAS MCID = 2, change = -4
    });

    it('calculates MCID achievement for lower-is-better measures', async () => {
      const mockMeasurements = [
        {
          id: '1',
          patient_id: 'patient-1',
          measure_type: 'NDI',
          score: 50,
          date: '2024-01-01',
          phase: 'baseline',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
        {
          id: '2',
          patient_id: 'patient-1',
          measure_type: 'NDI',
          score: 40,
          date: '2024-02-01',
          phase: 'discharge',
          created_at: '2024-02-01T00:00:00Z',
          updated_at: '2024-02-01T00:00:00Z',
        },
      ];

      vi.spyOn(apiLib.api, 'get').mockResolvedValue(mockApiResponse(mockMeasurements));

      const { result } = renderHook(() => useProgress('patient-1', 'NDI'), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data?.baseline).toBe(50);
      expect(result.current.data?.current).toBe(40);
      expect(result.current.data?.changeFromBaseline).toBe(-10);
      expect(result.current.data?.mcidAchieved).toBe(true); // NDI MCID = 7.5
    });

    it('calculates MCID achievement for higher-is-better measures', async () => {
      const mockMeasurements = [
        {
          id: '1',
          patient_id: 'patient-1',
          measure_type: 'LEFS',
          score: 40,
          date: '2024-01-01',
          phase: 'baseline',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
        {
          id: '2',
          patient_id: 'patient-1',
          measure_type: 'LEFS',
          score: 55,
          date: '2024-02-01',
          phase: 'discharge',
          created_at: '2024-02-01T00:00:00Z',
          updated_at: '2024-02-01T00:00:00Z',
        },
      ];

      vi.spyOn(apiLib.api, 'get').mockResolvedValue(mockApiResponse(mockMeasurements));

      const { result } = renderHook(() => useProgress('patient-1', 'LEFS'), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data?.baseline).toBe(40);
      expect(result.current.data?.current).toBe(55);
      expect(result.current.data?.changeFromBaseline).toBe(15);
      expect(result.current.data?.mcidAchieved).toBe(true); // LEFS MCID = 9
    });

    it('calculates target score based on MCID', async () => {
      const mockMeasurements = [
        {
          id: '1',
          patient_id: 'patient-1',
          measure_type: 'VAS',
          score: 8,
          date: '2024-01-01',
          phase: 'baseline',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      ];

      vi.spyOn(apiLib.api, 'get').mockResolvedValue(mockApiResponse(mockMeasurements));

      const { result } = renderHook(() => useProgress('patient-1', 'VAS'), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      // VAS: lower is better, MCID = 2, baseline = 8, target = 8 - 2 = 6
      expect(result.current.data?.target).toBe(6);
    });

    it('returns data points for charting', async () => {
      const mockMeasurements = [
        {
          id: '1',
          patient_id: 'patient-1',
          measure_type: 'VAS',
          score: 8,
          date: '2024-01-01',
          phase: 'baseline',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
        {
          id: '2',
          patient_id: 'patient-1',
          measure_type: 'VAS',
          score: 6,
          date: '2024-02-01',
          phase: 'interim',
          created_at: '2024-02-01T00:00:00Z',
          updated_at: '2024-02-01T00:00:00Z',
        },
        {
          id: '3',
          patient_id: 'patient-1',
          measure_type: 'VAS',
          score: 3,
          date: '2024-03-01',
          phase: 'discharge',
          created_at: '2024-03-01T00:00:00Z',
          updated_at: '2024-03-01T00:00:00Z',
        },
      ];

      vi.spyOn(apiLib.api, 'get').mockResolvedValue(mockApiResponse(mockMeasurements));

      const { result } = renderHook(() => useProgress('patient-1', 'VAS'), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data?.dataPoints).toHaveLength(3);
      expect(result.current.data?.dataPoints[0].score).toBe(8);
      expect(result.current.data?.dataPoints[1].score).toBe(6);
      expect(result.current.data?.dataPoints[2].score).toBe(3);
    });

    it('handles no baseline measurement', async () => {
      const mockMeasurements = [
        {
          id: '1',
          patient_id: 'patient-1',
          measure_type: 'VAS',
          score: 5,
          date: '2024-01-01',
          phase: 'interim',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      ];

      vi.spyOn(apiLib.api, 'get').mockResolvedValue(mockApiResponse(mockMeasurements));

      const { result } = renderHook(() => useProgress('patient-1', 'VAS'), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data?.baseline).toBeNull();
      expect(result.current.data?.changeFromBaseline).toBeNull();
      expect(result.current.data?.mcidAchieved).toBe(false);
    });

    it('does not fetch when disabled', () => {
      const apiSpy = vi.spyOn(apiLib.api, 'get');

      renderHook(() => useProgress('patient-1', 'VAS', false), {
        wrapper: createWrapper(queryClient),
      });

      expect(apiSpy).not.toHaveBeenCalled();
    });
  });

  describe('useTrending', () => {
    it('returns trending data with change from baseline', async () => {
      const mockMeasurements = [
        {
          id: '1',
          patient_id: 'patient-1',
          measure_type: 'VAS',
          score: 8,
          date: '2024-01-01',
          phase: 'baseline',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
        {
          id: '2',
          patient_id: 'patient-1',
          measure_type: 'VAS',
          score: 6,
          date: '2024-02-01',
          phase: 'interim',
          created_at: '2024-02-01T00:00:00Z',
          updated_at: '2024-02-01T00:00:00Z',
        },
        {
          id: '3',
          patient_id: 'patient-1',
          measure_type: 'VAS',
          score: 4,
          date: '2024-03-01',
          phase: 'discharge',
          created_at: '2024-03-01T00:00:00Z',
          updated_at: '2024-03-01T00:00:00Z',
        },
      ];

      vi.spyOn(apiLib.api, 'get').mockResolvedValue(mockApiResponse(mockMeasurements));

      const { result } = renderHook(() => useTrending('patient-1', 'VAS'), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toHaveLength(3);
      expect(result.current.data?.[0].changeFromBaseline).toBe(0); // baseline
      expect(result.current.data?.[1].changeFromBaseline).toBe(-2); // 6 - 8
      expect(result.current.data?.[2].changeFromBaseline).toBe(-4); // 4 - 8
    });

    it('sorts measurements by date', async () => {
      const mockMeasurements = [
        {
          id: '3',
          patient_id: 'patient-1',
          measure_type: 'VAS',
          score: 4,
          date: '2024-03-01',
          phase: 'discharge',
          created_at: '2024-03-01T00:00:00Z',
          updated_at: '2024-03-01T00:00:00Z',
        },
        {
          id: '1',
          patient_id: 'patient-1',
          measure_type: 'VAS',
          score: 8,
          date: '2024-01-01',
          phase: 'baseline',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
        {
          id: '2',
          patient_id: 'patient-1',
          measure_type: 'VAS',
          score: 6,
          date: '2024-02-01',
          phase: 'interim',
          created_at: '2024-02-01T00:00:00Z',
          updated_at: '2024-02-01T00:00:00Z',
        },
      ];

      vi.spyOn(apiLib.api, 'get').mockResolvedValue(mockApiResponse(mockMeasurements));

      const { result } = renderHook(() => useTrending('patient-1', 'VAS'), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data?.[0].date).toBe('2024-01-01');
      expect(result.current.data?.[1].date).toBe('2024-02-01');
      expect(result.current.data?.[2].date).toBe('2024-03-01');
    });

    it('handles no baseline measurement', async () => {
      const mockMeasurements = [
        {
          id: '1',
          patient_id: 'patient-1',
          measure_type: 'VAS',
          score: 6,
          date: '2024-01-01',
          phase: 'interim',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      ];

      vi.spyOn(apiLib.api, 'get').mockResolvedValue(mockApiResponse(mockMeasurements));

      const { result } = renderHook(() => useTrending('patient-1', 'VAS'), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data?.[0].changeFromBaseline).toBeNull();
    });

    it('does not fetch when disabled', () => {
      const apiSpy = vi.spyOn(apiLib.api, 'get');

      renderHook(() => useTrending('patient-1', 'VAS', false), {
        wrapper: createWrapper(queryClient),
      });

      expect(apiSpy).not.toHaveBeenCalled();
    });
  });
});
