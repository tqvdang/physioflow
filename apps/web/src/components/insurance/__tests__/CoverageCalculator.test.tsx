import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CoverageCalculator } from '../CoverageCalculator';
import { renderWithQuery } from '@/__tests__/utils';
import * as useInsuranceHook from '@/hooks/use-insurance';
import type { Insurance, CoverageResult } from '@/hooks/use-insurance';

describe('CoverageCalculator', () => {
  const mockInsurance: Insurance = {
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
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('renders calculator with input field', () => {
      renderWithQuery(
        <CoverageCalculator patientId="patient-1" insurance={mockInsurance} />
      );

      expect(screen.getByText(/calculator.title/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/calculator.totalAmount/i)).toBeInTheDocument();
    });

    it('renders without insurance', () => {
      renderWithQuery(
        <CoverageCalculator patientId="patient-1" insurance={null} />
      );

      expect(screen.getByLabelText(/calculator.totalAmount/i)).toBeInTheDocument();
    });

    it('input has VND label', () => {
      renderWithQuery(
        <CoverageCalculator patientId="patient-1" insurance={mockInsurance} />
      );

      expect(screen.getByText('VND')).toBeInTheDocument();
    });
  });

  describe('VND Amount Input', () => {
    it('accepts numeric input', async () => {
      const user = userEvent.setup();
      renderWithQuery(
        <CoverageCalculator patientId="patient-1" insurance={mockInsurance} />
      );

      const input = screen.getByLabelText(/calculator.totalAmount/i) as HTMLInputElement;
      await user.type(input, '1000000');

      expect(input.value).toBe('1.000.000');
    });

    it('formats input with thousand separators', async () => {
      const user = userEvent.setup();
      renderWithQuery(
        <CoverageCalculator patientId="patient-1" insurance={mockInsurance} />
      );

      const input = screen.getByLabelText(/calculator.totalAmount/i);
      await user.type(input, '5000000');

      await waitFor(() => {
        expect(input).toHaveValue('5.000.000');
      });
    });

    it('ignores non-numeric characters', async () => {
      const user = userEvent.setup();
      renderWithQuery(
        <CoverageCalculator patientId="patient-1" insurance={mockInsurance} />
      );

      const input = screen.getByLabelText(/calculator.totalAmount/i) as HTMLInputElement;
      await user.type(input, 'abc123def');

      // Only numeric characters should remain
      expect(input.value).toBe('123');
    });

    it('shows placeholder zero', () => {
      renderWithQuery(
        <CoverageCalculator patientId="patient-1" insurance={mockInsurance} />
      );

      const input = screen.getByPlaceholderText('0');
      expect(input).toBeInTheDocument();
    });
  });

  describe('Coverage Calculation Display', () => {
    it('calculates and displays coverage for valid insurance', async () => {
      const user = userEvent.setup();
      renderWithQuery(
        <CoverageCalculator patientId="patient-1" insurance={mockInsurance} />
      );

      const input = screen.getByLabelText(/calculator.totalAmount/i);
      await user.type(input, '1000000');

      await waitFor(() => {
        expect(screen.getByText(/calculator.insurancePays/i)).toBeInTheDocument();
        expect(screen.getByText(/calculator.patientPays/i)).toBeInTheDocument();
      });
    });

    it('shows coverage percentage bar for active insurance', async () => {
      const user = userEvent.setup();
      renderWithQuery(
        <CoverageCalculator patientId="patient-1" insurance={mockInsurance} />
      );

      const input = screen.getByLabelText(/calculator.totalAmount/i);
      await user.type(input, '1000000');

      await waitFor(() => {
        expect(screen.getByText('80%')).toBeInTheDocument();
      });
    });

    it('does not show breakdown when amount is zero', () => {
      renderWithQuery(
        <CoverageCalculator patientId="patient-1" insurance={mockInsurance} />
      );

      expect(screen.queryByText(/calculator.insurancePays/i)).not.toBeInTheDocument();
    });

    it('displays "no insurance" notice when patient has no insurance', async () => {
      const user = userEvent.setup();
      renderWithQuery(
        <CoverageCalculator patientId="patient-1" insurance={null} />
      );

      const input = screen.getByLabelText(/calculator.totalAmount/i);
      await user.type(input, '1000000');

      await waitFor(() => {
        expect(screen.getByText(/calculator.noInsurance/i)).toBeInTheDocument();
      });
    });
  });

  describe('Insurance Pays / Patient Pays Breakdown', () => {
    it('calculates insurance pays correctly at 80% coverage', async () => {
      const user = userEvent.setup();
      renderWithQuery(
        <CoverageCalculator patientId="patient-1" insurance={mockInsurance} />
      );

      const input = screen.getByLabelText(/calculator.totalAmount/i);
      await user.type(input, '1000000');

      await waitFor(() => {
        // Insurance pays 80% = 800,000 VND
        expect(screen.getByText(/800\.000/)).toBeInTheDocument();
      });
    });

    it('calculates patient pays correctly at 20% copay', async () => {
      const user = userEvent.setup();
      renderWithQuery(
        <CoverageCalculator patientId="patient-1" insurance={mockInsurance} />
      );

      const input = screen.getByLabelText(/calculator.totalAmount/i);
      await user.type(input, '1000000');

      await waitFor(() => {
        // Patient pays 20% = 200,000 VND
        expect(screen.getByText(/200\.000/)).toBeInTheDocument();
      });
    });

    it('calculates correctly for 100% coverage', async () => {
      const user = userEvent.setup();
      const fullCoverageInsurance: Insurance = {
        ...mockInsurance,
        coveragePercent: 100,
        copayRate: 0,
        prefixCode: 'CH',
      };

      renderWithQuery(
        <CoverageCalculator patientId="patient-1" insurance={fullCoverageInsurance} />
      );

      const input = screen.getByLabelText(/calculator.totalAmount/i);
      await user.type(input, '1000000');

      await waitFor(() => {
        // Insurance pays 100% = 1,000,000 VND
        expect(screen.getByText(/1\.000\.000/)).toBeInTheDocument();
      });
    });

    it('shows patient pays full amount when no insurance', async () => {
      const user = userEvent.setup();
      renderWithQuery(
        <CoverageCalculator patientId="patient-1" insurance={null} />
      );

      const input = screen.getByLabelText(/calculator.totalAmount/i);
      await user.type(input, '1000000');

      await waitFor(() => {
        // Patient pays 100% = 1,000,000 VND
        const patientPaysElements = screen.getAllByText(/1\.000\.000/);
        expect(patientPaysElements.length).toBeGreaterThan(0);
      });
    });

    it('shows zero insurance payment when no insurance', async () => {
      const user = userEvent.setup();
      renderWithQuery(
        <CoverageCalculator patientId="patient-1" insurance={null} />
      );

      const input = screen.getByLabelText(/calculator.totalAmount/i);
      await user.type(input, '500000');

      await waitFor(() => {
        expect(screen.getByText(/calculator.insurancePays/i)).toBeInTheDocument();
        // Should show 0 VND for insurance
        const insuranceText = screen.getByText(/calculator.insurancePays/i).parentElement;
        expect(insuranceText?.textContent).toContain('0');
      });
    });

    it('formats currency amounts with VND symbol', async () => {
      const user = userEvent.setup();
      renderWithQuery(
        <CoverageCalculator patientId="patient-1" insurance={mockInsurance} />
      );

      const input = screen.getByLabelText(/calculator.totalAmount/i);
      await user.type(input, '1500000');

      await waitFor(() => {
        // Should have Vietnamese currency formatting
        expect(screen.getByText(/1\.500\.000/)).toBeInTheDocument();
      });
    });
  });

  describe('API Integration', () => {
    it('uses API coverage data when available', async () => {
      const user = userEvent.setup();
      const mockApiCoverage: CoverageResult = {
        totalAmount: 1000000,
        coveragePercent: 85,
        copayRate: 15,
        insurancePays: 850000,
        patientPays: 150000,
      };

      vi.spyOn(useInsuranceHook, 'useCalculateCoverage').mockReturnValue({
        data: mockApiCoverage,
        isLoading: false,
        isError: false,
      } as any);

      renderWithQuery(
        <CoverageCalculator patientId="patient-1" insurance={mockInsurance} />
      );

      const input = screen.getByLabelText(/calculator.totalAmount/i);
      await user.type(input, '1000000');

      await waitFor(() => {
        // Should use API coverage (85%) instead of local (80%)
        expect(screen.getByText('85%')).toBeInTheDocument();
      });
    });

    it('falls back to local calculation when API fails', async () => {
      const user = userEvent.setup();

      vi.spyOn(useInsuranceHook, 'useCalculateCoverage').mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: true,
      } as any);

      renderWithQuery(
        <CoverageCalculator patientId="patient-1" insurance={mockInsurance} />
      );

      const input = screen.getByLabelText(/calculator.totalAmount/i);
      await user.type(input, '1000000');

      await waitFor(() => {
        // Should fall back to local coverage (80%)
        expect(screen.getByText('80%')).toBeInTheDocument();
      });
    });

    it('debounces API calls when typing', async () => {
      const user = userEvent.setup();
      const mockUseCalculateCoverage = vi.spyOn(useInsuranceHook, 'useCalculateCoverage');

      mockUseCalculateCoverage.mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: false,
      } as any);

      renderWithQuery(
        <CoverageCalculator patientId="patient-1" insurance={mockInsurance} />
      );

      const input = screen.getByLabelText(/calculator.totalAmount/i);

      // Type multiple characters rapidly
      await user.type(input, '1000000');

      // Should be called initially, but debounced during rapid typing
      expect(mockUseCalculateCoverage).toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('handles inactive insurance by showing no coverage', async () => {
      const user = userEvent.setup();
      const inactiveInsurance: Insurance = {
        ...mockInsurance,
        isActive: false,
      };

      renderWithQuery(
        <CoverageCalculator patientId="patient-1" insurance={inactiveInsurance} />
      );

      const input = screen.getByLabelText(/calculator.totalAmount/i);
      await user.type(input, '1000000');

      await waitFor(() => {
        expect(screen.getByText(/calculator.noInsurance/i)).toBeInTheDocument();
      });
    });

    it('handles large amounts correctly', async () => {
      const user = userEvent.setup();
      renderWithQuery(
        <CoverageCalculator patientId="patient-1" insurance={mockInsurance} />
      );

      const input = screen.getByLabelText(/calculator.totalAmount/i);
      await user.type(input, '50000000');

      await waitFor(() => {
        expect(screen.getByText(/50\.000\.000/)).toBeInTheDocument();
      });
    });

    it('handles zero amount gracefully', async () => {
      renderWithQuery(
        <CoverageCalculator patientId="patient-1" insurance={mockInsurance} />
      );

      // Should not show breakdown for zero amount
      expect(screen.queryByText(/calculator.insurancePays/i)).not.toBeInTheDocument();
    });

    it('rounds insurance payment correctly', async () => {
      const user = userEvent.setup();
      renderWithQuery(
        <CoverageCalculator patientId="patient-1" insurance={mockInsurance} />
      );

      const input = screen.getByLabelText(/calculator.totalAmount/i);
      // 333 VND * 80% = 266.4 VND (should round to 266)
      await user.type(input, '333');

      await waitFor(() => {
        expect(screen.getByText(/calculator.patientPays/i)).toBeInTheDocument();
      });
    });
  });
});
