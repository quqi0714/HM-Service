import test from "node:test";
import assert from "node:assert/strict";
import {
  buildPublicListEnvelope,
  parsePublicListRequest,
  serializePublicEntry,
} from "./public-api.js";
import { onRequestGet as getApiCatalog } from "../.well-known/api-catalog.js";

const apartment = {
  id: "internal-id",
  type: "apartment",
  slug: "apartment-101",
  apartmentNumber: "101",
  title: "Fremont 55+ 长者公寓",
  summary: "公开摘要",
  bodyHtml: "<p>公开正文</p>",
  contentStatus: "published",
  coverImageUrl: "/images/example.webp",
  coverAlt: "公寓封面",
  galleryImages: ["/images/example.webp"],
  tags: ["适合长者"],
  publishedAt: "2026-07-20",
  updatedAt: "2026-07-22T12:00:00.000Z",
  city: "Fremont",
  region: "north",
  ageRequirement: "55+",
  roomTypes: ["1B"],
  rentRange: "$1,000–$1,500",
  incomeLimit: "30%–50% AMI",
  applicationDeadline: "2026-09-06",
  externalApplyLink: "https://example.org/apply",
  lastEditorEmail: "private@example.com",
  seoTitle: "internal seo title",
};

test("public API clamps pagination and filter lengths", () => {
  const request = new Request(
    `https://huameihope.com/public-data/v1/apartments?page=0&limit=500&query=${"a".repeat(140)}`,
  );
  const parsed = parsePublicListRequest(request);

  assert.equal(parsed.page, 1);
  assert.equal(parsed.limit, 50);
  assert.equal(parsed.query.length, 100);
  assert.equal(parsed.offset, 0);
});

test("public serializer exposes published content without internal CMS fields", () => {
  const value = serializePublicEntry(apartment, "https://huameihope.com/public-data/v1/apartments/101", {
    includeContent: true,
  });
  const serialized = JSON.stringify(value);

  assert.equal(value.identifier, "101");
  assert.equal(value.url, "https://huameihope.com/apartments/101");
  assert.equal(value.coverImage.url, "https://huameihope.com/images/example.webp");
  assert.equal(value.contentHtml, "<p>公开正文</p>");
  assert.doesNotMatch(serialized, /private@example\.com|lastEditorEmail|contentStatus|internal-id|seoTitle/);
});

test("public list envelope is bounded and links pagination", () => {
  const request = new Request("https://huameihope.com/public-data/v1/apartments?region=north");
  const result = buildPublicListEnvelope({
    request,
    entries: [apartment],
    total: 61,
    page: 2,
    limit: 20,
  });

  assert.equal(result.pagination.totalPages, 4);
  assert.match(result.links.self, /page=2/);
  assert.match(result.links.previous, /page=1/);
  assert.match(result.links.next, /page=3/);
  assert.equal(result.data.length, 1);
});

test("API catalog uses the linkset media type and advertises the public OpenAPI service", async () => {
  const response = getApiCatalog();
  const body = await response.json();

  assert.match(response.headers.get("content-type"), /^application\/linkset\+json/);
  assert.equal(body.linkset[0].anchor, "https://huameihope.com/public-data/v1");
  assert.equal(body.linkset[0]["service-desc"][0].href, "https://huameihope.com/openapi.json");
});
