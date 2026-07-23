const CANONICAL_HOST = "huameihope.com";
const PUBLIC_CONTENT_PATHS = new Set([
  "/",
  "/vehicle",
  "/health",
  "/love-health",
  "/privacy",
  "/terms",
  "/accessibility",
]);
const AGENT_DISCOVERY_LINKS = [
  '</llms.txt>; rel="describedby"; type="text/plain"',
  '</sitemap.xml>; rel="sitemap"; type="application/xml"',
  '</.well-known/agent-skills/index.json>; rel="describedby"; type="application/json"',
  '</.well-known/api-catalog>; rel="api-catalog"; type="application/linkset+json"',
  '</openapi.json>; rel="service-desc"; type="application/vnd.oai.openapi+json"',
  '</.well-known/mcp/server-card.json>; rel="describedby"; type="application/json"',
].join(", ");
const HTML_PAGE_ALIASES = new Map([
  ["/index.html", "/"],
  ["/vehicle.html", "/vehicle"],
  ["/health.html", "/health"],
  ["/love-health.html", "/love-health"],
  ["/privacy.html", "/privacy"],
  ["/terms.html", "/terms"],
  ["/accessibility.html", "/accessibility"],
]);

export async function onRequest(context) {
  const canonicalUrl = buildCanonicalUrl(context.request.url);
  if (canonicalUrl) {
    return new Response(null, {
      status: 301,
      headers: {
        location: canonicalUrl,
        "cache-control": "public, max-age=3600",
      },
    });
  }

  const response = await context.next();
  return enhancePublicResponse(context.request, response);
}

export function buildCanonicalUrl(requestUrl) {
  const url = new URL(requestUrl);
  let changed = false;

  if (url.hostname === `www.${CANONICAL_HOST}`) {
    url.hostname = CANONICAL_HOST;
    changed = true;
  }

  if (url.protocol === "http:" && [CANONICAL_HOST, `www.${CANONICAL_HOST}`].includes(url.hostname)) {
    url.protocol = "https:";
    changed = true;
  }

  if (url.pathname.length > 1 && url.pathname.endsWith("/")) {
    url.pathname = url.pathname.replace(/\/+$/, "");
    changed = true;
  }

  const aliasedPath = HTML_PAGE_ALIASES.get(url.pathname);
  if (aliasedPath) {
    url.pathname = aliasedPath;
    changed = true;
  }

  return changed ? url.toString() : "";
}

export async function enhancePublicResponse(request, response) {
  const url = new URL(request.url);
  if (!isPublicContentPath(url.pathname)) return response;

  const headers = new Headers(response.headers);
  appendHeaderValue(headers, "link", AGENT_DISCOVERY_LINKS);
  headers.set("content-signal", "search=yes, ai-input=yes, ai-train=yes");
  appendVary(headers, "Accept");

  if (!shouldReturnMarkdown(request, response)) {
    return cloneResponse(response, headers);
  }

  const html = await response.text();
  const markdown = htmlToMarkdown(html, url);
  headers.set("content-type", "text/markdown; charset=utf-8");
  headers.set("x-markdown-tokens", String(estimateTokenCount(markdown)));
  headers.set("x-original-tokens", String(estimateTokenCount(html)));
  for (const header of ["content-encoding", "content-length", "content-range", "etag", "last-modified", "transfer-encoding"]) {
    headers.delete(header);
  }

  return new Response(markdown, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export function isPublicContentPath(pathname) {
  if (PUBLIC_CONTENT_PATHS.has(pathname)) return true;
  return /^\/(?:blog|apartments)(?:\/[^/]+)?$/.test(pathname);
}

export function shouldReturnMarkdown(request, response) {
  if (request.method !== "GET") return false;
  if (!isPublicContentPath(new URL(request.url).pathname)) return false;
  if (!/\btext\/markdown\b/i.test(request.headers.get("accept") || "")) return false;
  return /\btext\/html\b/i.test(response.headers.get("content-type") || "");
}

export function htmlToMarkdown(html, url = new URL(`https://${CANONICAL_HOST}/`)) {
  const title = extractHtmlValue(html, /<title[^>]*>([\s\S]*?)<\/title>/i);
  const description =
    extractHtmlAttribute(html, /<meta[^>]+name=["']description["'][^>]*>/i, "content") ||
    extractHtmlAttribute(html, /<meta[^>]+property=["']og:description["'][^>]*>/i, "content");
  const jsonLdBlocks = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)]
    .map((match) => match[1].trim())
    .filter(Boolean);
  const main = extractHtmlValue(html, /<main\b[^>]*>([\s\S]*?)<\/main>/i) || extractHtmlValue(html, /<body\b[^>]*>([\s\S]*?)<\/body>/i);
  let content = main || html;

  content = content
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<(script|style|noscript|svg|dialog|form|nav|aside)\b[^>]*>[\s\S]*?<\/\1>/gi, "")
    .replace(/<img\b([^>]*)>/gi, (_match, attributes) => {
      const src = attributeValue(attributes, "src");
      const alt = decodeHtmlEntities(attributeValue(attributes, "alt")).trim();
      if (!src || !alt) return "";
      return `\n\n![${escapeMarkdownText(alt)}](${absoluteHref(src, url)})\n\n`;
    })
    .replace(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi, (_match, attributes, label) => {
      const href = attributeValue(attributes, "href");
      const text = stripHtml(label).trim();
      if (!text) return "";
      if (!href || href.startsWith("#") || /^(?:javascript|mailto|tel):/i.test(href)) return text;
      return `[${escapeMarkdownText(text)}](${absoluteHref(href, url)})`;
    })
    .replace(/<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/gi, (_match, level, value) => {
      const heading = stripHtml(value).trim();
      return heading ? `\n\n${"#".repeat(Number(level))} ${heading}\n\n` : "";
    })
    .replace(/<(strong|b)\b[^>]*>([\s\S]*?)<\/\1>/gi, "**$2**")
    .replace(/<(em|i)\b[^>]*>([\s\S]*?)<\/\1>/gi, "*$2*")
    .replace(/<blockquote\b[^>]*>([\s\S]*?)<\/blockquote>/gi, (_match, value) => {
      const quote = stripHtml(value).trim().replace(/\n+/g, "\n> ");
      return quote ? `\n\n> ${quote}\n\n` : "";
    })
    .replace(/<li\b[^>]*>([\s\S]*?)<\/li>/gi, (_match, value) => {
      const item = stripHtml(value).trim();
      return item ? `\n- ${item}` : "";
    })
    .replace(/<\/?(?:ul|ol)\b[^>]*>/gi, "\n")
    .replace(/<(?:p|section|article|header|footer|div|figure|figcaption|details|summary)\b[^>]*>/gi, "\n\n")
    .replace(/<\/(?:p|section|article|header|footer|div|figure|figcaption|details|summary)>/gi, "\n\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<(?:th|td)\b[^>]*>([\s\S]*?)<\/(?:th|td)>/gi, (_match, value) => ` ${stripHtml(value).trim()} |`)
    .replace(/<\/?tr\b[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, " ");

  content = normalizeMarkdown(decodeHtmlEntities(content));
  const frontmatter = [
    "---",
    title ? `title: "${escapeYaml(decodeHtmlEntities(stripHtml(title)).trim())}"` : "",
    description ? `description: "${escapeYaml(decodeHtmlEntities(description).trim())}"` : "",
    `url: "${url.toString()}"`,
    "---",
  ]
    .filter(Boolean)
    .join("\n");
  const structuredData = jsonLdBlocks.length
    ? `\n\n## Structured data\n\n\`\`\`json\n${jsonLdBlocks.join("\n")}\n\`\`\``
    : "";

  return `${frontmatter}\n\n${content}${structuredData}\n`;
}

function cloneResponse(response, headers) {
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function appendHeaderValue(headers, name, value) {
  const current = headers.get(name);
  if (!current) {
    headers.set(name, value);
    return;
  }
  if (!current.includes(value)) headers.set(name, `${current}, ${value}`);
}

function appendVary(headers, value) {
  const values = (headers.get("vary") || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  if (!values.some((item) => item.toLowerCase() === value.toLowerCase())) values.push(value);
  headers.set("vary", values.join(", "));
}

function extractHtmlValue(html, pattern) {
  return html.match(pattern)?.[1] || "";
}

function extractHtmlAttribute(html, tagPattern, name) {
  const tag = html.match(tagPattern)?.[0] || "";
  return attributeValue(tag, name);
}

function attributeValue(attributes, name) {
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return (
    attributes.match(new RegExp(`\\b${escapedName}\\s*=\\s*["']([^"']*)["']`, "i"))?.[1] ||
    attributes.match(new RegExp(`\\b${escapedName}\\s*=\\s*([^\\s>]+)`, "i"))?.[1] ||
    ""
  );
}

function stripHtml(value) {
  return decodeHtmlEntities(String(value || "").replace(/<[^>]+>/g, " "));
}

function absoluteHref(href, baseUrl) {
  try {
    return new URL(href, baseUrl).toString();
  } catch {
    return href;
  }
}

function normalizeMarkdown(value) {
  return value
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function decodeHtmlEntities(value) {
  const entities = {
    amp: "&",
    apos: "'",
    gt: ">",
    lt: "<",
    nbsp: " ",
    quot: '"',
  };
  return String(value || "")
    .replace(/&#(\d+);/g, (_match, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_match, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&([a-z]+);/gi, (match, name) => entities[name.toLowerCase()] ?? match);
}

function escapeYaml(value) {
  return String(value || "").replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\s+/g, " ");
}

function escapeMarkdownText(value) {
  return String(value || "").replace(/([[\]])/g, "\\$1");
}

function estimateTokenCount(value) {
  const text = String(value || "");
  const hanCharacters = (text.match(/[\u3400-\u9fff]/g) || []).length;
  const otherCharacters = text.replace(/[\u3400-\u9fff\s]/g, "").length;
  return Math.max(1, hanCharacters + Math.ceil(otherCharacters / 4));
}
