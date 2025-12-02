const { defineConfig } = require('cypress');

module.exports = defineConfig({
  e2e: {
    baseUrl: 'http://localhost:8080',
    supportFile: 'cypress/support/e2e.js',
    specPattern: 'cypress/e2e/**/*.cy.js',
    viewportWidth: 375,
    viewportHeight: 667,
    video: false,
    screenshotsFolder: 'cypress/screenshots',
    screenshotOnRunFailure: true,
    defaultCommandTimeout: 10000,
    pageLoadTimeout: 30000,
  },
});
