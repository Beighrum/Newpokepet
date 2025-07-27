import { Page, expect } from '@playwright/test';

export class TestHelpers {
  static async waitForNetworkIdle(page: Page, timeout = 5000) {
    await page.waitForLoadState('networkidle', { timeout });
  }

  static async waitForAnimation(page: Page, selector: string) {
    await page.waitForFunction(
      (sel) => {
        const element = document.querySelector(sel);
        if (!element) return true;
        
        const computedStyle = window.getComputedStyle(element);
        return computedStyle.animationPlayState === 'paused' || 
               computedStyle.animationName === 'none';
      },
      selector,
      { timeout: 5000 }
    );
  }

  static async mockApiResponse(page: Page, endpoint: string, response: any, status = 200) {
    await page.route(endpoint, route => {
      route.fulfill({
        status,
        contentType: 'application/json',
        body: JSON.stringify(response)
      });
    });
  }

  static async mockApiError(page: Page, endpoint: string, status = 500, message = 'Server Error') {
    await page.route(endpoint, route => {
      route.fulfill({
        status,
        contentType: 'application/json',
        body: JSON.stringify({ error: message })
      });
    });
  }

  static async simulateSlowNetwork(page: Page, delay = 2000) {
    await page.route('**/*', async route => {
      await new Promise(resolve => setTimeout(resolve, delay));
      await route.continue();
    });
  }

  static async simulateOffline(page: Page) {
    await page.context().setOffline(true);
  }

  static async simulateOnline(page: Page) {
    await page.context().setOffline(false);
  }

  static async clearBrowserData(page: Page) {
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
      
      // Clear IndexedDB if used
      if ('indexedDB' in window) {
        indexedDB.databases?.().then(databases => {
          databases.forEach(db => {
            if (db.name) {
              indexedDB.deleteDatabase(db.name);
            }
          });
        });
      }
    });
  }

  static async setUserSession(page: Page, user: any) {
    await page.evaluate((userData) => {
      localStorage.setItem('user', JSON.stringify(userData));
    }, user);
  }

  static async mockGeolocation(page: Page, latitude: number, longitude: number) {
    await page.context().grantPermissions(['geolocation']);
    await page.context().setGeolocation({ latitude, longitude });
  }

  static async takeScreenshotOnFailure(page: Page, testName: string) {
    const screenshot = await page.screenshot({
      path: `test-results/screenshots/${testName}-failure.png`,
      fullPage: true
    });
    return screenshot;
  }

  static async getPerformanceMetrics(page: Page) {
    return await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      const paint = performance.getEntriesByType('paint');
      
      return {
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.navigationStart,
        loadComplete: navigation.loadEventEnd - navigation.navigationStart,
        firstPaint: paint.find(p => p.name === 'first-paint')?.startTime || 0,
        firstContentfulPaint: paint.find(p => p.name === 'first-contentful-paint')?.startTime || 0,
        resourceCount: performance.getEntriesByType('resource').length
      };
    });
  }

  static async waitForElement(page: Page, selector: string, timeout = 10000) {
    await page.waitForSelector(selector, { timeout, state: 'visible' });
  }

  static async scrollToElement(page: Page, selector: string) {
    await page.locator(selector).scrollIntoViewIfNeeded();
  }

  static async hoverAndClick(page: Page, selector: string) {
    const element = page.locator(selector);
    await element.hover();
    await element.click();
  }

  static async fillFormField(page: Page, selector: string, value: string, options?: { clear?: boolean }) {
    const field = page.locator(selector);
    
    if (options?.clear) {
      await field.clear();
    }
    
    await field.fill(value);
    
    // Verify the value was set
    await expect(field).toHaveValue(value);
  }

  static async selectDropdownOption(page: Page, selector: string, value: string) {
    await page.locator(selector).selectOption(value);
    await expect(page.locator(selector)).toHaveValue(value);
  }

  static async uploadFile(page: Page, inputSelector: string, filePath: string) {
    const fileInput = page.locator(inputSelector);
    await fileInput.setInputFiles(filePath);
    
    // Verify file was selected
    const fileName = filePath.split('/').pop() || '';
    await expect(fileInput).toHaveValue(new RegExp(fileName));
  }

  static async waitForToast(page: Page, message?: string, type?: 'success' | 'error' | 'warning' | 'info') {
    const toastSelector = '[data-testid="toast"]';
    await page.waitForSelector(toastSelector, { timeout: 5000 });
    
    if (message) {
      await expect(page.locator(toastSelector)).toContainText(message);
    }
    
    if (type) {
      await expect(page.locator(toastSelector)).toHaveAttribute('data-type', type);
    }
  }

  static async dismissToast(page: Page) {
    const dismissButton = page.locator('[data-testid="toast-dismiss"]');
    if (await dismissButton.isVisible()) {
      await dismissButton.click();
    }
  }

  static async verifyErrorBoundary(page: Page, expectedError?: string) {
    const errorBoundary = page.locator('[data-testid="error-boundary"]');
    await expect(errorBoundary).toBeVisible();
    
    if (expectedError) {
      await expect(errorBoundary).toContainText(expectedError);
    }
    
    // Verify retry button is present
    await expect(errorBoundary.locator('[data-testid="retry-button"]')).toBeVisible();
  }

  static async retryFromErrorBoundary(page: Page) {
    const retryButton = page.locator('[data-testid="error-boundary"] [data-testid="retry-button"]');
    await retryButton.click();
  }

  static async verifyAccessibility(page: Page) {
    // Basic accessibility checks
    const results = await page.evaluate(() => {
      const issues: string[] = [];
      
      // Check for alt text on images
      const images = document.querySelectorAll('img');
      images.forEach((img, index) => {
        if (!img.alt && !img.getAttribute('aria-label')) {
          issues.push(`Image ${index} missing alt text`);
        }
      });
      
      // Check for form labels
      const inputs = document.querySelectorAll('input, select, textarea');
      inputs.forEach((input, index) => {
        const id = input.id;
        const hasLabel = id && document.querySelector(`label[for="${id}"]`);
        const hasAriaLabel = input.getAttribute('aria-label');
        
        if (!hasLabel && !hasAriaLabel) {
          issues.push(`Form field ${index} missing label`);
        }
      });
      
      // Check for heading hierarchy
      const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
      let lastLevel = 0;
      headings.forEach((heading, index) => {
        const level = parseInt(heading.tagName.charAt(1));
        if (level > lastLevel + 1) {
          issues.push(`Heading level skip at heading ${index}`);
        }
        lastLevel = level;
      });
      
      return issues;
    });
    
    if (results.length > 0) {
      console.warn('Accessibility issues found:', results);
    }
    
    return results;
  }

  static async measurePageLoad(page: Page, url: string) {
    const startTime = Date.now();
    await page.goto(url);
    const endTime = Date.now();
    
    const metrics = await this.getPerformanceMetrics(page);
    
    return {
      totalTime: endTime - startTime,
      ...metrics
    };
  }
}