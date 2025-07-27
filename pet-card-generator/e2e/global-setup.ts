import { chromium, FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting global setup...');
  
  // Create a browser instance for setup
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Wait for the dev server to be ready
    const baseURL = config.projects[0].use.baseURL || 'http://localhost:5173';
    console.log(`⏳ Waiting for server at ${baseURL}...`);
    
    let retries = 0;
    const maxRetries = 30;
    
    while (retries < maxRetries) {
      try {
        await page.goto(baseURL, { timeout: 5000 });
        console.log('✅ Server is ready!');
        break;
      } catch (error) {
        retries++;
        if (retries === maxRetries) {
          throw new Error(`Server not ready after ${maxRetries} attempts`);
        }
        console.log(`⏳ Server not ready, retrying... (${retries}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    // Set up test data or authentication if needed
    await setupTestData(page);
    
    console.log('✅ Global setup completed');
    
  } catch (error) {
    console.error('❌ Global setup failed:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

async function setupTestData(page: any) {
  // Set up any test data, authentication, or database state
  console.log('📝 Setting up test data...');
  
  // Example: Clear localStorage and set up test user
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  
  // Example: Set up mock user data
  await page.evaluate(() => {
    const mockUser = {
      id: 'test-user-123',
      uid: 'test-user-123',
      email: 'test@example.com',
      displayName: 'Test User',
      photoURL: null
    };
    localStorage.setItem('user', JSON.stringify(mockUser));
  });
  
  console.log('✅ Test data setup completed');
}

export default globalSetup;