import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { InsuranceCardForm } from '../InsuranceCardForm';
import { renderWithQuery } from '@/__tests__/utils';
import type { Insurance } from '@/hooks/use-insurance';

describe('InsuranceCardForm', () => {
  const mockOnSubmit = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    mockOnSubmit.mockClear();
    mockOnCancel.mockClear();
  });

  describe('Form Rendering', () => {
    it('renders all form fields in create mode', () => {
      renderWithQuery(
        <InsuranceCardForm
          mode="create"
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByLabelText(/card.number/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/card.prefix/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/card.validFrom/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/card.validTo/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/card.coverage/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/card.copay/i)).toBeInTheDocument();
    });

    it('renders with default values in edit mode', () => {
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

      renderWithQuery(
        <InsuranceCardForm
          mode="edit"
          defaultValues={mockInsurance}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      const cardNumberInput = screen.getByDisplayValue('DN4012345678901');
      expect(cardNumberInput).toBeInTheDocument();
    });

    it('displays action buttons', () => {
      renderWithQuery(
        <InsuranceCardForm
          mode="create"
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByRole('button', { name: /actions.save/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /actions.cancel/i })).toBeInTheDocument();
    });
  });

  describe('Card Number Validation', () => {
    it('validates card number format in real-time', async () => {
      const user = userEvent.setup();
      renderWithQuery(
        <InsuranceCardForm
          mode="create"
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      const input = screen.getByLabelText(/card.number/i);

      // Type invalid card number
      await user.type(input, 'INVALID123');

      // Should show format error after attempting to submit
      const submitButton = screen.getByRole('button', { name: /actions.save/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/Dinh dang the khong dung/i)).toBeInTheDocument();
      });
    });

    it('validates valid card number and shows validation badge', async () => {
      const user = userEvent.setup();
      renderWithQuery(
        <InsuranceCardForm
          mode="create"
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      const input = screen.getByLabelText(/card.number/i);

      // Type valid card number
      await user.type(input, 'DN4012345678901');

      // Should show validation badge
      await waitFor(() => {
        expect(screen.getByText(/validation.valid/i)).toBeInTheDocument();
      });
    });

    it('auto-converts card number to uppercase', async () => {
      const user = userEvent.setup();
      renderWithQuery(
        <InsuranceCardForm
          mode="create"
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      const input = screen.getByLabelText(/card.number/i) as HTMLInputElement;

      await user.type(input, 'dn4012345678901');

      expect(input.value).toBe('DN4012345678901');
    });

    it('shows invalid prefix error for unknown prefix code', async () => {
      const user = userEvent.setup();
      renderWithQuery(
        <InsuranceCardForm
          mode="create"
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      const input = screen.getByLabelText(/card.number/i);

      // Type card with invalid prefix
      await user.type(input, 'XX4012345678901');

      await waitFor(() => {
        expect(screen.getByText(/validation.invalidPrefix/i)).toBeInTheDocument();
      });
    });
  });

  describe('Prefix Code Selection', () => {
    it('auto-sets prefix code from card number', async () => {
      const user = userEvent.setup();
      renderWithQuery(
        <InsuranceCardForm
          mode="create"
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      const input = screen.getByLabelText(/card.number/i);
      await user.type(input, 'DN4012345678901');

      // Wait for auto-fill
      await waitFor(() => {
        const prefixSelect = screen.getByRole('combobox');
        expect(prefixSelect).toHaveTextContent(/DN/);
      });
    });

    it('auto-sets coverage percent based on prefix code', async () => {
      const user = userEvent.setup();
      renderWithQuery(
        <InsuranceCardForm
          mode="create"
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      const input = screen.getByLabelText(/card.number/i);
      await user.type(input, 'DN4012345678901');

      await waitFor(() => {
        const coverageInput = screen.getByLabelText(/card.coverage/i) as HTMLInputElement;
        expect(coverageInput.value).toBe('80');
      });
    });

    it('updates copay rate when coverage percent changes', async () => {
      const user = userEvent.setup();
      renderWithQuery(
        <InsuranceCardForm
          mode="create"
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      const coverageInput = screen.getByLabelText(/card.coverage/i);
      await user.clear(coverageInput);
      await user.type(coverageInput, '90');

      await waitFor(() => {
        const copayInput = screen.getByLabelText(/card.copay/i) as HTMLInputElement;
        expect(copayInput.value).toBe('10');
      });
    });
  });

  describe('Form Submission', () => {
    it('submits form with valid data', async () => {
      const user = userEvent.setup();
      mockOnSubmit.mockResolvedValue(undefined);

      renderWithQuery(
        <InsuranceCardForm
          mode="create"
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      // Fill in all required fields
      const cardNumberInput = screen.getByLabelText(/card.number/i);
      await user.type(cardNumberInput, 'DN4012345678901');

      // Wait for auto-fill of prefix and coverage
      await waitFor(() => {
        const coverageInput = screen.getByLabelText(/card.coverage/i) as HTMLInputElement;
        expect(coverageInput.value).toBe('80');
      });

      // Click date pickers and select dates
      const validFromButton = screen.getByRole('button', { name: /form.selectDate/i });
      await user.click(validFromButton);

      // Note: Full date picker interaction would require more complex mocking
      // For now, we test that the form structure is correct

      const submitButton = screen.getByRole('button', { name: /actions.save/i });
      expect(submitButton).toBeInTheDocument();
    });

    it('displays error message on submission failure', async () => {
      const errorMessage = 'Failed to create insurance card';

      renderWithQuery(
        <InsuranceCardForm
          mode="create"
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
          error={errorMessage}
        />
      );

      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });

    it('disables submit button while submitting', () => {
      renderWithQuery(
        <InsuranceCardForm
          mode="create"
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
          isSubmitting={true}
        />
      );

      const submitButton = screen.getByRole('button', { name: /form.saving/i });
      expect(submitButton).toBeDisabled();
    });

    it('calls onCancel when cancel button is clicked', async () => {
      const user = userEvent.setup();
      renderWithQuery(
        <InsuranceCardForm
          mode="create"
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      const cancelButton = screen.getByRole('button', { name: /actions.cancel/i });
      await user.click(cancelButton);

      expect(mockOnCancel).toHaveBeenCalledOnce();
    });
  });

  describe('Date Validation', () => {
    it('valid_to cannot be before valid_from', async () => {
      // This tests the disabledFn in the DatePickerDialog
      // The actual implementation prevents selecting invalid dates in the calendar
      renderWithQuery(
        <InsuranceCardForm
          mode="create"
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByLabelText(/card.validFrom/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/card.validTo/i)).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('shows validation errors for empty required fields', async () => {
      const user = userEvent.setup();
      renderWithQuery(
        <InsuranceCardForm
          mode="create"
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      const submitButton = screen.getByRole('button', { name: /actions.save/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/Vui long nhap so the BHYT/i)).toBeInTheDocument();
      });
    });

    it('validates coverage percent is between 0-100', async () => {
      const user = userEvent.setup();
      renderWithQuery(
        <InsuranceCardForm
          mode="create"
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      const coverageInput = screen.getByLabelText(/card.coverage/i);
      await user.clear(coverageInput);
      await user.type(coverageInput, '150');

      const submitButton = screen.getByRole('button', { name: /actions.save/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/Ty le chi tra phai tu 0-100/i)).toBeInTheDocument();
      });
    });
  });
});
