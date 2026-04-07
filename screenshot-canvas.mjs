import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
await page.goto('http://localhost:4203', { waitUntil: 'networkidle' });
await page.waitForTimeout(3000);
const canvas = await page.$('canvas');
if (canvas) {
  await canvas.screenshot({ path: '/tmp/mc-office-crop.png' });
  console.log('Canvas screenshot saved');
} else {
  console.log('No canvas found');
  await page.screenshot({ path: '/tmp/mc-office-crop.png' });
}
await browser.close();
