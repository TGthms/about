const origins = new Set(["https://timgong.me", "https://t-g.pages.dev"]);
const manifestUrl = "https://t-g.pages.dev/notes/reactions.json";
const notePattern = /^[a-f0-9]{64}$/;
const tokenPattern = /^[a-f0-9]{32}$/;
const countSql = "SELECT COALESCE((SELECT count FROM totals WHERE note = ?), 0) AS count";
const stateSql = countSql + ", EXISTS(SELECT 1 FROM likes WHERE note = ? AND token_hash = ?) AS liked";
let manifest;
let refreshAt = 0;

async function published(note) {
  if (Date.now() >= refreshAt) {
    const response = await fetch(manifestUrl, { redirect: "error", cf: { cacheTtl: 30, cacheEverything: true } });
    if (!response.ok) throw new Error("Publication list unavailable");
    manifest = await response.json();
    refreshAt = Date.now() + 30_000;
  }
  if (!Object.hasOwn(manifest, note)) return false;
  const expiry = manifest[note];
  return expiry === null || Date.parse(expiry) > Date.now();
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin");
    const headers = { "Cache-Control": "no-store", Vary: "Origin" };
    if (!origins.has(origin)) return new Response(null, { status: 403, headers });
    headers["Access-Control-Allow-Origin"] = origin;
    const reply = (body, status = 200) => Response.json(body, { status, headers });
    const { pathname } = new URL(request.url);
    const note = pathname.slice(1);
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
        return reply(await env.DB.prepare(countSql).bind(note).first());
      }

      if (!/^application\/json(?:\s*;|$)/i.test(request.headers.get("Content-Type") || "")) {
        return reply({ error: "content_type" }, 415);
      }
      const ip = request.headers.get("CF-Connecting-IP") || "unknown";
      if (!(await env.REACTION_LIMIT.limit({ key: ip })).success) {
        headers["Retry-After"] = "60";
        return reply({ error: "rate_limit" }, 429);
      }
      // Cap the stream itself so a missing or inaccurate Content-Length cannot bypass the limit.
      const reader = request.body?.getReader();
      if (!reader) return reply({ error: "invalid_body" }, 400);
      const buffer = new Uint8Array(256);
      let size = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (size + value.length > buffer.length) {
          await reader.cancel();
          return reply({ error: "invalid_body" }, 413);
        }
        buffer.set(value, size);
        size += value.length;
      }
      let body;
      try { body = JSON.parse(new TextDecoder().decode(buffer.subarray(0, size))); }
      catch { return reply({ error: "invalid_body" }, 400); }
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
    } catch {
      return reply({ error: "unavailable" }, 503);
    }
  }
};
