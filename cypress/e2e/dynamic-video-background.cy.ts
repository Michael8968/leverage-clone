describe('DynamicVideoBackground E2E Tests', () => {
  beforeEach(() => {
    // Clear localStorage and set default theme
    cy.window().then((win) => {
      win.localStorage.clear();
      win.localStorage.setItem('theme', 'light');
    });

    // Mock TCB COS environment variables
      cy.intercept('GET', '**/video/light-bg.mp4', { fixture: 'light-bg.mp4' }).as('lightVideo');
      cy.intercept('GET', '**/video/dark-bg.mp4', { fixture: 'dark-bg.mp4' }).as('darkVideo');
      cy.intercept('GET', '**/video/gradient-bg.mp4', { fixture: 'gradient-bg.mp4' }).as('gradientVideo');
  });

  describe('Login Page Video Background', () => {
    it('should render video background on login page', () => {
      cy.visit('/login');

      // Check if video element exists
      cy.get('video[data-video-src*="light-bg.mp4"]', { timeout: 10000 }).should('exist');

      // Verify video attributes
      cy.get('video').should('have.attr', 'autoplay');
      cy.get('video').should('have.attr', 'loop');
      cy.get('video').should('have.attr', 'muted');
      cy.get('video').should('have.attr', 'playsinline');

      // Verify video source
        cy.get('video source').should('have.attr', 'src').and('include', 'video/light-bg.mp4');
      cy.get('video source').should('have.attr', 'type', 'video/mp4');

      // Check that video request was made
      cy.wait('@lightVideo').its('response.statusCode').should('eq', 200);
    });

    it('should show fallback gradient when video fails to load', () => {
      // Mock video load failure
        cy.intercept('GET', '**/video/light-bg.mp4', { statusCode: 404 }).as('failedVideo');

      cy.visit('/login');

      // Wait for video to fail and fallback to show
      cy.get('[data-video-src*="light-bg.mp4"]', { timeout: 10000 }).should('exist');
      cy.get('[data-video-src*="light-bg.mp4"]').should('have.class', 'bg-gradient-to-b');

      // Verify fallback has correct styling for light theme
      cy.get('[data-video-src*="light-bg.mp4"]').should('have.class', 'from-blue-400');
      cy.get('[data-video-src*="light-bg.mp4"]').should('have.class', 'to-purple-500');
    });

    it('should handle video loading errors gracefully', () => {
      // Mock network error
        cy.intercept('GET', '**/video/light-bg.mp4', { forceNetworkError: true }).as('networkError');

      cy.visit('/login');

      // Should still render fallback without crashing
      cy.get('[data-video-src*="light-bg.mp4"]', { timeout: 10000 }).should('exist');
      cy.get('[data-video-src*="light-bg.mp4"]').should('have.class', 'bg-gradient-to-b');

      // Check console for error logging (if accessible)
      cy.window().then((win) => {
        // Note: Console logs may not be directly accessible in all Cypress configurations
        // This is more of a structural test
        expect(win.document.querySelector('[data-video-src*="light-bg.mp4"]')).to.exist;
      });
    });
  });

  describe('Dashboard Video Background and Theme Switching', () => {
    beforeEach(() => {
      // Assume user is logged in and visits dashboard
      cy.visit('/dashboard');
    });

    it('should render video background on dashboard', () => {
      cy.get('video[data-video-src*="light-bg.mp4"]', { timeout: 10000 }).should('exist');
      cy.wait('@lightVideo');
    });

    it('should switch video when theme changes to dark', () => {
      // Initial light theme video
      cy.get('video[data-video-src*="light-bg.mp4"]').should('exist');

      // Change theme to dark via theme switcher
      cy.get('[data-testid="theme-switcher"]').click();
      cy.get('[data-testid="dark-theme-option"]').click();

      // Should switch to dark theme video
      cy.get('video[data-video-src*="dark-bg.mp4"]', { timeout: 5000 }).should('exist');
      cy.wait('@darkVideo');
    });

    it('should switch video when theme changes to gradient', () => {
      // Change theme to gradient
      cy.get('[data-testid="theme-switcher"]').click();
      cy.get('[data-testid="gradient-theme-option"]').click();

      // Should switch to gradient theme video
      cy.get('video[data-video-src*="gradient-bg.mp4"]', { timeout: 5000 }).should('exist');
      cy.wait('@gradientVideo');
    });

    it('should maintain video playback across theme switches', () => {
      // Start with light theme
      cy.get('video[data-video-src*="light-bg.mp4"]').should('exist');

      // Switch to dark theme
      cy.get('[data-testid="theme-switcher"]').click();
      cy.get('[data-testid="dark-theme-option"]').click();

      // Video should still be playing (autoplay attribute)
      cy.get('video[data-video-src*="dark-bg.mp4"]').should('have.attr', 'autoplay');

      // Switch back to light
      cy.get('[data-testid="theme-switcher"]').click();
      cy.get('[data-testid="light-theme-option"]').click();

      cy.get('video[data-video-src*="light-bg.mp4"]').should('have.attr', 'autoplay');
    });

    it('should show appropriate fallback gradients for each theme', () => {
      // Test light theme fallback
      cy.get('[data-testid="theme-switcher"]').click();
      cy.get('[data-testid="light-theme-option"]').click();

      // Force video failure for light theme
        cy.intercept('GET', '**/video/light-bg.mp4', { statusCode: 404 }).as('lightFail');
      cy.reload();

      cy.get('[data-video-src*="light-bg.mp4"]').should('have.class', 'from-blue-400');
      cy.get('[data-video-src*="light-bg.mp4"]').should('have.class', 'to-purple-500');

      // Test dark theme fallback
      cy.get('[data-testid="theme-switcher"]').click();
      cy.get('[data-testid="dark-theme-option"]').click();

        cy.intercept('GET', '**/video/dark-bg.mp4', { statusCode: 404 }).as('darkFail');
      cy.reload();

      cy.get('[data-video-src*="dark-bg.mp4"]').should('have.class', 'from-[#0f1724]');
      cy.get('[data-video-src*="dark-bg.mp4"]').should('have.class', 'to-[#1e293b]');

      // Test gradient theme fallback
      cy.get('[data-testid="theme-switcher"]').click();
      cy.get('[data-testid="gradient-theme-option"]').click();

        cy.intercept('GET', '**/video/gradient-bg.mp4', { statusCode: 404 }).as('gradientFail');
      cy.reload();

      cy.get('[data-video-src*="gradient-bg.mp4"]').should('have.class', 'from-indigo-600');
      cy.get('[data-video-src*="gradient-bg.mp4"]').should('have.class', 'to-purple-800');
    });
  });

  describe('Cross-browser Compatibility', () => {
    it('should work on mobile viewport', () => {
      cy.viewport('iphone-x');

      cy.visit('/login');

      // Video should have playsInline attribute for mobile
      cy.get('video').should('have.attr', 'playsinline');

      // Should render within mobile viewport
      cy.get('video').should('be.visible');
    });

    it('should work on tablet viewport', () => {
      cy.viewport('ipad-2');

      cy.visit('/dashboard');

      cy.get('video[data-video-src*="light-bg.mp4"]', { timeout: 10000 }).should('exist');
      cy.get('video').should('have.attr', 'playsinline');
    });

    it('should work on desktop viewport', () => {
      cy.viewport(1920, 1080);

      cy.visit('/dashboard');

      cy.get('video[data-video-src*="light-bg.mp4"]', { timeout: 10000 }).should('exist');
      cy.get('video').should('have.class', 'object-cover');
    });
  });

  describe('Performance and Loading', () => {
    it('should preload video metadata', () => {
      cy.visit('/login');

      cy.get('video').should('have.attr', 'preload', 'metadata');
    });

    it('should handle slow network conditions', () => {
      // Simulate slow network
      cy.intercept('GET', '**/videos/light-bg.mp4', (req) => {
        req.reply((res) => {
          // Delay response by 5 seconds
          setTimeout(() => {
            res.send({ fixture: 'light-bg.mp4' });
          }, 5000);
        });
      }).as('slowVideo');

      cy.visit('/login', { timeout: 15000 });

      // Should still show fallback initially, then video when loaded
      cy.get('[data-video-src*="light-bg.mp4"]', { timeout: 10000 }).should('exist');
      cy.wait('@slowVideo');
    });

    it('should cache videos appropriately', () => {
      cy.visit('/login');
      cy.wait('@lightVideo');

      // Visit again - should use cache
      cy.visit('/login');

      // Video should load from cache faster
      cy.get('video[data-video-src*="light-bg.mp4"]', { timeout: 5000 }).should('exist');
    });
  });

  describe('Error Recovery', () => {
    it('should recover from temporary network issues', () => {
      // First request fails
      let requestCount = 0;
      cy.intercept('GET', '**/videos/light-bg.mp4', (req) => {
        requestCount++;
        if (requestCount === 1) {
          req.reply({ statusCode: 500 });
        } else {
          req.reply({ fixture: 'light-bg.mp4' });
        }
      }).as('videoRequest');

      cy.visit('/login');

      // Should show fallback initially
      cy.get('[data-video-src*="light-bg.mp4"]').should('exist');

      // Trigger reload or theme switch to retry
      cy.get('[data-testid="theme-switcher"]').click();
      cy.get('[data-testid="light-theme-option"]').click();

      // Should eventually load video
      cy.get('video[data-video-src*="light-bg.mp4"]', { timeout: 10000 }).should('exist');
    });

    it('should handle CORS issues gracefully', () => {
      // Mock CORS error
      cy.intercept('GET', '**/videos/light-bg.mp4', { statusCode: 0, body: '' }).as('corsError');

      cy.visit('/login');

      // Should fallback to gradient
      cy.get('[data-video-src*="light-bg.mp4"]').should('have.class', 'bg-gradient-to-b');
    });
  });

  describe('Accessibility', () => {
    it('should not interfere with keyboard navigation', () => {
      cy.visit('/login');

      // Video should not capture focus
      cy.get('video').should('not.have.focus');

      // Other interactive elements should remain accessible
      cy.get('input[type="email"]').should('exist').and('be.visible');
      cy.get('input[type="password"]').should('exist').and('be.visible');
    });

    it('should have appropriate ARIA attributes if needed', () => {
      cy.visit('/dashboard');

      // Video background should not have inappropriate ARIA attributes
      cy.get('video').should('not.have.attr', 'aria-label');
      cy.get('video').should('not.have.attr', 'role');
    });
  });
});