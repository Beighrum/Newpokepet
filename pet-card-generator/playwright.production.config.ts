import { defineConfig } from '@playwright/test';
import baseConfig from './playwright.config';

/**
 * Production environment configuration for Playwright tests
 * Only runs critical smoke tests
 */
export default defineConfig({
  ...baseConfig,
  
  // Override base URL for production
  use: {
    ...baseConfig.use,
    baseURL: 'https://petcardgenerator.com',
  },

  // Production smoke tests only
  testDir: './e2e/production',
  
  // Conservative settings for production
  retries: 2,
  workers: 1,
  
  // Longer timeouts for production
  timeout: 90 * 1000,
  
  expect: {
    timeout: 15000,
  },

  // Only Chrome for production smoke tests
  projects: [
    {
      name: 'production-smoke',
      use: { ...baseConfig.projects![0].use },
    }
  ],

  // No local server for production
  webServer: undefined,
  
  // More detailed reporting for production
  reporter: [
    ['html', { outputFolder: 'production-test-results' }],
    ['json', { outputFile: 'production-test-results/results.json' }],
    ['junit', { outputFile: 'production-test-results/results.xml' }]
  ],
});