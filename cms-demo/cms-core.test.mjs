import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
  APARTMENT_TAG_OPTIONS,
  CONTENT_STATUS,
  CONTENT_TYPES,
  REGION_LABELS,
  buildAdminPreviewUrl,
  buildAdminTitle,
  buildEntryUrl,
  findDuplicateApartmentNumber,
  filterApartmentEntries,
  formatDisplayDate,
  formatPostDate,
  getEditorActionLabels,
  getPublishedApartmentRows,
  getRegionLabel,
  normalizeSlug,
  prepareEntryForSave,
  sanitizeRichText,
  sortByNewest,
  sortPublishedApartmentRows,
} from "./cms-core.mjs";

const sampleEntries = [
  {
    id: "a1",
    type: CONTENT_TYPES.APARTMENT,
    title: "San Gabriel Senior Apartments",
    slug: "san-gabriel-senior-apartments",
    apartmentNumber: "1",
    contentStatus: CONTENT_STATUS.PUBLISHED,
    region: "south",
    ageRequirement: "62+",
    roomTypes: ["1B", "2B"],
    applicationStatus: "抽签中",
    tags: ["重点推荐"],
    publishedAt: "2026-07-01",
  },
  {
    id: "a2",
    type: CONTENT_TYPES.APARTMENT,
    title: "Oakland Family Housing",
    slug: "oakland-family-housing",
    apartmentNumber: "2",
    contentStatus: CONTENT_STATUS.PUBLISHED,
    region: "north",
    ageRequirement: "18+",
    roomTypes: ["2B", "3B+"],
    applicationStatus: "开放中",
    tags: ["全新公寓"],
    publishedAt: "2026-07-03",
  },
  {
    id: "a3",
    type: CONTENT_TYPES.APARTMENT,
    title: "Draft Pasadena Senior Housing",
    slug: "draft-pasadena-senior-housing",
    apartmentNumber: "3",
    contentStatus: CONTENT_STATUS.DRAFT,
    region: "south",
    ageRequirement: "55+",
    roomTypes: ["1B"],
    applicationStatus: "即将开放",
    tags: ["限时开放"],
    publishedAt: "",
  },
  {
    id: "b1",
    type: CONTENT_TYPES.BLOG,
    title: "材料准备攻略",
    slug: "housing-document-guide",
    contentStatus: CONTENT_STATUS.PUBLISHED,
    publishedAt: "2026-07-02",
  },
];

test("normalizeSlug creates a stable URL slug", () => {
  assert.equal(normalizeSlug(" San Gabriel 62+ Housing! "), "san-gabriel-62-housing");
});

test("buildEntryUrl returns demo detail URLs by content type", () => {
  assert.equal(
    buildEntryUrl(sampleEntries[0]),
    "detail.html?type=apartment&slug=san-gabriel-senior-apartments",
  );
  assert.equal(
    buildEntryUrl(sampleEntries[3]),
    "detail.html?type=blog&slug=housing-document-guide",
  );
});

test("published admin previews open the standalone public detail page", () => {
  assert.equal(buildAdminPreviewUrl(sampleEntries[0]), "detail.html?type=apartment&slug=san-gabriel-senior-apartments");
  assert.equal(
    buildAdminPreviewUrl({ ...sampleEntries[0], contentStatus: CONTENT_STATUS.DRAFT }),
    "preview.html?type=apartment&slug=san-gabriel-senior-apartments",
  );
});

test("admin titles prefix apartment numbers for quick recognition", () => {
  assert.equal(buildAdminTitle(sampleEntries[0]), "#1 San Gabriel Senior Apartments");
  assert.equal(buildAdminTitle(sampleEntries[3]), "材料准备攻略");
});

test("prepareEntryForSave uses apartment number as apartment URL slug", () => {
  const saved = prepareEntryForSave(
    {
      id: "a395",
      type: CONTENT_TYPES.APARTMENT,
      title: "Monterey Park Senior Housing",
      apartmentNumber: "395",
      slug: "",
      contentStatus: CONTENT_STATUS.DRAFT,
      roomTypes: ["1B"],
      tags: [],
    },
    CONTENT_STATUS.PUBLISHED,
  );

  assert.equal(saved.apartmentNumber, "395");
  assert.equal(saved.slug, "apartment-395");
  assert.equal(buildEntryUrl(saved), "detail.html?type=apartment&slug=apartment-395");
});

test("prepareEntryForSave keeps blog URLs title based when slug is empty", () => {
  const saved = prepareEntryForSave(
    {
      id: "b2",
      type: CONTENT_TYPES.BLOG,
      title: "申请材料准备清单 2026",
      slug: "",
      contentStatus: CONTENT_STATUS.DRAFT,
      roomTypes: [],
      tags: [],
    },
    CONTENT_STATUS.PUBLISHED,
  );

  assert.equal(saved.slug, "2026");
});

test("sanitizeRichText strips unsafe markup and keeps allowed content", () => {
  const html = `
    <h2 onclick="alert(1)">Title</h2>
    <p>Body <strong>bold</strong><img src=x onerror=alert(1)></p>
    <script>alert("xss")</script>
    <a href="javascript:alert(1)" onclick="alert(2)">bad link</a>
    <a href="https://example.com/apply" onclick="alert(3)">good link</a>
  `;

  const sanitized = sanitizeRichText(html);

  assert.match(sanitized, /<h2>Title<\/h2>/);
  assert.match(sanitized, /<strong>bold<\/strong>/);
  assert.match(
    sanitized,
    /<a href="https:\/\/example\.com\/apply" target="_blank" rel="noopener nofollow">good link<\/a>/,
  );
  assert.doesNotMatch(sanitized, /script|img|onerror|onclick|javascript:/i);
});

test("prepareEntryForSave sanitizes body HTML and removes status-like apartment tags", () => {
  const saved = prepareEntryForSave(
    {
      id: "a396",
      type: CONTENT_TYPES.APARTMENT,
      title: "Safe Housing",
      apartmentNumber: "396",
      slug: "",
      contentStatus: CONTENT_STATUS.DRAFT,
      bodyHtml: '<p onclick="alert(1)">Safe</p><script>alert(1)</script>',
      roomTypes: ["1B"],
      applicationStatus: "抽签中",
      tags: ["重点推荐", "抽签中", "开放中"],
    },
    CONTENT_STATUS.PUBLISHED,
  );

  assert.equal(saved.bodyHtml, "<p>Safe</p>");
  assert.deepEqual(saved.tags, ["重点推荐"]);
});

test("apartment marketing tags do not include application statuses", () => {
  assert.deepEqual(
    APARTMENT_TAG_OPTIONS.filter((tag) => ["开放中", "抽签中", "候补中", "已满", "已截止", "已过期"].includes(tag)),
    [],
  );
});

test("findDuplicateApartmentNumber detects other entries with the same number", () => {
  const duplicate = findDuplicateApartmentNumber(sampleEntries, {
    id: "new",
    type: CONTENT_TYPES.APARTMENT,
    apartmentNumber: "001",
  });

  assert.equal(duplicate?.id, "a1");
});

test("formatDisplayDate preserves plain YYYY-MM-DD dates without timezone drift", () => {
  assert.equal(formatDisplayDate("2026-06-30"), "2026/06/30");
});

test("formatPostDate displays publication dates in mm-dd-yyyy format", () => {
  assert.equal(formatPostDate("2026-07-03"), "07-03-2026");
});

test("region options can be extended with outside-state without changing old entries", () => {
  assert.equal(REGION_LABELS.south, "南加州");
  assert.equal(REGION_LABELS.north, "北加州");
  assert.equal(getRegionLabel("outside"), "外州");
});

test("forum editor labels match the selected content status and pin state", () => {
  assert.deepEqual(getEditorActionLabels({ type: CONTENT_TYPES.APARTMENT, contentStatus: CONTENT_STATUS.PUBLISHED, isPinned: true }), {
    modeLabel: "编辑已发布帖子",
    draftAction: "转为草稿",
    publishAction: "更新帖子",
    archiveAction: "下架帖子",
    pinAction: "取消置顶",
  });

  assert.deepEqual(getEditorActionLabels({ type: CONTENT_TYPES.APARTMENT, contentStatus: CONTENT_STATUS.DRAFT, isPinned: false }), {
    modeLabel: "编辑草稿",
    draftAction: "保存草稿",
    publishAction: "发布帖子",
    archiveAction: "下架帖子",
    pinAction: "设为置顶",
  });
});

test("sortByNewest puts pinned published apartments before newer non-pinned items", () => {
  const results = sortByNewest([
    { ...sampleEntries[1], isPinned: false },
    { ...sampleEntries[0], isPinned: true },
    sampleEntries[3],
  ]);

  assert.deepEqual(
    results.map((entry) => entry.id),
    ["a1", "a2", "b1"],
  );
});

test("published apartment management rows only include published apartments", () => {
  const rows = getPublishedApartmentRows(sampleEntries);

  assert.deepEqual(
    rows.map((entry) => entry.id),
    ["a2", "a1"],
  );
});

test("published apartment management rows sort by apartment number and publish date", () => {
  const rows = getPublishedApartmentRows(sampleEntries);

  assert.deepEqual(
    sortPublishedApartmentRows(rows, "apartmentNumber", "asc").map((entry) => entry.apartmentNumber),
    ["1", "2"],
  );
  assert.deepEqual(
    sortPublishedApartmentRows(rows, "publishedAt", "desc").map((entry) => entry.id),
    ["a2", "a1"],
  );
});

test("filterApartmentEntries returns only published apartments", () => {
  const results = filterApartmentEntries(sampleEntries, {});
  assert.deepEqual(
    results.map((entry) => entry.slug),
    ["oakland-family-housing", "san-gabriel-senior-apartments"],
  );
});

test("filterApartmentEntries applies region, age, room, and tag filters", () => {
  const results = filterApartmentEntries(sampleEntries, {
    region: "south",
    ageRequirement: "62+",
    roomType: "1B",
    tag: "重点推荐",
  });

  assert.deepEqual(
    results.map((entry) => entry.slug),
    ["san-gabriel-senior-apartments"],
  );
});

test("admin CSS forces hidden conditional fieldsets to stay hidden", async () => {
  const css = await readFile(new URL("./styles.css", import.meta.url), "utf8");

  assert.match(css, /\[hidden\]\s*\{[^}]*display:\s*none\s*!important/i);
});

test("admin and public apartment filters expose forum-style controls", async () => {
  const adminHtml = await readFile(new URL("./admin.html", import.meta.url), "utf8");
  const apartmentsHtml = await readFile(new URL("./apartments.html", import.meta.url), "utf8");
  const publishedHtml = await readFile(new URL("./published-apartments.html", import.meta.url), "utf8");

  assert.match(adminHtml, /id="editorMode"/);
  assert.match(adminHtml, /id="togglePin"/);
  assert.match(adminHtml, /published-apartments\.html/);
  assert.match(adminHtml, /<option value="outside">外州<\/option>/);
  assert.match(apartmentsHtml, /<option value="outside">外州<\/option>/);
  assert.match(publishedHtml, /id="publishedApartmentTable"/);
});

test("admin page exposes the storage mode clearly before Cloudflare setup", async () => {
  const adminHtml = await readFile(new URL("./admin.html", import.meta.url), "utf8");

  assert.match(adminHtml, /id="backendMode"/);
  assert.match(adminHtml, /本地演示|正式后台/);
});

test("home page links customers to the apartment list from desktop, mobile, and housing sections", async () => {
  const homeHtml = await readFile(new URL("../index.html", import.meta.url), "utf8");

  assert.match(homeHtml, /data-apartment-list-link[^>]*>公寓清单/);
  assert.match(homeHtml, /查看最新开放公寓/);
  assert.match(homeHtml, /data-apartment-list-link/);
  assert.match(homeHtml, /window\.tailwind/);
});
