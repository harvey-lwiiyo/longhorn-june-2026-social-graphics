#!/usr/bin/env node
/**
 * LHA Dividend In Real Numbers — PNG/JPG exporter
 *
 * Renders the self-contained HTML design at native 1080×1350
 * via Playwright and exports PNG + JPG for social media.
 */

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const http = require('http');

const PROJECT_DIR = path.resolve(__dirname, 'project');
const OUT_DIR = path.resolve(__dirname, 'graphics-export');

function startServer(rootDir) {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const safePath = decodeURIComponent(req.url).replace(/\.\./g, '');
      const filePath = path.join(rootDir, safePath === '/' ? '/lha-dividend-render.html' : safePath);
      fs.readFile(filePath, (err, data) => {
        if (err) { res.writeHead(404); return res.end('Not found'); }
        const ext = path.extname(filePath).toLowerCase();
        const mimes = {
          '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript',
          '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml',
          '.woff': 'font/woff', '.woff2': 'font/woff2',
        };
        res.writeHead(200, { 'Content-Type': mimes[ext] || 'application/octet-stream' });
        res.end(data);
      });
    });
    server.listen(0, '127.0.0.1', () => {
      resolve({ server, port: server.address().port });
    });
  });
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  console.log('Starting HTTP server…');
  const { server, port } = await startServer(PROJECT_DIR);

  console.log('Launching headless browser…');
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

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

  // Force stage to native 1080×1350 (bypass viewport scaling)
  await page.evaluate(() => {
    document.getElementById('stage').style.transform = 'scale(1)';
  });

  // Wait for fonts + images
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1500);

  // Verify images loaded
  const imgStatus = await page.evaluate(() => {
    const imgs = document.querySelectorAll('img');
    return Array.from(imgs).map(img => ({
      alt: img.alt,
      complete: img.complete,
      w: img.naturalWidth,
      h: img.naturalHeight,
    }));
  });
  console.log('Images:', JSON.stringify(imgStatus));

  // Screenshot the .card element
  const cardEl = await page.$('.card');

  const pngPath = path.join(OUT_DIR, 'lha-dividend-real-numbers.png');
  const pngBuf = await cardEl.screenshot({ type: 'png' });
  fs.writeFileSync(pngPath, pngBuf);
  console.log(`\n  PNG: ${pngPath} (${(pngBuf.length / 1024).toFixed(0)} KB)`);

  const jpgPath = path.join(OUT_DIR, 'lha-dividend-real-numbers.jpg');
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
