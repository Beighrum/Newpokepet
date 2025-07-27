import { Page, Locator, expect } from '@playwright/test';

export class UploadPage {
  readonly page: Page;
  readonly fileInput: Locator;
  readonly dropZone: Locator;
  readonly uploadButton: Locator;
  readonly previewImage: Locator;
  readonly progressBar: Locator;
  readonly errorMessage: Locator;
  readonly successMessage: Locator;
  readonly petNameInput: Locator;
  readonly petTypeSelect: Locator;
  readonly generateButton: Locator;
  readonly loadingSpinner: Locator;

  constructor(page: Page) {
    this.page = page;
    this.fileInput = page.locator('[data-testid="file-input"]');
    this.dropZone = page.locator('[data-testid="drop-zone"]');
    this.uploadButton = page.locator('[data-testid="upload-button"]');
    this.previewImage = page.locator('[data-testid="preview-image"]');
    this.progressBar = page.locator('[data-testid="progress-bar"]');
    this.errorMessage = page.locator('[data-testid="error-message"]');
    this.successMessage = page.locator('[data-testid="success-message"]');
    this.petNameInput = page.locator('[data-testid="pet-name-input"]');
    this.petTypeSelect = page.locator('[data-testid="pet-type-select"]');
    this.generateButton = page.locator('[data-testid="generate-button"]');
    this.loadingSpinner = page.locator('[data-testid="loading-spinner"]');
  }

  async goto() {
    await this.page.goto('/upload');
    await this.waitForLoad();
  }

  async waitForLoad() {
    await expect(this.dropZone).toBeVisible();
    await expect(this.fileInput).toBeAttached();
  }

  async uploadFile(filePath: string) {
    await this.fileInput.setInputFiles(filePath);
    await this.waitForPreview();
  }

  async waitForPreview() {
    await expect(this.previewImage).toBeVisible({ timeout: 10000 });
  }

  async fillPetDetails(name: string, type: string) {
    await this.petNameInput.fill(name);
    await this.petTypeSelect.selectOption(type);
  }

  async clickGenerate() {
    await this.generateButton.click();
  }

  async waitForGeneration() {
    // Wait for loading spinner to appear
    await expect(this.loadingSpinner).toBeVisible();
    
    // Wait for loading to complete (spinner disappears)
    await expect(this.loadingSpinner).toBeHidden({ timeout: 30000 });
  }

  async verifyUploadSuccess() {
    await expect(this.successMessage).toBeVisible();
    await expect(this.previewImage).toBeVisible();
  }

  async verifyUploadError() {
    await expect(this.errorMessage).toBeVisible();
  }

  async dragAndDropFile(filePath: string) {
    // Create a file input element and set the file
    const fileInput = await this.page.evaluateHandle(() => {
      const input = document.createElement('input');
      input.type = 'file';
      input.style.display = 'none';
      document.body.appendChild(input);
      return input;
    });

    await fileInput.setInputFiles(filePath);

    // Simulate drag and drop
    const file = await this.page.evaluateHandle(([input]) => {
      return input.files[0];
    }, [fileInput]);

    await this.dropZone.dispatchEvent('dragenter');
    await this.dropZone.dispatchEvent('dragover');
    await this.dropZone.dispatchEvent('drop', { dataTransfer: { files: [file] } });
  }

  async verifyFileValidation(expectedError: string) {
    await expect(this.errorMessage).toContainText(expectedError);
  }

  async verifyProgressBar() {
    await expect(this.progressBar).toBeVisible();
    
    // Wait for progress to complete
    await this.page.waitForFunction(() => {
      const progressBar = document.querySelector('[data-testid="progress-bar"]');
      return progressBar?.getAttribute('aria-valuenow') === '100';
    }, { timeout: 10000 });
  }
}