import test from "node:test";
import assert from "node:assert/strict";

import {
  buildEntryPath,
  buildSitemapXml,
  formatPostDate,
  isNewEntry,
  getRegionLabel,
  normalizeEntryForStorage,
  renderHtmlErrorPage,
  renderListPage,
  renderEntryPage,
  sanitizeRichText,
  sortPublicEntries,
} from "./cms-core.js";
import { archiveEntry, deletePermanentEntry, upsertEntry } from "./content-repository.js";
import { HttpError, notFoundResponse, requireAdmin } from "./http.js";
import {
  buildIndexNowKeyLocation,
  collectIndexNowPaths,
  getIndexNowKey,
  notifyIndexNow,
  queueIndexNowNotification,
} from "./indexnow.js";
import { buildCanonicalUrl } from "../_middleware.js";
import { onRequestPost as createContentPost } from "../api/content/index.js";
import { buildAssetKey } from "../api/upload.js";
import { onRequestDelete as deleteContentById } from "../api/content/[id].js";
import { onRequestGet as getBlogPost } from "../blog/[slug].js";
import { onRequestGet as getIndexNowKeyFile } from "../indexnow/[key].js";

const baseApartment = {
  id: "entry-1",
  type: "apartment",
  title: "San Gabriel 62+ 长者公寓抽签开放",
  apartmentNumber: "00396",
  slug: "",
  contentStatus: "published",
  city: "San Gabriel",
  region: "south",
  ageRequirement: "62+",
  roomTypes: ["1B", "2B"],
  applicationStatus: "抽签中",
  tags: ["重点推荐", "抽签中", "适合长者"],
  coverImageUrl: "https://assets.example.com/apt-396.webp",
  coverAlt: "San Gabriel 长者公寓社区外观",
  summary: "南加州 62+ 长者公寓近期抽签开放。",
  bodyHtml:
    '<h2 onclick="alert(1)">本次更新重点</h2><p>可协助准备材料。</p><script>alert(1)</script><a href="javascript:alert(1)">坏链接</a><a href="https://example.com/apply" onclick="x()">申请链接</a>',
  rentRange: "$1,200 - $1,650",
  incomeLimit: "以项目公告为准",
  applicationDeadline: "2026-08-15",
  externalApplyLink: "https://example.com/apply",
  publishedAt: "2026-07-01",
  isPinned: true,
};

test("normalizeEntryForStorage prepares safe apartment records for D1", () => {
  const entry = normalizeEntryForStorage(baseApartment);

  assert.equal(entry.apartmentNumber, "396");
  assert.equal(entry.slug, "apartment-396");
  assert.equal(entry.isPinned, true);
  assert.equal(entry.summary, "南加州 62+ 长者公寓近期抽签开放。");
  assert.equal(entry.coverAlt, "San Gabriel 长者公寓社区外观");
  assert.equal(entry.bodyHtml.includes("script"), false);
  assert.equal(entry.bodyHtml.includes("javascript:"), false);
  assert.deepEqual(entry.tags, ["重点推荐", "适合长者"]);
  assert.equal(buildEntryPath(entry), "/apartments/396");
});

test("normalizeEntryForStorage preserves gallery images and uses the first image as the cover", () => {
  const entry = normalizeEntryForStorage({
    ...baseApartment,
    coverImageUrl: "https://assets.example.com/poster.webp",
    galleryImages: [
      "https://assets.example.com/poster.webp",
      "/cms-assets/cms/2026-07-03/lobby.webp",
      "/cms-assets/cms/2026-07-03/lobby.webp",
      "javascript:alert(1)",
    ],
  });

  assert.equal(entry.coverImageUrl, "https://assets.example.com/poster.webp");
  assert.deepEqual(entry.galleryImages, [
    "https://assets.example.com/poster.webp",
    "/cms-assets/cms/2026-07-03/lobby.webp",
  ]);
});

test("normalizeEntryForStorage derives simple summaries and cover alt text when editors leave them blank", () => {
  const entry = normalizeEntryForStorage({
    ...baseApartment,
    title: "Boyle Heights 62+ 老年经济适用房",
    summary: "",
    coverAlt: "",
    bodyHtml: "<p>靠近轻轨站，生活便利。</p>",
  });

  assert.equal(entry.summary, "靠近轻轨站，生活便利。");
  assert.equal(entry.coverAlt, "Boyle Heights 62+ 老年经济适用房宣传图");
});

test("sanitizeRichText preserves admin editor line breaks for production pages", () => {
  assert.equal(
    sanitizeRichText("✨社区优势：\n✅ 62岁以上长者社区\n✅ 一房一卫户型\n\n💰租金：\n家庭收入的 30%"),
    "<p>✨社区优势：<br>✅ 62岁以上长者社区<br>✅ 一房一卫户型</p><p>💰租金：<br>家庭收入的 30%</p>"
  );
  assert.equal(
    sanitizeRichText("<div>Boyle Heights 社区&amp;nbsp; 离 Monterey Park 12 分钟</div><div>✅ 生活便利</div>"),
    "<p>Boyle Heights 社区  离 Monterey Park 12 分钟</p><p>✅ 生活便利</p>"
  );
  assert.equal(
    sanitizeRichText("第一段<br>第二段&nbsp;内容<br>第三段"),
    "<p>第一段</p><p>第二段 内容</p><p>第三段</p>"
  );
});

test("sanitizeRichText preserves readable editorial callouts for production pages", () => {
  assert.equal(
    sanitizeRichText("<blockquote><p><strong>先看重点：</strong>先给结论，再解释。</p></blockquote>"),
    "<blockquote><p><strong>先看重点：</strong>先给结论，再解释。</p></blockquote>",
  );
});

test("normalizeEntryForStorage preserves outside-state region values", () => {
  const entry = normalizeEntryForStorage({
    ...baseApartment,
    region: "outside",
  });

  assert.equal(entry.region, "outside");
  assert.equal(getRegionLabel(entry.region), "外州");
});

test("normalizeEntryForStorage keeps only HTTPS editorial sources for blog governance", () => {
  const entry = normalizeEntryForStorage({
    id: "blog-governance-1",
    type: "blog",
    title: "Section 8 审核示例",
    slug: "section-8-review-example",
    contentStatus: "draft",
    authorName: "",
    reviewerName: "华美服务中心",
    lastReviewedAt: "2026-07-22T12:00:00Z",
    applicability: "美国联邦 HCV 一般规则；以当地 PHA 为准。",
    sourceUrls: [
      "https://www.hud.gov/helping-americans/housing-choice-vouchers-tenants",
      "https://www.hud.gov/helping-americans/housing-choice-vouchers-tenants",
      "http://example.com/not-secure",
      "javascript:alert(1)",
    ],
  });

  assert.equal(entry.authorName, "华美服务中心");
  assert.equal(entry.reviewerName, "华美服务中心");
  assert.equal(entry.lastReviewedAt, "2026-07-22");
  assert.equal(entry.applicability, "美国联邦 HCV 一般规则；以当地 PHA 为准。");
  assert.deepEqual(entry.sourceUrls, ["https://www.hud.gov/helping-americans/housing-choice-vouchers-tenants"]);
});

test("formatPostDate displays publication dates in mm-dd-yyyy format", () => {
  assert.equal(formatPostDate("2026-07-03"), "07-03-2026");
});

test("sortPublicEntries puts pinned content first and keeps newest order inside groups", () => {
  const pinned = normalizeEntryForStorage({ ...baseApartment, id: "pinned", publishedAt: "2026-07-01", isPinned: true });
  const newer = normalizeEntryForStorage({
    ...baseApartment,
    id: "newer",
    apartmentNumber: "397",
    title: "Oakland 公寓开放",
    publishedAt: "2026-07-03",
    isPinned: false,
  });
  const blog = normalizeEntryForStorage({
    id: "blog-1",
    type: "blog",
    title: "申请材料准备清单",
    slug: "housing-document-checklist",
    contentStatus: "published",
    summary: "提前准备材料可以减少补件。",
    publishedAt: "2026-07-02",
  });

  assert.deepEqual(
    sortPublicEntries([newer, pinned, blog]).map((entry) => entry.id),
    ["pinned", "newer", "blog-1"]
  );
});

test("renderListPage shows pinned marker, visible tags, and US publication date", () => {
  const entry = normalizeEntryForStorage(baseApartment);
  const html = renderListPage([entry], "apartment", {
    origin: "https://huameihope.com",
    siteName: "HM 华美服务中心",
    filters: {},
    page: 1,
    pageSize: 24,
    totalEntries: 60,
    totalPages: 3,
    now: Date.parse("2026-07-05T12:00:00Z"),
  });

  assert.match(html, /class="list-heading"/);
  assert.match(html, /<meta name="robots" content="index,follow,max-image-preview:large">/);
  assert.match(html, /<link rel="canonical" href="https:\/\/huameihope\.com\/apartments">/);
  assert.match(html, /class="list-kicker"/);
  assert.match(html, /加州低收入公寓清单/);
  assert.match(html, /"@type":"ItemList"/);
  assert.match(html, /og:image/);
  assert.match(html, /class="list-tools"/);
  assert.match(html, /class="entry-card__number">#396<\/span>/);
  assert.match(html, /<span class="entry-card__date">07-01-2026<\/span>/);
  assert.match(html, /<span class="chip chip--pinned">置顶<\/span>/);
  assert.match(html, /<dd>1B \/ 2B<\/dd>/);
  assert.match(html, /class="chip chip--fact chip--m">1B \/ 2B<\/span>/);
  assert.match(html, /<span class="chip chip--tag">重点推荐<\/span>/);
  assert.doesNotMatch(html, /开放申请|剩 \d+ 天|chip--deadline/);
  assert.match(html, /class="new-flag"/);
  assert.match(html, /name="query"/);
  assert.match(html, /class="filter-chip is-active"[^>]*>全部年龄<\/a>/);
  assert.match(html, /class="filter-chip"[^>]*>18\+<\/a>/);
  assert.match(html, /class="filter-chip"[^>]*>62\+<\/a>/);
  assert.match(html, /class="filter-chip"[^>]*>3B\+<\/a>/);
  assert.match(html, /aria-label="年龄筛选"/);
  assert.match(html, /aria-label="房型筛选"/);
  assert.doesNotMatch(html, /仅看开放中|抽签中|申请状态|openOnly/);
  assert.match(html, /href="\/apartments\?page=2#list"/);
  assert.doesNotMatch(html, /<details class="filter-advanced"|<summary>更多筛选|name="age"|name="room"/);
  assert.doesNotMatch(html, /<summary>筛选<\/summary>[\s\S]*<button type="submit">筛选<\/button>/);
  assert.match(html, /grid-template-columns:minmax\(0,1fr\) auto/);
  assert.match(html, /grid-template-columns:148px minmax\(0,1fr\)/);
  assert.match(html, /height:168px/);
  assert.match(html, /class="entry-card__action"/);
  assert.match(html, /data-adaptive-media/);
  assert.match(html, /adaptive-media::before/);
  assert.match(html, /--media-bg/);
  assert.match(html, /data-orientation/);
  assert.match(html, /object-fit:cover/);
  assert.doesNotMatch(html, /<p>南加州 62\+ 长者公寓近期抽签开放。<\/p>/);
  assert.match(html, /联系华美，确认申请条件/);
  assert.match(html, /123 E Valley Blvd, Suite 106/);
});

test("renderListPage keeps search and filter combinations out of the index", () => {
  const entry = normalizeEntryForStorage(baseApartment, { now: "2026-07-22T10:00:00.000Z" });
  const html = renderListPage([entry], "apartment", {
    origin: "https://huameihope.com",
    filters: { query: "老人", region: "south", ageRequirement: "62+", roomType: "1B" },
    page: 2,
    pageSize: 24,
    totalEntries: 30,
    totalPages: 2,
  });

  assert.match(html, /<meta name="robots" content="noindex,follow">/);
  assert.match(html, /<link rel="canonical" href="https:\/\/huameihope\.com\/apartments">/);
  assert.doesNotMatch(html, /rel="canonical"[^>]*(?:query|region|age|room)=/);
});

test("renderEntryPage emits SEO-ready HTML without unsafe body markup", () => {
  const entry = normalizeEntryForStorage(baseApartment);
  const html = renderEntryPage(entry, {
    origin: "https://huameihope.com",
    siteName: "HM 华美服务中心",
    now: Date.parse("2026-07-05T12:00:00Z"),
  });

  assert.match(html, /<title>San Gabriel 62\+ 长者公寓抽签开放 \| HM 华美服务中心<\/title>/);
  assert.match(html, /<meta name="description" content="南加州 62\+ 长者公寓近期抽签开放。">/);
  assert.match(html, /<meta name="robots" content="index,follow,max-image-preview:large">/);
  assert.match(html, /<link rel="canonical" href="https:\/\/huameihope\.com\/apartments\/396">/);
  assert.match(html, /<meta property="og:site_name" content="HM 华美服务中心">/);
  assert.match(html, /<meta property="og:locale" content="zh_CN">/);
  assert.match(html, /<meta name="twitter:card" content="summary_large_image">/);
  assert.match(html, /gtag\/js\?id=G-B1ZL92HNR6/);
  assert.match(html, /<script type="application\/ld\+json">/);
  assert.match(html, /"@type":"WebPage"/);
  assert.match(html, /"@type":"Apartment"/);
  assert.match(html, /"mainEntity":\{"@type":"Apartment","@id":"https:\/\/huameihope\.com\/apartments\/396#apartment"/);
  assert.match(html, /"publisher":\{"@type":"Organization","@id":"https:\/\/huameihope\.com\/#organization"/);
  assert.match(html, /class="entry-layout"/);
  assert.match(html, /class="entry-kicker"/);
  assert.match(html, /公寓档案 #396/);
  assert.match(html, /class="entry-heading"/);
  assert.match(html, /class="entry-media-panel"/);
  assert.match(html, /class="entry-quick-actions"/);
  assert.match(html, /class="entry-content"/);
  assert.match(html, /\.entry-content\{grid-column:1/);
  assert.match(html, /\.entry-heading,\.entry-content,\.entry-media-panel\{grid-column:1;grid-row:auto\}/);
  assert.match(html, /class="[^"]*entry-poster-preview/);
  assert.match(html, /data-adaptive-media/);
  assert.match(html, /entry-poster-preview\[data-orientation=portrait\]/);
  assert.match(html, /entry-poster-preview\[data-orientation=landscape\]/);
  assert.match(html, /查看完整海报/);
  assert.match(html, /data-lightbox-src="https:\/\/assets\.example\.com\/apt-396\.webp"/);
  assert.match(html, /data-image-lightbox/);
  assert.match(html, /data-lightbox-close/);
  assert.match(html, /document\.querySelector\("\[data-image-lightbox\]"\)/);
  assert.doesNotMatch(html, /target="_blank" rel="noopener">查看完整海报/);
  assert.match(html, /grid-template-columns:minmax\(0,1fr\) minmax\(220px,320px\)/);
  assert.match(html, /max-width:300px/);
  assert.match(html, /max-height:300px/);
  assert.match(html, /font-size:clamp\(30px,3vw,44px\)/);
  assert.doesNotMatch(html, /max-height:min\(780px,88vh\)/);
  assert.doesNotMatch(html, /class="entry-summary"/);
  assert.match(html, /<dt>城市<\/dt><dd>San Gabriel<\/dd>/);
  assert.doesNotMatch(html, /申请截止|租金范围|收入限制|deadline-note/);
  assert.match(html, /"@type":"BreadcrumbList"/);
  assert.match(html, /加州低收入公寓清单/);
  assert.doesNotMatch(html, /<dt>申请状态<\/dt>|抽签中/);
  assert.match(html, /联系华美，确认申请条件/);
  assert.match(html, /123 E Valley Blvd, Suite 106/);
  assert.match(html, /rel="noopener"/);
  assert.doesNotMatch(html, /nofollow/);
  assert.doesNotMatch(html, /onclick|javascript:|<script>alert/i);
});

test("renderEntryPage emits BlogPosting authorship and page identity for blog SEO", () => {
  const entry = normalizeEntryForStorage({
    id: "blog-seo-1",
    type: "blog",
    title: "Section 8 住房券怎么申请？",
    slug: "section-8-application-guide",
    contentStatus: "published",
    summary: "了解 Section 8 的申请流程和等候名单。",
    bodyHtml: '<p>查看 <a href="/blog/section-8-rent-guide">租金计算指南</a>。</p>',
    blogCategory: "政策解读",
    authorName: "华美服务中心",
    reviewerName: "华美服务中心",
    lastReviewedAt: "2026-07-22",
    applicability: "美国联邦 Housing Choice Voucher 一般规则；具体以当地 PHA 当前政策为准。",
    sourceUrls: [
      "https://www.hud.gov/helping-americans/housing-choice-vouchers-tenants",
      "https://www.hud.gov/helping-americans/housing-choice-vouchers-portability",
    ],
    seoTitle: "Section 8 怎么申请？流程与材料清单",
    seoDescription: "Section 8 住房券中文申请指南。",
    publishedAt: "2026-07-13",
  });
  const html = renderEntryPage(entry, {
    origin: "https://huameihope.com",
    siteName: "HM 华美服务中心",
  });

  assert.match(html, /"@type":"BlogPosting"/);
  assert.match(html, /"mainEntityOfPage":\{"@type":"WebPage","@id":"https:\/\/huameihope\.com\/blog\/section-8-application-guide"\}/);
  assert.match(html, /"author":\{"@type":"Organization","@id":"https:\/\/huameihope\.com\/#organization","name":"华美服务中心","url":"https:\/\/huameihope\.com"\}/);
  assert.match(html, /"logo":\{"@type":"ImageObject","url":"https:\/\/huameihope\.com\/images\/brand\/huamei-logo\.webp"\}/);
  assert.match(html, /"articleSection":"政策解读"/);
  assert.match(html, /"inLanguage":"zh-Hans"/);
  assert.match(html, /<a href="\/blog\/section-8-rent-guide">租金计算指南<\/a>/);
  assert.match(html, /来源与更新/);
  assert.match(html, /最后审核<\/dt><dd>07-22-2026/);
  assert.match(html, /官方来源 1 · hud\.gov/);
  assert.match(html, /target="_blank" rel="noopener"/);
  assert.doesNotMatch(html, /nofollow/);

  const jsonLd = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((match) => JSON.parse(match[1]));
  const posting = jsonLd.find((item) => item["@type"] === "BlogPosting");
  assert.deepEqual(posting.citation, [
    "https://www.hud.gov/helping-americans/housing-choice-vouchers-tenants",
    "https://www.hud.gov/helping-americans/housing-choice-vouchers-portability",
  ]);
  assert.equal(posting.editor.name, "华美服务中心");
  assert.match(posting.about.name, /当地 PHA/);
});

test("renderEntryPage keeps draft previews out of search indexes", () => {
  const entry = normalizeEntryForStorage({
    id: "blog-draft-seo-1",
    type: "blog",
    title: "Section 8 草稿",
    slug: "section-8-draft",
    contentStatus: "draft",
    bodyHtml: "<p>审核中。</p>",
  });
  const html = renderEntryPage(entry, { origin: "https://huameihope.com" });

  assert.match(html, /<meta name="robots" content="noindex,nofollow">/);
  assert.doesNotMatch(html, /content="index,follow,max-image-preview:large"/);
});

test("buildAssetKey keeps a descriptive image filename before the unique suffix", () => {
  assert.equal(
    buildAssetKey("section-8-application-guide.png", "image/webp", {
      now: "2026-07-13T12:00:00Z",
      uuid: "asset-123",
    }),
    "cms/2026-07-13/section-8-application-guide-asset-123.webp",
  );
});

test("renderEntryPage puts extra uploaded images in a compact clickable gallery", () => {
  const entry = normalizeEntryForStorage({
    ...baseApartment,
    galleryImages: [
      "https://assets.example.com/cover.webp",
      "/cms-assets/cms/2026-07-03/lobby.webp",
      "/cms-assets/cms/2026-07-03/courtyard.webp",
    ],
  });
  const html = renderEntryPage(entry, {
    origin: "https://huameihope.com",
    siteName: "HM 华美服务中心",
  });

  assert.match(html, /class="entry-gallery"/);
  assert.match(html, /更多图片/);
  assert.match(html, /https:\/\/huameihope\.com\/cms-assets\/cms\/2026-07-03\/lobby\.webp/);
  assert.match(html, /https:\/\/huameihope\.com\/cms-assets\/cms\/2026-07-03\/courtyard\.webp/);
  assert.match(html, /\.entry-gallery-grid\{display:grid;grid-template-columns:repeat\(auto-fit,minmax\(120px,1fr\)\)/);
  assert.match(html, /\.entry-gallery-card\{appearance:none;aspect-ratio:4\/3/);
  assert.match(html, /class="entry-gallery-card adaptive-media" type="button"/);
  assert.doesNotMatch(html, /class="entry-gallery-card adaptive-media"[^>]*href=/);
});

test("buildSitemapXml includes published routes and only emits reliable entry lastmod values", () => {
  const apartment = normalizeEntryForStorage(baseApartment, { now: "2026-07-20T09:00:00.000Z" });
  const blog = normalizeEntryForStorage({
    id: "blog-1",
    type: "blog",
    title: "申请材料准备清单",
    slug: "housing-document-checklist",
    contentStatus: "published",
    summary: "提前准备材料可以减少补件。",
    bodyHtml: "<p>正文</p>",
    publishedAt: "2026-07-02",
  }, { now: "2026-07-21T10:30:00.000Z" });
  const draft = normalizeEntryForStorage({
    id: "draft-1",
    type: "blog",
    title: "草稿",
    slug: "draft",
    contentStatus: "draft",
    summary: "不应进入 sitemap",
  });

  const xml = buildSitemapXml([apartment, blog, draft], "https://huameihope.com");

  assert.match(xml, /<loc>https:\/\/huameihope\.com\/<\/loc>/);
  assert.doesNotMatch(xml, /<loc>https:\/\/huameihope\.com\/<\/loc>\s*<lastmod>/);
  assert.doesNotMatch(xml, /<loc>https:\/\/huameihope\.com\/accessibility<\/loc>\s*<lastmod>/);
  assert.match(xml, /<priority>1\.0<\/priority>/);
  assert.match(xml, /<loc>https:\/\/huameihope\.com\/vehicle<\/loc>/);
  assert.match(xml, /<loc>https:\/\/huameihope\.com\/health<\/loc>/);
  assert.match(xml, /<loc>https:\/\/huameihope\.com\/love-health<\/loc>/);
  assert.match(xml, /<loc>https:\/\/huameihope\.com\/apartments<\/loc>/);
  assert.match(xml, /<loc>https:\/\/huameihope\.com\/blog<\/loc>/);
  assert.match(xml, /<loc>https:\/\/huameihope\.com\/apartments\/396<\/loc>/);
  assert.match(xml, /<loc>https:\/\/huameihope\.com\/apartments\/396<\/loc>[\s\S]*?<lastmod>2026-07-20<\/lastmod>/);
  assert.match(xml, /<loc>https:\/\/huameihope\.com\/blog\/housing-document-checklist<\/loc>/);
  assert.match(xml, /<loc>https:\/\/huameihope\.com\/blog\/housing-document-checklist<\/loc>[\s\S]*?<lastmod>2026-07-21<\/lastmod>/);
  assert.doesNotMatch(xml, /draft/);
});

test("IndexNow collects public URL changes for publish, rename, archive, and delete", () => {
  const published = normalizeEntryForStorage(baseApartment, { now: "2026-07-20T09:00:00.000Z" });
  const renamed = normalizeEntryForStorage(
    { ...published, apartmentNumber: "397", slug: "apartment-397", contentStatus: "published" },
    { now: "2026-07-21T09:00:00.000Z" },
  );
  const archived = { ...renamed, contentStatus: "archived" };

  assert.deepEqual(collectIndexNowPaths(null, published), ["/apartments/396"]);
  assert.deepEqual(collectIndexNowPaths(published, renamed), ["/apartments/396", "/apartments/397"]);
  assert.deepEqual(collectIndexNowPaths(renamed, archived), ["/apartments/397"]);
  assert.deepEqual(collectIndexNowPaths(published, null), ["/apartments/396"]);
});

test("IndexNow notification is canonical, asynchronous, and safe when unconfigured", async () => {
  assert.equal(getIndexNowKey({ INDEXNOW_KEY: "short" }), "");
  assert.deepEqual(await notifyIndexNow({}, ["/blog/test"]), {
    skipped: true,
    reason: "INDEXNOW_KEY is not configured",
    urlList: [],
  });

  const env = {
    SITE_ORIGIN: "https://huameihope.com",
    INDEXNOW_KEY: "huamei-indexnow-2026",
  };
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url, init });
    return new Response("", { status: 202 });
  };
  let backgroundTask;
  const task = queueIndexNowNotification(
    { env, waitUntil(promise) { backgroundTask = promise; } },
    ["/blog/section-8", "https://huameihope.com/blog/section-8#answer", "https://other.example/page"],
    { fetchImpl },
  );

  assert.equal(backgroundTask, task);
  const result = await backgroundTask;
  const payload = JSON.parse(calls[0].init.body);
  assert.equal(result.status, 202);
  assert.equal(calls[0].url, "https://api.indexnow.org/indexnow");
  assert.deepEqual(payload.urlList, ["https://huameihope.com/blog/section-8"]);
  assert.equal(payload.keyLocation, "https://huameihope.com/huamei-indexnow-2026.txt");
  assert.equal(buildIndexNowKeyLocation(env), payload.keyLocation);
});

test("IndexNow key proof endpoint only serves the configured key", async () => {
  const env = { INDEXNOW_KEY: "huamei-indexnow-2026" };
  const ok = await getIndexNowKeyFile({ env, params: { key: "huamei-indexnow-2026.txt" } });
  const missing = await getIndexNowKeyFile({ env, params: { key: "wrong-key.txt" } });

  assert.equal(ok.status, 200);
  assert.equal(await ok.text(), env.INDEXNOW_KEY);
  assert.equal(missing.status, 404);
});

test("canonical middleware consolidates host, slash, and HTML page aliases", () => {
  assert.equal(
    buildCanonicalUrl("https://www.huameihope.com/vehicle/?from=test"),
    "https://huameihope.com/vehicle?from=test",
  );
  assert.equal(
    buildCanonicalUrl("http://huameihope.com/blog/section-8-guide/"),
    "https://huameihope.com/blog/section-8-guide",
  );
  assert.equal(buildCanonicalUrl("https://huameihope.com/index.html"), "https://huameihope.com/");
  assert.equal(buildCanonicalUrl("https://huameihope.com/health.html"), "https://huameihope.com/health");
  assert.equal(buildCanonicalUrl("https://huameihope.com/health"), "");
});

test("requireAdmin fails closed unless Cloudflare Access or local bypass is configured", async () => {
  const request = new Request("https://huameihope.com/api/content");

  await assert.rejects(
    () => requireAdmin(request, {}),
    (error) => error instanceof HttpError && error.status === 503
  );

  await assert.deepEqual(await requireAdmin(new Request("http://127.0.0.1:8788/api/content"), { CMS_AUTH_BYPASS: "true" }), {
    email: "local-dev@huamei",
  });

  await assert.rejects(
    () => requireAdmin(request, { CMS_AUTH_BYPASS: "true" }),
    (error) => error instanceof HttpError && error.status === 503
  );
});

test("requireAdmin fails closed when admin allowlist is empty", async () => {
  const request = new Request("https://huameihope.com/api/content");

  await assert.rejects(
    () =>
      requireAdmin(request, {
        CF_ACCESS_TEAM_DOMAIN: "example.cloudflareaccess.com",
        CF_ACCESS_AUD: "audience",
        CMS_ADMIN_EMAILS: "",
      }),
    (error) => error instanceof HttpError && error.status === 503 && /CMS_ADMIN_EMAILS/.test(error.message)
  );
});

test("requireAdmin rejects malformed Cloudflare Access tokens as unauthorized", async () => {
  const request = new Request("https://huameihope.com/api/content", {
    headers: {
      "CF-Access-Jwt-Assertion": "not-a-valid-token",
    },
  });

  await assert.rejects(
    () =>
      requireAdmin(request, {
        CF_ACCESS_TEAM_DOMAIN: "example.cloudflareaccess.com",
        CF_ACCESS_AUD: "audience",
        CMS_ADMIN_EMAILS: "admin@example.com",
      }),
    (error) => error instanceof HttpError && error.status === 401
  );
});

test("requireAdmin rejects Access tokens with a wrong issuer before loading certs", async () => {
  const token = [
    encodeBase64Url(JSON.stringify({ alg: "RS256", kid: "kid-1" })),
    encodeBase64Url(
      JSON.stringify({
        aud: ["audience"],
        email: "admin@example.com",
        exp: Math.floor(Date.now() / 1000) + 60,
        iss: "https://wrong.cloudflareaccess.com",
      })
    ),
    "signature",
  ].join(".");

  await assert.rejects(
    () =>
      requireAdmin(
        new Request("https://huameihope.com/api/content", {
          headers: { "CF-Access-Jwt-Assertion": token },
        }),
        {
          CF_ACCESS_TEAM_DOMAIN: "example.cloudflareaccess.com",
          CF_ACCESS_AUD: "audience",
          CMS_ADMIN_EMAILS: "admin@example.com",
        }
      ),
    (error) => error instanceof HttpError && error.status === 401 && /issuer/i.test(error.message)
  );
});

test("upsertEntry returns a readable conflict when apartment number is duplicated", async () => {
  const duplicateError = new Error("D1_ERROR: UNIQUE constraint failed: cms_entries.apartment_number");
  const env = {
    HM_CMS_DB: {
      prepare() {
        return {
          bind() {
            return {
              run() {
                throw duplicateError;
              },
            };
          },
        };
      },
    },
  };

  await assert.rejects(
    () => upsertEntry(env, baseApartment, { editorEmail: "admin@example.com" }),
    (error) => error instanceof HttpError && error.status === 409 && /公寓编号/.test(error.message)
  );
});

test("upsertEntry rejects stale updates with a readable conflict", async () => {
  const env = {
    HM_CMS_DB: {
      prepare(sql) {
        return {
          bind() {
            return {
              first() {
                if (sql.includes("WHERE id = ?")) {
                  return {
                    ...dbRowFromEntry(normalizeEntryForStorage(baseApartment)),
                    updated_at: "2026-07-01T12:00:00.000Z",
                  };
                }
                return null;
              },
              run() {
                return { meta: { changes: 1 } };
              },
            };
          },
        };
      },
    },
  };

  await assert.rejects(
    () =>
      upsertEntry(
        env,
        {
          ...baseApartment,
          updatedAt: "2026-07-01T12:30:00.000Z",
          expectedUpdatedAt: "2026-07-01T11:00:00.000Z",
        },
        { editorEmail: "admin@example.com", requireFreshUpdatedAt: true }
      ),
    (error) => error instanceof HttpError && error.status === 409 && /刷新/.test(error.message)
  );
});

test("upsertEntry accepts a fresh expectedUpdatedAt while writing a new updatedAt", async () => {
  const writes = [];
  const existing = {
    ...dbRowFromEntry(normalizeEntryForStorage(baseApartment)),
    updated_at: "2026-07-01T10:00:00.000Z",
  };
  const env = {
    HM_CMS_DB: {
      prepare(sql) {
        return {
          bind(...args) {
            return {
              first() {
                if (sql.includes("WHERE id = ?")) return existing;
                return null;
              },
              run() {
                writes.push({ sql, args });
                return { meta: { changes: 1 } };
              },
            };
          },
        };
      },
    },
  };

  const entry = await upsertEntry(
    env,
    {
      ...baseApartment,
      summary: "已更新摘要",
      updatedAt: "2026-07-01T12:30:00.000Z",
      expectedUpdatedAt: "2026-07-01T10:00:00.000Z",
    },
    { editorEmail: "admin@example.com", requireFreshUpdatedAt: true }
  );

  assert.equal(entry.summary, "已更新摘要");
  assert.notEqual(entry.updatedAt, "2026-07-01T10:00:00.000Z");
  assert.equal(writes.length, 2);
});

test("upsertEntry persists gallery images as JSON in D1", async () => {
  const writes = [];
  const env = {
    HM_CMS_DB: {
      prepare(sql) {
        return {
          bind(...args) {
            return {
              run() {
                writes.push({ sql, args });
                return { meta: { changes: 1 } };
              },
            };
          },
        };
      },
    },
  };

  const entry = await upsertEntry(
    env,
    {
      ...baseApartment,
      id: "entry-gallery",
      apartmentNumber: "410",
      galleryImages: ["https://assets.example.com/cover.webp", "/cms-assets/cms/2026-07-03/detail.webp"],
    },
    { editorEmail: "admin@example.com" }
  );
  const write = writes.find((item) => /INSERT INTO cms_entries/.test(item.sql));

  assert.match(write.sql, /gallery_images_json/);
  assert.equal(write.args.includes(JSON.stringify(entry.galleryImages)), true);
});

test("upsertEntry allows a published blog without optional source and review metadata", async () => {
  const writes = [];
  const env = {
    HM_CMS_DB: {
      prepare(sql) {
        return {
          bind(...args) {
            return {
              run() {
                writes.push({ sql, args });
                return { meta: { changes: 1 } };
              },
            };
          },
        };
      },
    },
  };

  const entry = await upsertEntry(env, {
    id: "blog-with-optional-metadata-empty",
    type: "blog",
    title: "政策文章",
    slug: "policy-article",
    contentStatus: "published",
    bodyHtml: "<p>内容</p>",
  });

  assert.equal(entry.contentStatus, "published");
  assert.equal(entry.authorName, "华美服务中心");
  assert.equal(entry.reviewerName, "");
  assert.equal(entry.lastReviewedAt, "");
  assert.equal(entry.applicability, "");
  assert.deepEqual(entry.sourceUrls, []);
  assert.equal(writes.some((item) => /INSERT INTO cms_entries/.test(item.sql)), true);
});

test("POST rejects an existing id instead of bypassing optimistic locking", async () => {
  const env = {
    CMS_AUTH_BYPASS: "true",
    HM_CMS_DB: {
      prepare(sql) {
        return {
          bind() {
            return {
              first() {
                if (sql.includes("WHERE id = ?")) return dbRowFromEntry(normalizeEntryForStorage(baseApartment));
                return null;
              },
              run() {
                return { meta: { changes: 1 } };
              },
            };
          },
        };
      },
    },
  };
  const request = new Request("http://127.0.0.1:8788/api/content", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(baseApartment),
  });

  const response = await createContentPost({ request, env });
  const payload = await response.json();

  assert.equal(response.status, 409);
  assert.match(payload.error, /已存在|刷新|编辑/);
});

test("archiveEntry returns 404 when the entry does not exist", async () => {
  const env = {
    HM_CMS_DB: {
      prepare(sql) {
        return {
          bind() {
            return {
              first() {
                return null;
              },
              run() {
                return { meta: { changes: 0 } };
              },
            };
          },
        };
      },
    },
  };

  await assert.rejects(
    () => archiveEntry(env, "missing-entry", { editorEmail: "admin@example.com" }),
    (error) => error instanceof HttpError && error.status === 404
  );
});

test("deletePermanentEntry requires matching confirmation before deleting the row", async () => {
  const writes = [];
  const existing = dbRowFromEntry(normalizeEntryForStorage(baseApartment));
  const env = {
    HM_CMS_DB: {
      prepare(sql) {
        return {
          bind(...args) {
            return {
              first() {
                if (sql.includes("WHERE id = ?")) return existing;
                return null;
              },
              run() {
                writes.push({ sql, args });
                return { meta: { changes: 1 } };
              },
            };
          },
        };
      },
    },
  };

  await assert.rejects(
    () => deletePermanentEntry(env, baseApartment.id, { confirmation: "wrong", editorEmail: "admin@example.com" }),
    (error) => error instanceof HttpError && error.status === 400 && /确认/.test(error.message)
  );

  const deleted = await deletePermanentEntry(env, baseApartment.id, {
    confirmation: "396",
    editorEmail: "admin@example.com",
  });

  assert.equal(deleted.id, baseApartment.id);
  assert.equal(writes.some((write) => /DELETE FROM cms_entries/.test(write.sql)), true);
  assert.equal(writes.some((write) => /cms_audit_log/.test(write.sql) && write.args.includes("delete_permanent")), true);
});

test("content DELETE permanent mode removes content instead of archiving", async () => {
  const writes = [];
  const existing = dbRowFromEntry(normalizeEntryForStorage(baseApartment));
  const env = {
    CMS_AUTH_BYPASS: "true",
    HM_CMS_DB: {
      prepare(sql) {
        return {
          bind(...args) {
            return {
              first() {
                if (sql.includes("WHERE id = ?")) return existing;
                return null;
              },
              run() {
                writes.push({ sql, args });
                return { meta: { changes: 1 } };
              },
            };
          },
        };
      },
    },
  };
  const request = new Request("http://127.0.0.1:8788/api/content/entry-1?permanent=1", {
    method: "DELETE",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ confirmation: "396" }),
  });

  const response = await deleteContentById({ request, env, params: { id: baseApartment.id } });
  const payload = await response.json();

  assert.equal(response.status, 200);
  assert.equal(payload.ok, true);
  assert.equal(writes.some((write) => /DELETE FROM cms_entries/.test(write.sql)), true);
});

test("renderHtmlErrorPage gives visitors a friendly HTML fallback", () => {
  const html = renderHtmlErrorPage("内容暂时无法加载");

  assert.match(html, /内容暂时无法加载/);
  assert.match(html, /650-576-8590/);
  assert.match(html, /HM 华美服务中心/);
});

test("notFoundResponse uses the Chinese friendly HTML page and keeps 404 status", async () => {
  const response = notFoundResponse("公寓详情不存在");
  const html = await response.text();

  assert.equal(response.status, 404);
  assert.match(html, /公寓详情不存在/);
  assert.match(html, /650-576-8590/);
  assert.match(html, /HM 华美服务中心/);
});

test("blog detail 404 uses Chinese visitor-facing copy", async () => {
  const env = {
    HM_CMS_DB: {
      prepare() {
        return {
          bind() {
            return {
              first() {
                return null;
              },
            };
          },
        };
      },
    },
  };

  const response = await getBlogPost({
    request: new Request("https://huameihope.com/blog/missing"),
    env,
    params: { slug: "missing" },
  });
  const html = await response.text();

  assert.equal(response.status, 404);
  assert.match(html, /文章不存在/);
  assert.doesNotMatch(html, /Blog post not found/);
});

function encodeBase64Url(value) {
  return Buffer.from(value).toString("base64url");
}

function dbRowFromEntry(entry) {
  return {
    id: entry.id,
    type: entry.type,
    slug: entry.slug,
    apartment_number: entry.apartmentNumber,
    title: entry.title,
    summary: entry.summary,
    body_html: entry.bodyHtml,
    content_status: entry.contentStatus,
    cover_image_url: entry.coverImageUrl,
    gallery_images_json: JSON.stringify(entry.galleryImages || []),
    cover_alt: entry.coverAlt,
    published_at: entry.publishedAt,
    created_at: entry.createdAt,
    updated_at: entry.updatedAt,
    is_pinned: entry.isPinned ? 1 : 0,
    city: entry.city,
    region: entry.region,
    age_requirement: entry.ageRequirement,
    room_types_json: JSON.stringify(entry.roomTypes),
    application_status: entry.applicationStatus,
    tags_json: JSON.stringify(entry.tags),
    rent_range: entry.rentRange,
    income_limit: entry.incomeLimit,
    application_deadline: entry.applicationDeadline,
    external_apply_link: entry.externalApplyLink,
    blog_category: entry.blogCategory,
    author_name: entry.authorName,
    reviewer_name: entry.reviewerName,
    last_reviewed_at: entry.lastReviewedAt,
    applicability: entry.applicability,
    source_urls_json: JSON.stringify(entry.sourceUrls || []),
    seo_title: entry.seoTitle,
    seo_description: entry.seoDescription,
    last_editor_email: "",
  };
}

test("isNewEntry marks entries published within seven days", () => {
  const now = Date.parse("2026-07-05T12:00:00Z");
  assert.equal(isNewEntry({ publishedAt: "2026-07-01" }, now), true);
  assert.equal(isNewEntry({ publishedAt: "2026-06-27" }, now), false);
  assert.equal(isNewEntry({ publishedAt: "2026-07-09" }, now), false);
  assert.equal(isNewEntry({ publishedAt: "" }, now), false);
});
