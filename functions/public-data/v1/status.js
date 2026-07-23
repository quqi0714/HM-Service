import { PUBLIC_API_NAME, PUBLIC_API_VERSION, publicJsonResponse } from "../../_lib/public-api.js";

export function onRequestGet() {
  return publicJsonResponse({
    status: "ok",
    service: PUBLIC_API_NAME,
    version: PUBLIC_API_VERSION,
    readOnly: true,
  });
}
