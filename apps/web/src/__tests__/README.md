# PhysioFlow Web App Unit Tests

This directory contains unit tests for React components and custom hooks using Vitest and React Testing Library.

## Test Structure

```
src/
├── __tests__/
│   ├── setup.ts           # Test environment setup
│   ├── utils.tsx          # Test utilities and helpers
│   └── README.md          # This file
├── components/
│   └── insurance/
│       └── __tests__/
│           ├── InsuranceCardForm.test.tsx
│           ├── InsuranceValidator.test.tsx
│           └── CoverageCalculator.test.tsx
└── hooks/
    └── __tests__/
        ├── use-insurance.test.ts
        ├── use-outcome-measures.test.ts
        └── use-billing.test.ts
```

## Test Coverage

### Components (3 test files, ~70 test cases)

#### InsuranceCardForm.test.tsx
- Form rendering with all fields
- Card number validation (real-time)
- Prefix code selection and auto-fill
- Form submission with valid data
- Error handling and validation messages
- Date validation
- Coverage/copay rate auto-calculation

#### InsuranceValidator.test.tsx
- Component rendering
- Real-time prefix preview while typing
- Validation button click and Enter key
- Valid card result display with all details
- Invalid card error messages (format, prefix)
- Expired card warnings
- API integration and fallback

#### CoverageCalculator.test.tsx
- Component rendering with/without insurance
- VND amount input and formatting
- Coverage calculation display
- Insurance pays / patient pays breakdown
- API integration and local fallback
- Edge cases (inactive insurance, large amounts, rounding)

### Hooks (3 test files, ~80 test cases)

#### use-insurance.test.ts
- `validateBhytCardLocal()` - Local card validation
- `usePatientInsurance()` - Fetch patient insurance
- `useInsuranceValidation()` - API validation with fallback
- `useCreateInsurance()` - Create insurance mutation
- `useUpdateInsurance()` - Update insurance mutation
- `useCalculateCoverage()` - Coverage calculation query

#### use-outcome-measures.test.ts
- `MEASURE_LIBRARY` - Validate measure definitions
- `getMeasureDefinition()` - Get measure by type
- `useMeasureLibrary()` - Fetch measure library
- `usePatientMeasures()` - Fetch all patient measures
- `useRecordMeasure()` - Record new measurement
- `useProgress()` - Calculate progress and MCID achievement
- `useTrending()` - Get trending data with baseline changes

#### use-billing.test.ts
- `useServiceCodes()` - Fetch PT service codes
- `useInvoices()` - Fetch invoices with pagination/filters
- `usePatientInvoices()` - Fetch patient-specific invoices
- `useInvoice()` - Fetch single invoice by ID
- `useCreateInvoice()` - Create invoice mutation
- `useCalculateBilling()` - Calculate billing preview with coverage
- `usePaymentHistory()` - Fetch payment history
- `useRecordPayment()` - Record payment mutation

## Running Tests

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test watch

# Run tests with UI
pnpm test:ui

# Run with coverage
pnpm test:coverage

# Run specific test file
pnpm vitest run src/hooks/__tests__/use-insurance.test.ts

# Run tests matching pattern
pnpm vitest run -t "validates card"
```

## Test Patterns

### Component Testing

```typescript
import { renderWithQuery } from '@/__tests__/utils';

it('renders component with props', () => {
  renderWithQuery(<MyComponent prop="value" />);

  expect(screen.getByText('Expected Text')).toBeInTheDocument();
});
```

### Hook Testing

```typescript
import { renderHook, waitFor } from '@testing-library/react';
import { createWrapper } from '@/__tests__/utils';

it('fetches data successfully', async () => {
  const { result } = renderHook(() => useMyHook('param'), {
    wrapper: createWrapper(queryClient),
  });

  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(result.current.data).toBeDefined();
});
```

### Mocking API Calls

```typescript
import * as apiLib from '@/lib/api';

vi.spyOn(apiLib.api, 'get').mockResolvedValue(mockApiResponse(mockData));
```

## Test Coverage Goals

Current coverage: **~70%** for critical components and hooks

### Coverage by Module
- Insurance components: ~80% coverage
- Insurance hooks: ~85% coverage
- Outcome measures hooks: ~80% coverage
- Billing hooks: ~75% coverage

### Key Testing Areas
- Form validation and submission
- Real-time user input handling
- API integration with fallback logic
- Query cache invalidation
- Error handling
- Edge cases and boundary conditions

## Best Practices

1. **Test Isolation**: Each test is independent with its own QueryClient
2. **Mock External Dependencies**: API calls, next-intl, next/navigation
3. **User-Centric Testing**: Use `userEvent` for realistic interactions
4. **Query Testing**: Test both success and error states
5. **Accessibility**: Use semantic queries (getByRole, getByLabelText)
6. **Coverage**: Focus on critical paths and edge cases

## Future Enhancements

- Add visual regression testing with Playwright
- Increase coverage for UI components (Button, Input, etc.)
- Add integration tests for complex workflows
- Add performance testing for expensive calculations
- Add snapshot testing for static components

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [TanStack Query Testing](https://tanstack.com/query/latest/docs/framework/react/guides/testing)
