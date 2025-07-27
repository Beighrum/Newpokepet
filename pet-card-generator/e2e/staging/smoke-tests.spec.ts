import { test, expect } from '@playwright/test';
import { TestHelpers } from '../utils/test-helpers';

test.describe('Staging Smoke Tests', () => {
  test('should load landing page successfully', async ({ page }) => {
    await page.goto('/');
    
    // Check basic page elements
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('[data-testid="get-started-button"]')).toBeVisible();
    
    // Check performance
    const metrics = await TestHelpers.getPerformanceMetrics(page);
    expect(metrics.loadComplete).toBeLessThan(5000); // 5 seconds max
  });

  test('should have working API health check', async ({ page }) => {
    const response = await page.request.get('/api/health');
    expect(response.ok()).toBeTruthy();
    
    const healthData = await response.json();
    expect(healthData.status).toBe('healthy');
  });

  test('should handle file upload flow', async ({ page }) => {
    await page.goto('/upload');
    
    // Verify upload page loads
    await expect(page.locator('[data-testid="drop-zone"]')).toBeVisible();
    
    // Test file validation
    const fileInput = page.locator('[data-testid="file-input"]');
    await expect(fileInput).toBeAttached();
  });

  test('should display gallery page', async ({ page }) => {
    await page.goto('/gallery');
    
    // Should load without errors
    await expect(page.locator('[data-testid="card-grid"]')).toBeVisible();
  });

  test('should have proper error handling', async ({ page }) => {
    // Test 404 page
    await page.goto('/non-existent-page');
    await expect(page.locator('text=404')).toBeVisible();
  });

  test('should be accessible', async ({ page }) => {
    await page.goto('/');
    
    const accessibilityIssues = await TestHelpers.verifyAccessibility(page);
    expect(accessibilityIssues.length).toBeLessThan(5); // Allow some minor issues
  });

  test('should work on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    
    await expect(page.locator('h1')).toBeVisible();
    
    // Check mobile navigation if present
    const mobileMenu = page.locator('[data-testid="mobile-menu-button"]');
    if (await mobileMenu.isVisible()) {
      await mobileMenu.click();
      await expect(page.locator('[data-testid="mobile-menu"]')).toBeVisible();
    }
  });
});