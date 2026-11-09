import {published} from "./publications.mjs";
import {commentPage, cursor, postComment, validateComment} from "./comments.mjs";

const origins = new Set(["https://timgong.me", "https://t-g.pages.dev"]);
const notePattern = /^[a-f0-9]{64}$/;
const tokenPattern = /^[a-f0-9]{32}$/;
const countSql = "SELECT COALESCE((SELECT count FROM totals WHERE note = ?), 0) AS count";
const stateSql = countSql + ", EXISTS(SELECT 1 FROM likes WHERE note = ? AND token_hash = ?) AS liked";
async function readBody(request, maxSize) {
  // Cap the stream so a missing or inaccurate Content-Length cannot bypass the limit.
  const reader = request.body?.getReader();
  if (!reader) return { status: 400 };
  const buffer = new Uint8Array(maxSize);
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (size + value.length > buffer.length) {
      await reader.cancel();
      return { status: 413 };
    }
    buffer.set(value, size);
    size += value.length;
  }
  try { return { body: JSON.parse(new TextDecoder().decode(buffer.subarray(0, size))) }; }
  catch { return { status: 400 }; }
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin");
    const headers = { "Cache-Control": "no-store", Vary: "Origin" };
    if (!origins.has(origin)) return new Response(null, { status: 403, headers });
    headers["Access-Control-Allow-Origin"] = origin;
    const reply = (body, status = 200) => Response.json(body, { status, headers });
    const { pathname, searchParams } = new URL(request.url);
    const commentRoute = pathname.startsWith("/comments/");
    const note = pathname.slice(commentRoute ? "/comments/".length : 1);
    if (commentRoute && env.COMMENTS_OPEN !== "true") return reply({ error: "unavailable" }, 503);
    if (!notePattern.test(note)) return reply({ error: "not_found" }, 404);
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: {
        ...headers,
        "Access-Control-Allow-Methods": "GET, POST",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Max-Age": "86400"
      } });
    }
    if (request.method !== "GET" && request.method !== "POST") return reply({ error: "method" }, 405);

    try {
      if (request.method === "GET") {
        if (!await published(note)) return reply({ error: "not_found" }, 404);
        if (!commentRoute) return reply(await env.DB.prepare(countSql).bind(note).first());
        const before = cursor(searchParams.get("before"));
        if (before === null) return reply({ error: "invalid_cursor" }, 400);
        return reply(await commentPage(env.DB, note, before));
      }

      if (!/^application\/json(?:\s*;|$)/i.test(request.headers.get("Content-Type") || "")) {
        return reply({ error: "content_type" }, 415);
      }
      const ip = request.headers.get("CF-Connecting-IP") || "unknown";
      const limit = commentRoute ? env.COMMENT_LIMIT : env.REACTION_LIMIT;
      if (!(await limit.limit({ key: ip })).success) {
        headers["Retry-After"] = "60";
        return reply({ error: "rate_limit" }, 429);
      }
      const { body, status } = await readBody(request, commentRoute ? 8192 : 256);
      if (status) return reply({ error: "invalid_body" }, status);
      if (commentRoute) {
        const comment = validateComment(body);
        if (!comment || body.website) return reply({ error: "invalid_body" }, 400);
        if (!await published(note)) return reply({ error: "not_found" }, 404);
        const saved = await postComment(env.DB, note, comment);
        return saved ? reply(saved, 201) : reply({ error: "already_removed" }, 409);
      }
      if (typeof body?.token !== "string" || !tokenPattern.test(body.token) ||
          (body.liked !== undefined && typeof body.liked !== "boolean")) {
        return reply({ error: "invalid_body" }, 400);
      }
      if (!await published(note)) return reply({ error: "not_found" }, 404);

      const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(body.token));
      const tokenHash = Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, "0")).join("");
      const state = env.DB.prepare(stateSql).bind(note, note, tokenHash);
      if (body.liked === undefined) {
        const result = await state.first();
        return reply({ count: result.count, liked: Boolean(result.liked) });
      }

      const mutation = body.liked
        ? "INSERT INTO likes (note, token_hash) VALUES (?, ?) ON CONFLICT DO NOTHING"
        : "DELETE FROM likes WHERE note = ? AND token_hash = ?";
      const [, result] = await env.DB.batch([env.DB.prepare(mutation).bind(note, tokenHash), state]);
      return reply({ count: result.results[0].count, liked: Boolean(result.results[0].liked) });
    } catch (error) {
      console.warn(error.message === "Publication list unavailable" ? "Publication list unavailable" : "Notes interaction failed");
      return reply({ error: "unavailable" }, 503);
    }
  }
};
