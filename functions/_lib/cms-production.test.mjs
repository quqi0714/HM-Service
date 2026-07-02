import test from "node:test";
import assert from "node:assert/strict";

import {
  buildEntryPath,
  buildSitemapXml,
  formatPostDate,
  getRegionLabel,
  normalizeEntryForStorage,
  renderHtmlErrorPage,
  renderListPage,
  renderEntryPage,
  sanitizeRichText,
  sortPublicEntries,
} from "./cms-core.js";
import { archiveEntry, upsertEntry } from "./content-repository.js";
import { HttpError, notFoundResponse, requireAdmin } from "./http.js";
import { onRequestPost as createContentPost } from "../api/content/index.js";
import { onRequestGet as getBlogPost } from "../blog/[slug].js";

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

test("normalizeEntryForStorage preserves outside-state region values", () => {
  const entry = normalizeEntryForStorage({
    ...baseApartment,
    region: "outside",
  });

  assert.equal(entry.region, "outside");
  assert.equal(getRegionLabel(entry.region), "外州");
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
  });

  assert.match(html, /<span class="entry-card__date">发布 07-01-2026<\/span>/);
  assert.match(html, /<span>置顶<\/span>/);
  assert.match(html, /<span>1B<\/span>/);
  assert.match(html, /name="query"/);
  assert.match(html, /<details class="filter-advanced"/);
  assert.match(html, /<summary>更多筛选 ▾<\/summary>/);
  assert.match(html, /<button type="submit">应用筛选<\/button>/);
  assert.doesNotMatch(html, /仅看开放中|抽签中|申请状态|openOnly/);
  assert.match(html, /href="\/apartments\?page=2"/);
  assert.doesNotMatch(html, /<summary>筛选<\/summary>[\s\S]*<button type="submit">筛选<\/button>/);
  assert.doesNotMatch(html, /<span>重点推荐<\/span>/);
  assert.match(html, /aspect-ratio:3\/4/);
  assert.match(html, /object-fit:contain/);
  assert.match(html, /联系华美，确认申请条件/);
  assert.match(html, /123 E Valley Blvd, Suite 106/);
});

test("renderEntryPage emits SEO-ready HTML without unsafe body markup", () => {
  const entry = normalizeEntryForStorage(baseApartment);
  const html = renderEntryPage(entry, {
    origin: "https://huameihope.com",
    siteName: "HM 华美服务中心",
  });

  assert.match(html, /<title>San Gabriel 62\+ 长者公寓抽签开放 \| HM 华美服务中心<\/title>/);
  assert.match(html, /<meta name="description" content="南加州 62\+ 长者公寓近期抽签开放。">/);
  assert.match(html, /<link rel="canonical" href="https:\/\/huameihope\.com\/apartments\/396">/);
  assert.match(html, /<meta property="og:site_name" content="HM 华美服务中心">/);
  assert.match(html, /<meta property="og:locale" content="zh_CN">/);
  assert.match(html, /<meta name="twitter:card" content="summary_large_image">/);
  assert.match(html, /gtag\/js\?id=G-B1ZL92HNR6/);
  assert.match(html, /<script type="application\/ld\+json">/);
  assert.match(html, /"@type":"Apartment"/);
  assert.match(html, /class="entry-hero__media"/);
  assert.match(html, /查看完整海报/);
  assert.match(html, /height:clamp\(240px,38vh,360px\)/);
  assert.doesNotMatch(html, /max-height:min\(780px,88vh\)/);
  assert.doesNotMatch(html, /class="entry-summary"/);
  assert.match(html, /<dt>城市<\/dt><dd>San Gabriel<\/dd>/);
  assert.match(html, /<dt>申请截止<\/dt><dd>2026\/08\/15<\/dd>/);
  assert.doesNotMatch(html, /<dt>申请状态<\/dt>|抽签中/);
  assert.match(html, /联系华美，确认申请条件/);
  assert.match(html, /123 E Valley Blvd, Suite 106/);
  assert.match(html, /rel="noopener nofollow"/);
  assert.doesNotMatch(html, /onclick|javascript:|<script>alert/i);
});

test("buildSitemapXml includes published apartment and blog routes", () => {
  const apartment = normalizeEntryForStorage(baseApartment);
  const blog = normalizeEntryForStorage({
    id: "blog-1",
    type: "blog",
    title: "申请材料准备清单",
    slug: "housing-document-checklist",
    contentStatus: "published",
    summary: "提前准备材料可以减少补件。",
    bodyHtml: "<p>正文</p>",
    publishedAt: "2026-07-02",
  });
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
  assert.match(xml, /<priority>1\.0<\/priority>/);
  assert.match(xml, /<loc>https:\/\/huameihope\.com\/vehicle\.html<\/loc>/);
  assert.match(xml, /<loc>https:\/\/huameihope\.com\/health\.html<\/loc>/);
  assert.match(xml, /<loc>https:\/\/huameihope\.com\/love-health\.html<\/loc>/);
  assert.match(xml, /<loc>https:\/\/huameihope\.com\/apartments<\/loc>/);
  assert.match(xml, /<loc>https:\/\/huameihope\.com\/blog<\/loc>/);
  assert.match(xml, /<loc>https:\/\/huameihope\.com\/apartments\/396<\/loc>/);
  assert.match(xml, /<loc>https:\/\/huameihope\.com\/blog\/housing-document-checklist<\/loc>/);
  assert.doesNotMatch(xml, /draft/);
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
    seo_title: entry.seoTitle,
    seo_description: entry.seoDescription,
    last_editor_email: "",
  };
}
