const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('http://localhost:3000/auth');
  await page.waitForTimeout(2000);
  // Click the dropdown
  await page.click('.cs-display');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'dropdown_open.png' });
  
  // Try typing
  await page.type('.cs-search', 'nig');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'dropdown_typed.png' });

  await browser.close();
})();
