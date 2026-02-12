import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { InsuranceValidator } from '../InsuranceValidator';
import { renderWithQuery } from '@/__tests__/utils';
import * as useInsuranceHook from '@/hooks/use-insurance';
import type { InsuranceValidationResult } from '@/hooks/use-insurance';

describe('InsuranceValidator', () => {
  const mockOnValidResult = vi.fn();

  beforeEach(() => {
    mockOnValidResult.mockClear();
  });

  describe('Component Rendering', () => {
    it('renders validator with input and button', () => {
      renderWithQuery(<InsuranceValidator />);

      expect(screen.getByRole('textbox')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /validation.validate/i })).toBeInTheDocument();
      expect(screen.getByText(/validation.title/i)).toBeInTheDocument();
    });

    it('input has correct placeholder', () => {
      renderWithQuery(<InsuranceValidator />);

      const input = screen.getByPlaceholderText('DN4-0123-45678-90123');
      expect(input).toBeInTheDocument();
    });
  });

  describe('Real-time Preview', () => {
    it('shows prefix preview while typing valid card', async () => {
      const user = userEvent.setup();
      renderWithQuery(<InsuranceValidator />);

      const input = screen.getByRole('textbox');
      await user.type(input, 'DN');

      await waitFor(() => {
        expect(screen.getByText(/validation.prefixDetected/i)).toBeInTheDocument();
      });
    });

    it('shows unknown prefix warning for invalid prefix', async () => {
      const user = userEvent.setup();
      renderWithQuery(<InsuranceValidator />);

      const input = screen.getByRole('textbox');
      await user.type(input, 'XX');

      await waitFor(() => {
        expect(screen.getByText(/validation.unknownPrefix/i)).toBeInTheDocument();
      });
    });

    it('converts input to uppercase automatically', async () => {
      const user = userEvent.setup();
      renderWithQuery(<InsuranceValidator />);

      const input = screen.getByRole('textbox') as HTMLInputElement;
      await user.type(input, 'dn40123456789012 3');

      expect(input.value).toBe('DN4-0123-45678-90123');
    });

    it('clears result when input changes', async () => {
      const user = userEvent.setup();
      const mockMutateAsync = vi.fn();

      vi.spyOn(useInsuranceHook, 'useInsuranceValidation').mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: false,
      } as any);

      mockMutateAsync.mockResolvedValue({
        valid: true,
        cardNumber: 'CH40123456789023',
        prefixCode: 'CH',
        prefixLabel: 'CH - Chinh sach',
        defaultCoverage: 100,
        expired: false,
      });

      renderWithQuery(<InsuranceValidator />);

      const input = screen.getByRole('textbox');
      await user.type(input, 'CH40123456789023');

      const validateButton = screen.getByRole('button', { name: /validation.validate/i });
      await user.click(validateButton);

      await waitFor(() => {
        expect(screen.getAllByText(/validation.valid/i).length).toBeGreaterThan(0);
      });

      // Manually modify input to trigger onChange
      await user.tripleClick(input);
      await user.keyboard('DN');

      // After changing input, result should be cleared
      // Use exact match to avoid matching the button's "validation.validate" text
      await waitFor(() => {
        expect(screen.queryByText(/^validation\.valid$/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Validation Button Click', () => {
    it('validates card when button is clicked', async () => {
      const user = userEvent.setup();
      const mockMutateAsync = vi.fn();

      vi.spyOn(useInsuranceHook, 'useInsuranceValidation').mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: false,
      } as any);

      const validResult: InsuranceValidationResult = {
        valid: true,
        cardNumber: 'DN4-0123-45678-90123',
        prefixCode: 'DN',
        prefixLabel: 'DN - Doanh nghiep',
        defaultCoverage: 80,
        expired: false,
      };

      mockMutateAsync.mockResolvedValue(validResult);

      renderWithQuery(<InsuranceValidator onValidResult={mockOnValidResult} />);

      const input = screen.getByRole('textbox');
      await user.type(input, 'DN4-0123-45678-90123');

      const validateButton = screen.getByRole('button', { name: /validation.validate/i });
      await user.click(validateButton);

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledWith('DN4-0123-45678-90123');
      });
    });

    it('validates card when Enter key is pressed', async () => {
      const user = userEvent.setup();
      const mockMutateAsync = vi.fn();

      vi.spyOn(useInsuranceHook, 'useInsuranceValidation').mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: false,
      } as any);

      mockMutateAsync.mockResolvedValue({
        valid: true,
        cardNumber: 'DN4-0123-45678-90123',
        prefixCode: 'DN',
        prefixLabel: 'DN - Doanh nghiep',
        defaultCoverage: 80,
        expired: false,
      });

      renderWithQuery(<InsuranceValidator />);

      const input = screen.getByRole('textbox');
      await user.type(input, 'DN4-0123-45678-90123{Enter}');

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledWith('DN4-0123-45678-90123');
      });
    });

    it('does not validate when input is empty', async () => {
      const user = userEvent.setup();
      const mockMutateAsync = vi.fn();

      vi.spyOn(useInsuranceHook, 'useInsuranceValidation').mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: false,
      } as any);

      renderWithQuery(<InsuranceValidator />);

      const validateButton = screen.getByRole('button', { name: /validation.validate/i });
      await user.click(validateButton);

      expect(mockMutateAsync).not.toHaveBeenCalled();
    });

    it('shows loading state while validating', async () => {
      const user = userEvent.setup();
      const mockMutateAsync = vi.fn();

      vi.spyOn(useInsuranceHook, 'useInsuranceValidation').mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: true,
      } as any);

      renderWithQuery(<InsuranceValidator />);

      const input = screen.getByRole('textbox');
      await user.type(input, 'DN4-0123-45678-90123');

      // When isPending is true, button shows loader icon instead of text
      const validateButton = screen.getByRole('button');
      expect(validateButton).toBeDisabled();
    });
  });

  describe('Valid Card Result Display', () => {
    it('displays valid card result with green badge', async () => {
      const user = userEvent.setup();
      const mockMutateAsync = vi.fn();

      vi.spyOn(useInsuranceHook, 'useInsuranceValidation').mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: false,
      } as any);

      const validResult: InsuranceValidationResult = {
        valid: true,
        cardNumber: 'DN4-0123-45678-90123',
        prefixCode: 'DN',
        prefixLabel: 'DN - Doanh nghiep',
        defaultCoverage: 80,
        expired: false,
      };

      mockMutateAsync.mockResolvedValue(validResult);

      renderWithQuery(<InsuranceValidator />);

      const input = screen.getByRole('textbox');
      await user.type(input, 'DN4-0123-45678-90123');

      const validateButton = screen.getByRole('button', { name: /validation.validate/i });
      await user.click(validateButton);

      await waitFor(() => {
        expect(screen.getByText('DN4-0123-45678-90123')).toBeInTheDocument();
        expect(screen.getByText('DN - Doanh nghiep')).toBeInTheDocument();
        expect(screen.getByText('80%')).toBeInTheDocument();
      });
    });

    it('displays all card details for valid result', async () => {
      const user = userEvent.setup();
      const mockMutateAsync = vi.fn();

      vi.spyOn(useInsuranceHook, 'useInsuranceValidation').mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: false,
      } as any);

      const validResult: InsuranceValidationResult = {
        valid: true,
        cardNumber: 'CH4012345678901',
        prefixCode: 'CH',
        prefixLabel: 'CH - Chinh sach',
        defaultCoverage: 100,
        expired: false,
      };

      mockMutateAsync.mockResolvedValue(validResult);

      renderWithQuery(<InsuranceValidator />);

      const input = screen.getByRole('textbox');
      await user.type(input, 'CH4012345678901');

      const validateButton = screen.getByRole('button', { name: /validation.validate/i });
      await user.click(validateButton);

      await waitFor(() => {
        expect(screen.getByText('CH4012345678901')).toBeInTheDocument();
        expect(screen.getByText('CH - Chinh sach')).toBeInTheDocument();
        expect(screen.getByText('100%')).toBeInTheDocument();
        expect(screen.getByText('0%')).toBeInTheDocument(); // copay
      });
    });

    it('calls onValidResult callback with valid result', async () => {
      const user = userEvent.setup();
      const mockMutateAsync = vi.fn();

      vi.spyOn(useInsuranceHook, 'useInsuranceValidation').mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: false,
      } as any);

      const validResult: InsuranceValidationResult = {
        valid: true,
        cardNumber: 'DN4-0123-45678-90123',
        prefixCode: 'DN',
        prefixLabel: 'DN - Doanh nghiep',
        defaultCoverage: 80,
        expired: false,
      };

      mockMutateAsync.mockResolvedValue(validResult);

      renderWithQuery(<InsuranceValidator onValidResult={mockOnValidResult} />);

      const input = screen.getByRole('textbox');
      await user.type(input, 'DN4-0123-45678-90123');

      const validateButton = screen.getByRole('button', { name: /validation.validate/i });
      await user.click(validateButton);

      await waitFor(() => {
        expect(mockOnValidResult).toHaveBeenCalledWith(validResult);
      });
    });
  });

  describe('Invalid Card Error Messages', () => {
    it('displays invalid format error', async () => {
      const user = userEvent.setup();
      const mockMutateAsync = vi.fn();

      vi.spyOn(useInsuranceHook, 'useInsuranceValidation').mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: false,
      } as any);

      const invalidResult: InsuranceValidationResult = {
        valid: false,
        cardNumber: 'INVALID',
        prefixCode: '',
        prefixLabel: '',
        defaultCoverage: 0,
        expired: false,
        errorCode: 'invalid_format',
      };

      mockMutateAsync.mockResolvedValue(invalidResult);

      renderWithQuery(<InsuranceValidator />);

      const input = screen.getByRole('textbox');
      await user.type(input, 'INVALID');

      const validateButton = screen.getByRole('button', { name: /validation.validate/i });
      await user.click(validateButton);

      await waitFor(() => {
        expect(screen.getByText(/validation.invalidFormat/i)).toBeInTheDocument();
      });
    });

    it('displays invalid prefix error', async () => {
      const user = userEvent.setup();
      const mockMutateAsync = vi.fn();

      vi.spyOn(useInsuranceHook, 'useInsuranceValidation').mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: false,
      } as any);

      const invalidResult: InsuranceValidationResult = {
        valid: false,
        cardNumber: 'XX4012345678901',
        prefixCode: 'XX',
        prefixLabel: '',
        defaultCoverage: 0,
        expired: false,
        errorCode: 'invalid_prefix',
      };

      mockMutateAsync.mockResolvedValue(invalidResult);

      renderWithQuery(<InsuranceValidator />);

      const input = screen.getByRole('textbox');
      await user.type(input, 'XX4012345678901');

      const validateButton = screen.getByRole('button', { name: /validation.validate/i });
      await user.click(validateButton);

      await waitFor(() => {
        expect(screen.getByText(/validation.invalidPrefix/i)).toBeInTheDocument();
      });
    });

    it('displays generic invalid error for other error codes', async () => {
      const user = userEvent.setup();
      const mockMutateAsync = vi.fn();

      vi.spyOn(useInsuranceHook, 'useInsuranceValidation').mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: false,
      } as any);

      const invalidResult: InsuranceValidationResult = {
        valid: false,
        cardNumber: 'DN4-0123-45678-90123',
        prefixCode: 'DN',
        prefixLabel: 'DN - Doanh nghiep',
        defaultCoverage: 80,
        expired: false,
        message: 'Card not found in database',
      };

      mockMutateAsync.mockResolvedValue(invalidResult);

      renderWithQuery(<InsuranceValidator />);

      const input = screen.getByRole('textbox');
      await user.type(input, 'DN4-0123-45678-90123');

      const validateButton = screen.getByRole('button', { name: /validation.validate/i });
      await user.click(validateButton);

      await waitFor(() => {
        // Should have at least one instance of validation.invalid (appears in both badge and text)
        expect(screen.getAllByText(/validation.invalid/i).length).toBeGreaterThan(0);
      });
    });
  });

  describe('Expired Card Warning', () => {
    it('displays expired warning for expired card', async () => {
      const user = userEvent.setup();
      const mockMutateAsync = vi.fn();

      vi.spyOn(useInsuranceHook, 'useInsuranceValidation').mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: false,
      } as any);

      const expiredResult: InsuranceValidationResult = {
        valid: true,
        cardNumber: 'DN4-0123-45678-90123',
        prefixCode: 'DN',
        prefixLabel: 'DN - Doanh nghiep',
        defaultCoverage: 80,
        expired: true,
        errorCode: 'expired',
        message: 'Card has expired',
      };

      mockMutateAsync.mockResolvedValue(expiredResult);

      renderWithQuery(<InsuranceValidator />);

      const input = screen.getByRole('textbox');
      await user.type(input, 'DN4-0123-45678-90123');

      const validateButton = screen.getByRole('button', { name: /validation.validate/i });
      await user.click(validateButton);

      await waitFor(() => {
        // Should show expired badge (which contains the text "validation.expired")
        const badges = screen.getAllByText(/validation.expired/i);
        expect(badges.length).toBeGreaterThan(0);
      });
    });

    it('does not call onValidResult for expired cards', async () => {
      const user = userEvent.setup();
      const mockMutateAsync = vi.fn();

      vi.spyOn(useInsuranceHook, 'useInsuranceValidation').mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: false,
      } as any);

      const expiredResult: InsuranceValidationResult = {
        valid: true,
        cardNumber: 'DN4-0123-45678-90123',
        prefixCode: 'DN',
        prefixLabel: 'DN - Doanh nghiep',
        defaultCoverage: 80,
        expired: true,
      };

      mockMutateAsync.mockResolvedValue(expiredResult);

      renderWithQuery(<InsuranceValidator onValidResult={mockOnValidResult} />);

      const input = screen.getByRole('textbox');
      await user.type(input, 'DN4-0123-45678-90123');

      const validateButton = screen.getByRole('button', { name: /validation.validate/i });
      await user.click(validateButton);

      await waitFor(() => {
        expect(screen.getAllByText(/validation.expired/i).length).toBeGreaterThan(0);
      });

      expect(mockOnValidResult).not.toHaveBeenCalled();
    });
  });
});
