const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log(`BROWSER CONSOLE ERROR: ${msg.text()}`);
    }
  });

  page.on('pageerror', err => {
    console.log(`BROWSER PAGE ERROR:`, err);
  });

  try {
    console.log('Navigating to http://localhost:8081...');
    await page.goto('http://localhost:8081', { timeout: 15000 });
    console.log('Waiting 10 seconds for any errors/toasts to appear...');
    await page.waitForTimeout(10000);
  } catch (err) {
    console.error('Navigation or timeout error:', err);
  } finally {
    await browser.close();
    console.log('Browser closed.');
  }
})();
