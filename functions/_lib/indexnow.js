import { CONTENT_STATUS, buildEntryPath } from "./cms-core.js";

const DEFAULT_INDEXNOW_ENDPOINT = "https://api.indexnow.org/indexnow";
const DEFAULT_SITE_ORIGIN = "https://huameihope.com";
const INDEXNOW_KEY_PATTERN = /^[A-Za-z0-9-]{8,128}$/;

export function getIndexNowKey(env = {}) {
  const key = String(env.INDEXNOW_KEY || "").trim();
  return INDEXNOW_KEY_PATTERN.test(key) ? key : "";
}

export function buildIndexNowKeyLocation(env = {}) {
  const key = getIndexNowKey(env);
  if (!key) return "";
  return `${normalizeOrigin(env.SITE_ORIGIN)}/${key}.txt`;
}

export function collectIndexNowPaths(beforeEntry, afterEntry) {
  const paths = [];
  if (beforeEntry?.contentStatus === CONTENT_STATUS.PUBLISHED) paths.push(buildEntryPath(beforeEntry));
  if (afterEntry?.contentStatus === CONTENT_STATUS.PUBLISHED) paths.push(buildEntryPath(afterEntry));
  return [...new Set(paths)];
}

export async function notifyIndexNow(env = {}, paths = [], options = {}) {
  const key = getIndexNowKey(env);
  if (!key) return { skipped: true, reason: "INDEXNOW_KEY is not configured", urlList: [] };

  const origin = normalizeOrigin(env.SITE_ORIGIN);
  const urlList = normalizeUrlList(paths, origin);
  if (!urlList.length) return { skipped: true, reason: "No public URLs changed", urlList: [] };

  const fetchImpl = options.fetchImpl || globalThis.fetch;
  if (typeof fetchImpl !== "function") throw new Error("IndexNow fetch is unavailable");

  const response = await fetchImpl(env.INDEXNOW_ENDPOINT || DEFAULT_INDEXNOW_ENDPOINT, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json; charset=utf-8",
    },
    body: JSON.stringify({
      host: new URL(origin).hostname,
      key,
      keyLocation: buildIndexNowKeyLocation(env),
      urlList,
    }),
  });

  if (![200, 202].includes(response.status)) {
    throw new Error(`IndexNow notification failed (${response.status})`);
  }

  return { skipped: false, status: response.status, urlList };
}

export function queueIndexNowNotification(context, paths, options = {}) {
  const task = notifyIndexNow(context?.env || {}, paths, options).catch((error) => {
    console.error("IndexNow notification failed", error);
    return { skipped: true, reason: error.message, urlList: [] };
  });

  if (typeof context?.waitUntil === "function") context.waitUntil(task);
  return task;
}

function normalizeOrigin(value) {
  const candidate = String(value || DEFAULT_SITE_ORIGIN).trim();
  try {
    const url = new URL(candidate);
    if (!/^https?:$/.test(url.protocol)) return DEFAULT_SITE_ORIGIN;
    return url.origin;
  } catch {
    return DEFAULT_SITE_ORIGIN;
  }
}

function normalizeUrlList(paths, origin) {
  const hostname = new URL(origin).hostname;
  const urls = [];
  const seen = new Set();

  for (const value of Array.isArray(paths) ? paths : [paths]) {
    const raw = String(value || "").trim();
    if (!raw) continue;

    let url;
    try {
      url = new URL(raw, origin);
    } catch {
      continue;
    }
    if (!/^https?:$/.test(url.protocol) || url.hostname !== hostname) continue;

    url.protocol = "https:";
    url.hostname = hostname;
    url.port = "";
    url.hash = "";
    const normalized = url.toString();
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    urls.push(normalized);
  }

  return urls.slice(0, 10_000);
}
