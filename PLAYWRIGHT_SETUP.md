# Playwright Setup Guide for Automated Testing

This guide explains how to set up and run automated browser tests for the BB Mobile game using Playwright.

## Prerequisites

- Node.js (v16 or higher)
- npm (comes with Node.js)

## Installation

### Step 1: Install Playwright

```bash
npm install --save-dev @playwright/test
```

### Step 2: Install Playwright Browsers

```bash
npx playwright install
```

This will download Chromium, Firefox, and WebKit browsers for testing.

### Step 3: Install Only Chromium (Optional, Faster)

If you only need Chromium for testing:

```bash
npx playwright install chromium
```

## Running the Tests

### Start Local Server

First, start a local web server to serve the game:

```bash
# Using Python 3
python3 -m http.server 8080

# Or using Python 2
python -m SimpleHTTPServer 8080

# Or using Node.js http-server (install with: npm install -g http-server)
http-server -p 8080
```

### Run All Tests

```bash
npx playwright test
```

### Run Specific Test File

```bash
npx playwright test test_game_progression_social_automated.spec.js
```

### Run Tests with UI Mode (Recommended for Development)

```bash
npx playwright test --ui
```

### Run Tests in Headed Mode (See Browser)

```bash
npx playwright test --headed
```

### Run Tests with Debug Mode

```bash
npx playwright test --debug
```

## Test Configuration

### playwright.config.js

Create a `playwright.config.js` file in the root directory with the following content:

```javascript
const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './',
  testMatch: '**/*.spec.js',
  timeout: 180000, // 3 minutes per test
  expect: {
    timeout: 10000
  },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : 1,
  reporter: [
    ['html', { outputFolder: 'test-results/html' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['list']
  ],
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:8080',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],
});
```

## Test Output

### Screenshots

Screenshots are automatically saved to:
- `test-screenshots/social-maneuvers/` - Social phase screenshots
- Individual phase screenshots with descriptive names

### Test Results

Test results and reports are saved to:
- `test-results/html/` - HTML report (open `index.html` in browser)
- `test-results/results.json` - JSON test results
- `playwright-report/` - Default Playwright report

### View HTML Report

After running tests:

```bash
npx playwright show-report
```

## Test Coverage

The automated test suite covers:

1. **Game Initialization**
   - Verifies game loads correctly
   - Checks Social Maneuvers module is loaded

2. **Feature Flag Verification**
   - Confirms Social Maneuvers can be enabled/disabled
   - Validates feature flag state

3. **Phase Progression**
   - Simulates progression through all game phases:
     - Intermission
     - HOH (Head of Household)
     - Nominations
     - Veto Competition
     - Veto Meeting
     - Eviction
     - Social Phase

4. **Social Maneuvers UI**
   - Verifies Social Maneuvers UI renders correctly
   - Checks energy system is initialized
   - Validates player and action selection elements

5. **Legacy Social Bypass**
   - Confirms Social Maneuvers bypasses legacy social logic
   - Verifies energy system vs decision queue usage

6. **Interactive Elements**
   - Tests player selection dropdown
   - Tests action selection dropdown
   - Validates energy display

7. **Screenshot Capture**
   - Captures screenshots at each phase
   - Detailed social phase screenshots for visual verification

## Continuous Integration

### GitHub Actions Example

Create `.github/workflows/playwright.yml`:

```yaml
name: Playwright Tests
on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]
jobs:
  test:
    timeout-minutes: 60
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    - uses: actions/setup-node@v3
      with:
        node-version: 18
    - name: Install dependencies
      run: npm ci
    - name: Install Playwright Browsers
      run: npx playwright install --with-deps
    - name: Start server
      run: |
        python3 -m http.server 8080 &
        sleep 5
    - name: Run Playwright tests
      run: npx playwright test
    - uses: actions/upload-artifact@v3
      if: always()
      with:
        name: playwright-report
        path: playwright-report/
        retention-days: 30
    - uses: actions/upload-artifact@v3
      if: always()
      with:
        name: test-screenshots
        path: test-screenshots/
        retention-days: 30
```

## Troubleshooting

### Port Already in Use

If port 8080 is already in use, specify a different port:

```bash
# Start server on different port
python3 -m http.server 9090

# Run tests with custom port
BASE_URL=http://localhost:9090 npx playwright test
```

### Browser Installation Issues

If browser installation fails:

```bash
# Try with sudo (Linux/Mac)
sudo npx playwright install-deps

# Or install specific browser
npx playwright install chromium --force
```

### Test Timeout

If tests are timing out, increase the timeout in the test file or config:

```javascript
test.setTimeout(300000); // 5 minutes
```

### Screenshots Not Captured

Ensure the screenshot directory has write permissions:

```bash
mkdir -p test-screenshots/social-maneuvers
chmod 755 test-screenshots/social-maneuvers
```

## Alternative: Puppeteer Setup

If you prefer Puppeteer over Playwright:

```bash
npm install --save-dev puppeteer
```

See `PUPPETEER_SETUP.md` for Puppeteer-specific instructions.

## Alternative: Cypress Setup

If you prefer Cypress:

```bash
npm install --save-dev cypress
```

See `CYPRESS_SETUP.md` for Cypress-specific instructions.

## Additional Resources

- [Playwright Documentation](https://playwright.dev)
- [Playwright Test Runner](https://playwright.dev/docs/test-runners)
- [Playwright Assertions](https://playwright.dev/docs/test-assertions)
- [Playwright Screenshots](https://playwright.dev/docs/screenshots)
