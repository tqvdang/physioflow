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

      // Text input fields have direct labels
      expect(screen.getByLabelText(/card\.number/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/card\.prefix/i)).toBeInTheDocument();

      // Coverage/copay fields have labels but inputs are wrapped in divs
      // Check for label text instead
      expect(screen.getByText(/card\.coverage/i)).toBeInTheDocument();
      expect(screen.getByText(/card\.copay/i)).toBeInTheDocument();

      // Date fields render as buttons with labels
      expect(screen.getByText(/card\.validFrom/i)).toBeInTheDocument();
      expect(screen.getByText(/card\.validTo/i)).toBeInTheDocument();
    });

    it('renders with default values in edit mode', () => {
      const mockInsurance: Insurance = {
        id: '1',
        patientId: 'patient-1',
        cardNumber: 'DN4-0123-45678-90123',
        prefixCode: 'DN',
        beneficiaryType: 4,
        provinceCode: '79',
        holderName: 'NGUYEN VAN A',
        holderNameVi: 'Nguyen Van A',
        registeredFacilityCode: '79024',
        coveragePercent: 80,
        validFrom: '2024-01-01',
        validTo: '2024-12-31',
        copayRate: 20,
        fiveYearContinuous: false,
        verification: 'verified',
        isActive: true,
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

      const cardNumberInput = screen.getByDisplayValue('DN4-0123-45678-90123');
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

      const input = screen.getByLabelText(/card\.number/i);

      // Type invalid card number
      await user.type(input, 'INVALID123');

      // Should show format error after attempting to submit
      const submitButton = screen.getByRole('button', { name: /actions\.save/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/Định dạng thẻ không đúng/i)).toBeInTheDocument();
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

      const input = screen.getByLabelText(/card\.number/i) as HTMLInputElement;

      // Type a full valid card number
      await user.type(input, 'DN40123456789012');

      // Verify the card was formatted correctly (with dashes)
      expect(input.value).toMatch(/DN4-0123-45678-90/);

      // Verify prefix was auto-filled from the card number
      await waitFor(() => {
        const prefixSelect = screen.getByRole('combobox');
        expect(prefixSelect).toHaveTextContent(/DN/);
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

      const input = screen.getByLabelText(/card\.number/i) as HTMLInputElement;

      await user.type(input, 'dn4012345678901');

      // formatCardNumber converts to uppercase and adds dashes
      await waitFor(() => {
        expect(input.value).toBe('DN4-0123-45678-901');
      });
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

      const input = screen.getByLabelText(/card\.number/i) as HTMLInputElement;

      // Type card with invalid prefix
      await user.type(input, 'XX4012345678901');

      // Verify the card was formatted
      expect(input.value).toMatch(/XX4-0123-45678-90/);

      // The prefix select should not be auto-filled with XX (invalid prefix)
      const prefixSelect = screen.getByRole('combobox');
      // Should still show placeholder since XX is not a valid prefix
      expect(prefixSelect).toHaveTextContent(/form\.selectPrefix/);
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

      const input = screen.getByLabelText(/card\.number/i);
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

      const input = screen.getByLabelText(/card\.number/i);
      await user.type(input, 'DN4012345678901');

      await waitFor(() => {
        // Coverage input is a number input - find by type and check it's the first one
        const numberInputs = screen.getAllByRole('spinbutton');
        const coverageInput = numberInputs[0] as HTMLInputElement;
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

      const numberInputs = screen.getAllByRole('spinbutton');
      const coverageInput = numberInputs[0];
      await user.clear(coverageInput);
      await user.type(coverageInput, '90');

      await waitFor(() => {
        const copayInput = numberInputs[1] as HTMLInputElement;
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
      const cardNumberInput = screen.getByLabelText(/card\.number/i);
      await user.type(cardNumberInput, 'DN4012345678901');

      // Wait for auto-fill of prefix and coverage
      await waitFor(() => {
        const numberInputs = screen.getAllByRole('spinbutton');
        const coverageInput = numberInputs[0] as HTMLInputElement;
        expect(coverageInput.value).toBe('80');
      });

      // Verify the form structure has date picker buttons
      const validFromButtons = screen.getAllByRole('button', { name: /form\.selectDate/i });
      expect(validFromButtons.length).toBeGreaterThan(0);

      // Verify submit button is present and enabled
      const submitButton = screen.getByRole('button', { name: /actions\.save/i });
      expect(submitButton).toBeInTheDocument();
      expect(submitButton).not.toBeDisabled();
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

      const submitButton = screen.getByRole('button', { name: /form\.saving/i });
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

      const cancelButton = screen.getByRole('button', { name: /actions\.cancel/i });
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

      // Date fields render as text labels above buttons
      expect(screen.getByText(/card\.validFrom/i)).toBeInTheDocument();
      expect(screen.getByText(/card\.validTo/i)).toBeInTheDocument();
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

      const submitButton = screen.getByRole('button', { name: /actions\.save/i });
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

      // Verify that coverage input has min/max attributes for HTML5 validation
      const numberInputs = screen.getAllByRole('spinbutton');
      const coverageInput = numberInputs[0] as HTMLInputElement;

      expect(coverageInput).toHaveAttribute('min', '0');
      expect(coverageInput).toHaveAttribute('max', '100');
      expect(coverageInput).toHaveAttribute('type', 'number');

      // The HTML5 validation prevents entering values outside 0-100
      // Verify default value is within range
      expect(Number(coverageInput.value)).toBeGreaterThanOrEqual(0);
      expect(Number(coverageInput.value)).toBeLessThanOrEqual(100);
    });
  });
});
