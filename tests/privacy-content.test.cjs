const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const crypto = require('node:crypto');
const path = require('node:path');

function documents() {
  const context = {window:{}};
  for (const kind of ['privacy','terms']) vm.runInNewContext(fs.readFileSync('public/js/legal/'+kind+'-content.js','utf8'),context);
  return context.window.LEGAL_DOCUMENTS;
}

test('every legal translation includes current sections and complete storage semantics', () => {
  const docs = documents(), languages = ['en','es','zh','zh-Hant','ja','ko'];
  for (const kind of ['privacy','terms']) for (const lang of languages) {
    const doc = docs[kind][lang];
    assert.deepEqual(Array.from(doc.sections,s=>s.id),Array.from(docs[kind].en.sections,s=>s.id));
    assert.equal(new Set(doc.sections.map(s=>s.id)).size,doc.sections.length);
    for (const section of doc.sections) {
      assert.ok(section.title && section.paragraphs.length);
      assert.equal(section.paragraphs.length,docs[kind].en.sections.find(s=>s.id===section.id).paragraphs.length);
    }
    assert.match(doc.updated,/2026/);
    if (kind === 'privacy') {
      const table=doc.sections.find(s=>s.id==='cookies').table;
      assert.ok(table.caption); assert.equal(table.headers.length,3);assert.equal(table.rows.length,6);
      table.rows.forEach(row=>{assert.equal(row.length,3);row.forEach(cell=>assert.ok(cell.trim()));});
      assert.ok(doc.sections.find(s=>s.id==='notes'));
    }
  }
  assert.doesNotMatch(JSON.stringify(docs.privacy),/jogruber|fonts\.googleapis|18 MB|19.4MB|continued use.*acknowledgment/i);
});

test('language font subsets are complete, licensed, unmodified and exclusively first-party', () => {
  const base='public/assets/fonts/noto', manifest=JSON.parse(fs.readFileSync(base+'/manifest.json'));
  for (const key of ['SC','TC','JP','KR']) {
    const css=fs.readFileSync(base+'/'+key.toLowerCase()+'.css','utf8');
    assert.match(css,/unicode-range:/); assert.match(css,/font-weight: 400 700/);
    assert.doesNotMatch(css,/https?:\/\//);
    for(const match of css.matchAll(/url\(([^)]+)\)/g)) assert.ok(manifest.files[match[1]],'manifest covers '+match[1]);
    for(const family of ['sans','serif']) assert.match(fs.readFileSync(base+'/noto'+family+key.toLowerCase()+'-OFL.txt','utf8'),/SIL OPEN FONT LICENSE/);
  }
  for (const [name,record] of Object.entries(manifest.files)) {
    assert.equal(path.basename(name),name);
    const bytes=fs.readFileSync(base+'/'+name);
    assert.equal(bytes.subarray(0,4).toString(),'wOF2');assert.equal(bytes.length,record.bytes);
    assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),record.sha256);
  }
  assert.doesNotMatch(fs.readFileSync('public/js/i18n/language.js','utf8'),/fonts\.googleapis|fonts\.gstatic/);
});

test('public GitHub preview has no visitor-side third-party data or avatar dependency', () => {
  const source=fs.readFileSync('public/js/github-card.js','utf8');
  assert.doesNotMatch(source,/jogruber|api\.github\.com|avatars\.githubusercontent|PROFILE_URL \+ "\.png/);
  const data=JSON.parse(fs.readFileSync('public/assets/github/contributions.json'));
  assert.equal(data.days.length,119);assert.equal(data.avatarUrl,'assets/github/avatar.webp');
  assert.ok(fs.existsSync('public/'+data.avatarUrl));assert.ok(Number.isInteger(data.total));
});
