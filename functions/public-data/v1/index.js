import { PUBLIC_API_NAME, PUBLIC_API_VERSION, publicJsonResponse } from "../../_lib/public-api.js";

export function onRequestGet(context) {
  const origin = new URL(context.request.url).origin;
  return publicJsonResponse({
    name: PUBLIC_API_NAME,
    version: PUBLIC_API_VERSION,
    readOnly: true,
    documentation: `${origin}/openapi.json`,
    endpoints: {
      status: `${origin}/public-data/v1/status`,
      apartments: `${origin}/public-data/v1/apartments`,
      articles: `${origin}/public-data/v1/articles`,
    },
  });
}
