/// <reference types="cypress" />

// Custom commands for video background testing
Cypress.Commands.add('setTheme', (theme: 'light' | 'dark' | 'gradient') => {
  cy.window().then((win) => {
    win.localStorage.setItem('theme', theme);
    // Dispatch custom event to trigger theme change
    win.dispatchEvent(new CustomEvent('themeChange', { detail: { theme } }));
  });
});

Cypress.Commands.add('waitForVideo', (theme: string, timeout = 10000) => {
  cy.get(`video[data-video-src*="${theme}-bg.mp4"]`, { timeout }).should('exist');
});

Cypress.Commands.add('waitForVideoFallback', (theme: string, timeout = 10000) => {
  cy.get(`[data-video-src*="${theme}-bg.mp4"]`, { timeout }).should('exist');
  cy.get(`[data-video-src*="${theme}-bg.mp4"]`).should('have.class', 'bg-gradient-to-b');
});

Cypress.Commands.add('mockVideoResponse', (theme: string, statusCode = 200) => {
  const fixture = statusCode === 200 ? `${theme}-bg.mp4` : null;
  const interceptOptions = fixture
    ? { fixture }
    : { statusCode };

  cy.intercept('GET', `**/videos/${theme}-bg.mp4`, interceptOptions).as(`${theme}Video`);
});

Cypress.Commands.add('verifyVideoAttributes', () => {
  cy.get('video').should('have.attr', 'autoplay');
  cy.get('video').should('have.attr', 'loop');
  cy.get('video').should('have.attr', 'muted');
  cy.get('video').should('have.attr', 'playsinline');
  cy.get('video').should('have.attr', 'preload', 'metadata');
});

export {};

declare global {
  namespace Cypress {
    interface Chainable {
      setTheme(theme: 'light' | 'dark' | 'gradient'): Chainable
      waitForVideo(theme: string, timeout?: number): Chainable
      waitForVideoFallback(theme: string, timeout?: number): Chainable
      mockVideoResponse(theme: string, statusCode?: number): Chainable
      verifyVideoAttributes(): Chainable
    }
  }
}