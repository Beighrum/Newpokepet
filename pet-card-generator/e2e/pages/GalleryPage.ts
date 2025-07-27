import { Page, Locator, expect } from '@playwright/test';

export class GalleryPage {
  readonly page: Page;
  readonly cardGrid: Locator;
  readonly cardItems: Locator;
  readonly searchInput: Locator;
  readonly filterDropdown: Locator;
  readonly sortDropdown: Locator;
  readonly paginationNext: Locator;
  readonly paginationPrev: Locator;
  readonly loadMoreButton: Locator;
  readonly emptyState: Locator;
  readonly loadingSpinner: Locator;
  readonly collectionStats: Locator;

  constructor(page: Page) {
    this.page = page;
    this.cardGrid = page.locator('[data-testid="card-grid"]');
    this.cardItems = page.locator('[data-testid="card-item"]');
    this.searchInput = page.locator('[data-testid="search-input"]');
    this.filterDropdown = page.locator('[data-testid="filter-dropdown"]');
    this.sortDropdown = page.locator('[data-testid="sort-dropdown"]');
    this.paginationNext = page.locator('[data-testid="pagination-next"]');
    this.paginationPrev = page.locator('[data-testid="pagination-prev"]');
    this.loadMoreButton = page.locator('[data-testid="load-more-button"]');
    this.emptyState = page.locator('[data-testid="empty-state"]');
    this.loadingSpinner = page.locator('[data-testid="loading-spinner"]');
    this.collectionStats = page.locator('[data-testid="collection-stats"]');
  }

  async goto() {
    await this.page.goto('/gallery');
    await this.waitForLoad();
  }

  async waitForLoad() {
    // Wait for either cards to load or empty state to show
    await Promise.race([
      expect(this.cardItems.first()).toBeVisible(),
      expect(this.emptyState).toBeVisible()
    ]);
  }

  async searchCards(query: string) {
    await this.searchInput.fill(query);
    await this.searchInput.press('Enter');
    await this.waitForSearchResults();
  }

  async waitForSearchResults() {
    // Wait for loading to finish
    await expect(this.loadingSpinner).toBeHidden({ timeout: 10000 });
  }

  async filterByRarity(rarity: string) {
    await this.filterDropdown.click();
    await this.page.locator(`[data-testid="filter-option-${rarity}"]`).click();
    await this.waitForSearchResults();
  }

  async sortBy(sortOption: string) {
    await this.sortDropdown.click();
    await this.page.locator(`[data-testid="sort-option-${sortOption}"]`).click();
    await this.waitForSearchResults();
  }

  async clickCard(index: number = 0) {
    await this.cardItems.nth(index).click();
  }

  async verifyCardCount(expectedCount: number) {
    await expect(this.cardItems).toHaveCount(expectedCount);
  }

  async verifyEmptyState() {
    await expect(this.emptyState).toBeVisible();
    await expect(this.cardItems).toHaveCount(0);
  }

  async verifyCollectionStats() {
    await expect(this.collectionStats).toBeVisible();
    
    // Verify stats contain expected elements
    await expect(this.collectionStats.locator('[data-testid="total-cards"]')).toBeVisible();
    await expect(this.collectionStats.locator('[data-testid="rarity-breakdown"]')).toBeVisible();
  }

  async loadMoreCards() {
    const initialCount = await this.cardItems.count();
    await this.loadMoreButton.click();
    
    // Wait for new cards to load
    await expect(this.cardItems).toHaveCount(initialCount + 12, { timeout: 10000 });
  }

  async navigateToNextPage() {
    await this.paginationNext.click();
    await this.waitForSearchResults();
  }

  async navigateToPrevPage() {
    await this.paginationPrev.click();
    await this.waitForSearchResults();
  }

  async verifyCardDetails(index: number, expectedName: string, expectedRarity: string) {
    const card = this.cardItems.nth(index);
    
    await expect(card.locator('[data-testid="card-name"]')).toContainText(expectedName);
    await expect(card.locator('[data-testid="card-rarity"]')).toContainText(expectedRarity);
  }

  async hoverCard(index: number) {
    await this.cardItems.nth(index).hover();
  }

  async verifyCardHoverEffects(index: number) {
    const card = this.cardItems.nth(index);
    await this.hoverCard(index);
    
    // Verify hover overlay appears
    await expect(card.locator('[data-testid="card-overlay"]')).toBeVisible();
  }

  async deleteCard(index: number) {
    const card = this.cardItems.nth(index);
    await this.hoverCard(index);
    
    await card.locator('[data-testid="delete-button"]').click();
    
    // Confirm deletion in modal
    await this.page.locator('[data-testid="confirm-delete"]').click();
    
    // Wait for card to be removed
    await expect(card).toBeHidden({ timeout: 5000 });
  }
}