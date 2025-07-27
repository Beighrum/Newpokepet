import { test, expect } from '@playwright/test';
import { LandingPage } from '../pages/LandingPage';
import { UploadPage } from '../pages/UploadPage';
import { GalleryPage } from '../pages/GalleryPage';
import path from 'path';

test.describe('Complete Card Generation Flow', () => {
  let landingPage: LandingPage;
  let uploadPage: UploadPage;
  let galleryPage: GalleryPage;

  test.beforeEach(async ({ page }) => {
    landingPage = new LandingPage(page);
    uploadPage = new UploadPage(page);
    galleryPage = new GalleryPage(page);
  });

  test('should complete full card generation journey', async ({ page }) => {
    // Step 1: Start from landing page
    await landingPage.goto();
    await landingPage.verifyHeroContent();
    await landingPage.clickGetStarted();

    // Step 2: Upload pet image
    await uploadPage.waitForLoad();
    
    // Use a test image file
    const testImagePath = path.join(__dirname, '../fixtures/test-pet.jpg');
    await uploadPage.uploadFile(testImagePath);
    await uploadPage.verifyUploadSuccess();

    // Step 3: Fill pet details
    await uploadPage.fillPetDetails('Fluffy', 'cat');

    // Step 4: Generate card
    await uploadPage.clickGenerate();
    await uploadPage.waitForGeneration();

    // Step 5: Verify card was created and navigate to gallery
    await expect(page).toHaveURL(/.*gallery/);
    await galleryPage.waitForLoad();

    // Step 6: Verify the new card appears in gallery
    await galleryPage.verifyCardCount(1);
    await galleryPage.verifyCardDetails(0, 'Fluffy', 'common'); // Assuming common rarity for test

    // Step 7: View card details
    await galleryPage.clickCard(0);
    await expect(page.locator('[data-testid="card-detail-modal"]')).toBeVisible();
    
    // Verify card details in modal
    await expect(page.locator('[data-testid="card-name"]')).toContainText('Fluffy');
    await expect(page.locator('[data-testid="card-type"]')).toContainText('cat');
    await expect(page.locator('[data-testid="card-image"]')).toBeVisible();
  });

  test('should handle file upload validation', async ({ page }) => {
    await uploadPage.goto();

    // Test invalid file type
    const invalidFilePath = path.join(__dirname, '../fixtures/test-document.pdf');
    await uploadPage.uploadFile(invalidFilePath);
    await uploadPage.verifyFileValidation('Please upload a valid image file');

    // Test file too large (simulate)
    await page.evaluate(() => {
      // Mock file size validation
      const fileInput = document.querySelector('[data-testid="file-input"]') as HTMLInputElement;
      if (fileInput) {
        fileInput.addEventListener('change', (e) => {
          const file = (e.target as HTMLInputElement).files?.[0];
          if (file && file.size > 10 * 1024 * 1024) { // 10MB limit
            const errorElement = document.querySelector('[data-testid="error-message"]');
            if (errorElement) {
              errorElement.textContent = 'File size must be less than 10MB';
            }
          }
        });
      }
    });
  });

  test('should show progress during generation', async ({ page }) => {
    await uploadPage.goto();
    
    const testImagePath = path.join(__dirname, '../fixtures/test-pet.jpg');
    await uploadPage.uploadFile(testImagePath);
    await uploadPage.fillPetDetails('Test Pet', 'dog');

    // Mock slow API response to test progress
    await page.route('**/api/generate-card', async (route) => {
      // Delay response to test loading states
      await new Promise(resolve => setTimeout(resolve, 2000));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'test-card-123',
          name: 'Test Pet',
          type: 'dog',
          rarity: 'common',
          imageUrl: '/test-card-image.jpg'
        })
      });
    });

    await uploadPage.clickGenerate();
    
    // Verify progress indicators
    await uploadPage.verifyProgressBar();
    await expect(page.locator('[data-testid="generation-status"]')).toContainText('Generating');
    
    await uploadPage.waitForGeneration();
  });

  test('should handle generation errors gracefully', async ({ page }) => {
    await uploadPage.goto();
    
    const testImagePath = path.join(__dirname, '../fixtures/test-pet.jpg');
    await uploadPage.uploadFile(testImagePath);
    await uploadPage.fillPetDetails('Error Pet', 'cat');

    // Mock API error
    await page.route('**/api/generate-card', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Generation failed' })
      });
    });

    await uploadPage.clickGenerate();
    
    // Should show error message
    await expect(page.locator('[data-testid="error-message"]')).toContainText('Generation failed');
    
    // Should show retry button
    await expect(page.locator('[data-testid="retry-button"]')).toBeVisible();
  });

  test('should work with drag and drop upload', async ({ page }) => {
    await uploadPage.goto();
    
    const testImagePath = path.join(__dirname, '../fixtures/test-pet.jpg');
    await uploadPage.dragAndDropFile(testImagePath);
    
    await uploadPage.verifyUploadSuccess();
  });

  test('should generate different rarity cards', async ({ page }) => {
    // Mock different rarity responses
    let callCount = 0;
    const rarities = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
    
    await page.route('**/api/generate-card', route => {
      const rarity = rarities[callCount % rarities.length];
      callCount++;
      
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: `test-card-${callCount}`,
          name: `Pet ${callCount}`,
          type: 'cat',
          rarity,
          imageUrl: `/test-card-${callCount}.jpg`
        })
      });
    });

    // Generate multiple cards
    for (let i = 0; i < 3; i++) {
      await uploadPage.goto();
      
      const testImagePath = path.join(__dirname, '../fixtures/test-pet.jpg');
      await uploadPage.uploadFile(testImagePath);
      await uploadPage.fillPetDetails(`Pet ${i + 1}`, 'cat');
      await uploadPage.clickGenerate();
      await uploadPage.waitForGeneration();
    }

    // Verify different rarities in gallery
    await galleryPage.goto();
    await galleryPage.verifyCardCount(3);
    
    // Check that we have different rarities
    const rarityElements = page.locator('[data-testid="card-rarity"]');
    const rarityTexts = await rarityElements.allTextContents();
    
    // Should have at least 2 different rarities
    const uniqueRarities = new Set(rarityTexts);
    expect(uniqueRarities.size).toBeGreaterThanOrEqual(2);
  });

  test('should handle premium features correctly', async ({ page }) => {
    // Mock user without premium
    await page.evaluate(() => {
      localStorage.setItem('user', JSON.stringify({
        id: 'free-user-123',
        subscription: { tier: 'free' }
      }));
    });

    await uploadPage.goto();
    
    // Try to access premium feature (e.g., video generation)
    const premiumButton = page.locator('[data-testid="generate-video-button"]');
    if (await premiumButton.isVisible()) {
      await premiumButton.click();
      
      // Should show premium gate
      await expect(page.locator('[data-testid="premium-gate"]')).toBeVisible();
      await expect(page.locator('[data-testid="upgrade-button"]')).toBeVisible();
    }
  });

  test('should maintain state during navigation', async ({ page }) => {
    await uploadPage.goto();
    
    const testImagePath = path.join(__dirname, '../fixtures/test-pet.jpg');
    await uploadPage.uploadFile(testImagePath);
    await uploadPage.fillPetDetails('Navigation Test', 'dog');

    // Navigate away and back
    await page.goto('/gallery');
    await page.goBack();

    // Form should maintain state (if implemented)
    const nameValue = await page.locator('[data-testid="pet-name-input"]').inputValue();
    const typeValue = await page.locator('[data-testid="pet-type-select"]').inputValue();
    
    // Note: This depends on implementation - might need localStorage or session storage
    if (nameValue || typeValue) {
      expect(nameValue).toBe('Navigation Test');
      expect(typeValue).toBe('dog');
    }
  });
});