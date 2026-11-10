const assert = require('node:assert/strict');
const { createReadStream, statSync } = require('node:fs');
const { createServer } = require('node:http');
const { extname, resolve, sep } = require('node:path');
const { webkit, expect } = require('../tools/notes-manager/node_modules/@playwright/test');

const root = resolve(__dirname, '../public');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.webp': 'image/webp', '.woff2': 'font/woff2', '.json': 'application/json' };
const server = createServer((request, response) => {
  const pathname = new URL(request.url, 'http://localhost').pathname;
  const file = resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
  try {
    if (!file.startsWith(root + sep) || !statSync(file).isFile()) throw new Error('Missing asset');
    response.setHeader('Content-Type', types[extname(file)] || 'application/octet-stream');
    createReadStream(file).pipe(response);
  } catch (_) {
    response.writeHead(404).end();
  }
});

async function main() {
  await new Promise((resolve, reject) => server.once('error', reject).listen(0, '127.0.0.1', resolve));
  const origin = 'http://127.0.0.1:' + server.address().port;
  const browser = await webkit.launch();
  try {
    for (const width of [210, 390, 1440]) {
      const size = {width, height: width === 210 ? 260 : 844};
      const page = await browser.newPage({viewport:size, screen:size, isMobile:width < 500, hasTouch:width < 500, locale:"en-US"});
      await page.clock.setFixedTime(new Date("2026-11-09T12:00:00Z"));
      const scripts = [], errors = [], media = [];
      page.on('pageerror', error => errors.push(error.message));
      page.on('request', request => {
        const path = new URL(request.url()).pathname;
        if (request.resourceType() === 'script') scripts.push(path);
        if (path.includes('/assets/erhu/')) media.push(path);
      });
      let blockHistory = width === 210;
      await page.route('**/*', route => {
        const url = new URL(route.request().url());
        if (url.origin !== origin || url.pathname.endsWith('.mp4')) return route.abort();
        if (blockHistory && url.pathname.endsWith('/site-history-content.js')) {
          blockHistory = false;
          return route.abort();
        }
        return route.continue();
      });
      await page.goto(origin, {waitUntil:'load'});
      await expect(page.locator('html')).toHaveAttribute('data-language', 'en');
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), width);
      assert.equal(await page.locator('html').getAttribute('data-lightweight') !== null, width === 210);
      assert.ok(!scripts.some(path => /\/(?:rally|site-history)[-.]/.test(path)));
      if (width === 210) assert.ok(scripts.length <= 30, 'Watch-sized homepage requests at most 30 scripts');

      await page.locator('#erhu-wiki-open').scrollIntoViewIfNeeded();
      if (width === 210) {
        await page.locator('#erhu-wiki-open').click();
        await expect(page.locator('#erhu-wiki-modal')).toBeVisible();
        await page.keyboard.press('Escape');
        await expect(page.locator('#erhu-wiki-modal')).toBeHidden();
        assert.ok(!media.some(path => path.endsWith('.mp4')));
      } else {
        await expect.poll(() => media.some(path => path.endsWith('performance-poster.webp'))).toBe(true);
        assert.ok(!media.some(path => path.endsWith('.mp4')), 'scrolling must not download video');
      }

      const history = page.locator('#site-history-open');
      await history.click();
      if (width === 210) {
        await expect(page.locator('#site-history-open-status')).toContainText('Try again');
        await history.click();
      }
      await expect(page.locator('#site-history-modal')).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(history).toBeFocused();
      await page.locator('#rally-open').click();
      await expect(page.locator('#rally-modal')).toBeVisible();
      await expect(page.locator('#rally-serve')).toBeFocused();
      await page.keyboard.press('Escape');
      await expect(page.locator('#rally-modal')).toBeHidden();
      if (width === 210) {
        await page.goto(origin + '/notes.html');
        await expect(page.locator('main h1')).toHaveText('Notes');
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), width);
        assert.ok(!media.some(path => path.endsWith('.mp4')));
      }
      assert.deepEqual(errors, []);
      await page.close();
    }
    console.log('Homepage loading and optional dialogs passed in desktop, phone, and Watch-sized WebKit.');
  } finally {
    await browser.close();
  }
}

main().catch(error => { console.error(error); process.exitCode = 1; })
  .finally(() => server.close());
