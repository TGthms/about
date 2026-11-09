export const maxCursor = Number.MAX_SAFE_INTEGER;
const pageSize = 20;
const fields = "id, note, name, body, posted_at";

export function cursor(value) {
  if (value === null) return maxCursor;
  const id = Number(value);
  return /^\d+$/.test(value) && Number.isSafeInteger(id) && id > 0 ? id : null;
}

export async function commentPage(db, note, before) {
  const query = `SELECT ${fields} FROM comments WHERE removed = 0 AND id < ?
    ${note ? "AND note = ?" : ""} ORDER BY id DESC LIMIT ?`;
  const args = note ? [before, note, pageSize + 1] : [before, pageSize + 1];
  const {results} = await db.prepare(query).bind(...args).all();
  const comments = results.slice(0, pageSize);
  return {comments, next: results.length > pageSize ? comments.at(-1).id : null};
}

export function commentDetails(db, id) {
  return db.prepare(`SELECT ${fields} FROM comments WHERE id = ? AND removed = 0`).bind(id).first();
}

export async function removeComment(db, id) {
  await db.prepare("UPDATE comments SET name = '', body = '', removed = 1 WHERE id = ? AND removed = 0").bind(id).run();
}

export function validateComment(data) {
  if (typeof data?.submission !== "string" || !/^[a-f0-9]{32}$/.test(data.submission) ||
      typeof data.name !== "string" || typeof data.body !== "string") return null;
  const name = data.name.trim();
  const body = data.body.trim();
  if (!name || !body || name.length > 40 || body.length > 1200 ||
      /[\x00-\x1f\x7f\u202a-\u202e\u2066-\u2069]/u.test(name) ||
      /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/u.test(body)) return null;
  return { name, body, submission: data.submission };
}

export async function postComment(db, note, comment) {
  const lookup = `SELECT ${fields}, removed FROM comments WHERE submission = ? AND note = ?`;
  const [, result] = await db.batch([
    db.prepare("INSERT INTO comments (note, submission, name, body, posted_at) VALUES (?, ?, ?, ?, ?) ON CONFLICT DO NOTHING")
      .bind(note, comment.submission, comment.name, comment.body, Date.now()),
    db.prepare(lookup).bind(comment.submission, note)
  ]);
  const row = result.results[0];
  if (!row || row.removed) return null;
  const {removed, ...publicFields} = row;
  return publicFields;
}
