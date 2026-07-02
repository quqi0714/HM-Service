import { notFoundResponse } from "../_lib/http.js";

export async function onRequestGet(context) {
  if (!context.env.HM_CMS_ASSETS) return notFoundResponse("Asset bucket is not configured");

  const key = normalizeKey(context.params.key);
  if (!key) return notFoundResponse("Asset not found");

  const object = await context.env.HM_CMS_ASSETS.get(key);
  if (!object) return notFoundResponse("Asset not found");

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  headers.set("cache-control", "public, max-age=31536000, immutable");

  return new Response(object.body, { headers });
}

function normalizeKey(value) {
  const key = Array.isArray(value) ? value.join("/") : String(value || "");
  if (!key || key.includes("..") || key.startsWith("/")) return "";
  return key;
}
