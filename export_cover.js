#!/usr/bin/env node
/**
 * Longhorn Cover Image — PNG/JPG exporter
 * Single 1920×1080 landscape cover/banner, bundler format. Target: .canvas
 */
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const http = require('http');

const HTML_SRC = '/root/.claude/uploads/286740be-3ba6-54bc-9bc3-369704668f91/b76d7014-Longhorn_Cover_Image_Standalone.html';
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
      } else { res.writeHead(404); res.end('Not found'); }
    });
    server.listen(0, '127.0.0.1', () => resolve({ server, port: server.address().port }));
  });
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  console.log('Starting HTTP server…');
  const { server, port } = await startServer(HTML_SRC);

  console.log('Launching headless browser…');
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 1980, height: 1140 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  page.on('pageerror', err => console.error('[page error]', err.message.slice(0, 200)));

  console.log('Loading design…');
  await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'networkidle', timeout: 60000 });

  await page.waitForFunction(() => document.querySelector('.canvas') !== null, { timeout: 30000 });

  // Force native 1920×1080 (no scaling)
  await page.evaluate(() => {
    const stage = document.getElementById('stage');
    if (stage) stage.style.transform = 'scale(1)';
  });

  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(2000);

  const imgStatus = await page.evaluate(() =>
    Array.from(document.querySelectorAll('.canvas img')).map(img => ({
      alt: img.alt || '(photo)', complete: img.complete, w: img.naturalWidth, h: img.naturalHeight })));
  console.log('Images:', JSON.stringify(imgStatus));

  const el = await page.$('.canvas');

  const pngPath = path.join(OUT_DIR, 'longhorn-cover-image.png');
  const pngBuf = await el.screenshot({ type: 'png' });
  fs.writeFileSync(pngPath, pngBuf);
  console.log(`\n  PNG: ${pngPath} (${(pngBuf.length/1024).toFixed(0)} KB)`);

  const jpgPath = path.join(OUT_DIR, 'longhorn-cover-image.jpg');
  const jpgBuf = await el.screenshot({ type: 'jpeg', quality: 95 });
  fs.writeFileSync(jpgPath, jpgBuf);
  console.log(`  JPG: ${jpgPath} (${(jpgBuf.length/1024).toFixed(0)} KB)`);

  const dims = await page.evaluate(() => {
    const r = document.querySelector('.canvas').getBoundingClientRect();
    return { w: Math.round(r.width), h: Math.round(r.height) };
  });
  console.log(`\n  Dimensions: ${dims.w}×${dims.h}`);

  await browser.close();
  server.close();
  console.log('\nDone!');
}

main().catch(err => { console.error(err); process.exit(1); });
