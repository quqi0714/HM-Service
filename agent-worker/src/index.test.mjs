import test from "node:test";
import assert from "node:assert/strict";
import { executeTool, handleRequest, serverCard } from "./index.js";

test("MCP server card points to the isolated read-only worker", () => {
  const card = serverCard();
  assert.equal(card.transport.type, "streamable-http");
  assert.equal(card.transport.endpoint, "https://agent.huameihope.com/mcp");
  assert.equal(card.authentication.required, false);
  assert.equal(card.capabilities.tools.listChanged, false);
});

test("MCP initialize and tools/list expose only read operations", async () => {
  const initialize = await handleRequest(
    rpcRequest({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: { protocolVersion: "2025-06-18" },
    }),
    {},
  );
  const initialized = await initialize.json();
  assert.equal(initialized.result.serverInfo.name, "huamei-public-information");

  const list = await handleRequest(rpcRequest({ jsonrpc: "2.0", id: 2, method: "tools/list" }), {});
  const body = await list.json();
  const names = body.result.tools.map((tool) => tool.name);
  assert.deepEqual(names, ["search_apartments", "get_apartment", "search_articles", "get_article"]);
  assert.doesNotMatch(names.join(" "), /create|update|delete|submit|publish|write/i);
});

test("MCP apartment search only performs a bounded GET against public data", async () => {
  let observed;
  const result = await executeTool(
    "search_apartments",
    { query: "Fremont", limit: 999 },
    {
      apiOrigin: "https://huameihope.com",
      fetchImpl: async (url, options) => {
        observed = { url, options };
        return new Response(JSON.stringify({ data: [] }), {
          headers: { "content-type": "application/json" },
        });
      },
    },
  );

  assert.deepEqual(result, { data: [] });
  assert.equal(observed.options.method, "GET");
  assert.match(observed.url, /^https:\/\/huameihope\.com\/public-data\/v1\/apartments\?/);
  assert.match(observed.url, /limit=50/);
  assert.doesNotMatch(observed.url, /\/api\//);
});

test("MCP rejects unsupported tools without invoking upstream fetch", async () => {
  let called = false;
  await assert.rejects(
    executeTool("publish_article", {}, {
      apiOrigin: "https://huameihope.com",
      fetchImpl: async () => {
        called = true;
        return new Response("{}");
      },
    }),
  );
  assert.equal(called, false);
});

function rpcRequest(payload) {
  return new Request("https://agent.huameihope.com/mcp", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
}
