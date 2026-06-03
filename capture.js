#!/usr/bin/env node
/**
 * Africa Day — headless frame capture → MP4
 *
 * Renders render.html frame-by-frame using Playwright, pipes PNG frames
 * to ffmpeg, and produces africa-day.mp4 at 1080x1920 / 30fps.
 */

const { chromium } = require('playwright');
const path = require('path');
const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');

const FPS = 30;
const DURATION = 34.5;
const W = 1080;
const H = 1920;
// Viewport height = canvas height + playback bar (44px), so scale === 1.0
const VP_H = H + 44;

const PROJECT_DIR = path.resolve(__dirname, 'project');
const OUT_PATH = path.resolve(__dirname, 'africa-day.mp4');

function startServer() {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const filePath = path.join(PROJECT_DIR, req.url === '/' ? '/render.html' : req.url);
      fs.readFile(filePath, (err, data) => {
        if (err) { res.writeHead(404); return res.end('Not found'); }
        const ext = path.extname(filePath);
        const mime = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript',
                       '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml' }[ext] || 'application/octet-stream';
        res.writeHead(200, { 'Content-Type': mime });
        res.end(data);
      });
    });
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      resolve({ server, port });
    });
    server.on('error', reject);
  });
}

async function main() {
  console.log('Starting local HTTP server…');
  const { server, port } = await startServer();
  const url = `http://127.0.0.1:${port}/`;

  console.log('Launching headless browser…');
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const ctx = await browser.newContext({
    viewport: { width: W, height: VP_H },
    deviceScaleFactor: 1,
  });
  const page = await ctx.newPage();

  page.on('pageerror', err => console.error('[page error]', err.message));

  console.log('Loading animation…');
  await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });

  // Wait until React mounts and exposes the time setter
  await page.waitForFunction(() => typeof window.__setTime === 'function', { timeout: 15000 });

  // Ensure animation is paused
  await page.evaluate(() => window.__setPlaying(false));

  // Seek to t=0 so any localStorage state is cleared
  await page.evaluate(() => window.__setTime(0));
  await page.evaluate(() => new Promise(r => requestAnimationFrame(r)));

  // Start ffmpeg, reading PNG frames from stdin
  const ff = spawn('ffmpeg', [
    '-y',
    '-f', 'image2pipe',
    '-vcodec', 'png',
    '-r', String(FPS),
    '-i', 'pipe:0',
    '-vcodec', 'libx264',
    '-preset', 'fast',
    '-crf', '18',
    '-pix_fmt', 'yuv420p',
    '-movflags', '+faststart',
    OUT_PATH,
  ]);

  let ffErr = '';
  ff.stderr.on('data', d => { ffErr += d.toString(); });
  ff.on('error', err => { console.error('ffmpeg error:', err); process.exit(1); });

  const totalFrames = Math.ceil(DURATION * FPS) + 1;
  const startMs = Date.now();

  console.log(`Capturing ${totalFrames} frames at ${FPS}fps (${DURATION}s)…`);

  for (let i = 0; i < totalFrames; i++) {
    const t = i / FPS;

    // Set playhead and wait for React to flush + one rAF tick
    await page.evaluate(time => {
      window.__setTime(time);
      return new Promise(r => requestAnimationFrame(r));
    }, t);

    // Screenshot only the canvas area (clip off the playback bar)
    const buf = await page.screenshot({
      type: 'png',
      clip: { x: 0, y: 0, width: W, height: H },
    });

    // Write frame to ffmpeg's stdin
    await new Promise((res, rej) => {
      ff.stdin.write(buf, err => (err ? rej(err) : res()));
    });

    if (i % FPS === 0 || i === totalFrames - 1) {
      const elapsed = ((Date.now() - startMs) / 1000).toFixed(1);
      const pct = ((i / totalFrames) * 100).toFixed(0);
      process.stdout.write(`\r  ${pct}%  frame ${i}/${totalFrames}  t=${t.toFixed(2)}s  elapsed=${elapsed}s   `);
    }
  }

  process.stdout.write('\n');
  console.log('Frames captured. Encoding…');

  ff.stdin.end();

  const code = await new Promise(resolve => ff.on('close', resolve));

  await browser.close();
  server.close();

  if (code !== 0) {
    console.error('ffmpeg failed:\n', ffErr);
    process.exit(1);
  }

  const size = require('fs').statSync(OUT_PATH).size;
  const mb = (size / 1024 / 1024).toFixed(1);
  const total = ((Date.now() - startMs) / 1000).toFixed(1);
  console.log(`\nDone!  ${OUT_PATH}  (${mb} MB)  in ${total}s`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
