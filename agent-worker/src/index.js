const SERVER_NAME = "huamei-public-information";
const SERVER_VERSION = "1.0.0";
const DEFAULT_PROTOCOL_VERSION = "2025-06-18";
const MAX_PAGE_SIZE = 50;
const FETCH_TIMEOUT_MS = 8000;

const TOOLS = [
  {
    name: "search_apartments",
    title: "Search Huamei apartment listings",
    description:
      "Search Huamei's published apartment listings. Returns public information only; availability, rents, deadlines, and eligibility may change.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", maxLength: 100, description: "Title, city, summary, or apartment number" },
        region: { type: "string", maxLength: 30, description: "Huamei region code, such as north or south" },
        age: { type: "string", maxLength: 10, description: "Age requirement, such as 55+ or 62+" },
        room: { type: "string", maxLength: 10, description: "Room type, such as 1B, 2B, or 3B" },
        page: { type: "integer", minimum: 1, maximum: 1000, default: 1 },
        limit: { type: "integer", minimum: 1, maximum: 50, default: 20 },
      },
      additionalProperties: false,
    },
  },
  {
    name: "get_apartment",
    title: "Get a Huamei apartment listing",
    description: "Get one published Huamei apartment entry by public apartment number or slug.",
    inputSchema: {
      type: "object",
      properties: {
        identifier: { type: "string", minLength: 1, maxLength: 100 },
      },
      required: ["identifier"],
      additionalProperties: false,
    },
  },
  {
    name: "search_articles",
    title: "Search Huamei policy articles",
    description: "Search Huamei's published housing policy explanations and application guides.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", maxLength: 100 },
        page: { type: "integer", minimum: 1, maximum: 1000, default: 1 },
        limit: { type: "integer", minimum: 1, maximum: 50, default: 20 },
      },
      additionalProperties: false,
    },
  },
  {
    name: "get_article",
    title: "Get a Huamei policy article",
    description: "Get one published Huamei policy or application-guide article by slug.",
    inputSchema: {
      type: "object",
      properties: {
        slug: { type: "string", minLength: 1, maxLength: 100 },
      },
      required: ["slug"],
      additionalProperties: false,
    },
  },
];

export default {
  async fetch(request, env) {
    return handleRequest(request, env);
  },
};

export async function handleRequest(request, env = {}, options = {}) {
  const url = new URL(request.url);
  const mcpOrigin = normalizeOrigin(env.MCP_ORIGIN || url.origin);

  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders() });
  if (url.pathname === "/health" && request.method === "GET") {
    return jsonResponse({
      status: "ok",
      service: SERVER_NAME,
      version: SERVER_VERSION,
      readOnly: true,
    });
  }
  if (url.pathname === "/.well-known/mcp/server-card.json" && request.method === "GET") {
    return jsonResponse(serverCard(mcpOrigin), 200, {
      "cache-control": "public, max-age=300, s-maxage=3600",
    });
  }
  if (url.pathname !== "/mcp") return jsonResponse({ error: "Not found" }, 404);
  if (request.method !== "POST") {
    return jsonResponse({ error: "Use POST for MCP JSON-RPC requests." }, 405, { allow: "POST, OPTIONS" });
  }

  let message;
  try {
    message = await request.json();
  } catch {
    return rpcError(null, -32700, "Parse error");
  }

  if (!message || Array.isArray(message) || message.jsonrpc !== "2.0" || typeof message.method !== "string") {
    return rpcError(message?.id ?? null, -32600, "Invalid Request");
  }

  if (message.id === undefined || message.id === null) {
    return new Response(null, { status: 202, headers: corsHeaders() });
  }

  const apiOrigin = normalizeOrigin(env.API_ORIGIN || "https://huameihope.com");
  const fetchImpl = options.fetchImpl || fetch;

  try {
    if (message.method === "initialize") {
      return rpcResult(message.id, {
        protocolVersion: message.params?.protocolVersion || DEFAULT_PROTOCOL_VERSION,
        capabilities: {
          tools: { listChanged: false },
        },
        serverInfo: {
          name: SERVER_NAME,
          version: SERVER_VERSION,
        },
        instructions:
          "Read-only access to Huamei's published public information. Treat deadlines, rents, availability, and eligibility as time-sensitive and cite the returned canonical URL.",
      });
    }
    if (message.method === "ping") return rpcResult(message.id, {});
    if (message.method === "tools/list") return rpcResult(message.id, { tools: TOOLS });
    if (message.method === "tools/call") {
      const toolName = String(message.params?.name || "");
      const toolArguments = message.params?.arguments || {};
      const data = await executeTool(toolName, toolArguments, { apiOrigin, fetchImpl });
      return rpcResult(message.id, {
        content: [
          {
            type: "text",
            text: JSON.stringify(data),
          },
        ],
        structuredContent: data,
      });
    }
    return rpcError(message.id, -32601, "Method not found");
  } catch (error) {
    const status = Number(error?.status || 0);
    const messageText =
      status === 404
        ? "The requested published entry was not found."
        : "Huamei public information is temporarily unavailable.";
    return rpcError(message.id, -32000, messageText, status ? { upstreamStatus: status } : undefined);
  }
}

export async function executeTool(name, args, options) {
  validateObject(args);
  switch (name) {
    case "search_apartments": {
      assertAllowedKeys(args, ["query", "region", "age", "room", "page", "limit"]);
      const url = new URL("/public-data/v1/apartments", options.apiOrigin);
      setSearchValue(url, "query", args.query, 100);
      setSearchValue(url, "region", args.region, 30);
      setSearchValue(url, "age", args.age, 10);
      setSearchValue(url, "room", args.room, 10);
      url.searchParams.set("page", String(clampInteger(args.page, 1, 1000, 1)));
      url.searchParams.set("limit", String(clampInteger(args.limit, 1, MAX_PAGE_SIZE, 20)));
      return fetchPublicJson(url, options.fetchImpl);
    }
    case "get_apartment": {
      assertAllowedKeys(args, ["identifier"]);
      const identifier = requiredString(args.identifier, "identifier", 100);
      return fetchPublicJson(
        new URL(`/public-data/v1/apartments/${encodeURIComponent(identifier)}`, options.apiOrigin),
        options.fetchImpl,
      );
    }
    case "search_articles": {
      assertAllowedKeys(args, ["query", "page", "limit"]);
      const url = new URL("/public-data/v1/articles", options.apiOrigin);
      setSearchValue(url, "query", args.query, 100);
      url.searchParams.set("page", String(clampInteger(args.page, 1, 1000, 1)));
      url.searchParams.set("limit", String(clampInteger(args.limit, 1, MAX_PAGE_SIZE, 20)));
      return fetchPublicJson(url, options.fetchImpl);
    }
    case "get_article": {
      assertAllowedKeys(args, ["slug"]);
      const slug = requiredString(args.slug, "slug", 100);
      return fetchPublicJson(
        new URL(`/public-data/v1/articles/${encodeURIComponent(slug)}`, options.apiOrigin),
        options.fetchImpl,
      );
    }
    default:
      throw new Error("Unknown tool");
  }
}

export function serverCard(origin = "https://agent.huameihope.com") {
  return {
    serverInfo: {
      name: SERVER_NAME,
      version: SERVER_VERSION,
      description: "Read-only tools for Huamei Service Center's published apartment listings and policy articles.",
    },
    transport: {
      type: "streamable-http",
      endpoint: `${normalizeOrigin(origin)}/mcp`,
    },
    capabilities: {
      tools: { listChanged: false },
      resources: {},
      prompts: {},
    },
    authentication: {
      required: false,
    },
  };
}

async function fetchPublicJson(url, fetchImpl) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  let response;
  try {
    response = await fetchImpl(url.toString(), {
      method: "GET",
      headers: {
        accept: "application/json",
        "user-agent": `${SERVER_NAME}/${SERVER_VERSION}`,
      },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    const error = new Error("Upstream request failed");
    error.status = response.status;
    throw error;
  }
  return response.json();
}

function validateObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Arguments must be an object");
}

function assertAllowedKeys(value, allowedKeys) {
  const allowed = new Set(allowedKeys);
  if (Object.keys(value).some((key) => !allowed.has(key))) throw new Error("Unsupported argument");
}

function requiredString(value, name, maxLength) {
  const result = String(value || "").trim();
  if (!result) throw new Error(`${name} is required`);
  return result.slice(0, maxLength);
}

function setSearchValue(url, name, value, maxLength) {
  const normalized = String(value || "").trim().slice(0, maxLength);
  if (normalized) url.searchParams.set(name, normalized);
}

function clampInteger(value, min, max, fallback) {
  const number = Number.parseInt(value, 10);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, number));
}

function normalizeOrigin(value) {
  return String(value || "").replace(/\/+$/, "");
}

function rpcResult(id, result) {
  return jsonResponse({ jsonrpc: "2.0", id, result });
}

function rpcError(id, code, message, data) {
  const error = { code, message };
  if (data !== undefined) error.data = data;
  return jsonResponse({ jsonrpc: "2.0", id, error }, 200, { "cache-control": "no-store" });
}

function jsonResponse(payload, status = 200, headers = {}) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "access-control-allow-origin": "*",
      "access-control-expose-headers": "Mcp-Session-Id",
      "x-content-type-options": "nosniff",
      ...headers,
    },
  });
}

function corsHeaders() {
  return {
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET, POST, OPTIONS",
    "access-control-allow-headers": "Accept, Content-Type, Mcp-Protocol-Version, Mcp-Session-Id",
    "access-control-max-age": "86400",
  };
}
