import { defineConfig } from '@playwright/test';
import baseConfig from './playwright.config';

/**
 * Staging environment configuration for Playwright tests
 */
export default defineConfig({
  ...baseConfig,
  
  // Override base URL for staging
  use: {
    ...baseConfig.use,
    baseURL: 'https://staging.petcardgenerator.com',
  },

  // Staging-specific test configuration
  testDir: './e2e/staging',
  
  // More conservative settings for staging
  retries: 1,
  workers: 2,
  
  // Longer timeouts for staging environment
  timeout: 60 * 1000,
  
  expect: {
    timeout: 10000,
  },

  // Only run critical tests on staging
  projects: [
    {
      name: 'staging-chrome',
      use: { ...baseConfig.projects![0].use },
    }
  ],

  // No local server for staging
  webServer: undefined,
});