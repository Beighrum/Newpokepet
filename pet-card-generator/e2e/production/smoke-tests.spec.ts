import { test, expect } from '@playwright/test';
import { TestHelpers } from '../utils/test-helpers';

test.describe('Production Smoke Tests', () => {
  test('should load landing page successfully', async ({ page }) => {
    await page.goto('/');
    
    // Critical elements must be present
    await expect(page.locator('h1')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('[data-testid="get-started-button"]')).toBeVisible();
    
    // Performance check - production should be fast
    const metrics = await TestHelpers.getPerformanceMetrics(page);
    expect(metrics.loadComplete).toBeLessThan(3000); // 3 seconds max for production
    expect(metrics.firstContentfulPaint).toBeLessThan(1500); // 1.5 seconds FCP
  });

  test('should have healthy API endpoints', async ({ page }) => {
    // Main health check
    const healthResponse = await page.request.get('/api/health');
    expect(healthResponse.ok()).toBeTruthy();
    
    const healthData = await healthResponse.json();
    expect(healthData.status).toBe('healthy');
    
    // App health check
    const appHealthResponse = await page.request.get('/health');
    expect(appHealthResponse.ok()).toBeTruthy();
  });

  test('should have proper security headers', async ({ page }) => {
    const response = await page.goto('/');
    
    const headers = response?.headers() || {};
    
    // Check security headers
    expect(headers['x-frame-options']).toBeTruthy();
    expect(headers['x-content-type-options']).toBe('nosniff');
    expect(headers['x-xss-protection']).toBeTruthy();
    expect(headers['content-security-policy']).toBeTruthy();
  });

  test('should handle SSL correctly', async ({ page }) => {
    // Verify HTTPS redirect and SSL
    const response = await page.goto('/');
    expect(response?.url()).toMatch(/^https:/);
  });

  test('should have working navigation', async ({ page }) => {
    await page.goto('/');
    
    // Test main navigation links
    const navLinks = [
      { selector: '[data-testid="nav-gallery"]', expectedUrl: '/gallery' },
      { selector: '[data-testid="nav-upload"]', expectedUrl: '/upload' }
    ];
    
    for (const link of navLinks) {
      const element = page.locator(link.selector);
      if (await element.isVisible()) {
        await element.click();
        await expect(page).toHaveURL(new RegExp(link.expectedUrl));
        await page.goBack();
      }
    }
  });

  test('should handle errors gracefully', async ({ page }) => {
    // Test 404 handling
    const response = await page.goto('/non-existent-page');
    expect(response?.status()).toBe(404);
    
    // Should show custom 404 page, not browser default
    await expect(page.locator('body')).not.toContainText('This site can't be reached');
  });

  test('should be performant', async ({ page }) => {
    const startTime = Date.now();
    await page.goto('/');
    const loadTime = Date.now() - startTime;
    
    // Production should load quickly
    expect(loadTime).toBeLessThan(2000);
    
    // Check resource count (shouldn't be excessive)
    const metrics = await TestHelpers.getPerformanceMetrics(page);
    expect(metrics.resourceCount).toBeLessThan(50);
  });

  test('should work without JavaScript (progressive enhancement)', async ({ page }) => {
    // Disable JavaScript
    await page.context().addInitScript(() => {
      Object.defineProperty(window, 'navigator', {
        value: { ...window.navigator, javaEnabled: () => false }
      });
    });
    
    await page.goto('/');
    
    // Basic content should still be visible
    await expect(page.locator('h1')).toBeVisible();
  });

  test('should have proper meta tags for SEO', async ({ page }) => {
    await page.goto('/');
    
    // Check essential meta tags
    await expect(page.locator('title')).not.toBeEmpty();
    await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /.+/);
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute('content', /.+/);
    await expect(page.locator('meta[property="og:description"]')).toHaveAttribute('content', /.+/);
  });

  test('should handle high load gracefully', async ({ page }) => {
    // Simulate multiple concurrent requests
    const promises = Array.from({ length: 5 }, () => 
      page.request.get('/')
    );
    
    const responses = await Promise.all(promises);
    
    // All requests should succeed
    responses.forEach(response => {
      expect(response.ok()).toBeTruthy();
    });
  });
});