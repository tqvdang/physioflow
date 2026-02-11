import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import {
  useCreateReevaluation,
  useReevaluationHistory,
  useComparison,
  reevaluationKeys,
} from '../use-reevaluation';
import { createWrapper, createTestQueryClient } from '@/__tests__/utils';
import * as apiLib from '@/lib/api';

// Also test the shared interpretation logic
import {
  calculateChange,
  determineInterpretation,
} from '@physioflow/shared-types';

describe('use-reevaluation hooks', () => {
  let queryClient: ReturnType<typeof createTestQueryClient>;

  beforeEach(() => {
    queryClient = createTestQueryClient();
    vi.clearAllMocks();
  });

  afterEach(() => {
    queryClient.clear();
  });

  describe('reevaluationKeys', () => {
    it('generates correct query keys', () => {
      expect(reevaluationKeys.all).toEqual(['reevaluations']);
      expect(reevaluationKeys.patient('p1')).toEqual([
        'reevaluations',
        'patient',
        'p1',
      ]);
      expect(reevaluationKeys.patientHistory('p1')).toEqual([
        'reevaluations',
        'patient',
        'p1',
        'history',
      ]);
      expect(reevaluationKeys.comparison('r1')).toEqual([
        'reevaluations',
        'comparison',
        'r1',
      ]);
    });
  });
});

describe('Comparison Logic (shared-types)', () => {
  describe('calculateChange', () => {
    it('calculates positive change for ROM improvement', () => {
      const result = calculateChange(90, 120);
      expect(result.change).toBe(30);
      expect(result.changePercentage).toBeCloseTo(33.33, 1);
    });

    it('calculates negative change for ROM decline', () => {
      const result = calculateChange(120, 100);
      expect(result.change).toBe(-20);
      expect(result.changePercentage).toBeCloseTo(-16.67, 1);
    });

    it('calculates zero change when values are equal', () => {
      const result = calculateChange(100, 100);
      expect(result.change).toBe(0);
      expect(result.changePercentage).toBeCloseTo(0, 1);
    });

    it('returns undefined percentage when baseline is zero', () => {
      const result = calculateChange(0, 50);
      expect(result.change).toBe(50);
      expect(result.changePercentage).toBeUndefined();
    });

    it('calculates negative change for pain improvement (lower is better)', () => {
      const result = calculateChange(8, 3);
      expect(result.change).toBe(-5);
      expect(result.changePercentage).toBeCloseTo(-62.5, 1);
    });
  });

  describe('determineInterpretation', () => {
    it('returns improved when ROM increases above MCID', () => {
      const result = determineInterpretation(15, 10, true);
      expect(result.interpretation).toBe('improved');
      expect(result.mcidAchieved).toBe(true);
    });

    it('returns stable when change is below MCID', () => {
      const result = determineInterpretation(5, 10, true);
      expect(result.interpretation).toBe('stable');
      expect(result.mcidAchieved).toBe(false);
    });

    it('returns declined when ROM decreases above MCID', () => {
      const result = determineInterpretation(-15, 10, true);
      expect(result.interpretation).toBe('declined');
      expect(result.mcidAchieved).toBe(true);
    });

    it('returns improved for pain decrease (lower is better)', () => {
      const result = determineInterpretation(-3, 2, false);
      expect(result.interpretation).toBe('improved');
      expect(result.mcidAchieved).toBe(true);
    });

    it('returns declined for pain increase (lower is better)', () => {
      const result = determineInterpretation(3, 2, false);
      expect(result.interpretation).toBe('declined');
      expect(result.mcidAchieved).toBe(true);
    });

    it('returns stable for small pain change below MCID', () => {
      const result = determineInterpretation(-1, 2, false);
      expect(result.interpretation).toBe('stable');
      expect(result.mcidAchieved).toBe(false);
    });

    it('returns improved without MCID when positive change and higher is better', () => {
      const result = determineInterpretation(5, undefined, true);
      expect(result.interpretation).toBe('improved');
      expect(result.mcidAchieved).toBe(false);
    });

    it('returns declined without MCID when negative change and higher is better', () => {
      const result = determineInterpretation(-5, undefined, true);
      expect(result.interpretation).toBe('declined');
      expect(result.mcidAchieved).toBe(false);
    });

    it('returns stable for zero change without MCID', () => {
      const result = determineInterpretation(0, undefined, true);
      expect(result.interpretation).toBe('stable');
      expect(result.mcidAchieved).toBe(false);
    });

    it('returns stable for essentially zero change', () => {
      const result = determineInterpretation(0.00001, undefined, true);
      expect(result.interpretation).toBe('stable');
      expect(result.mcidAchieved).toBe(false);
    });

    it('returns improved when change exactly equals MCID', () => {
      const result = determineInterpretation(5, 5, true);
      expect(result.interpretation).toBe('improved');
      expect(result.mcidAchieved).toBe(true);
    });
  });
});
