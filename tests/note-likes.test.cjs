const {test} = require('node:test');
const assert = require('node:assert/strict');
const {readFileSync} = require('node:fs');
const {DatabaseSync} = require('node:sqlite');

test('Notes reactions are shared across hosts and restricted to live notes', async (t) => {
  const {default: worker} = await import('../tools/notes-likes/worker.mjs');
  const {removeComment} = await import('../tools/notes-likes/comments.mjs');
  const db = new DatabaseSync(':memory:');
  t.after(() => db.close());
  db.exec(readFileSync('tools/notes-likes/migrations/0001_likes.sql', 'utf8'));
  db.exec(readFileSync('tools/notes-likes/migrations/0002_comments.sql', 'utf8'));
  const active = 'a'.repeat(64);
  const expired = 'b'.repeat(64);
  const missing = 'c'.repeat(64);
  const token = '1'.repeat(32);
  const second = '2'.repeat(32);
  const primary = 'https://timgong.me';
  const backup = 'https://t-g.pages.dev';
  let limited = false;
  t.mock.method(globalThis, 'fetch', async () => Response.json({[active]: null, [expired]: '2020-01-01T00:00:00Z'}));
  const env = {
    COMMENTS_OPEN: 'true',
    COMMENT_LIMIT: {limit: async () => ({success: !limited})},
    REACTION_LIMIT: {limit: async () => ({success: !limited})},
    DB: {
      prepare: (sql) => ({bind: (...args) => ({
        first: () => db.prepare(sql).get(...args),
        all: () => ({results: db.prepare(sql).all(...args)}),
        run: () => sql.startsWith('SELECT')
          ? {results: db.prepare(sql).all(...args)}
          : db.prepare(sql).run(...args)
      })}),
      batch: (statements) => {
        db.exec('BEGIN');
        try {
          const results = statements.map(statement => statement.run());
          db.exec('COMMIT');
          return results;
        } catch (error) {
          db.exec('ROLLBACK');
          throw error;
        }
      }
    }
  };
  function request(id, {origin = primary, body, method = body === undefined ? 'GET' : 'POST'} = {}) {
    return worker.fetch(new Request('https://test.workers.dev/' + id, {
      method, headers: {Origin: origin, 'Content-Type': 'application/json'},
      body: typeof body === 'string' ? body : JSON.stringify(body)
    }), env);
  }
  async function read(id, options, expected) {
    const response = await request(id, options);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('Access-Control-Allow-Origin'), options.origin || primary);
    assert.deepEqual(await response.json(), expected);
  }

  assert.equal((await request(active, {origin: 'https://foreign.example'})).status, 403);
  assert.equal((await request(active, {method: 'OPTIONS'})).status, 204);
  assert.equal((await request(missing)).status, 404);
  assert.equal((await request(expired, {body: {token, liked: true}})).status, 404);
  assert.equal((await request(active, {body: {token, liked: 1}})).status, 400);
  assert.equal((await request(active, {body: 'x'.repeat(257)})).status, 413);

  await read(active, {}, {count: 0});
  await Promise.all(Array.from({length: 5}, () => read(active, {body: {token, liked: true}}, {count: 1, liked: true})));
  await read(active, {origin: backup}, {count: 1});
  await read(active, {body: {token}}, {count: 1, liked: true});
  await read(active, {origin: backup, body: {token: second, liked: true}}, {count: 2, liked: true});
  assert.equal(db.prepare('SELECT COUNT(*) AS count FROM likes WHERE token_hash = ?').get(token).count, 0);
  limited = true;
  const rate = await request(active, {body: {token, liked: false}});
  assert.equal(rate.status, 429);
  assert.equal(rate.headers.get('Retry-After'), '60');
  limited = false;
  await read(active, {body: {token, liked: false}}, {count: 1, liked: false});
  await read(active, {body: {token, liked: false}}, {count: 1, liked: false});
  await read(active, {body: {token: second, liked: false}}, {count: 0, liked: false});
  assert.equal(db.prepare('SELECT COUNT(*) AS count FROM totals').get().count, 0);

  const path = 'comments/' + active;
  const fixture = {submission: 'a'.repeat(32), name: '  Reader ', body: 'A comment <script>alert(1)</script>'};
  assert.equal((await request('comments/' + expired, {body: fixture})).status, 404);
  assert.equal((await request(path, {body: {...fixture, website: 'bot'}})).status, 400);
  assert.equal((await request(path, {body: {...fixture, name: '   '}})).status, 400);
  assert.equal((await request(path + '?before=bad')).status, 400);
  const posted = await request(path, {body: fixture});
  assert.equal(posted.status, 201);
  const comment = await posted.json();
  assert.equal(comment.name, 'Reader');
  assert.equal(comment.body, fixture.body);
  assert.equal(comment.submission, undefined);
  assert.deepEqual(await (await request(path, {origin: backup, body: fixture})).json(), comment);
  await read(path, {origin: backup}, {comments: [comment], next: null});
  await removeComment(env.DB, comment.id);
  assert.equal((await request(path, {body: fixture})).status, 409);
  await read(path, {}, {comments: [], next: null});
  assert.equal(db.prepare('SELECT body FROM comments WHERE id = ?').get(comment.id).body, '');

});
