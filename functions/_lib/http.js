export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.name = "HttpError";
    this.status = status;
  }
}

export function jsonResponse(payload, status = 200, headers = {}) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...headers,
    },
  });
}

export function htmlResponse(html, status = 200, headers = {}) {
  return new Response(html, {
    status,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": status === 200 ? "public, max-age=120" : "no-store",
      ...headers,
    },
  });
}

export function xmlResponse(xml, status = 200) {
  return new Response(xml, {
    status,
    headers: {
      "content-type": "application/xml; charset=utf-8",
      "cache-control": "public, max-age=300",
    },
  });
}

export function notFoundResponse(message = "Not found") {
  return htmlResponse(`<!doctype html><title>404</title><h1>${message}</h1>`, 404, {
    "cache-control": "no-store",
  });
}

export function htmlErrorResponse(message = "内容暂时无法加载", status = 500) {
  return htmlResponse(
    `<!doctype html>
<html lang="zh-Hans">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(message)} | HM 华美服务中心</title>
  <style>
    body{margin:0;background:#f2ead8;color:#342b24;font-family:-apple-system,BlinkMacSystemFont,"Noto Sans SC",sans-serif;line-height:1.7}
    main{width:min(760px,calc(100% - 32px));margin:12vh auto;padding:28px;border:1px solid rgba(58,46,38,.16);border-radius:16px;background:#f8f1e2}
    h1{margin:0 0 12px;font-size:clamp(28px,5vw,44px)}
    a{color:#3a2e26;font-weight:800}
  </style>
</head>
<body>
  <main>
    <h1>${escapeHtml(message)}</h1>
    <p>页面内容正在加载或维护中，请稍后再试。也可以直接联系华美服务中心确认最新信息。</p>
    <p><a href="/#contact">联系梅老师</a> · <a href="tel:+16505768590">650-576-8590</a></p>
  </main>
</body>
</html>`,
    status,
    { "cache-control": "no-store" }
  );
}

export async function parseJsonRequest(request) {
  const contentType = request.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) throw new HttpError(415, "Expected application/json");

  try {
    return await request.json();
  } catch {
    throw new HttpError(400, "Invalid JSON body");
  }
}

export function getSiteOptions(env, request) {
  const requestUrl = new URL(request.url);
  return {
    origin: env.SITE_ORIGIN || requestUrl.origin,
    siteName: env.SITE_NAME || "HM 华美服务中心",
  };
}

export async function requireAdmin(request, env) {
  const requestUrl = new URL(request.url);

  // 生产环境禁止设置 CMS_AUTH_BYPASS；只允许本机开发地址绕过 Cloudflare Access。
  if (env.CMS_AUTH_BYPASS === "true" && isLocalHostname(requestUrl.hostname)) {
    return { email: "local-dev@huamei" };
  }

  if (!env.CF_ACCESS_TEAM_DOMAIN || !env.CF_ACCESS_AUD) {
    throw new HttpError(503, "CMS admin auth is not configured");
  }

  const allowlist = parseEmailList(env.CMS_ADMIN_EMAILS);
  if (!allowlist.length) throw new HttpError(503, "CMS_ADMIN_EMAILS 未配置");

  const token = request.headers.get("CF-Access-Jwt-Assertion");
  if (!token) throw new HttpError(401, "Cloudflare Access login required");

  const claims = await verifyCloudflareAccessJwt(token, env);
  const email = String(claims.email || request.headers.get("CF-Access-Authenticated-User-Email") || "").toLowerCase();
  if (!email) throw new HttpError(401, "Cloudflare Access email missing");

  if (!allowlist.includes(email)) throw new HttpError(403, "CMS admin is not allowed");

  return { email };
}

export function handleError(error) {
  if (error instanceof HttpError) return jsonResponse({ error: error.message }, error.status);
  console.error(error);
  return jsonResponse({ error: "Internal server error" }, 500);
}

function parseEmailList(value) {
  return String(value || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

function isLocalHostname(hostname) {
  return ["localhost", "127.0.0.1", "::1", "[::1]", ""].includes(String(hostname || ""));
}

async function verifyCloudflareAccessJwt(token, env) {
  const [headerPart, payloadPart, signaturePart] = String(token).split(".");
  if (!headerPart || !payloadPart || !signaturePart) throw new HttpError(401, "Invalid Access token");

  let header;
  let claims;
  try {
    header = JSON.parse(textFromBase64Url(headerPart));
    claims = JSON.parse(textFromBase64Url(payloadPart));
  } catch {
    throw new HttpError(401, "Invalid Access token");
  }
  if (header.alg !== "RS256" || !header.kid) throw new HttpError(401, "Unsupported Access token");

  const aud = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
  if (!aud.includes(env.CF_ACCESS_AUD)) throw new HttpError(401, "Access audience mismatch");

  const issuer = `https://${normalizeAccessDomain(env.CF_ACCESS_TEAM_DOMAIN)}`;
  if (claims.iss !== issuer) throw new HttpError(401, "Access token issuer mismatch");

  const now = Math.floor(Date.now() / 1000);
  if (claims.exp && claims.exp < now) throw new HttpError(401, "Access token expired");
  if (claims.nbf && claims.nbf > now) throw new HttpError(401, "Access token not active");

  const jwk = await fetchAccessJwk(header.kid, env.CF_ACCESS_TEAM_DOMAIN);
  const key = await crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["verify"]
  );
  const ok = await crypto.subtle.verify(
    "RSASSA-PKCS1-v1_5",
    key,
    bytesFromBase64Url(signaturePart),
    new TextEncoder().encode(`${headerPart}.${payloadPart}`)
  );
  if (!ok) throw new HttpError(401, "Invalid Access token signature");

  return claims;
}

const ACCESS_CERTS_CACHE = new Map();
const ACCESS_CERTS_CACHE_TTL_MS = 60 * 60 * 1000;

async function fetchAccessJwk(kid, teamDomain) {
  const domain = normalizeAccessDomain(teamDomain);
  const now = Date.now();
  const cached = ACCESS_CERTS_CACHE.get(domain);
  let jwks = cached && cached.expiresAt > now ? cached.jwks : null;

  if (!jwks) {
    const response = await fetch(`https://${domain}/cdn-cgi/access/certs`);
    if (!response.ok) throw new HttpError(503, "Cannot load Access public keys");
    jwks = await response.json();
    ACCESS_CERTS_CACHE.set(domain, { jwks, expiresAt: now + ACCESS_CERTS_CACHE_TTL_MS });
  }

  const jwk = jwks.keys?.find((key) => key.kid === kid);
  if (!jwk) throw new HttpError(401, "Access key not found");
  return jwk;
}

function normalizeAccessDomain(value) {
  return String(value || "")
    .replace(/^https?:\/\//i, "")
    .replace(/\/.*$/, "");
}

function textFromBase64Url(value) {
  return new TextDecoder().decode(bytesFromBase64Url(value));
}

function bytesFromBase64Url(value) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

function escapeHtml(value) {
  return String(value || "").replace(/[&<>"']/g, (char) => {
    const map = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" };
    return map[char];
  });
}
