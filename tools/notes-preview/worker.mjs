// Private previews are isolated from the public site and expire after three days.
const TTL = 3 * 24 * 60 * 60;
const MAX_FILE = 22 * 1024 * 1024;
const keys = new Map();
const types = { html: 'text/html; charset=utf-8', webp: 'image/webp', mp4: 'video/mp4', webm: 'video/webm', json: 'application/json',
  mp3:'audio/mpeg', m4a:'audio/mp4', ogg:'audio/ogg', wav:'audio/wav', pdf:'application/pdf', zip:'application/zip', txt:'text/plain', csv:'text/csv' };
const headers = { 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff', 'X-Robots-Tag': 'noindex, nofollow, noarchive', 'Referrer-Policy': 'no-referrer' };
const reply = (text, status = 200, extra = {}) => new Response(text, { status, headers: { ...headers, ...extra } });
const configured = env => Boolean(env.ACCESS_TEAM_DOMAIN && env.ACCESS_AUDIENCE && env.OWNER_EMAIL);

function decode(value) {
  return Uint8Array.from(atob(value.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
}

export async function verify(token, issuer, audience, fetcher = fetch) {
  if (typeof token !== 'string' || token.length > 16000) throw new Error('Invalid token');
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('Invalid token');
  const header = JSON.parse(new TextDecoder().decode(decode(parts[0])));
  const claims = JSON.parse(new TextDecoder().decode(decode(parts[1])));
  const now = Date.now() / 1000;
  if (header.alg !== 'RS256' || !header.kid || claims.iss !== issuer ||
      !(Array.isArray(claims.aud) ? claims.aud : [claims.aud]).includes(audience) ||
      !Number.isFinite(claims.exp) || claims.exp <= now || (claims.nbf && claims.nbf > now + 30) ||
      (claims.iat && claims.iat > now + 30)) throw new Error('Invalid claims');
  let jwks = keys.get(issuer);
  if (!jwks || jwks.until <= now || !jwks.value.some(k => k.kid === header.kid)) {
    const endpoint = issuer === 'https://token.actions.githubusercontent.com' ? issuer + '/.well-known/jwks' : issuer + '/cdn-cgi/access/certs';
    const response = await fetcher(endpoint);
    if (!response.ok) throw new Error('Identity service unavailable');
    const value = await response.json();
    if (!Array.isArray(value.keys)) throw new Error('Invalid identity keys');
    jwks = { value: value.keys, until: now + 300 }; keys.set(issuer, jwks);
  }
  const jwk = jwks.value.find(k => k.kid === header.kid && k.kty === 'RSA');
  if (!jwk) throw new Error('Unknown key');
  const key = await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
  if (!await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, decode(parts[2]), new TextEncoder().encode(parts[0] + '.' + parts[1]))) throw new Error('Invalid signature');
  return claims;
}

function contentPolicy(hashes = []) {
  return "default-src 'none'; base-uri 'none'; object-src 'none'; frame-ancestors 'none'; form-action 'none'; connect-src 'none'; " +
    "style-src 'unsafe-inline'; img-src 'self' data:; media-src 'self' data: https:; script-src " + (hashes.length ? hashes.join(' ') : "'none'");
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/health') return reply(JSON.stringify({ ready: configured(env) }), 200, { 'Content-Type': 'application/json' });
    if (!configured(env)) return reply('Private previews are not configured yet.', 503);
    const upload = url.pathname.match(/^\/upload\/(\d{1,20}-\d{1,4})\/([a-z0-9][a-zA-Z0-9.-]{0,180}\.(?:html|webp|mp4|webm|json|mp3|m4a|ogg|wav|pdf|zip|txt|csv))$/);
    if (upload) {
      if (request.method !== 'PUT') return reply('Method not allowed', 405);
      let claims;
      try {
        const token = request.headers.get('Authorization')?.replace(/^Bearer /, '');
        claims = await verify(token, 'https://token.actions.githubusercontent.com', env.PREVIEW_ORIGIN, env.FETCH || fetch);
      } catch { return reply('Authentication required', 401); }
      const scope = [
        ['repository', claims.repository === 'TGthms/about-notes'],
        ['branch', claims.ref === 'refs/heads/main'],
        ['workflow', claims.workflow_ref === 'TGthms/about-notes/.github/workflows/preview.yml@refs/heads/main'],
        ['event', claims.event_name === 'workflow_dispatch'],
        ['run', upload[1] === claims.run_id + '-' + claims.run_attempt]
      ];
      const mismatch = scope.find(([, matches]) => !matches);
      if (mismatch) return reply('Forbidden', 403, { 'X-Preview-Check': mismatch[0] });
      const length = Number(request.headers.get('Content-Length'));
      if (!length || length > MAX_FILE) return reply('Preview file is too large', 413);
      const bytes = await request.arrayBuffer();
      if (bytes.byteLength > MAX_FILE) return reply('Preview file is too large', 413);
      const extension = upload[2].split('.').pop();
      const metadata = { type: types[extension], expires: Date.now() + TTL * 1000, hashes: [] };
      if (extension === 'html') {
        const html = new TextDecoder().decode(bytes);
        for (const match of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)) {
          const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(match[1])));
          metadata.hashes.push("'sha256-" + btoa(String.fromCharCode(...digest)) + "'");
        }
      }
      if (upload[2] === 'index.json') {
        try {
          const data = JSON.parse(new TextDecoder().decode(bytes));
          if (!Array.isArray(data.files) || !data.files.length || data.files.length > 6 || data.files.some(f =>
            !/^[a-z0-9][a-zA-Z0-9.-]{0,180}\.html$/.test(f.name) || !['en','zh','zh-Hant','ja','ko','es'].includes(f.language))) throw new Error();
        } catch { return reply('Invalid manifest', 400); }
      }
      await env.PREVIEWS.put(upload[1] + '/' + upload[2], bytes, { expirationTtl: TTL, metadata });
      return reply('Saved', 201);
    }
    if (request.method !== 'GET' && request.method !== 'HEAD') return reply('Method not allowed', 405);
    if (!url.pathname.startsWith('/preview')) return reply('', 302, { Location: '/preview/' });
    try {
      const claims = await verify(request.headers.get('Cf-Access-Jwt-Assertion'), 'https://' + env.ACCESS_TEAM_DOMAIN, env.ACCESS_AUDIENCE, env.FETCH || fetch);
      if (typeof claims.email !== 'string' || claims.email.toLowerCase() !== env.OWNER_EMAIL.toLowerCase()) return reply('Forbidden', 403);
    } catch { return reply('Sign in through Cloudflare Access to view this private preview.', 401); }
    const route = url.pathname.match(/^\/preview\/(\d{1,20}-\d{1,4})\/(?:([a-z0-9][a-zA-Z0-9.-]{0,180}\.(?:html|webp|mp4|webm|json|mp3|m4a|ogg|wav|pdf|zip|txt|csv)))?$/);
    if (!route) return reply('Open the private preview link from your Notes action.', 200);
    const selected = route[1] + '/' + (route[2] || 'index.json');
    const file = await env.PREVIEWS.getWithMetadata(selected, { type: 'arrayBuffer' });
    if (!file.value || !file.metadata || file.metadata.expires <= Date.now()) return reply('This preview has expired. Build a new preview in Notes.', 404);
    if (!route[2]) {
      let manifest;
      try { manifest = JSON.parse(new TextDecoder().decode(file.value)); } catch { return reply('Preview unavailable', 404); }
      const names = { en: 'English', zh: '简体中文', 'zh-Hant': '繁體中文', ja: '日本語', ko: '한국어', es: 'Español' };
      const links = manifest.files.map(f => `<li><a href="${f.name}">${names[f.language]}</a></li>`).join('');
      return reply('<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Private preview — Notes</title><style>body{font:17px/1.7 system-ui;max-width:40rem;margin:8vh auto;padding:24px;color:#202629;background:#fbf9f4}a{color:#355e70}li{margin:12px 0}small{color:#626c71}@media(prefers-color-scheme:dark){body{background:#141718;color:#eee}a{color:#a0c5d2}}</style><h1>Private preview</h1><p>Choose a language.</p><ul>' + links + '</ul><small>This saved revision stays private. The preview expires after three days.</small></html>', 200, { 'Content-Type': 'text/html; charset=utf-8', 'Content-Security-Policy': contentPolicy() });
    }
    const extra = { 'Content-Type': file.metadata.type, 'Content-Security-Policy': contentPolicy(file.metadata.hashes) };
    if (['pdf','zip','txt','csv','json'].includes(route[2].split('.').pop())) extra['Content-Disposition'] = 'attachment; filename="' + route[2] + '"';
    if (file.metadata.type.startsWith('video/') || file.metadata.type.startsWith('audio/')) {
      extra['Accept-Ranges'] = 'bytes';
      const range = request.headers.get('Range')?.match(/^bytes=(\d+)-(\d*)$/);
      if (range) {
        const start = Number(range[1]), end = range[2] ? Math.min(Number(range[2]), file.value.byteLength - 1) : file.value.byteLength - 1;
        if (start > end || start >= file.value.byteLength) return reply('Range not satisfiable', 416, { 'Content-Range': 'bytes */' + file.value.byteLength });
        extra['Content-Range'] = `bytes ${start}-${end}/${file.value.byteLength}`;
        extra['Content-Length'] = String(end - start + 1);
        return reply(request.method === 'HEAD' ? null : file.value.slice(start, end + 1), 206, extra);
      }
    }
    return reply(request.method === 'HEAD' ? null : file.value, 200, extra);
  }
};
