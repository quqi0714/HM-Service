export function onRequestGet() {
  return new Response(
    JSON.stringify({
      linkset: [
        {
          anchor: "https://huameihope.com/public-data/v1",
          "service-desc": [
            {
              href: "https://huameihope.com/openapi.json",
              type: "application/vnd.oai.openapi+json",
            },
          ],
          "service-doc": [
            {
              href: "https://huameihope.com/llms.txt",
              type: "text/plain",
            },
          ],
          status: [
            {
              href: "https://huameihope.com/public-data/v1/status",
              type: "application/json",
            },
          ],
        },
      ],
    }),
    {
      headers: {
        "content-type": "application/linkset+json; charset=utf-8",
        "cache-control": "public, max-age=300, s-maxage=3600",
        "access-control-allow-origin": "*",
        "x-content-type-options": "nosniff",
      },
    },
  );
}
