/**
 * Cypress support file for e2e tests
 * This file is loaded before every test
 */

// Suppress uncaught exception errors from the application
Cypress.on('uncaught:exception', (err, runnable) => {
  // Returning false here prevents Cypress from failing the test
  console.warn('Caught exception:', err.message);
  return false;
});

// Custom command to check element visibility within viewport
Cypress.Commands.add('isInViewport', { prevSubject: true }, (subject) => {
  const rect = subject[0].getBoundingClientRect();
  const vh = Cypress.config('viewportHeight');
  const vw = Cypress.config('viewportWidth');
  
  expect(rect.top).to.be.lessThan(vh);
  expect(rect.bottom).to.be.greaterThan(0);
  expect(rect.left).to.be.lessThan(vw);
  expect(rect.right).to.be.greaterThan(0);
  
  return subject;
});

// Custom command to wait for mobile roster to be ready
Cypress.Commands.add('waitForMobileRoster', () => {
  cy.window().should('have.property', 'MobileRoster');
  cy.get('.mobile-roster-container').should('exist');
  cy.get('.mobile-roster-active-grid').should('exist');
});
