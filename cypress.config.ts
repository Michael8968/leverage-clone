import { defineConfig } from "cypress";

export default defineConfig({
  projectId: 'gf2ba6',
  e2e: {
    baseUrl: 'http://localhost:3001',
    viewportWidth: 1280,
    viewportHeight: 720,
    video: false, // Disable Cypress video recording for performance
    screenshotOnRunFailure: true,
    defaultCommandTimeout: 10000,
    requestTimeout: 15000,
    responseTimeout: 15000,
    setupNodeEvents(on, config) {
      // implement node event listeners here
      on('before:browser:launch', (browser, launchOptions) => {
        // Configure browser for video testing
        if (browser.family === 'chromium') {
          launchOptions.args.push('--disable-web-security');
          launchOptions.args.push('--disable-features=VizDisplayCompositor');
        }
        return launchOptions;
      });
    },
    env: {
      // Environment variables for testing
      TCB_COS_BUCKET: 'test-bucket-123',
      TCB_COS_REGION: 'ap-shanghai'
    }
  },
  component: {
    devServer: {
      framework: "next",
      bundler: "webpack",
    },
  },
});
