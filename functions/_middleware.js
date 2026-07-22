const CANONICAL_HOST = "huameihope.com";
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

  return context.next();
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
