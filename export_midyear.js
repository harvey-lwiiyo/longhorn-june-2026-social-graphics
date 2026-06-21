#!/usr/bin/env node
/**
 * Longhorn Mid-Year Reset Week — PNG exporter
 * 8 frames (Launch + Post 01–07), each 1080×1080, bundler format.
 */
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const http = require('http');

const HTML_SRC = '/root/.claude/uploads/286740be-3ba6-54bc-9bc3-369704668f91/8378ca7d-Longhorn_MidYear_Reset_Week_Standalone.html';
const OUT_DIR = path.resolve(__dirname, 'graphics-export', 'midyear-reset');

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

const slug = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  console.log('Starting HTTP server…');
  const { server, port } = await startServer(HTML_SRC);

  console.log('Launching headless browser…');
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 1200, height: 1200 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  page.on('pageerror', err => console.error('[page error]', err.message.slice(0, 200)));

  console.log('Loading design…');
  await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'networkidle', timeout: 60000 });

  await page.waitForFunction(
    () => document.querySelectorAll('.frame[data-screen-label]').length > 0, { timeout: 30000 });

  const count = await page.evaluate(() => document.querySelectorAll('.frame[data-screen-label]').length);
  console.log(`Found ${count} frames. Rendering at native 1080×1080…`);

  // Force all stages to native scale
  await page.evaluate(() => {
    document.querySelectorAll('.stage').forEach(el => {
      el.style.setProperty('--s', '1');
      el.style.width = '1080px';
      el.style.height = '1080px';
    });
  });

  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1500);

  console.log('Capturing…\n');
  let n = 0;
  for (let i = 0; i < count; i++) {
    const label = await page.evaluate(idx =>
      document.querySelectorAll('.frame[data-screen-label]')[idx].getAttribute('data-screen-label'), i);
    const handle = await page.evaluateHandle(idx =>
      document.querySelectorAll('.frame[data-screen-label]')[idx], i);
    const el = handle.asElement();
    await el.scrollIntoViewIfNeeded();
    await page.waitForTimeout(200);

    const name = `${String(i).padStart(2, '0')}-${slug(label)}`;
    const pngBuf = await el.screenshot({ type: 'png' });
    fs.writeFileSync(path.join(OUT_DIR, `${name}.png`), pngBuf);
    const jpgBuf = await el.screenshot({ type: 'jpeg', quality: 95 });
    fs.writeFileSync(path.join(OUT_DIR, `${name}.jpg`), jpgBuf);

    console.log(`  ✓ ${label.padEnd(9)} → ${name}.{png,jpg}  (${(pngBuf.length/1024).toFixed(0)}/${(jpgBuf.length/1024).toFixed(0)} KB)`);
    n++;
  }

  await browser.close();
  server.close();
  console.log(`\nExported ${n} frames (PNG + JPG) to ${OUT_DIR}/`);
}

main().catch(err => { console.error(err); process.exit(1); });
