# Test Fixtures

This directory contains test files used in E2E tests.

## Files

- `test-pet.jpg` - Sample pet image for upload tests
- `test-document.pdf` - Invalid file type for validation tests
- `large-image.jpg` - Large image file for size validation tests

## Usage

These files are referenced in the E2E tests using relative paths:

```typescript
const testImagePath = path.join(__dirname, '../fixtures/test-pet.jpg');
```

## Adding New Fixtures

When adding new test files:

1. Place them in this directory
2. Keep file sizes reasonable (< 1MB for images)
3. Use descriptive names
4. Update this README with descriptions

## Image Requirements

Test images should:
- Be in common formats (JPG, PNG, WebP)
- Have reasonable dimensions (500x500 to 1920x1080)
- Contain clear pet subjects for realistic testing
- Be properly licensed for testing use