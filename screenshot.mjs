import { chromium } from 'playwright';

const url = process.argv[2] || 'http://localhost:4203';
const out = process.argv[3] || '/tmp/mc-dashboard.png';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
await page.goto(url, { waitUntil: 'networkidle' });
// Wait for canvas to render
await page.waitForTimeout(3000);
await page.screenshot({ path: out, fullPage: false });
await browser.close();
console.log(`Screenshot saved to ${out}`);
