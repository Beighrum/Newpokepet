import { Page, Locator, expect } from '@playwright/test';

export class LandingPage {
  readonly page: Page;
  readonly heroTitle: Locator;
  readonly heroDescription: Locator;
  readonly getStartedButton: Locator;
  readonly demoButton: Locator;
  readonly featureCards: Locator;
  readonly loginButton: Locator;
  readonly signupButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heroTitle = page.locator('[data-testid="hero-title"]').first();
    this.heroDescription = page.locator('[data-testid="hero-description"]').first();
    this.getStartedButton = page.locator('[data-testid="get-started-button"]').first();
    this.demoButton = page.locator('[data-testid="demo-button"]').first();
    this.featureCards = page.locator('[data-testid="feature-card"]');
    this.loginButton = page.locator('[data-testid="login-button"]').first();
    this.signupButton = page.locator('[data-testid="signup-button"]').first();
  }

  async goto() {
    await this.page.goto('/');
    await this.waitForLoad();
  }

  async waitForLoad() {
    await expect(this.heroTitle).toBeVisible();
    await expect(this.getStartedButton).toBeVisible();
  }

  async clickGetStarted() {
    await this.getStartedButton.click();
  }

  async clickDemo() {
    await this.demoButton.click();
  }

  async clickLogin() {
    await this.loginButton.click();
  }

  async clickSignup() {
    await this.signupButton.click();
  }

  async verifyHeroContent() {
    await expect(this.heroTitle).toContainText('Pet Card Generator');
    await expect(this.heroDescription).toBeVisible();
  }

  async verifyFeatureCards() {
    await expect(this.featureCards).toHaveCount(3); // Assuming 3 feature cards
    
    // Verify each feature card is visible
    for (let i = 0; i < 3; i++) {
      await expect(this.featureCards.nth(i)).toBeVisible();
    }
  }

  async scrollToFeatures() {
    await this.featureCards.first().scrollIntoViewIfNeeded();
  }
}