# Contributing to PhysioFlow

Thank you for your interest in contributing to PhysioFlow! This document provides guidelines and instructions for contributing to the project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Code Style Guidelines](#code-style-guidelines)
- [Testing Requirements](#testing-requirements)
- [Commit Message Conventions](#commit-message-conventions)
- [Pull Request Process](#pull-request-process)
- [Documentation](#documentation)
- [No AI Attribution Policy](#no-ai-attribution-policy)

## Code of Conduct

PhysioFlow is committed to providing a welcoming and inclusive environment for all contributors. We expect all participants to:

- Be respectful and considerate in communication
- Accept constructive criticism gracefully
- Focus on what is best for the community and project
- Show empathy towards other community members

## Getting Started

### Prerequisites

Before you begin, ensure you have:

- Node.js 20.0.0 or higher
- Go 1.22 or higher
- pnpm 9.15.0 or higher
- Docker Desktop
- Git

### Initial Setup

1. Fork the repository on GitHub
2. Clone your fork locally:

```bash
git clone https://github.com/YOUR_USERNAME/physioflow.git
cd physioflow
```

3. Add the upstream repository:

```bash
git remote add upstream https://github.com/tqvdang/physioflow.git
```

4. Install dependencies:

```bash
pnpm install
cd apps/api && go mod download
```

5. Start the development environment:

```bash
make dev-local
```

See [Getting Started Guide](./docs/developer-guides/GETTING_STARTED.md) for detailed setup instructions.

## Development Workflow

### 1. Create a Feature Branch

Always create a new branch for your changes:

```bash
git checkout -b feature/your-feature-name
```

Branch naming conventions:
- `feature/description` - New features
- `fix/description` - Bug fixes
- `docs/description` - Documentation changes
- `refactor/description` - Code refactoring
- `test/description` - Test additions or improvements

### 2. Make Your Changes

Follow existing code patterns and conventions:

**Frontend** (Next.js):
- Use shadcn/ui components for consistency
- Follow React Query patterns for data fetching
- Use TypeScript strict mode
- Keep components small and focused

**Backend** (Go):
- Follow clean architecture (handler → service → repository)
- Write idiomatic Go code
- Use structured logging
- Handle errors explicitly

**Mobile** (React Native):
- Use Expo patterns and conventions
- Follow WatermelonDB best practices for offline storage
- Keep platform-specific code minimal

### 3. Run Tests and Linters

Before committing, ensure all checks pass:

```bash
# Lint all code
pnpm lint

# Type check
pnpm typecheck

# Format code
pnpm format

# Run tests
make test-all
```

Fix any issues before proceeding.

### 4. Commit Your Changes

Use conventional commit messages (see below):

```bash
git add .
git commit -m "feat(web): add outcome measure trending chart"
```

### 5. Keep Your Branch Updated

Regularly sync with upstream:

```bash
git fetch upstream
git rebase upstream/main
```

### 6. Push and Create Pull Request

```bash
git push origin feature/your-feature-name
```

Then create a pull request on GitHub.

## Code Style Guidelines

### TypeScript/JavaScript

**Style**:
- Use ESLint configuration (extends `next/core-web-vitals`)
- Prefer functional components over class components
- Use TypeScript strict mode
- Avoid `any` type (use `unknown` if necessary)

**Naming**:
- Components: PascalCase (`MeasureList.tsx`)
- Hooks: camelCase with `use` prefix (`useOutcomeMeasures.ts`)
- Utilities: camelCase (`formatDate.ts`)
- Constants: UPPER_SNAKE_CASE (`MAX_RETRIES`)

**Example**:

```typescript
// Good
interface OutcomeMeasure {
  id: string;
  patientId: string;
  score: number;
}

export function MeasureList({ patientId }: { patientId: string }) {
  const { measures, loading } = useOutcomeMeasures(patientId);

  if (loading) return <Skeleton />;
  return <div>{/* ... */}</div>;
}

// Bad
export function measureList(props: any) {
  // Missing type safety, incorrect naming
}
```

### Go

**Style**:
- Follow `gofmt` and `golangci-lint` rules
- Use standard library patterns
- Handle all errors explicitly
- Use context for cancellation

**Naming**:
- Exported: PascalCase (`CreateMeasure`)
- Unexported: camelCase (`fetchFromDB`)
- Interfaces: Noun or adjective (`Repository`, `Validator`)
- Errors: `Err` prefix (`ErrNotFound`)

**Example**:

```go
// Good
func (s *OutcomeMeasuresService) CreateMeasure(
    ctx context.Context,
    req *CreateMeasureRequest,
) (*OutcomeMeasure, error) {
    if err := s.validateScore(req); err != nil {
        return nil, fmt.Errorf("invalid score: %w", err)
    }

    measure, err := s.repo.Create(ctx, req)
    if err != nil {
        return nil, fmt.Errorf("failed to create measure: %w", err)
    }

    return measure, nil
}

// Bad
func createMeasure(req interface{}) interface{} {
    // Missing context, error handling, type safety
}
```

### SQL

**Style**:
- Use uppercase for keywords (`SELECT`, `FROM`, `WHERE`)
- Use snake_case for identifiers (`patient_id`, `created_at`)
- Indent for readability
- Always use parameterized queries (no string concatenation)

**Example**:

```sql
-- Good
SELECT
    om.id,
    om.patient_id,
    om.score,
    om.measured_at
FROM outcome_measures om
WHERE om.patient_id = $1
    AND om.measure_type = $2
ORDER BY om.measured_at DESC
LIMIT 10;

-- Bad
select * from outcome_measures where patient_id = '...'
```

### Component Structure

Follow this structure for React components:

```typescript
// 1. Imports
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useOutcomeMeasures } from '@/hooks/use-outcome-measures';

// 2. Types
interface MeasureListProps {
  patientId: string;
}

// 3. Component
export function MeasureList({ patientId }: MeasureListProps) {
  // Hooks
  const { measures, loading } = useOutcomeMeasures(patientId);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Handlers
  const handleSelect = (id: string) => {
    setSelectedId(id);
  };

  // Early returns
  if (loading) return <Skeleton />;
  if (!measures.length) return <EmptyState />;

  // Render
  return (
    <div>
      {measures.map((measure) => (
        <MeasureCard
          key={measure.id}
          measure={measure}
          onSelect={handleSelect}
        />
      ))}
    </div>
  );
}
```

## Testing Requirements

All new features and bug fixes must include tests.

### Backend Tests

**Unit Tests** (`*_test.go`):
- Test individual functions in isolation
- Mock external dependencies
- Use table-driven tests for multiple cases

**Example**:

```go
func TestCircuitBreaker_OpensAfterFailures(t *testing.T) {
    tests := []struct {
        name          string
        maxFailures   int
        failureCount  int
        expectedState State
    }{
        {"below threshold", 5, 3, Closed},
        {"at threshold", 5, 5, Open},
        {"above threshold", 5, 7, Open},
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            cb := NewCircuitBreaker(tt.maxFailures, 1*time.Second)
            for i := 0; i < tt.failureCount; i++ {
                cb.Call(func() error { return errors.New("fail") })
            }
            assert.Equal(t, tt.expectedState, cb.GetState())
        })
    }
}
```

**Integration Tests** (`tests/integration/*_test.go`):
- Test full API endpoints
- Use real PostgreSQL (test database)
- Clean up data after each test

**Example**:

```go
func TestOutcomeMeasures_CreateAndGet(t *testing.T) {
    db := setupTestDB(t)
    defer cleanupTestDB(t, db)

    // Create measure
    req := &CreateMeasureRequest{
        PatientID:   "patient-123",
        MeasureType: "ndi",
        Score:       20.0,
    }
    measure, err := createMeasure(db, req)
    require.NoError(t, err)

    // Get measure
    retrieved, err := getMeasure(db, measure.ID)
    require.NoError(t, err)
    assert.Equal(t, measure.Score, retrieved.Score)
}
```

### Frontend Tests

**Unit Tests** (Vitest):
- Test hooks in isolation
- Mock API calls
- Test edge cases

**Example**:

```typescript
import { renderHook, waitFor } from '@testing-library/react';
import { useOutcomeMeasures } from './use-outcome-measures';

test('fetches outcome measures successfully', async () => {
  const mockMeasures = [
    { id: '1', measure_type: 'ndi', score: 20 },
  ];
  mockedAxios.get.mockResolvedValueOnce({ data: mockMeasures });

  const { result } = renderHook(() => useOutcomeMeasures('patient-123'));

  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(result.current.measures).toEqual(mockMeasures);
});
```

**E2E Tests** (Playwright):
- Test complete user flows
- Use real browser
- Test accessibility

**Example**:

```typescript
import { test, expect } from '@playwright/test';

test('records a new outcome measure', async ({ page }) => {
  await page.goto('/patients/123/outcomes');
  await page.click('button:has-text("Record Measure")');
  await page.selectOption('select[name="measureType"]', 'ndi');
  await page.fill('input[name="score"]', '20');
  await page.click('button:has-text("Save")');

  await expect(page.locator('text=Measure recorded successfully')).toBeVisible();
});
```

### Test Coverage Requirements

- **Backend**: Minimum 70% coverage for new code
- **Frontend**: Minimum 60% coverage for new code
- **Critical paths**: 90%+ coverage (auth, payment, data sync)

Run coverage reports:

```bash
# Backend
cd apps/api
go test -cover ./...

# Frontend
pnpm --filter @physioflow/web test:coverage
```

## Commit Message Conventions

We use [Conventional Commits](https://www.conventionalcommits.org/) for clear, semantic commit history.

### Format

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `refactor`: Code refactoring (no functionality change)
- `test`: Adding or updating tests
- `chore`: Build process, tooling changes
- `perf`: Performance improvements
- `style`: Code style changes (formatting, missing semicolons)

### Scopes

- `web`: Web frontend
- `mobile`: Mobile app
- `api`: Backend API
- `db`: Database changes
- `infra`: Infrastructure (Docker, Kubernetes)
- `docs`: Documentation

### Examples

```bash
feat(web): add outcome measure trending chart
fix(api): resolve race condition in sync queue
docs(user-guides): add MCID explanation for outcome measures
test(api): add integration tests for anatomy regions
chore(docker): update PostgreSQL to version 16.2
refactor(web): extract measure form validation to hook
perf(api): add index for patient_id on outcome_measures
```

### Multi-line Commits

For complex changes, add a body:

```bash
git commit -m "feat(api): add circuit breaker pattern

Implement circuit breaker to prevent cascading failures:
- 5 failure threshold before opening circuit
- 30s timeout before half-open state
- Automatic recovery testing

Closes #42"
```

## Pull Request Process

### Before Creating a PR

1. **Sync with upstream**:

```bash
git fetch upstream
git rebase upstream/main
```

2. **Run all checks**:

```bash
pnpm lint
pnpm typecheck
pnpm format
make test-all
```

3. **Update documentation** if needed
4. **Add changelog entry** for user-facing changes

### Creating the PR

1. **Title**: Use conventional commit format

```
feat(web): add outcome measure trending chart
```

2. **Description**: Include:
   - What changed and why
   - Link to related issues
   - Screenshots (for UI changes)
   - Testing instructions

**Example**:

```markdown
## Summary

Adds a trending chart for outcome measures with MCID indicators.

## Changes

- New `TrendingView` component using Recharts
- MCID threshold reference line
- Baseline and goal indicators
- Responsive design for mobile

## Related Issues

Closes #42

## Screenshots

[Before] [After]

## Testing

1. Navigate to patient outcomes page
2. Click on any measure type (e.g., NDI)
3. Verify chart displays with MCID line
4. Test on mobile viewport
```

3. **Request review** from at least one maintainer
4. **Address feedback** promptly

### PR Requirements

All PRs must:
- Pass all CI checks (linting, type checking, tests)
- Include tests for new features
- Update documentation if needed
- Follow code style guidelines
- Use conventional commit format

### Merging

- **Squash commits** before merging (for clean history)
- **Update CHANGELOG.md** for user-facing changes
- **Delete branch** after merge

## Documentation

Update documentation for:
- New features (user guides + developer guides)
- API changes (API reference docs)
- Architecture changes (architecture guide)
- Configuration changes (README, getting started)

### Documentation Standards

- **Clear and concise**: Avoid jargon, explain acronyms
- **Code examples**: Include working examples, not pseudocode
- **Screenshots**: Add for UI changes (use placeholders)
- **Bilingual**: Vietnamese + English for user guides
- **Keep updated**: Update docs in the same PR as code changes

### Documentation Locations

- **User Guides**: `docs/user-guides/` (bilingual)
- **Developer Guides**: `docs/developer-guides/`
- **API Reference**: `docs/api/`
- **Architecture**: `docs/developer-guides/ARCHITECTURE.md`
- **Deployment**: `infrastructure/homelab/` and `docs/deployment/`

## No AI Attribution Policy

**Important**: Do NOT include AI attribution in:
- Commit messages (no "Co-Authored-By: Claude" or similar)
- Pull request descriptions
- Code comments
- Documentation

We value contributions from all sources but do not attribute them to AI tools. Focus on clear, descriptive commit messages that explain what changed and why.

## Questions?

- **Documentation**: Check `docs/` directory first
- **Code examples**: Look at existing components and tests
- **Issues**: Open a GitHub issue for bugs or questions
- **Email**: tqvdang@msn.com for direct questions

Thank you for contributing to PhysioFlow!
