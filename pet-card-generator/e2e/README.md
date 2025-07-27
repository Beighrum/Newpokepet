# End-to-End Testing

This directory contains the E2E testing setup using Playwright for the Pet Card Generator application.

## Structure

```
e2e/
├── fixtures/           # Test data and assets
├── pages/              # Page Object Models
├── tests/              # Test specifications
├── staging/            # Staging environment tests
├── production/         # Production smoke tests
├── utils/              # Test utilities and helpers
├── global-setup.ts     # Global test setup
└── global-teardown.ts  # Global test cleanup
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Application running locally or deployed

### Installation

```bash
# Install dependencies
npm install

# Install Playwright browsers
npm run setup:playwright
```

### Running Tests

```bash
# Run all E2E tests
npm run test:e2e

# Run tests with UI mode
npm run test:e2e:ui

# Run staging tests
npm run test:e2e:staging

# Run production smoke tests
npm run test:e2e:production

# Run specific test file
npx playwright test landing-page.spec.ts

# Run tests in specific browser
npx playwright test --project=chromium
```

## Test Categories

### 1. Critical User Journeys (`tests/`)

- **Landing Page Tests**: Hero section, navigation, responsiveness
- **Card Generation Flow**: Complete end-to-end user journey
- **Gallery Tests**: Card display, search, filtering
- **Authentication Tests**: Login, signup, session management

### 2. Staging Tests (`staging/`)

- Comprehensive functionality testing
- Integration testing with staging APIs
- Performance validation
- Accessibility checks

### 3. Production Smoke Tests (`production/`)

- Critical path validation
- Health check verification
- Security header validation
- Performance benchmarks

## Page Object Models

Page Object Models (POMs) are located in the `pages/` directory:

- `LandingPage.ts`: Landing page interactions
- `UploadPage.ts`: File upload and card generation
- `GalleryPage.ts`: Gallery browsing and management
- `AuthPage.ts`: Authentication flows

### Example Usage

```typescript
import { LandingPage } from '../pages/LandingPage';

test('should navigate to upload', async ({ page }) => {
  const landingPage = new LandingPage(page);
  await landingPage.goto();
  await landingPage.clickGetStarted();
  await expect(page).toHaveURL(/.*upload/);
});
```

## Test Utilities

The `utils/test-helpers.ts` file provides common utilities:

- `waitForNetworkIdle()`: Wait for network requests to complete
- `mockApiResponse()`: Mock API responses
- `simulateOffline()`: Test offline functionality
- `getPerformanceMetrics()`: Collect performance data
- `verifyAccessibility()`: Basic accessibility checks

### Example Usage

```typescript
import { TestHelpers } from '../utils/test-helpers';

test('should handle API errors', async ({ page }) => {
  await TestHelpers.mockApiError(page, '**/api/generate-card', 500);
  // Test error handling...
});
```

## Configuration

### Base Configuration (`playwright.config.ts`)

- Multi-browser testing (Chrome, Firefox, Safari)
- Mobile device testing
- Screenshot and video on failure
- Parallel execution

### Environment-Specific Configs

- `playwright.staging.config.ts`: Staging environment
- `playwright.production.config.ts`: Production smoke tests

## Test Data

Test fixtures are stored in `fixtures/`:

- `test-pet.jpg`: Sample pet image for upload tests
- `test-document.pdf`: Invalid file for validation tests
- Mock data for API responses

## Best Practices

### 1. Test Organization

```typescript
test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    // Setup for each test
  });

  test('should do something specific', async ({ page }) => {
    // Test implementation
  });
});
```

### 2. Selectors

Use data-testid attributes for reliable selectors:

```typescript
// Good
await page.locator('[data-testid="submit-button"]').click();

// Avoid
await page.locator('.btn-primary').click();
```

### 3. Assertions

Use Playwright's built-in assertions:

```typescript
// Wait for element and assert
await expect(page.locator('[data-testid="success-message"]')).toBeVisible();

// Assert URL
await expect(page).toHaveURL(/.*success/);
```

### 4. Error Handling

Always handle potential failures:

```typescript
test('should handle network errors', async ({ page }) => {
  await page.route('**/api/**', route => route.abort());
  
  // Test should still work or show appropriate error
  await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
});
```

## CI/CD Integration

Tests are integrated into the CI/CD pipeline:

1. **Pull Requests**: Run full test suite
2. **Staging Deployment**: Run staging tests
3. **Production Deployment**: Run smoke tests
4. **Scheduled**: Nightly full test runs

### GitHub Actions

```yaml
- name: Run E2E tests
  run: npx playwright test
  env:
    PLAYWRIGHT_BASE_URL: ${{ env.BASE_URL }}
```

## Debugging

### Local Debugging

```bash
# Run tests in headed mode
npx playwright test --headed

# Debug specific test
npx playwright test --debug landing-page.spec.ts

# Generate test code
npx playwright codegen localhost:5173
```

### CI Debugging

- Check test artifacts in GitHub Actions
- Download screenshots and videos
- Review HTML reports

## Performance Testing

Performance tests are integrated using Lighthouse:

```bash
# Run Lighthouse CI
npm run test:lighthouse
```

Performance budgets are configured in `lighthouserc.js`.

## Reporting

Test results are available in multiple formats:

- HTML Report: `playwright-report/index.html`
- JSON Results: `test-results/results.json`
- JUnit XML: `test-results/results.xml`

## Troubleshooting

### Common Issues

1. **Timeouts**: Increase timeout in test or config
2. **Flaky Tests**: Add proper waits and assertions
3. **Browser Issues**: Update Playwright browsers
4. **Network Issues**: Check base URL and connectivity

### Getting Help

- Check Playwright documentation
- Review test logs and screenshots
- Use debug mode for step-by-step execution
- Check GitHub Actions logs for CI issues

## Contributing

When adding new tests:

1. Follow existing patterns and structure
2. Use Page Object Models for reusable interactions
3. Add appropriate test data to fixtures
4. Update this README if adding new patterns
5. Ensure tests are stable and not flaky