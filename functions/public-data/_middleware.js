const PUBLIC_CACHE_CONTROL = "public, max-age=60, s-maxage=300, stale-while-revalidate=600";

export async function onRequest(context) {
  if (context.request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders(),
    });
  }

  const response = await context.next();
  const headers = new Headers(response.headers);
  for (const [name, value] of Object.entries(corsHeaders())) headers.set(name, value);
  headers.set("x-content-type-options", "nosniff");
  if (context.request.method === "GET" && response.status >= 200 && response.status < 300) {
    headers.set("cache-control", PUBLIC_CACHE_CONTROL);
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function corsHeaders() {
  return {
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET, HEAD, OPTIONS",
    "access-control-allow-headers": "Accept, Content-Type",
    "access-control-max-age": "86400",
  };
}
