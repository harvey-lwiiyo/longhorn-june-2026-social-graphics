#!/usr/bin/env node
/**
 * Longhorn July 2026 Social Graphics — PNG/JPG exporter
 * 21 frames (Posts + LinkedIn variants), bundler gallery format.
 */
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const http = require('http');

const HTML_SRC = '/root/.claude/uploads/286740be-3ba6-54bc-9bc3-369704668f91/b4c3d85c-Longhorn_July_2026_Social_Graphics_Standalone.html';
// The standalone references the logo by relative path (assets/logo/longhorn.png)
// but does not bundle it — serve the real transparent wordmark so it renders.
const LOGO_PATH = '/tmp/longhorn_clean.png';
const OUT_DIR = path.resolve(__dirname, 'graphics-export', 'july-2026');

function startServer(filePath) {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const url = req.url.split('?')[0];
      if (url === '/') {
        fs.readFile(filePath, (err, data) => {
          if (err) { res.writeHead(500); return res.end(err.message); }
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(data);
        });
      } else if (url.endsWith('/longhorn.png') || url.includes('logo')) {
        // Satisfy the design's relative logo reference
        fs.readFile(LOGO_PATH, (err, data) => {
          if (err) { res.writeHead(404); return res.end('no logo'); }
          res.writeHead(200, { 'Content-Type': 'image/png' });
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

  // Hide bundler overlays at the CSS level so they never appear in a capture,
  // even if the error handler re-creates the div mid-render.
  await page.addStyleTag({ content: '#__bundler_err,#__bundler_loading,#__bundler_thumbnail{display:none!important;visibility:hidden!important;}' }).catch(() => {});

  console.log('Loading design…');
  await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'networkidle', timeout: 60000 });
  await page.addStyleTag({ content: '#__bundler_err,#__bundler_loading,#__bundler_thumbnail{display:none!important;visibility:hidden!important;}' }).catch(() => {});
  await page.waitForFunction(() => document.querySelectorAll('.frame[data-screen-label]').length > 0, { timeout: 30000 });

  const count = await page.evaluate(() => document.querySelectorAll('.frame[data-screen-label]').length);
  console.log(`Found ${count} frames. Rendering at native scale…`);

  // Force all stages to native scale (frame defines its own size)
  await page.evaluate(() => {
    document.querySelectorAll('.stage').forEach(el => {
      el.style.setProperty('--s', '1');
      el.style.width = 'auto';
      el.style.height = 'auto';
      el.style.borderRadius = '0';
    });
    document.querySelectorAll('.frame').forEach(el => { el.style.transform = 'none'; });
  });

  // Remove the bundler's loading + error overlays (they paint over frames)
  await page.evaluate(() => {
    ['__bundler_err', '__bundler_loading', '__bundler_thumbnail'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.remove();
    });
    // Neutralize the global error handler so late image errors don't re-add the overlay
    window.onerror = null;
  });

  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1500);

  // Final sweep in case the overlay was re-created during font/image settle
  await page.evaluate(() => {
    const e = document.getElementById('__bundler_err');
    if (e) e.remove();
  });

  console.log('Capturing…\n');
  let n = 0;
  for (let i = 0; i < count; i++) {
    const label = await page.evaluate(idx =>
      document.querySelectorAll('.frame[data-screen-label]')[idx].getAttribute('data-screen-label'), i);
    const handle = await page.evaluateHandle(idx =>
      document.querySelectorAll('.frame[data-screen-label]')[idx], i);
    const el = handle.asElement();
    await el.scrollIntoViewIfNeeded();
    await page.waitForTimeout(150);

    // Clip to an exact 1080×1080 region anchored at the frame's top-left,
    // so sub-pixel layout never yields a 1081px-tall capture.
    const box = await el.boundingBox();
    const clip = { x: Math.round(box.x), y: Math.round(box.y), width: 1080, height: 1080 };

    const name = `${String(i + 1).padStart(2, '0')}-${slug(label)}`;
    const pngBuf = await page.screenshot({ type: 'png', clip });
    fs.writeFileSync(path.join(OUT_DIR, `${name}.png`), pngBuf);
    const jpgBuf = await page.screenshot({ type: 'jpeg', quality: 95, clip });
    fs.writeFileSync(path.join(OUT_DIR, `${name}.jpg`), jpgBuf);

    console.log(`  ✓ ${label.padEnd(20)} → ${name}  ${clip.width}×${clip.height}  (${(pngBuf.length/1024).toFixed(0)}/${(jpgBuf.length/1024).toFixed(0)} KB)`);
    n++;
  }

  await browser.close();
  server.close();
  console.log(`\nExported ${n} frames (PNG + JPG) to ${OUT_DIR}/`);
}

main().catch(err => { console.error(err); process.exit(1); });
