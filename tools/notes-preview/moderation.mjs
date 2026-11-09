import {commentDetails, commentPage, cursor, removeComment} from "../notes-likes/comments.mjs";
import {publications} from "../notes-likes/publications.mjs";

const path = "/preview/moderation";
const style = `
  :root{color-scheme:light dark;--bg:#fbf9f4;--ink:#212628;--muted:#59636a;--rule:#c9c8bf;--danger:#9c2342}
  @media(prefers-color-scheme:dark){:root{--bg:#171a1b;--ink:#edf0ef;--muted:#b3bdc2;--rule:#454d51;--danger:#ffa3b7}}
  body{max-width:46rem;margin:0 auto;padding:clamp(20px,6vw,60px);background:var(--bg);color:var(--ink);font:1rem/1.6 system-ui,sans-serif}
  h1{font:500 clamp(2rem,7vw,3.3rem)/1.1 Georgia,serif;margin:0 0 16px}
  p{margin:8px 0} a{color:inherit;text-underline-offset:.2em} a:hover{text-decoration-thickness:2px}
  ol{list-style:none;padding:0;margin:24px 0} li,article{border-top:1px solid var(--rule);padding:16px 0}
  .context{color:var(--muted);font-size:.86rem;overflow-wrap:anywhere} .message{white-space:pre-wrap;overflow-wrap:anywhere;unicode-bidi:plaintext}
  .actions{display:flex;gap:16px;flex-wrap:wrap;align-items:center;margin-top:12px}
  button,.button{box-sizing:border-box;display:inline-flex;align-items:center;min-height:44px;padding:6px 14px;border:1px solid var(--rule);border-radius:7px;background:transparent;color:inherit;font:inherit;text-decoration:none;cursor:pointer}
  .danger{color:var(--danger)} :focus-visible{outline:2px solid currentColor;outline-offset:3px}
`;
const escape = (value) => String(value).replace(/[&<>"']/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[char]);

function card(comment, notes) {
  const source = notes[comment.note];
  const article = source && /^notes\/[a-z0-9-]+\.html$/.test(source.path || "")
    ? `<a href="https://t-g.pages.dev/${source.path}">${escape(source.title || "Open note")}</a>`
    : `Note ${escape(comment.note.slice(0, 10))}`;
  const posted = new Date(comment.posted_at);
  return `<div class="context">${article} · <time datetime="${posted.toISOString()}">${posted.toISOString().slice(0, 16).replace("T", " ")} UTC</time></div>
    <p><strong><bdi>${escape(comment.name)}</bdi></strong></p><p class="message">${escape(comment.body)}</p>`;
}

export async function moderate(request, db, reply) {
  const url = new URL(request.url);
  if (!db) return reply("Comment moderation is unavailable.", 503);
  if (request.method === "POST") {
    if (request.headers.get("Origin") !== url.origin || request.headers.get("Sec-Fetch-Site") === "cross-site") {
      return reply("Use the signed-in moderation page to delete a comment.", 403);
    }
    if (!/^application\/x-www-form-urlencoded(?:\s*;|$)/i.test(request.headers.get("Content-Type") || "")) return reply("Invalid form.", 415);
    const form = new URLSearchParams(await request.text());
    const id = form.has("id") ? cursor(form.get("id")) : null;
    if (!id) return reply("Invalid comment.", 400);
    await removeComment(db, id);
    return reply(null, 303, {Location: path + "?removed=1"});
  }
  if (request.method !== "GET" && request.method !== "HEAD") return reply("Method not allowed.", 405);
  const page = (heading, content, status = 200) => reply(request.method === "HEAD" ? null :
    `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${heading} · Notes</title>
    <style>${style}</style><main><h1>${heading}</h1>${content}</main></html>`, status, {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'"
    });
  const selected = url.searchParams.get("delete");
  const before = cursor(selected ?? url.searchParams.get("before"));
  if (before === null) return reply("Invalid comment reference.", 400);
  const list = () => publications().catch(() => ({}));
  if (selected !== null) {
    const comment = await commentDetails(db, before);
    if (!comment) return page("Comment unavailable", `<p>This comment is already gone.</p><a href="${path}">Back to comments</a>`, 404);
    return page("Delete this comment?", `<article>${card(comment, await list())}</article>
      <p>This removes the display name and comment from the public note.</p>
      <form class="actions" method="post" action="${path}"><input type="hidden" name="id" value="${comment.id}">
      <button class="danger" type="submit">Delete comment</button><a href="${path}">Cancel</a></form>`);
  }
  const {comments, next} = await commentPage(db, null, before);
  const notes = comments.length ? await list() : {};
  const rows = comments.map(comment =>
    `<li>${card(comment, notes)}<div class="actions"><a class="button danger" href="${path}?delete=${comment.id}">Delete…</a></div></li>`).join("");
  return page("Notes comments", `
    <p class="context">Private moderation · Newest first</p>
    ${url.searchParams.get("removed") === "1" ? '<p role="status">Comment deleted.</p>' : ""}
    ${rows ? "<ol>" + rows + "</ol>" : "<p>No comments here yet.</p>"}
    ${next ? `<a class="button" href="${path}?before=${next}">Older comments →</a>` : ""}
    ${before < Number.MAX_SAFE_INTEGER ? `<p><a href="${path}">Back to newest</a></p>` : ""}`);
}
