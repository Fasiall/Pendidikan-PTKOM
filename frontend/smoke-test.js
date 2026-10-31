const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const frontend = 'D:/Website/Pendidikan-PTKOM/frontend';
const pages = [
  { name: 'index.html', url: 'file://' + path.join(frontend, 'index.html') },
  { name: 'login.html', url: 'file://' + path.join(frontend, 'login.html') },
  { name: 'materi.html', url: 'file://' + path.join(frontend, 'materi.html') },
  { name: 'materi-detail.html', url: 'file://' + path.join(frontend, 'materi-detail.html') },
];

// Expected network errors (no backend running)
const expectedNetworkErrors = [
  'ERR_CONNECTION_REFUSED',
  'Failed to fetch',
  'NetworkError',
];

function isExpectedNetworkError(errorText) {
  return expectedNetworkErrors.some(e => errorText.includes(e));
}

async function runSmokeTest() {
  const browser = await chromium.launch();
  const context = await browser.newContext();

  let allPassed = true;

  for (const pageInfo of pages) {
    const page = await context.newPage();
    const jsErrors = [];
    const networkErrors = [];

    page.on('console', msg => {
      if (msg.type() === 'error') {
        const text = msg.text();
        if (isExpectedNetworkError(text)) {
          networkErrors.push(text);
        } else {
          jsErrors.push(text);
        }
      }
    });

    page.on('pageerror', err => {
      jsErrors.push(err.message);
    });

    try {
      console.log(`Testing ${pageInfo.name}...`);
      await page.goto(pageInfo.url, { waitUntil: 'networkidle', timeout: 30000 });

      // Wait a bit for any async errors
      await page.waitForTimeout(2000);

      if (jsErrors.length > 0) {
        console.log(`  FAIL: ${pageInfo.name} - JavaScript errors:`);
        jsErrors.forEach(e => console.log(`    - ${e}`));
        allPassed = false;
      } else {
        console.log(`  PASS: ${pageInfo.name} - No JavaScript errors`);
        if (networkErrors.length > 0) {
          console.log(`    (Expected network errors: ${networkErrors.length} - backend not running)`);
        }
      }

      // Basic DOM checks
      const title = await page.title();
      console.log(`    Title: ${title}`);

    } catch (err) {
      console.log(`  FAIL: ${pageInfo.name} - ${err.message}`);
      allPassed = false;
    }

    await page.close();
  }

  await browser.close();

  if (allPassed) {
    console.log('\n=== ALL SMOKE TESTS PASSED ===');
    process.exit(0);
  } else {
    console.log('\n=== SOME SMOKE TESTS FAILED ===');
    process.exit(1);
  }
}

runSmokeTest().catch(err => {
  console.error('Smoke test error:', err);
  process.exit(1);
});