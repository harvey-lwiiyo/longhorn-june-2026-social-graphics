#!/usr/bin/env node
/**
 * LHA Father's Day — PNG/JPG exporter
 *
 * The HTML is a self-contained "bundler" file: assets live base64 in a
 * manifest and a startup script decodes them into blob URLs, replacing
 * the DOM. We serve it over HTTP, let the bundler run, force the stage
 * to native 1080×1080, and screenshot the .card.
 */

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const http = require('http');

const HTML_SRC = '/root/.claude/uploads/286740be-3ba6-54bc-9bc3-369704668f91/e2c3b3f1-LHA_Fathers_Day_Standalone.html';
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
    server.listen(0, '127.0.0.1', () => resolve({ server, port: server.address().port }));
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
  const ctx = await browser.newContext({
    viewport: { width: 1200, height: 1200 },
    deviceScaleFactor: 1,
  });
  const page = await ctx.newPage();
  page.on('pageerror', err => console.error('[page error]', err.message.slice(0, 200)));

  console.log('Loading design…');
  await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'networkidle', timeout: 60000 });

  // Wait for the bundler to unpack and render the card
  await page.waitForFunction(
    () => document.querySelector('.card[data-screen-label]') !== null,
    { timeout: 30000 }
  );

  // Force native 1080×1080 (defeat viewport down-scaling)
  await page.evaluate(() => {
    const stage = document.getElementById('stage');
    if (stage) stage.style.transform = 'scale(1)';
  });

  // Let fonts + decoded blob images settle
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(2000);

  const imgStatus = await page.evaluate(() =>
    Array.from(document.querySelectorAll('.card img')).map(img => ({
      alt: img.alt, complete: img.complete, w: img.naturalWidth, h: img.naturalHeight,
    }))
  );
  console.log('Images:', JSON.stringify(imgStatus));

  const cardEl = await page.$('.card');

  const pngPath = path.join(OUT_DIR, 'lha-fathers-day.png');
  const pngBuf = await cardEl.screenshot({ type: 'png' });
  fs.writeFileSync(pngPath, pngBuf);
  console.log(`\n  PNG: ${pngPath} (${(pngBuf.length / 1024).toFixed(0)} KB)`);

  const jpgPath = path.join(OUT_DIR, 'lha-fathers-day.jpg');
  const jpgBuf = await cardEl.screenshot({ type: 'jpeg', quality: 95 });
  fs.writeFileSync(jpgPath, jpgBuf);
  console.log(`  JPG: ${jpgPath} (${(jpgBuf.length / 1024).toFixed(0)} KB)`);

  const dims = await page.evaluate(() => {
    const r = document.querySelector('.card').getBoundingClientRect();
    return { w: Math.round(r.width), h: Math.round(r.height) };
  });
  console.log(`\n  Dimensions: ${dims.w}×${dims.h}`);

  await browser.close();
  server.close();
  console.log('\nDone!');
}

main().catch(err => { console.error(err); process.exit(1); });
