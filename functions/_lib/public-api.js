import { buildEntryPath, CONTENT_TYPES } from "./cms-core.js";

export const PUBLIC_API_NAME = "huamei-public-data";
export const PUBLIC_API_VERSION = "1.0.0";
export const PUBLIC_API_MAX_PAGE_SIZE = 50;

export function parsePublicListRequest(request, options = {}) {
  const url = new URL(request.url);
  const defaultLimit = clampInteger(options.defaultLimit, 1, PUBLIC_API_MAX_PAGE_SIZE, 20);
  const limit = clampInteger(url.searchParams.get("limit"), 1, PUBLIC_API_MAX_PAGE_SIZE, defaultLimit);
  const page = clampInteger(url.searchParams.get("page"), 1, 1000, 1);

  return {
    page,
    limit,
    offset: (page - 1) * limit,
    query: cleanParameter(url.searchParams.get("query"), 100),
    region: cleanParameter(url.searchParams.get("region"), 30),
    ageRequirement: cleanParameter(url.searchParams.get("age"), 10),
    roomType: cleanParameter(url.searchParams.get("room"), 10),
  };
}

export function serializePublicEntry(entry, requestUrl, options = {}) {
  const origin = new URL(requestUrl).origin;
  const path = buildEntryPath(entry);
  const common = {
    type: entry.type,
    identifier:
      entry.type === CONTENT_TYPES.APARTMENT
        ? String(entry.apartmentNumber || entry.slug || "")
        : String(entry.slug || ""),
    title: entry.title || "",
    summary: entry.summary || "",
    url: new URL(path, origin).toString(),
    coverImage: serializeCoverImage(entry, origin),
    tags: [...(entry.tags || [])],
    publishedAt: entry.publishedAt || null,
    updatedAt: entry.updatedAt || null,
  };

  if (entry.type === CONTENT_TYPES.APARTMENT) {
    Object.assign(common, {
      city: entry.city || null,
      region: entry.region || null,
      ageRequirement: entry.ageRequirement || null,
      roomTypes: [...(entry.roomTypes || [])],
      rentRange: entry.rentRange || null,
      incomeLimit: entry.incomeLimit || null,
      applicationDeadline: entry.applicationDeadline || null,
      externalApplyUrl: entry.externalApplyLink || null,
    });
  } else {
    Object.assign(common, {
      category: entry.blogCategory || null,
      author: entry.authorName || "华美服务中心",
      reviewer: entry.reviewerName || null,
      lastReviewedAt: entry.lastReviewedAt || null,
      applicability: entry.applicability || null,
      sourceUrls: [...(entry.sourceUrls || [])],
    });
  }

  if (options.includeContent) {
    common.contentHtml = entry.bodyHtml || "";
    common.galleryImages = (entry.galleryImages || []).map((url) => absoluteUrl(url, origin)).filter(Boolean);
  }

  return common;
}

export function buildPublicListEnvelope({ request, entries, total, page, limit }) {
  const url = new URL(request.url);
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const currentPage = Math.min(page, totalPages);
  const links = {
    self: pageUrl(url, currentPage, limit),
    previous: currentPage > 1 ? pageUrl(url, currentPage - 1, limit) : null,
    next: currentPage < totalPages ? pageUrl(url, currentPage + 1, limit) : null,
  };

  return {
    apiVersion: PUBLIC_API_VERSION,
    data: entries.map((entry) => serializePublicEntry(entry, request.url)),
    pagination: {
      page: currentPage,
      limit,
      total,
      totalPages,
    },
    links,
  };
}

export function publicJsonResponse(payload, status = 200, headers = {}) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "x-content-type-options": "nosniff",
      ...headers,
    },
  });
}

export function publicApiError(message, status = 500) {
  return publicJsonResponse(
    {
      error: {
        status,
        message,
      },
    },
    status,
    { "cache-control": "no-store" },
  );
}

function serializeCoverImage(entry, origin) {
  if (!entry.coverImageUrl) return null;
  return {
    url: absoluteUrl(entry.coverImageUrl, origin),
    alt: entry.coverAlt || "",
  };
}

function absoluteUrl(value, origin) {
  if (!value) return "";
  try {
    return new URL(value, origin).toString();
  } catch {
    return "";
  }
}

function pageUrl(url, page, limit) {
  const next = new URL(url);
  next.searchParams.set("page", String(page));
  next.searchParams.set("limit", String(limit));
  return next.toString();
}

function cleanParameter(value, maxLength) {
  return String(value || "").trim().slice(0, maxLength);
}

function clampInteger(value, min, max, fallback) {
  const number = Number.parseInt(value, 10);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, number));
}
