#!/usr/bin/env node
/**
 * LHA Airtel Dividend Commentary — PNG/JPG exporter
 *
 * Loads the self-contained HTML design in Playwright at native
 * 1080×1350 resolution and screenshots to PNG + JPG.
 */

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const http = require('http');

const HTML_SRC = '/tmp/design-extract/june-longhorn/project/LHA Airtel Dividend Commentary.html';
const OUT_DIR = path.resolve(__dirname, 'graphics-export');

function startServer(filePath) {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      if (req.url === '/') {
        fs.readFile(filePath, (err, data) => {
          if (err) { res.writeHead(500); return res.end(err.message); }
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(data);
        });
      } else {
        res.writeHead(404);
        res.end('Not found');
      }
    });
    server.listen(0, '127.0.0.1', () => {
      resolve({ server, port: server.address().port });
    });
  });
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  console.log('Starting HTTP server…');
  const { server, port } = await startServer(HTML_SRC);

  console.log('Launching headless browser…');
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  // Set viewport large enough to fit 1080×1350 at scale(1)
  const ctx = await browser.newContext({
    viewport: { width: 1200, height: 1500 },
    deviceScaleFactor: 1,
  });
  const page = await ctx.newPage();

  page.on('pageerror', err => console.error('[page error]', err.message.slice(0, 200)));

  console.log('Loading design…');
  await page.goto(`http://127.0.0.1:${port}/`, {
    waitUntil: 'networkidle',
    timeout: 60000,
  });

  // Force stage to render at native 1080×1350 (no viewport scaling)
  await page.evaluate(() => {
    const stage = document.getElementById('stage');
    stage.style.transform = 'scale(1)';
  });

  // Wait for fonts and images to fully load
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(2000);

  // Verify images loaded
  const imgStatus = await page.evaluate(() => {
    const imgs = document.querySelectorAll('img');
    return Array.from(imgs).map(img => ({
      alt: img.alt,
      complete: img.complete,
      naturalWidth: img.naturalWidth,
      naturalHeight: img.naturalHeight,
    }));
  });
  console.log('Image status:', JSON.stringify(imgStatus));

  // Screenshot the .card element at its exact 1080×1350 size
  const cardEl = await page.$('.card');

  // PNG — lossless, highest quality
  const pngPath = path.join(OUT_DIR, 'lha-airtel-dividend-commentary.png');
  const pngBuf = await cardEl.screenshot({ type: 'png' });
  fs.writeFileSync(pngPath, pngBuf);
  console.log(`\n  PNG: ${pngPath} (${(pngBuf.length / 1024).toFixed(0)} KB)`);

  // JPG — high quality for social upload
  const jpgPath = path.join(OUT_DIR, 'lha-airtel-dividend-commentary.jpg');
  const jpgBuf = await cardEl.screenshot({ type: 'jpeg', quality: 95 });
  fs.writeFileSync(jpgPath, jpgBuf);
  console.log(`  JPG: ${jpgPath} (${(jpgBuf.length / 1024).toFixed(0)} KB)`);

  // Verify dimensions
  const dims = await page.evaluate(() => {
    const card = document.querySelector('.card');
    const rect = card.getBoundingClientRect();
    return { width: Math.round(rect.width), height: Math.round(rect.height) };
  });
  console.log(`\n  Dimensions: ${dims.width}×${dims.height}`);

  await browser.close();
  server.close();

  console.log('\nDone!');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
