/* Optional integration check: uses the manager's existing Playwright installation. */
const {chromium, expect} = require('../tools/notes-manager/node_modules/@playwright/test');
const {spawn} = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');
const assert = require('node:assert/strict');

(async () => {
  let server, browser;
  try {
    const port = await new Promise((resolve,reject) => {
      server = spawn('python3',['-u','-c',
        'from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler\ns=ThreadingHTTPServer(("127.0.0.1",0),SimpleHTTPRequestHandler)\nprint(s.server_port,flush=True)\ns.serve_forever()'],
        {cwd:path.resolve(__dirname,'../public'),stdio:['ignore','pipe','ignore']});
      server.on('error',reject);server.stdout.once('data',data=>resolve(Number(data.toString().trim())));
    });
    browser = await chromium.launch({headless:true,channel:'chrome'});
    const context = await browser.newContext();
    const page = await context.newPage(), errors=[], requests=[];
    page.on('pageerror',error=>errors.push(error.message));
    page.on('request',r=>requests.push(r.url()));
    await page.goto(`http://127.0.0.1:${port}/privacy.html`);
    const fallback = await page.locator('#legal-body').evaluate(body=>Array.from(body.querySelectorAll('section'),s=>({id:s.id,paragraphs:Array.from(s.querySelectorAll('p'),p=>p.textContent),table:s.querySelector('table')?.textContent.replace(/\s+/g,' ').trim()})));
    const nojs = await browser.newContext({javaScriptEnabled:false}), staticPage = await nojs.newPage();
    await staticPage.goto(`http://127.0.0.1:${port}/privacy.html`);
    const actual = await staticPage.locator('#legal-body').evaluate(body=>Array.from(body.querySelectorAll('section'),s=>({id:s.id,paragraphs:Array.from(s.querySelectorAll('p'),p=>p.textContent),table:s.querySelector('table')?.textContent.replace(/\s+/g,' ').trim()})));
    assert.deepEqual(actual.map(s=>({...s,table:undefined})),fallback.map(s=>({...s,table:undefined})));
    assert.equal(await staticPage.locator('.legal-storage tbody tr').count(),5);
    await nojs.close();
    for (const width of [1440,390,210]) for (const theme of ['light','dark']) for (const language of ['en','es','zh','zh-Hant','ja','ko']) {
      await page.setViewportSize({width,height:900});
      await page.evaluate(({language,theme})=>{localStorage.setItem('timg-lang',language);sessionStorage.setItem('timg-theme-session',theme);},{language,theme});
      await page.reload();
      await expect(page.locator('html')).toHaveAttribute('data-language',language);
      await expect(page.locator('html')).toHaveAttribute('data-theme',theme);
      assert.equal(await page.locator('.legal-storage tbody tr').count(),5);
      await expect(page.locator('.legal-storage tbody td').first()).toHaveCSS('border-bottom-width','1px');
      assert.equal(await page.locator('#legal-body #notes').count(),1);
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${language}/${theme}/${width} overflows`);
      if (width===390 && language==='en' && theme==='dark') await page.screenshot({path:'/tmp/about-privacy-phone.png'});
      if (width===1440 && language==='en' && theme==='light') await page.screenshot({path:'/tmp/about-privacy-desktop.png'});
    }
    for (const language of ['en','es','zh','zh-Hant','ja','ko']) {
      await page.evaluate(language=>localStorage.setItem('timg-lang',language),language);
      await page.goto(`http://127.0.0.1:${port}/terms.html`);
      const rendered=await page.locator('#legal-body').evaluate(body=>Array.from(body.querySelectorAll('section'),s=>({id:s.id,paragraphs:Array.from(s.querySelectorAll('p'),p=>p.textContent)})));
      const expected=await page.evaluate(language=>window.LEGAL_DOCUMENTS.terms[language].sections.map(s=>({id:s.id,paragraphs:s.paragraphs})),language);
      assert.deepEqual(rendered,expected);
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    }
    await page.setViewportSize({width:1440,height:1000});
    await page.evaluate(()=>{localStorage.setItem('timg-lang','en');sessionStorage.setItem('timg-theme-session','light');});
    await page.goto(`http://127.0.0.1:${port}/index.html#connect`);
    await page.locator('[data-github-card]').scrollIntoViewIfNeeded();
    await expect(page.locator('html')).not.toHaveAttribute('data-lightweight',/.*/);
    assert.deepEqual(errors,[]);
    await expect(page.locator('.github-popover')).toHaveCount(1);
    await page.locator('[data-github-card] a').focus();
    await expect(page.locator('.github-popover__meta')).toContainText('contributions in');
    await expect(page.locator('.github-popover__snapshot')).toContainText('Updated');
    assert.equal(await page.locator('.github-cal__cell').count(),119);
    await expect(page.locator('.github-popover__avatar')).toHaveJSProperty('naturalWidth',96);
    // No CJK display fonts should load before the corresponding language is selected.
    const fontStart=requests.filter(url=>url.endsWith('.woff2')).length;
    for (const language of ['zh','zh-Hant','ja','ko']) {
      await page.evaluate(language=>applyLanguage(language),language);
      await page.evaluate(()=>document.fonts.ready);
      assert.ok(await page.evaluate(()=>Array.from(document.fonts).some(font=>font.family.includes('Noto') && font.status==='loaded')));
    }
    assert.ok(requests.filter(url=>url.endsWith('.woff2')).length>fontStart);
    assert.ok(!requests.some(url=>/fonts\.googleapis|fonts\.gstatic|jogruber|api\.github|avatars\.githubusercontent/.test(url)));
    assert.deepEqual(errors,[]);
    console.log('PASS: six languages; light/dark at desktop, phone and Watch widths; no-JS fallback; local Noto fonts; first-party GitHub data and avatar; no page errors.');
    await context.close();
  } finally {if(browser)await browser.close();if(server)server.kill();}
})().catch(error=>{console.error(error);process.exitCode=1;});
