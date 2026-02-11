import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import {
  useTemplates,
  useTemplate,
  useSaveResult,
  usePatientAssessmentResults,
} from '../use-assessment-templates';
import { createWrapper, createTestQueryClient } from '@/__tests__/utils';
import * as apiLib from '@/lib/api';

describe('use-assessment-templates hooks', () => {
  let queryClient: ReturnType<typeof createTestQueryClient>;

  beforeEach(() => {
    queryClient = createTestQueryClient();
    vi.clearAllMocks();
  });

  afterEach(() => {
    queryClient.clear();
  });

  const mockTemplate = {
    id: 'tmpl-001',
    name: 'Lower Back Pain Assessment',
    name_vi: 'Danh gia Dau lung duoi',
    condition: 'lower_back_pain',
    category: 'musculoskeletal',
    description: 'Assessment for lower back pain',
    description_vi: 'Danh gia dau lung duoi',
    checklist_items: [
      {
        item: 'Posture Assessment',
        item_vi: 'Danh gia tu the',
        type: 'select',
        options: ['Normal', 'Kyphotic'],
        options_vi: ['Binh thuong', 'Gu lung'],
        required: true,
        order: 1,
      },
      {
        item: 'Pain Level',
        item_vi: 'Muc do dau',
        type: 'number',
        unit: 'score',
        range: [0, 10] as [number, number],
        required: true,
        order: 2,
      },
    ],
    item_count: 2,
    is_active: true,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  };

  const mockResult = {
    id: 'result-001',
    patient_id: 'patient-123',
    template_id: 'tmpl-001',
    clinic_id: 'clinic-123',
    therapist_id: 'therapist-123',
    results: { 'Posture Assessment': 'Normal', 'Pain Level': 5 },
    notes: 'Patient improving',
    assessed_at: '2025-06-15T10:00:00Z',
    created_at: '2025-06-15T10:00:00Z',
    updated_at: '2025-06-15T10:00:00Z',
    template_name: 'Lower Back Pain Assessment',
    template_name_vi: 'Danh gia Dau lung duoi',
    template_condition: 'lower_back_pain',
  };

  describe('useTemplates', () => {
    it('fetches all templates successfully', async () => {
      vi.spyOn(apiLib.api, 'get').mockResolvedValue({
        data: [mockTemplate],
      } as any);

      const wrapper = createWrapper(queryClient);
      const { result } = renderHook(() => useTemplates(), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toHaveLength(1);
      expect(result.current.data![0].name).toBe('Lower Back Pain Assessment');
      expect(result.current.data![0].nameVi).toBe('Danh gia Dau lung duoi');
      expect(result.current.data![0].checklistItems).toHaveLength(2);
      expect(result.current.data![0].checklistItems[0].itemVi).toBe('Danh gia tu the');
    });

    it('fetches templates filtered by category', async () => {
      vi.spyOn(apiLib.api, 'get').mockResolvedValue({
        data: [mockTemplate],
      } as any);

      const wrapper = createWrapper(queryClient);
      const { result } = renderHook(() => useTemplates('musculoskeletal'), {
        wrapper,
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(apiLib.api.get).toHaveBeenCalledWith(
        '/v1/assessment-templates',
        expect.objectContaining({
          params: { category: 'musculoskeletal' },
        })
      );
    });

    it('handles empty response', async () => {
      vi.spyOn(apiLib.api, 'get').mockResolvedValue({
        data: [],
      } as any);

      const wrapper = createWrapper(queryClient);
      const { result } = renderHook(() => useTemplates(), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toHaveLength(0);
    });
  });

  describe('useTemplate', () => {
    it('fetches a single template by ID', async () => {
      vi.spyOn(apiLib.api, 'get').mockResolvedValue({
        data: mockTemplate,
      } as any);

      const wrapper = createWrapper(queryClient);
      const { result } = renderHook(() => useTemplate('tmpl-001'), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data!.id).toBe('tmpl-001');
      expect(result.current.data!.condition).toBe('lower_back_pain');
      expect(result.current.data!.category).toBe('musculoskeletal');
    });

    it('does not fetch when id is empty', () => {
      const wrapper = createWrapper(queryClient);
      const { result } = renderHook(() => useTemplate(''), { wrapper });

      expect(result.current.isFetching).toBe(false);
    });
  });

  describe('useSaveResult', () => {
    it('saves assessment result successfully', async () => {
      vi.spyOn(apiLib.api, 'post').mockResolvedValue({
        data: mockResult,
      } as any);

      const wrapper = createWrapper(queryClient);
      const { result } = renderHook(() => useSaveResult(), { wrapper });

      await result.current.mutateAsync({
        patientId: 'patient-123',
        templateId: 'tmpl-001',
        results: { 'Posture Assessment': 'Normal', 'Pain Level': 5 },
        notes: 'Patient improving',
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data!.patientId).toBe('patient-123');
      expect(result.current.data!.templateId).toBe('tmpl-001');
      expect(result.current.data!.notes).toBe('Patient improving');
    });

    it('sends correct API payload with snake_case', async () => {
      vi.spyOn(apiLib.api, 'post').mockResolvedValue({
        data: mockResult,
      } as any);

      const wrapper = createWrapper(queryClient);
      const { result } = renderHook(() => useSaveResult(), { wrapper });

      await result.current.mutateAsync({
        patientId: 'patient-123',
        templateId: 'tmpl-001',
        results: { 'Pain Level': 7 },
      });

      expect(apiLib.api.post).toHaveBeenCalledWith(
        '/v1/assessment-templates/results',
        {
          patient_id: 'patient-123',
          template_id: 'tmpl-001',
          results: { 'Pain Level': 7 },
          notes: undefined,
          assessed_at: undefined,
        }
      );
    });
  });

  describe('usePatientAssessmentResults', () => {
    it('fetches patient assessment results', async () => {
      vi.spyOn(apiLib.api, 'get').mockResolvedValue({
        data: [mockResult],
      } as any);

      const wrapper = createWrapper(queryClient);
      const { result } = renderHook(
        () => usePatientAssessmentResults('patient-123'),
        { wrapper }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toHaveLength(1);
      expect(result.current.data![0].templateName).toBe('Lower Back Pain Assessment');
      expect(result.current.data![0].templateCondition).toBe('lower_back_pain');
    });

    it('does not fetch when patientId is empty', () => {
      const wrapper = createWrapper(queryClient);
      const { result } = renderHook(
        () => usePatientAssessmentResults(''),
        { wrapper }
      );

      expect(result.current.isFetching).toBe(false);
    });
  });
});
