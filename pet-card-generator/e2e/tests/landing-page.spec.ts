import { test, expect } from '@playwright/test';
import { LandingPage } from '../pages/LandingPage';

test.describe('Landing Page', () => {
  let landingPage: LandingPage;

  test.beforeEach(async ({ page }) => {
    landingPage = new LandingPage(page);
    await landingPage.goto();
  });

  test('should display hero section correctly', async () => {
    await landingPage.verifyHeroContent();
  });

  test('should display feature cards', async () => {
    await landingPage.scrollToFeatures();
    await landingPage.verifyFeatureCards();
  });

  test('should navigate to upload page when get started is clicked', async ({ page }) => {
    await landingPage.clickGetStarted();
    await expect(page).toHaveURL(/.*upload/);
  });

  test('should show demo functionality', async () => {
    await landingPage.clickDemo();
    // Verify demo modal or demo content appears
    await expect(page.locator('[data-testid="demo-modal"]')).toBeVisible();
  });

  test('should be responsive on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    await landingPage.verifyHeroContent();
    
    // Verify mobile navigation
    const mobileMenu = page.locator('[data-testid="mobile-menu-button"]');
    if (await mobileMenu.isVisible()) {
      await mobileMenu.click();
      await expect(page.locator('[data-testid="mobile-menu"]')).toBeVisible();
    }
  });

  test('should have proper SEO elements', async ({ page }) => {
    // Check meta tags
    await expect(page.locator('title')).toContainText('Pet Card Generator');
    await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /.+/);
    
    // Check structured data
    const structuredData = page.locator('script[type="application/ld+json"]');
    if (await structuredData.count() > 0) {
      const jsonLd = await structuredData.first().textContent();
      expect(jsonLd).toBeTruthy();
    }
  });

  test('should load quickly', async ({ page }) => {
    const startTime = Date.now();
    await landingPage.goto();
    const loadTime = Date.now() - startTime;
    
    // Should load within 3 seconds
    expect(loadTime).toBeLessThan(3000);
    
    // Check Core Web Vitals
    const metrics = await page.evaluate(() => {
      return new Promise((resolve) => {
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const vitals: any = {};
          
          entries.forEach((entry) => {
            if (entry.name === 'first-contentful-paint') {
              vitals.fcp = entry.startTime;
            }
            if (entry.entryType === 'largest-contentful-paint') {
              vitals.lcp = entry.startTime;
            }
          });
          
          resolve(vitals);
        }).observe({ entryTypes: ['paint', 'largest-contentful-paint'] });
        
        // Fallback timeout
        setTimeout(() => resolve({}), 5000);
      });
    });
    
    console.log('Performance metrics:', metrics);
  });

  test('should handle errors gracefully', async ({ page }) => {
    // Simulate network error
    await page.route('**/api/**', route => route.abort());
    
    await landingPage.goto();
    
    // Should still display basic content
    await landingPage.verifyHeroContent();
    
    // Should show error boundary or graceful degradation
    const errorBoundary = page.locator('[data-testid="error-boundary"]');
    const offlineIndicator = page.locator('[data-testid="offline-indicator"]');
    
    // Either error boundary should appear or offline indicator
    await expect(errorBoundary.or(offlineIndicator)).toBeVisible({ timeout: 10000 });
  });

  test('should work offline', async ({ page, context }) => {
    // Go offline
    await context.setOffline(true);
    
    await landingPage.goto();
    
    // Should show offline indicator
    await expect(page.locator('[data-testid="offline-indicator"]')).toBeVisible();
    
    // Basic content should still be available
    await landingPage.verifyHeroContent();
  });
});