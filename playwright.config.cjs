const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  testMatch: '**/*.spec.cjs',
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:4183',
    browserName: 'chromium',
    launchOptions: { executablePath: '/usr/bin/chromium', args: ['--no-sandbox'] }
  },
  webServer: {
    command: 'python3 -m http.server 4183 --bind 127.0.0.1',
    url: 'http://127.0.0.1:4183/',
    reuseExistingServer: false,
    timeout: 15000
  }
});
