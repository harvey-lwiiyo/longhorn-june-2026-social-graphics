#!/usr/bin/env node
/**
 * Longhorn June 2026 Social Graphics — PNG exporter
 *
 * Loads the bundled HTML file in Playwright, sets every stage
 * to its native 1080×1080 size, and screenshots each frame.
 * Output: graphics-export/post-01.png … post-13.png
 */

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const http = require('http');

const HTML_SRC = '/root/.claude/uploads/77cda9bc-dace-4f6c-b34e-5c4ade8de2ad/8bb2f44c-Longhorn_June_2026_Social_Graphics_Standalone.html';
const OUT_DIR = path.resolve(__dirname, 'graphics-export');

// ── Serve a single file via HTTP to avoid file:// CORS issues ────────────────
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
        res.writeHead(404); res.end('Not found');
      }
    });
    server.listen(0, '127.0.0.1', () => {
      resolve({ server, port: server.address().port });
    });
  });
}

// Slugify label: "Post 01" → "post-01"
function slugify(label) {
  return label.toLowerCase().replace(/\s+/g, '-');
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  console.log('Starting HTTP server…');
  const { server, port } = await startServer(HTML_SRC);
  const url = `http://127.0.0.1:${port}/`;

  console.log('Launching headless browser…');
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--font-render-hinting=none'],
  });

  // Large viewport so elements are within bounds; 1×DPR for exact pixel sizes
  const ctx = await browser.newContext({
    viewport: { width: 1200, height: 900 },
    deviceScaleFactor: 1,
  });
  const page = await ctx.newPage();

  page.on('pageerror', err => console.error('[page error]', err.message.slice(0, 200)));

  console.log('Loading graphics page…');
  await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });

  // Wait for the bundler to unpack assets (it replaces the DOM)
  await page.waitForFunction(
    () => document.querySelectorAll('.frame[data-screen-label]').length > 0,
    { timeout: 30000 }
  );

  // Count frames
  const frameCount = await page.evaluate(
    () => document.querySelectorAll('.frame[data-screen-label]').length
  );
  console.log(`Found ${frameCount} frames. Preparing full-resolution rendering…`);

  // Force all stages to render at native 1080×1080 (--s:1)
  await page.evaluate(() => {
    document.querySelectorAll('.stage').forEach(el => {
      el.style.setProperty('--s', '1');
      el.style.width = '1080px';
      el.style.height = '1080px';
    });
  });

  // Give the browser a moment to reflow at the new scale
  await page.waitForTimeout(800);

  // Also wait for fonts — wait until document fonts are ready
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(400);

  console.log('Capturing frames…\n');

  const exported = [];

  for (let i = 0; i < frameCount; i++) {
    const label = await page.evaluate((idx) => {
      return document.querySelectorAll('.frame[data-screen-label]')[idx]
        .getAttribute('data-screen-label');
    }, i);

    const slug = slugify(label);
    const outPath = path.join(OUT_DIR, `${slug}.png`);

    // Screenshot the element directly — Playwright clips to its bounding box
    const frameEl = await page.evaluateHandle(
      (idx) => document.querySelectorAll('.frame[data-screen-label]')[idx],
      i
    );

    await frameEl.asElement().scrollIntoViewIfNeeded();
    await page.waitForTimeout(150); // settle after scroll

    const buf = await frameEl.asElement().screenshot({ type: 'png' });
    fs.writeFileSync(outPath, buf);

    const kb = (buf.length / 1024).toFixed(0);
    console.log(`  ✓ ${label.padEnd(10)} → ${slug}.png  (${kb} KB)`);
    exported.push({ label, slug, path: outPath });
  }

  await browser.close();
  server.close();

  console.log(`\nExported ${exported.length} graphics to: ${OUT_DIR}/`);
  return exported;
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
