import { getIndexNowKey } from "../_lib/indexnow.js";

export async function onRequestGet(context) {
  const expectedKey = getIndexNowKey(context.env);
  const requestedKey = String(context.params.key || "").replace(/\.txt$/i, "");

  if (!expectedKey || requestedKey !== expectedKey) {
    return new Response("Not found", {
      status: 404,
      headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" },
    });
  }

  return new Response(expectedKey, {
    status: 200,
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=86400",
      "x-content-type-options": "nosniff",
    },
  });
}
