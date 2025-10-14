const { defineConfig, devices } = require('@playwright/test');

/**
 * Playwright Test Configuration
 * 
 * This configuration is optimized for testing the BB Mobile game,
 * particularly the Social Maneuvers module and phase progressions.
 */

module.exports = defineConfig({
  // Look for test files in the root directory
  testDir: './',
  
  // Match test files with .spec.js extension
  testMatch: '**/*.spec.js',
  
  // Maximum time one test can run (3 minutes)
  timeout: 180000,
  
  // Maximum time for each assertion
  expect: {
    timeout: 10000
  },
  
  // Run tests in files sequentially (important for game state)
  fullyParallel: false,
  
  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,
  
  // Retry on CI only
  retries: process.env.CI ? 2 : 0,
  
  // Single worker to avoid state conflicts
  workers: 1,
  
  // Reporter to use
  reporter: [
    ['html', { outputFolder: 'test-results/html', open: 'never' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['list'],
    ['junit', { outputFile: 'test-results/junit.xml' }]
  ],
  
  // Shared settings for all projects
  use: {
    // Base URL for page.goto() shortcuts
    baseURL: process.env.BASE_URL || 'http://localhost:8080',
    
    // Collect trace when retrying the failed test
    trace: 'on-first-retry',
    
    // Take screenshot on failure
    screenshot: 'only-on-failure',
    
    // Record video on failure
    video: 'retain-on-failure',
    
    // Maximum time for navigation
    navigationTimeout: 30000,
    
    // Maximum time for action
    actionTimeout: 10000,
  },
  
  // Configure projects for major browsers
  projects: [
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
      },
    },
    
    // Uncomment to test on Firefox
    // {
    //   name: 'firefox',
    //   use: { 
    //     ...devices['Desktop Firefox'],
    //     viewport: { width: 1280, height: 720 },
    //   },
    // },
    
    // Uncomment to test on WebKit (Safari)
    // {
    //   name: 'webkit',
    //   use: { 
    //     ...devices['Desktop Safari'],
    //     viewport: { width: 1280, height: 720 },
    //   },
    // },
    
    // Test against mobile viewports
    // {
    //   name: 'mobile-chrome',
    //   use: { ...devices['Pixel 5'] },
    // },
    
    // {
    //   name: 'mobile-safari',
    //   use: { ...devices['iPhone 12'] },
    // },
  ],
  
  // Folder for test artifacts
  outputDir: 'test-results/artifacts',
  
  // Run local dev server before starting the tests
  // Uncomment if you want Playwright to start the server automatically
  // webServer: {
  //   command: 'python3 -m http.server 8080',
  //   port: 8080,
  //   timeout: 120000,
  //   reuseExistingServer: !process.env.CI,
  // },
});
