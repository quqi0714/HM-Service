export const CONTENT_TYPES = Object.freeze({
  APARTMENT: "apartment",
  BLOG: "blog",
});

export const CONTENT_STATUS = Object.freeze({
  DRAFT: "draft",
  PUBLISHED: "published",
  ARCHIVED: "archived",
});

export const REGION_LABELS = Object.freeze({
  south: "南加州",
  north: "北加州",
  outside: "外州",
});

export const APARTMENT_STATUS_OPTIONS = [
  "开放中",
  "抽签中",
  "候补中",
  "已满",
  "已截止",
  "已过期",
];

export const APARTMENT_TAG_OPTIONS = [
  "重点推荐",
  "全新公寓",
  "限时开放",
  "即将开放",
  "资料齐全优先",
  "适合长者",
  "适合家庭",
];

export const AGE_OPTIONS = ["18+", "55+", "62+"];
export const ROOM_OPTIONS = ["1B", "2B", "3B", "3B+"];

const ALLOWED_RICH_TEXT_TAGS = new Set(["h2", "h3", "p", "ul", "ol", "li", "strong", "em", "a", "br"]);
const RICH_TEXT_VOID_TAGS = new Set(["br"]);
const BLOCKED_RICH_TEXT_TAGS = ["script", "style", "iframe", "object", "embed", "svg", "math", "template"];
const RICH_TEXT_BLOCK_TAG_PATTERN = /<\/?(?:h2|h3|p|ul|ol|li)\b/i;
const VALID_TYPES = new Set(Object.values(CONTENT_TYPES));
const VALID_STATUS = new Set(Object.values(CONTENT_STATUS));
const GA_MEASUREMENT_ID = "G-B1ZL92HNR6";
const STATIC_SITEMAP_URLS = [
  { path: "/", priority: "1.0" },
  { path: "/vehicle.html" },
  { path: "/health.html" },
  { path: "/love-health.html" },
];
const LIST_SITEMAP_URLS = [{ path: "/apartments" }, { path: "/blog" }];

export function normalizeSlug(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-")
    .slice(0, 90);
}

export function normalizeApartmentNumber(value) {
  return String(value || "").trim().replace(/[^\d]/g, "").replace(/^0+(?=\d)/, "");
}

export function buildApartmentSlug(apartmentNumber) {
  const normalizedNumber = normalizeApartmentNumber(apartmentNumber);
  return normalizedNumber ? `apartment-${normalizedNumber}` : "";
}

export function sanitizeRichText(value) {
  let html = normalizeRichTextInput(value);
  html = html.replace(/<!--[\s\S]*?-->/g, "");

  BLOCKED_RICH_TEXT_TAGS.forEach((tag) => {
    html = html.replace(new RegExp(`<${tag}\\b[\\s\\S]*?<\\/${tag}>`, "gi"), "");
    html = html.replace(new RegExp(`<${tag}\\b[^>]*\\/?>`, "gi"), "");
  });

  let output = "";
  let lastIndex = 0;
  const tagPattern = /<\/?([a-zA-Z][a-zA-Z0-9-]*)(?:\s[^>]*)?>/g;
  let match = tagPattern.exec(html);

  while (match) {
    output += escapeHtml(normalizeRichTextText(html.slice(lastIndex, match.index)));

    const rawTag = match[0];
    const tagName = match[1].toLowerCase();
    const isClosing = rawTag.startsWith("</");

    if (ALLOWED_RICH_TEXT_TAGS.has(tagName)) {
      if (isClosing) {
        if (!RICH_TEXT_VOID_TAGS.has(tagName)) output += `</${tagName}>`;
      } else if (tagName === "a") {
        const safeHref = normalizeSafeHref(readAttribute(rawTag, "href"));
        output += safeHref
          ? `<a href="${escapeAttribute(safeHref)}" target="_blank" rel="noopener nofollow">`
          : "<a>";
      } else if (RICH_TEXT_VOID_TAGS.has(tagName)) {
        output += `<${tagName}>`;
      } else {
        output += `<${tagName}>`;
      }
    }

    lastIndex = match.index + rawTag.length;
    match = tagPattern.exec(html);
  }

  output += escapeHtml(normalizeRichTextText(html.slice(lastIndex)));
  return output.trim();
}

function normalizeRichTextInput(value) {
  let html = String(value || "").replace(/\r\n?/g, "\n");
  html = html.replace(/&nbsp;/gi, " ");
  html = html.replace(/<b\b[^>]*>/gi, "<strong>").replace(/<\/b>/gi, "</strong>");
  html = html.replace(/<i\b[^>]*>/gi, "<em>").replace(/<\/i>/gi, "</em>");
  html = html.replace(/<div\b[^>]*>/gi, "<p>").replace(/<\/div>/gi, "</p>");
  html = html.replace(/<span\b[^>]*>/gi, "").replace(/<\/span>/gi, "");
  html = html.replace(/<font\b[^>]*>/gi, "").replace(/<\/font>/gi, "");
  html = html.replace(/<p>\s*(?:<br\s*\/?>)?\s*<\/p>/gi, "");

  if (!RICH_TEXT_BLOCK_TAG_PATTERN.test(html)) {
    if (html.includes("\n")) {
      html = plainTextToRichHtml(html);
    } else if (/<br\s*\/?>/i.test(html)) {
      html = looseBreaksToParagraphs(html);
    }
  }

  return html;
}

function plainTextToRichHtml(value) {
  return String(value || "")
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => {
      const lines = block
        .split(/\n/)
        .map((line) => line.trim())
        .filter(Boolean);
      return lines.length ? `<p>${lines.map(escapeHtml).join("<br>")}</p>` : "";
    })
    .filter(Boolean)
    .join("");
}

function looseBreaksToParagraphs(value) {
  return String(value || "")
    .split(/<br\s*\/?>/i)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => `<p>${line}</p>`)
    .join("");
}

function normalizeRichTextText(value) {
  return decodeHtmlEntitiesDeep(value).replace(/\u00a0/g, " ");
}

export function normalizeEntryForStorage(entry, options = {}) {
  const now = options.now || new Date().toISOString();
  const type = VALID_TYPES.has(entry?.type) ? entry.type : CONTENT_TYPES.APARTMENT;
  const contentStatus = VALID_STATUS.has(entry?.contentStatus) ? entry.contentStatus : CONTENT_STATUS.DRAFT;
  const title = String(entry?.title || "").trim();
  const bodyHtml = sanitizeRichText(entry?.bodyHtml);
  const summary = deriveSummary(entry, bodyHtml);
  const apartmentNumber = type === CONTENT_TYPES.APARTMENT ? normalizeApartmentNumber(entry?.apartmentNumber) : "";
  const titleSlug = normalizeSlug(title);
  const inputSlug = normalizeSlug(entry?.slug);
  const apartmentSlug = type === CONTENT_TYPES.APARTMENT ? buildApartmentSlug(apartmentNumber) : "";
  const publishedAt =
    contentStatus === CONTENT_STATUS.PUBLISHED
      ? normalizePlainDate(entry?.publishedAt) || now.slice(0, 10)
      : normalizePlainDate(entry?.publishedAt);
  const galleryImages = normalizeGalleryImages(entry?.galleryImages, entry?.coverImageUrl || entry?.coverImage);
  const coverImageUrl = galleryImages[0] || "";

  return {
    id: String(entry?.id || createId()).trim(),
    type,
    title,
    slug: apartmentSlug || inputSlug || titleSlug || `post-${Date.now()}`,
    contentStatus,
    summary,
    bodyHtml,
    coverImageUrl,
    galleryImages,
    coverAlt: String(entry?.coverAlt || "").trim() || `${title || "内容"}宣传图`,
    publishedAt,
    createdAt: entry?.createdAt || now,
    updatedAt: now,
    apartmentNumber,
    isPinned: type === CONTENT_TYPES.APARTMENT ? Boolean(entry?.isPinned) : false,
    city: type === CONTENT_TYPES.APARTMENT ? String(entry?.city || "").trim() : "",
    region: type === CONTENT_TYPES.APARTMENT && REGION_LABELS[entry?.region] ? entry.region : "",
    ageRequirement:
      type === CONTENT_TYPES.APARTMENT && AGE_OPTIONS.includes(entry?.ageRequirement) ? entry.ageRequirement : "",
    roomTypes: type === CONTENT_TYPES.APARTMENT ? normalizeRoomTypes(entry?.roomTypes) : [],
    applicationStatus: "",
    tags: type === CONTENT_TYPES.APARTMENT ? normalizeApartmentTags(entry?.tags) : uniqueStrings(entry?.tags),
    rentRange: type === CONTENT_TYPES.APARTMENT ? String(entry?.rentRange || "").trim() : "",
    incomeLimit: type === CONTENT_TYPES.APARTMENT ? String(entry?.incomeLimit || "").trim() : "",
    applicationDeadline:
      type === CONTENT_TYPES.APARTMENT ? normalizePlainDate(entry?.applicationDeadline) : "",
    externalApplyLink:
      type === CONTENT_TYPES.APARTMENT ? normalizeSafeHref(entry?.externalApplyLink, { allowRelative: false }) : "",
    blogCategory: type === CONTENT_TYPES.BLOG ? String(entry?.blogCategory || "").trim() : "",
    authorName: type === CONTENT_TYPES.BLOG ? String(entry?.authorName || "").trim() : "",
    seoTitle: String(entry?.seoTitle || "").trim(),
    seoDescription: String(entry?.seoDescription || "").trim(),
  };
}

export function normalizeApartmentTags(tags) {
  const allowedTags = new Set(APARTMENT_TAG_OPTIONS);
  const statusTags = new Set(APARTMENT_STATUS_OPTIONS);
  return uniqueStrings(tags).filter((tag) => allowedTags.has(tag) && !statusTags.has(tag));
}

function deriveSummary(entry, sanitizedBodyHtml) {
  const explicit = normalizeDisplayText(entry?.summary);
  if (explicit) return explicit;

  const bodyText = textFromHtml(sanitizedBodyHtml || entry?.bodyHtml);
  if (bodyText) return bodyText.slice(0, 120);

  return String(entry?.title || "").trim();
}

function textFromHtml(html) {
  return decodeHtmlEntitiesDeep(String(html || "").replace(/<[^>]*>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeDisplayText(value) {
  return decodeHtmlEntitiesDeep(String(value || ""))
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function buildEntryPath(entry) {
  if (entry?.type === CONTENT_TYPES.BLOG) return `/blog/${encodeURIComponent(entry.slug)}`;

  const number = normalizeApartmentNumber(entry?.apartmentNumber);
  if (number) return `/apartments/${encodeURIComponent(number)}`;

  const slug = String(entry?.slug || "").replace(/^apartment-/, "");
  return `/apartments/${encodeURIComponent(slug)}`;
}

export function renderEntryPage(entry, options = {}) {
  const origin = normalizeOrigin(options.origin);
  const siteName = options.siteName || "HM 华美服务中心";
  const canonicalUrl = absoluteUrl(buildEntryPath(entry), origin);
  const pageTitle = entry.seoTitle || entry.title;
  const apartmentSeoFallback =
    entry.type === CONTENT_TYPES.APARTMENT
      ? `${entry.city ? `${entry.city} ` : ""}加州低收入公寓：${entry.title}。${entry.ageRequirement ? `年龄 ${entry.ageRequirement}，` : ""}${(entry.roomTypes || []).length ? `房型 ${entry.roomTypes.join("/")}，` : ""}华美服务中心整理并协助申请。`
      : `${entry.title} - ${siteName}`;
  const description = normalizeDisplayText(entry.seoDescription || entry.summary || apartmentSeoFallback);
  const galleryImages = normalizeGalleryImages(entry.galleryImages, entry.coverImageUrl);
  const imageUrl = galleryImages[0] ? absoluteUrl(galleryImages[0], origin) : "";
  const schema = buildJsonLd(entry, { canonicalUrl, imageUrl, siteName });
  const now = options.now ?? Date.now();
  const factsHtml = entry.type === CONTENT_TYPES.APARTMENT ? renderApartmentFacts(entry) : renderBlogFacts(entry);
  const chipsHtml = renderChips(entry);
  const bodyHtml = sanitizeRichText(entry.bodyHtml);
  const galleryHtml = renderEntryGallery(galleryImages.slice(1), entry, origin);
  const entryKindLabel = entry.type === CONTENT_TYPES.APARTMENT ? `公寓档案 #${entry.apartmentNumber || "未编号"}` : entry.blogCategory || "申请攻略";
  const entryDateLabel = formatPostDate(entry.publishedAt || entry.updatedAt);
  const listPath = entry.type === CONTENT_TYPES.APARTMENT ? "/apartments" : "/blog";
  const summaryHtml =
    entry.type === CONTENT_TYPES.BLOG && normalizeDisplayText(entry.summary)
      ? `<p class="entry-summary">${escapeHtml(normalizeDisplayText(entry.summary))}</p>`
      : "";
  const imageHtml = imageUrl
    ? `<figure class="entry-poster-preview adaptive-media" data-adaptive-media><img src="${escapeAttribute(imageUrl)}" alt="${escapeAttribute(
        entry.coverAlt || entry.title
      )}" decoding="async"><figcaption><button class="image-open" type="button" data-lightbox-src="${escapeAttribute(
        imageUrl
      )}" data-lightbox-alt="${escapeAttribute(entry.coverAlt || entry.title)}" data-lightbox-caption="${escapeAttribute(
        entry.coverAlt || entry.title
      )}">查看完整海报</button></figcaption></figure>`
    : "";

  return `<!doctype html>
<html lang="zh-Hans">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(pageTitle)} | ${escapeHtml(siteName)}</title>
  <meta name="description" content="${escapeAttribute(description)}">
  <link rel="canonical" href="${escapeAttribute(canonicalUrl)}">
  ${renderSharedHeadAssets()}
  ${renderSocialMeta({
    type: "article",
    title: pageTitle,
    description,
    url: canonicalUrl,
    imageUrl,
    siteName,
  })}
  ${renderAnalyticsScript()}
  <style>${renderBaseCss()}</style>
  <script type="application/ld+json">${safeJson(schema)}</script>
  <script type="application/ld+json">${safeJson(buildBreadcrumbJsonLd(entry, { origin }))}</script>
</head>
<body class="has-contact-bar">
  ${renderSiteHeader(siteName, entry.type === CONTENT_TYPES.APARTMENT ? "apartments" : "blog")}
  <main class="entry-page">
    <article class="entry-article">
      <div class="entry-shell">
        <div class="entry-layout${imageHtml ? "" : " entry-layout--text"}">
          <div class="entry-heading">
            <p class="entry-kicker">${escapeHtml(entryKindLabel)} · 发布 ${escapeHtml(entryDateLabel)}</p>
            <div class="entry-meta">${chipsHtml}</div>
            <h1>${escapeHtml(entry.title)}</h1>
            ${summaryHtml}
            ${factsHtml}
            <div class="entry-quick-actions">
              <a class="inline-cta" href="/#contact">咨询梅老师</a>
              <a class="inline-cta secondary" href="${escapeAttribute(listPath)}">返回${entry.type === CONTENT_TYPES.APARTMENT ? "公寓清单" : "申请攻略"}</a>
            </div>
          </div>
          <div class="entry-content">
            <div class="entry-body">${bodyHtml || "<p>内容整理中。</p>"}</div>
            ${galleryHtml}
          </div>
          ${imageHtml ? `<aside class="entry-media-panel">${imageHtml}</aside>` : ""}
        </div>
        ${renderContactCta()}
        ${renderPrimaryAction(entry)}
      </div>
    </article>
  </main>
  ${renderImageLightbox()}
  <div class="mobile-contact-bar" aria-label="快速联系">
    <a class="inline-cta" href="/#contact">咨询梅老师</a>
    <a class="inline-cta secondary" href="tel:+16505768590">拨打电话</a>
  </div>
  ${renderSiteFooter()}
  ${renderAdaptiveMediaScript()}
  ${renderImageLightboxScript()}
</body>
</html>`;
}

export function renderListPage(entries, type, options = {}) {
  const origin = normalizeOrigin(options.origin);
  const siteName = options.siteName || "HM 华美服务中心";
  const isBlog = type === CONTENT_TYPES.BLOG;
  // SEO：H1 与 <title> 围绕"加州低收入公寓清单 / 低收入住房申请攻略"核心搜索词
  const title = isBlog ? "低收入住房申请攻略" : "加州低收入公寓清单";
  const seoListTitle = isBlog
    ? "低收入住房申请攻略 · 材料准备与政策解读"
    : "加州低收入公寓清单 · 老人公寓与可负担住房持续更新";
  const description = isBlog
    ? "华美服务中心整理的加州低收入住房申请攻略：材料准备、排队与资格审核、政策解读，帮华人家庭少走弯路。"
    : "华美服务中心持续更新的加州低收入公寓清单：老人公寓、可负担住房的地区、年龄要求、房型与申请提醒，覆盖洛杉矶、尔湾、旧金山等 60+ 城市。";
  const path = isBlog ? "/blog" : "/apartments";
  const filters = normalizeListFilters(options.filters, type);
  const page = Math.max(1, Number.parseInt(options.page || 1, 10) || 1);
  const pageSize = Math.max(1, Number.parseInt(options.pageSize || 24, 10) || 24);
  const totalEntries = Number.isFinite(options.totalEntries) ? options.totalEntries : entries.length;
  const totalPages = Math.max(1, Number.isFinite(options.totalPages) ? options.totalPages : Math.ceil(totalEntries / pageSize));
  const canonicalUrl = absoluteUrl(buildListPath(path, filters, page), origin);
  const publicEntries = sortPublicEntries(entries).filter((entry) => entry.type === type);
  const listNow = options.now ?? Date.now();

  return `<!doctype html>
<html lang="zh-Hans">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(seoListTitle)} | ${escapeHtml(siteName)}</title>
  <meta name="description" content="${escapeAttribute(description)}">
  <link rel="canonical" href="${escapeAttribute(canonicalUrl)}">
  ${renderSharedHeadAssets()}
  ${renderSocialMeta({
    type: "website",
    title: seoListTitle,
    description,
    url: canonicalUrl,
    imageUrl: absoluteUrl("/images/og-share.jpg", origin),
    siteName,
  })}
  ${renderAnalyticsScript()}
  <style>${renderBaseCss()}</style>
  <script type="application/ld+json">${safeJson(buildListJsonLd(publicEntries, { title, description, canonicalUrl, origin, page }))}</script>
</head>
<body>
  ${renderSiteHeader(siteName, isBlog ? "blog" : "apartments")}
  <main class="list-page">
    <section class="list-heading">
      <div>
        <p class="list-kicker">${isBlog ? "Housing Guide" : "Housing Desk"}</p>
        <h1>${escapeHtml(title)}</h1>
        <p>${escapeHtml(description)}</p>
      </div>
      <div class="list-metrics" aria-label="列表概况">
        <span><strong>${escapeHtml(totalEntries)}</strong>条内容</span>
        <span><strong>${escapeHtml(page)}</strong> / ${escapeHtml(totalPages)} 页</span>
      </div>
    </section>
    ${isBlog ? "" : renderApartmentFilters(filters)}
    <div class="list-tools" id="list">
      <span>${escapeHtml(totalEntries)} 条内容 · 第 ${escapeHtml(page)} / ${escapeHtml(totalPages)} 页</span>
      <span>${isBlog ? "文章按发布时间排序" : "置顶优先，其余按发布时间排序"}</span>
    </div>
    <section class="entry-grid" aria-label="${escapeAttribute(title)}列表">
      ${
        publicEntries.length
          ? publicEntries.map((entry) => renderEntryCard(entry, origin, listNow)).join("")
          : '<p class="empty-state">暂时没有符合条件的已发布内容。</p>'
      }
    </section>
    ${renderPagination(path, filters, page, totalPages)}
    ${renderContactCta()}
  </main>
  ${renderSiteFooter()}
  ${renderAdaptiveMediaScript()}
</body>
</html>`;
}

export function renderHtmlErrorPage(message = "内容暂时无法加载") {
  return `<!doctype html>
<html lang="zh-Hans">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(message)} | HM 华美服务中心</title>
  ${renderSharedHeadAssets()}
  <style>${renderBaseCss()}</style>
</head>
<body>
  ${renderSiteHeader("HM 华美服务中心")}
  <main class="list-page">
    <section class="empty-state">
      <h1>${escapeHtml(message)}</h1>
      <p>页面内容正在加载或维护中，请稍后再试。也可以直接联系华美服务中心确认最新公寓信息。</p>
      <p><a class="inline-cta" href="/#contact">联系梅老师</a> <a class="inline-cta secondary" href="tel:+16505768590">650-576-8590</a></p>
    </section>
  </main>
  ${renderSiteFooter()}
</body>
</html>`;
}

export function buildSitemapXml(entries, origin) {
  const normalizedOrigin = normalizeOrigin(origin);
  const baseUrls = [...STATIC_SITEMAP_URLS, ...LIST_SITEMAP_URLS].map((item) => renderSitemapUrl(item, normalizedOrigin));
  const entryUrls = sortPublicEntries(entries).map((entry) => {
    const loc = absoluteUrl(buildEntryPath(entry), normalizedOrigin);
    const lastmod = normalizePlainDate(entry.updatedAt) || normalizePlainDate(entry.publishedAt);
    return renderSitemapUrl({ loc, lastmod }, normalizedOrigin);
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${[...baseUrls, ...entryUrls].join("\n")}
</urlset>`;
}

export function normalizeListFilters(filters = {}, type = CONTENT_TYPES.APARTMENT) {
  if (type !== CONTENT_TYPES.APARTMENT) return {};
  return {
    query: String(filters.query || "").trim(),
    region: REGION_LABELS[filters.region] ? filters.region : "",
    ageRequirement: AGE_OPTIONS.includes(filters.ageRequirement) ? filters.ageRequirement : "",
    roomType: ROOM_OPTIONS.includes(filters.roomType) ? filters.roomType : "",
  };
}

export function sortPublicEntries(entries) {
  return [...(Array.isArray(entries) ? entries : [])]
    .filter((entry) => entry.contentStatus === CONTENT_STATUS.PUBLISHED)
    .sort((a, b) => {
      const pinnedDelta = Number(Boolean(b.isPinned)) - Number(Boolean(a.isPinned));
      if (pinnedDelta) return pinnedDelta;

      const bTime = Date.parse(b.publishedAt || b.updatedAt || b.createdAt || "");
      const aTime = Date.parse(a.publishedAt || a.updatedAt || a.createdAt || "");
      return (Number.isFinite(bTime) ? bTime : 0) - (Number.isFinite(aTime) ? aTime : 0);
    });
}

export function formatDisplayDate(value) {
  const plainDate = normalizePlainDate(value);
  if (plainDate) return plainDate.replaceAll("-", "/");

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value ? String(value) : "未设置";
  return date.toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

export function formatPostDate(value) {
  const plainDate = normalizePlainDate(value);
  if (plainDate) {
    const [year, month, day] = plainDate.split("-");
    return `${month}-${day}-${year}`;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value ? String(value) : "未设置";
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${month}-${day}-${date.getFullYear()}`;
}

export function getRegionLabel(region) {
  return REGION_LABELS[region] || "未设置";
}

// 业务现实（2026-07-06 用户确认）：绝大多数公寓没有明确截止日，"满了即止"。
// 因此不再渲染截止倒计时/派生状态章；租金、收入限制由正文文案表达。
// applicationDeadline / rentRange / incomeLimit 字段在数据层保留（个别抽签项目未来可低成本恢复展示）。
export function isNewEntry(entry, now = Date.now()) {
  const plain = normalizePlainDate(entry?.publishedAt);
  if (!plain) return false;
  const [year, month, day] = plain.split("-").map(Number);
  const publishedUtc = Date.UTC(year, month - 1, day);
  const age = now - publishedUtc;
  return age >= 0 && age < 7 * 86400000;
}

function renderNewFlag(entry, now) {
  return isNewEntry(entry, now) ? `<span class="new-flag" aria-label="一周内新发布">NEW</span>` : "";
}

export function escapeHtml(value) {
  return String(value || "").replace(/[&<>"']/g, (char) => {
    const map = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" };
    return map[char];
  });
}

export function escapeAttribute(value) {
  return escapeHtml(value).replace(/`/g, "&#096;");
}

function readAttribute(tag, name) {
  const expected = name.toLowerCase();
  const attrPattern = /\s([^\s"'<>/=]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/g;
  let match = attrPattern.exec(tag);

  while (match) {
    if (match[1].toLowerCase() === expected) return match[2] ?? match[3] ?? match[4] ?? "";
    match = attrPattern.exec(tag);
  }

  return "";
}

function normalizeSafeHref(value, options = {}) {
  const href = decodeHtmlEntitiesDeep(String(value || "")).trim();
  const compact = href.replace(/[\u0000-\u001F\u007F\s]+/g, "").toLowerCase();
  if (compact.startsWith("http://") || compact.startsWith("https://") || compact.startsWith("mailto:")) return href;
  if (options.allowRelative && compact.startsWith("/")) return href;
  return "";
}

function normalizeAssetUrl(value) {
  const url = String(value || "").trim();
  if (!url) return "";
  const compact = url.replace(/[\u0000-\u001F\u007F\s]+/g, "").toLowerCase();
  if (compact.startsWith("http://") || compact.startsWith("https://") || compact.startsWith("/")) return url;
  return "";
}

function normalizeGalleryImages(values, fallbackCover = "") {
  const images = [];
  const seen = new Set();
  const add = (value) => {
    const image = normalizeAssetUrl(value);
    if (!image || seen.has(image)) return;
    seen.add(image);
    images.push(image);
  };

  add(fallbackCover);
  (Array.isArray(values) ? values : []).forEach(add);
  return images;
}

function decodeHtmlEntities(value) {
  const named = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", colon: ":", nbsp: "\u00a0" };
  return String(value || "").replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (entity, body) => {
    const lower = body.toLowerCase();
    if (lower.startsWith("#x")) return String.fromCodePoint(Number.parseInt(lower.slice(2), 16));
    if (lower.startsWith("#")) return String.fromCodePoint(Number.parseInt(lower.slice(1), 10));
    return named[lower] || entity;
  });
}

function decodeHtmlEntitiesDeep(value) {
  let output = String(value || "");
  for (let index = 0; index < 3; index += 1) {
    const decoded = decodeHtmlEntities(output);
    if (decoded === output) break;
    output = decoded;
  }
  return output;
}

function uniqueStrings(values) {
  const seen = new Set();
  return (Array.isArray(values) ? values : [])
    .map((value) => String(value || "").trim())
    .filter((value) => {
      if (!value || seen.has(value)) return false;
      seen.add(value);
      return true;
    });
}

function normalizeRoomTypes(values) {
  return uniqueStrings(values).filter((value) => ROOM_OPTIONS.includes(value));
}

function normalizePlainDate(value) {
  const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match ? `${match[1]}-${match[2]}-${match[3]}` : "";
}

function normalizeOrigin(origin) {
  return String(origin || "https://huameihope.com").replace(/\/+$/, "");
}

function absoluteUrl(pathOrUrl, origin) {
  const value = String(pathOrUrl || "");
  if (/^https?:\/\//i.test(value)) return value;
  return `${normalizeOrigin(origin)}${value.startsWith("/") ? value : `/${value}`}`;
}

function renderSharedHeadAssets() {
  return `<link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Marcellus&family=Inter:wght@400;500;600;700&family=Noto+Serif+SC:wght@400;500;600&family=Noto+Sans+SC:wght@400;500;700&display=swap" rel="stylesheet">`;
}

function renderSocialMeta({ type, title, description, url, imageUrl = "", siteName }) {
  return `<meta property="og:type" content="${escapeAttribute(type)}">
  <meta property="og:site_name" content="${escapeAttribute(siteName)}">
  <meta property="og:locale" content="zh_CN">
  <meta property="og:title" content="${escapeAttribute(title)}">
  <meta property="og:description" content="${escapeAttribute(description)}">
  <meta property="og:url" content="${escapeAttribute(url)}">
  ${imageUrl ? `<meta property="og:image" content="${escapeAttribute(imageUrl)}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">` : ""}
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeAttribute(title)}">
  <meta name="twitter:description" content="${escapeAttribute(description)}">
  ${imageUrl ? `<meta name="twitter:image" content="${escapeAttribute(imageUrl)}">` : ""}`;
}

function renderAnalyticsScript() {
  return `<script async src="https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', '${GA_MEASUREMENT_ID}');
  </script>`;
}

function renderSiteHeader(siteName, activeNav = "") {
  const navItems = [
    ["/", "首页", ""],
    ["/#housing", "住房服务", ""],
    ["/apartments", "公寓清单", "apartments"],
    ["/vehicle.html", "购车补贴", ""],
    ["/health.html", "健康关怀", ""],
    ["/blog", "申请攻略", "blog"],
  ];
  const nav = navItems
    .map(([href, label, key]) => {
      const active = key && key === activeNav;
      return `<a href="${href}"${active ? ' class="is-active" aria-current="page"' : ""}>${label}</a>`;
    })
    .join("\n      ");
  return `<header class="site-header">
    <a class="site-brand" href="/">
      <img src="/images/brand/huamei-logo.webp" alt="${escapeAttribute(siteName)}">
      <span>HM 华美服务中心</span>
    </a>
    <nav aria-label="主要导航">
      ${nav}
    </nav>
    <a class="site-header__cta" href="/#contact">咨询梅老师</a>
  </header>`;
}

function renderContactCta() {
  return `<section class="contact-cta" aria-label="联系华美">
    <div>
      <p class="eyebrow">下一步</p>
      <h2>联系华美，确认申请条件</h2>
      <p>公寓开放状态、材料要求和排队时间会变化。提交申请前，建议先让梅老师团队帮您确认资格和材料。</p>
    </div>
    <div class="contact-cta__actions">
      <a class="inline-cta" href="/#contact">咨询梅老师</a>
      <a class="inline-cta secondary" href="tel:+16505768590">650-576-8590</a>
      <span>微信：USA013579</span>
    </div>
  </section>`;
}

function renderSiteFooter() {
  return `<footer class="site-footer">
    <div>
      <strong>HM 华美服务中心</strong>
      <p>123 E Valley Blvd, Suite 106, San Gabriel, CA 91776</p>
      <p><a href="mailto:info.cacar@gmail.com">info.cacar@gmail.com</a> · <a href="tel:+16505768590">650-576-8590</a></p>
    </div>
    <p>我们是独立第三方咨询服务机构，并非政府住房部门或公寓管理方的附属机构。</p>
  </footer>`;
}

function renderApartmentFilters(filters) {
  const activeCount = [filters.ageRequirement, filters.roomType].filter(Boolean).length;
  const summaryLabel = activeCount ? `更多条件 · 已选 ${activeCount} 项` : "更多条件（年龄 / 房型）";
  return `<form class="filter-panel" action="/apartments#list" method="get" role="search">
    <div class="filter-primary">
      <label class="filter-search">
        <span>搜索</span>
        <input name="query" type="search" value="${escapeAttribute(filters.query)}" placeholder="搜索编号、城市、标题">
      </label>
      <label class="filter-region">
        <span>地区</span>
        <select name="region">
          <option value="">全部地区</option>
          ${renderOptions(REGION_LABELS, filters.region)}
        </select>
      </label>
      <button type="submit">搜索</button>
    </div>
    <details class="filter-more" open data-active-filters="${activeCount}">
      <summary><span class="filter-more__icon" aria-hidden="true">▾</span>${escapeHtml(summaryLabel)}</summary>
      <div class="filter-more__body">
        ${renderFilterChipGroup("年龄", "年龄筛选", AGE_OPTIONS, filters, "ageRequirement", "全部年龄")}
        ${renderFilterChipGroup("房型", "房型筛选", ROOM_OPTIONS, filters, "roomType", "全部房型")}
      </div>
    </details>
  </form>
  <script>
(() => {
  // 移动端"更多条件"始终默认折叠（摘要会显示已选数量）；JS 失效时保持展开，不损失任何功能。
  var more = document.querySelector(".filter-more");
  if (!more) return;
  var narrow = window.matchMedia && window.matchMedia("(max-width: 760px)").matches;
  if (narrow) more.removeAttribute("open");
})();
</script>`;
}

function renderOptions(options, selected) {
  return Object.entries(options)
    .map(([value, label]) => `<option value="${escapeAttribute(value)}" ${value === selected ? "selected" : ""}>${escapeHtml(label)}</option>`)
    .join("");
}

function renderFilterChipGroup(label, ariaLabel, options, filters, key, allLabel) {
  return `<div class="filter-chip-row" aria-label="${escapeAttribute(ariaLabel)}">
    <span class="filter-chip-title">${escapeHtml(label)}</span>
    ${renderFilterChip(filters, key, "", allLabel)}
    ${options.map((option) => renderFilterChip(filters, key, option, option)).join("")}
  </div>`;
}

function renderFilterChip(filters, key, value, label) {
  const active = (filters[key] || "") === value;
  const nextFilters = { ...filters, [key]: value };
  return `<a class="filter-chip${active ? " is-active" : ""}" href="${escapeAttribute(
    `${buildListPath("/apartments", nextFilters)}#list`
  )}"${active ? ' aria-current="true"' : ""}>${escapeHtml(label)}</a>`;
}

function renderPagination(path, filters, page, totalPages) {
  if (totalPages <= 1) return "";
  const prev = page > 1 ? `<a href="${escapeAttribute(`${buildListPath(path, filters, page - 1)}#list`)}" rel="prev">上一页</a>` : `<span>上一页</span>`;
  const next = page < totalPages ? `<a href="${escapeAttribute(`${buildListPath(path, filters, page + 1)}#list`)}" rel="next">下一页</a>` : `<span>下一页</span>`;
  return `<nav class="pagination" aria-label="分页">${prev}<strong>${escapeHtml(page)} / ${escapeHtml(totalPages)}</strong>${next}</nav>`;
}

function buildListPath(path, filters = {}, page = 1) {
  const params = new URLSearchParams();
  if (filters.query) params.set("query", filters.query);
  if (filters.region) params.set("region", filters.region);
  if (filters.ageRequirement) params.set("age", filters.ageRequirement);
  if (filters.roomType) params.set("room", filters.roomType);
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `${path}?${query}` : path;
}

function renderSitemapUrl(item, origin) {
  const loc = item.loc || absoluteUrl(item.path, origin);
  return `  <url>
    <loc>${escapeXml(loc)}</loc>
    ${item.lastmod ? `<lastmod>${escapeXml(item.lastmod)}</lastmod>` : ""}
    ${item.priority ? `<priority>${escapeXml(item.priority)}</priority>` : ""}
  </url>`;
}

function buildJsonLd(entry, options) {
  const base = {
    "@context": "https://schema.org",
    "@type": entry.type === CONTENT_TYPES.APARTMENT ? "Apartment" : "Article",
    name: entry.title,
    headline: entry.title,
    description: entry.seoDescription || entry.summary,
    url: options.canonicalUrl,
    datePublished: entry.publishedAt || undefined,
    dateModified: entry.updatedAt || undefined,
    image: options.imageUrl || undefined,
    publisher: {
      "@type": "Organization",
      name: options.siteName,
    },
  };

  if (entry.type === CONTENT_TYPES.APARTMENT) {
    base.address = {
      "@type": "PostalAddress",
      addressLocality: entry.city || undefined,
      addressRegion: REGION_LABELS[entry.region] || undefined,
      addressCountry: "US",
    };
  }

  return removeUndefined(base);
}

function buildListJsonLd(entries, { title, description, canonicalUrl, origin, page }) {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: title,
    description,
    url: canonicalUrl,
    inLanguage: "zh-Hans",
    mainEntity: {
      "@type": "ItemList",
      itemListOrder: "https://schema.org/ItemListOrderDescending",
      numberOfItems: entries.length,
      itemListElement: entries.slice(0, 24).map((entry, index) => ({
        "@type": "ListItem",
        position: (Math.max(1, page || 1) - 1) * 24 + index + 1,
        name: entry.title,
        url: absoluteUrl(buildEntryPath(entry), origin),
      })),
    },
  };
}

function buildBreadcrumbJsonLd(entry, { origin }) {
  const isApartment = entry.type === CONTENT_TYPES.APARTMENT;
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "首页", item: absoluteUrl("/", origin) },
      {
        "@type": "ListItem",
        position: 2,
        name: isApartment ? "加州低收入公寓清单" : "低收入住房申请攻略",
        item: absoluteUrl(isApartment ? "/apartments" : "/blog", origin),
      },
      { "@type": "ListItem", position: 3, name: entry.title, item: absoluteUrl(buildEntryPath(entry), origin) },
    ],
  };
}

function removeUndefined(value) {
  if (Array.isArray(value)) return value.map(removeUndefined);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value)
      .filter(([, item]) => item !== undefined && item !== "")
      .map(([key, item]) => [key, removeUndefined(item)])
  );
}

function safeJson(value) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

function renderApartmentFacts(entry) {
  // 只展示普遍存在的结构化事实；租金/收入/截止等不稳定信息由正文文案表达。
  const facts = [
    ["城市", entry.city],
    ["地区", REGION_LABELS[entry.region] || ""],
    ["年龄要求", entry.ageRequirement],
    ["房型", entry.roomTypes.join(" / ")],
  ].filter(([, value]) => value && value !== "未设置");

  if (!facts.length) return "";
  return `<dl class="entry-facts">${facts
    .map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`)
    .join("")}</dl>`;
}

function renderBlogFacts(entry) {
  const facts = [
    ["分类", entry.blogCategory],
    ["作者", entry.authorName],
    ["发布", formatPostDate(entry.publishedAt)],
  ].filter(([, value]) => value && value !== "未设置");

  if (!facts.length) return "";
  return `<dl class="entry-facts">${facts
    .map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`)
    .join("")}</dl>`;
}

function renderChips(entry, options = {}) {
  const parts = [];
  if (entry.type === CONTENT_TYPES.APARTMENT) {
    // 地区/年龄/房型由事实面板承载，chips 只保留置顶与标签，避免同屏重复。
    if (entry.isPinned) parts.push(`<span class="chip chip--pinned">置顶</span>`);
    uniqueStrings(entry.tags).forEach((tag) => parts.push(`<span class="chip chip--tag">${escapeHtml(tag)}</span>`));
  } else {
    if (entry.blogCategory) parts.push(`<span class="chip chip--category">${escapeHtml(entry.blogCategory)}</span>`);
    uniqueStrings(entry.tags)
      .filter((tag) => tag !== entry.blogCategory)
      .forEach((tag) => parts.push(`<span class="chip chip--tag">${escapeHtml(tag)}</span>`));
  }
  return parts.join("");
}

function renderPrimaryAction(entry) {
  if (entry.type !== CONTENT_TYPES.APARTMENT || !entry.externalApplyLink) return "";
  return `<p class="entry-action"><a href="${escapeAttribute(
    entry.externalApplyLink
  )}" target="_blank" rel="noopener nofollow">查看项目申请页面</a></p>`;
}

function renderEntryGallery(images, entry, origin) {
  if (!images.length) return "";
  return `<section class="entry-gallery" aria-label="更多图片">
    <div class="entry-gallery__head">
      <h2>更多图片</h2>
      <span>点击查看大图</span>
    </div>
    <div class="entry-gallery-grid">
      ${images
        .map((image, index) => {
          const imageUrl = absoluteUrl(image, origin);
          const alt = `${entry.coverAlt || entry.title} ${index + 2}`;
          return `<button class="entry-gallery-card adaptive-media" type="button" data-adaptive-media data-lightbox-src="${escapeAttribute(
            imageUrl
          )}" data-lightbox-alt="${escapeAttribute(alt)}" data-lightbox-caption="${escapeAttribute(alt)}"><img src="${escapeAttribute(
            imageUrl
          )}" alt="${escapeAttribute(alt)}" loading="lazy" decoding="async"></button>`;
        })
        .join("")}
    </div>
  </section>`;
}

function renderEntryCard(entry, origin, now = Date.now()) {
  const image = entry.coverImageUrl
    ? `<div class="entry-card__media adaptive-media" data-adaptive-media><img src="${escapeAttribute(absoluteUrl(entry.coverImageUrl, origin))}" alt="${escapeAttribute(
        entry.coverAlt || entry.title
      )}"></div>`
    : `<div class="entry-card__media empty"></div>`;
  const summaryHtml =
    entry.type === CONTENT_TYPES.BLOG && normalizeDisplayText(entry.summary)
      ? `<p>${escapeHtml(normalizeDisplayText(entry.summary))}</p>`
      : "";

  return `<article class="entry-card">
    <a href="${escapeAttribute(buildEntryPath(entry))}">
      ${image}
      <div class="entry-card__body">
        <div class="entry-card__main">
          <div class="entry-card__top">
            ${entry.type === CONTENT_TYPES.APARTMENT ? `<span class="entry-card__number">#${escapeHtml(entry.apartmentNumber || "未编号")}</span>` : `<span class="entry-card__number">${escapeHtml(entry.blogCategory || "Blog")}</span>`}
            ${renderNewFlag(entry, now)}
            <span class="entry-card__date">${escapeHtml(formatPostDate(entry.publishedAt || entry.updatedAt))}</span>
          </div>
          <h2>${escapeHtml(entry.title)}</h2>
          ${renderCardFacts(entry)}
          <div class="entry-meta">${renderCardChips(entry, { now })}</div>
          ${summaryHtml}
        </div>
        <span class="entry-card__action">查看详情</span>
      </div>
    </a>
  </article>`;
}

function renderCardChips(entry, options = {}) {
  if (entry.type !== CONTENT_TYPES.APARTMENT) return renderChips(entry, options);
  const parts = [];
  if (entry.isPinned) parts.push(`<span class="chip chip--pinned">置顶</span>`);
  uniqueStrings(entry.tags)
    .slice(0, 2)
    .forEach((tag) => parts.push(`<span class="chip chip--tag">${escapeHtml(tag)}</span>`));

  // 移动端隐藏 facts 三列，这里补上仅移动端可见的事实 chips（桌面隐藏，避免与 facts 重复）。
  const mobileFacts = [
    REGION_LABELS[entry.region] ? `<span class="chip chip--fact chip--m">${escapeHtml(REGION_LABELS[entry.region])}</span>` : "",
    entry.ageRequirement ? `<span class="chip chip--fact chip--m">${escapeHtml(entry.ageRequirement)}</span>` : "",
    (entry.roomTypes || []).length ? `<span class="chip chip--fact chip--m">${escapeHtml(entry.roomTypes.join(" / "))}</span>` : "",
  ].filter(Boolean);

  return [...parts, ...mobileFacts].join("");
}

function renderCardFacts(entry) {
  if (entry.type !== CONTENT_TYPES.APARTMENT) return "";
  const facts = [
    ["地区", REGION_LABELS[entry.region] || ""],
    ["年龄", entry.ageRequirement],
    ["房型", (entry.roomTypes || []).join(" / ")],
  ].filter(([, value]) => value);
  return `<dl class="entry-card__facts">${facts
    .map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`)
    .join("")}</dl>`;
}

function renderAdaptiveMediaScript() {
  return `<script>
(() => {
  const classify = (img) => {
    const frame = img.closest("[data-adaptive-media]");
    if (!frame || !img.naturalWidth || !img.naturalHeight) return;
    const ratio = img.naturalWidth / img.naturalHeight;
    frame.dataset.orientation = ratio > 1.22 ? "landscape" : ratio < 0.82 ? "portrait" : "square";
    const url = img.currentSrc || img.src;
    if (url) frame.style.setProperty("--media-bg", "url(" + url + ")");
  };
  document.querySelectorAll("[data-adaptive-media] img").forEach((img) => {
    if (img.complete) classify(img);
    img.addEventListener("load", () => classify(img), { once: true });
  });
})();
</script>`;
}

function renderImageLightbox() {
  return `<div class="image-lightbox" data-image-lightbox hidden role="dialog" aria-modal="true" aria-label="图片预览">
    <button class="image-lightbox__backdrop" type="button" data-lightbox-close aria-label="关闭图片预览"></button>
    <figure class="image-lightbox__panel">
      <button class="image-lightbox__close" type="button" data-lightbox-close>关闭</button>
      <img data-lightbox-image alt="">
      <figcaption data-lightbox-caption></figcaption>
    </figure>
  </div>`;
}

function renderImageLightboxScript() {
  return `<script>
(() => {
  const lightbox = document.querySelector("[data-image-lightbox]");
  if (!lightbox) return;
  const image = lightbox.querySelector("[data-lightbox-image]");
  const caption = lightbox.querySelector("[data-lightbox-caption]");
  let lastTrigger = null;

  const close = () => {
    lightbox.hidden = true;
    document.body.classList.remove("is-lightbox-open");
    image.removeAttribute("src");
    if (lastTrigger) lastTrigger.focus();
  };

  const open = (trigger) => {
    const src = trigger.dataset.lightboxSrc;
    if (!src) return;
    lastTrigger = trigger;
    image.src = src;
    image.alt = trigger.dataset.lightboxAlt || "图片预览";
    caption.textContent = trigger.dataset.lightboxCaption || "";
    lightbox.hidden = false;
    document.body.classList.add("is-lightbox-open");
    const closeButton = lightbox.querySelector(".image-lightbox__close");
    if (closeButton) closeButton.focus();
  };

  document.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const trigger = target.closest("[data-lightbox-src]");
    if (trigger) {
      event.preventDefault();
      open(trigger);
      return;
    }
    if (target.closest("[data-lightbox-close]")) close();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !lightbox.hidden) close();
  });
})();
</script>`;
}

function renderBaseCss() {
  return `
:root{color-scheme:light;--forest:#342b24;--forest-2:#5c4a3e;--bone:#eee5d1;--bone-warm:#fbf8ef;--ink:#2f2924;--muted:#706862;--line:#ddd6c7;--paper:#fffdf8;--paper-2:#f7f9f3;--green:#496f5b;--green-2:#6e8b76;--gold:#b8893e;--sage-soft:#eef4ec;--gold-soft:#fff2d9;--sky-soft:#eef6f7;--blue:#567985;--rose-soft:#fbefea}
*{box-sizing:border-box}html{background:#eef3ec}body{margin:0;overflow-x:hidden;background:linear-gradient(180deg,#fbfaf4 0%,#f4f8f2 34%,#eef4f6 70%,#f7f0df 100%);color:var(--ink);font-family:Inter,"Noto Sans SC",-apple-system,BlinkMacSystemFont,"PingFang SC",sans-serif;line-height:1.65}
a{color:inherit}.site-header{display:flex;justify-content:space-between;gap:22px;align-items:center;padding:12px clamp(18px,4vw,56px);border-bottom:1px solid var(--line);background:rgba(255,253,247,.9);backdrop-filter:blur(16px);position:sticky;top:0;z-index:2}
.site-brand{display:flex;align-items:center;gap:10px;font-family:Marcellus,"Noto Serif SC",Georgia,serif;font-size:18px;font-weight:600;text-decoration:none}.site-brand img{width:42px;height:42px;object-fit:contain}.site-header nav{display:flex;flex-wrap:wrap;justify-content:flex-end;gap:14px;font-size:14px}.site-header nav a{text-decoration:none;color:var(--muted);font-weight:600}.site-header nav a:hover{color:var(--forest)}
.adaptive-media{position:relative;overflow:hidden;background:linear-gradient(135deg,rgba(237,243,236,.9),rgba(247,236,212,.72))}.adaptive-media::before{content:"";position:absolute;inset:-18px;background-image:var(--media-bg);background-size:cover;background-position:center;filter:blur(22px) saturate(1.08);opacity:.32;transform:scale(1.08);pointer-events:none}.adaptive-media>img{position:relative;z-index:1}
.entry-page{width:min(1160px,100%);margin:0 auto;padding:clamp(16px,3vw,34px) clamp(16px,4vw,42px)}.list-page{width:min(1220px,100%);margin:0 auto;padding:clamp(10px,2vw,22px) clamp(14px,4vw,42px) clamp(26px,4vw,52px)}.entry-article{background:rgba(255,253,248,.96);border:1px solid rgba(86,121,133,.18);border-radius:18px;overflow:hidden;box-shadow:0 22px 64px -50px rgba(39,62,70,.6)}.entry-layout{display:grid;grid-template-columns:minmax(0,1fr) minmax(220px,320px);gap:28px;align-items:start}.entry-layout--text{grid-template-columns:1fr}.entry-heading{grid-column:1;min-width:0;align-self:start}.entry-kicker{margin:0 0 10px;color:var(--blue);font-size:13px;font-weight:900;letter-spacing:.12em;text-transform:uppercase}.entry-content{grid-column:1;max-width:820px}.entry-media-panel{grid-column:2;grid-row:1;border:1px solid rgba(86,121,133,.14);border-radius:18px;background:linear-gradient(180deg,#f8fbf7,#eef6f7);padding:10px}.entry-poster-preview{width:100%;max-width:300px;margin:0 auto;border:1px solid rgba(58,46,38,.1);border-radius:14px;padding:0;box-shadow:0 18px 42px -34px rgba(39,62,70,.75)}.entry-poster-preview[data-orientation=portrait]{max-width:230px}.entry-poster-preview[data-orientation=square]{max-width:260px}.entry-poster-preview[data-orientation=landscape]{max-width:300px}.entry-poster-preview img{width:100%;height:auto;max-height:300px;object-fit:contain;display:block;margin:0 auto;background:transparent}.entry-poster-preview figcaption{position:relative;z-index:1;margin:0;padding:8px 10px;text-align:center;font-size:13px;font-weight:900;color:var(--blue);background:rgba(255,253,248,.9)}.image-open{appearance:none;border:0;border-bottom:1px solid currentColor;border-radius:0;background:transparent;color:var(--blue);cursor:pointer;font:inherit;font-weight:900;padding:0;text-decoration:none}.entry-gallery{margin-top:22px;border-top:1px solid var(--line);padding-top:16px}.entry-gallery__head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:10px}.entry-gallery__head h2{font-family:Marcellus,"Noto Serif SC",Georgia,serif;font-size:22px;line-height:1.2;margin:0}.entry-gallery__head span{color:var(--muted);font-size:13px;font-weight:800}.entry-gallery-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:10px}.entry-gallery-card{appearance:none;aspect-ratio:4/3;border:1px solid rgba(58,46,38,.12);border-radius:12px;overflow:hidden;background:var(--sage-soft);box-shadow:0 14px 42px -34px rgba(45,61,50,.65);cursor:zoom-in;font:inherit;padding:0;text-align:left}.entry-gallery img{width:100%;height:100%;object-fit:cover;display:block}
.entry-shell{padding:clamp(20px,3.6vw,42px)}h1{font-family:Marcellus,"Noto Serif SC",Georgia,serif;font-size:clamp(30px,3vw,44px);font-weight:500;line-height:1.1;margin:12px 0 16px;letter-spacing:0;overflow-wrap:anywhere}.entry-summary{font-size:clamp(17px,1.7vw,21px);color:var(--muted);margin:0 0 18px}
.entry-meta{display:flex;flex-wrap:wrap;gap:8px}.entry-meta span{border:1px solid var(--line);border-radius:999px;padding:4px 12px;background:#fffdf7;color:#5c5148;font-size:14px;font-weight:700}.entry-meta span:first-child{border-color:rgba(58,46,38,.2);background:var(--forest);color:var(--bone-warm)}.entry-meta span:nth-child(2){border-color:rgba(95,132,107,.28);background:var(--sage-soft);color:#3e654d}.entry-meta span:nth-child(3){border-color:rgba(191,152,84,.32);background:var(--gold-soft);color:#745622}.entry-meta span:nth-child(n+4){border-color:rgba(100,127,135,.28);background:var(--sky-soft);color:#496972}.entry-facts{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin:26px 0;padding:0}.entry-facts div{border-top:1px solid var(--line);padding-top:10px}.entry-facts dt{color:var(--muted);font-size:13px}.entry-facts dd{margin:3px 0 0;font-weight:800}
.entry-body{font-size:18px;background:rgba(255,255,255,.55);border:1px solid rgba(86,121,133,.12);border-radius:16px;padding:18px}.entry-body h2,.entry-body h3{line-height:1.25;margin:28px 0 10px}.entry-body p,.entry-body ul,.entry-body ol{margin:0 0 16px}.entry-body a{color:#6f4a12;font-weight:800}.entry-action a{display:inline-flex;text-decoration:none;background:var(--forest);color:var(--bone-warm);border-radius:999px;padding:12px 18px;font-weight:800}.entry-quick-actions{display:flex;flex-wrap:wrap;gap:10px;margin-top:18px}
.list-heading{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:18px;align-items:end;padding:8px 0 14px}.list-kicker{margin:0 0 4px;color:var(--blue);font-size:12px;font-weight:900;letter-spacing:.16em;text-transform:uppercase}.list-heading h1{font-size:clamp(30px,3vw,46px);margin:0 0 4px}.list-heading p{color:var(--muted);font-size:16px;line-height:1.55;margin:0;max-width:720px}.list-metrics{display:flex;gap:8px;align-items:center}.list-metrics span{min-width:98px;border:1px solid rgba(86,121,133,.16);border-radius:14px;background:rgba(255,255,255,.62);padding:9px 12px;color:var(--muted);font-size:12px;font-weight:800}.list-metrics strong{display:block;color:var(--forest);font-size:22px;line-height:1}.list-tools{display:flex;justify-content:space-between;gap:12px;align-items:center;margin:0 0 10px;color:var(--muted);font-size:14px;font-weight:800}.entry-grid{display:grid;grid-template-columns:1fr;gap:10px}
.filter-panel{display:grid;grid-template-columns:minmax(230px,1fr) 260px 82px;gap:8px;align-items:end;margin:0 0 10px;padding:10px;border:1px solid rgba(86,121,133,.16);border-radius:16px;background:rgba(255,255,255,.68);box-shadow:0 18px 54px -50px rgba(45,61,50,.45)}.filter-panel label{display:grid;gap:4px;color:var(--muted);font-size:12px;font-weight:800}.filter-panel input,.filter-panel select{min-height:36px;border:1px solid var(--line);border-radius:10px;background:#fffdf8;color:var(--ink);padding:0 10px;font:inherit}.filter-panel button,.inline-cta{min-height:36px;border:1px solid var(--forest);border-radius:999px;background:var(--forest);color:var(--bone-warm);padding:0 14px;font:inherit;font-weight:800;text-decoration:none;display:inline-flex;align-items:center;justify-content:center}.filter-chip-row{display:flex;align-items:center;flex-wrap:wrap;gap:6px}.filter-chip-row:nth-of-type(1){grid-column:1/2}.filter-chip-row:nth-of-type(2){grid-column:2/4}.filter-chip-title{color:var(--muted);font-size:12px;font-weight:800;margin-right:2px}.filter-chip{min-height:30px;border:1px solid var(--line);border-radius:999px;background:#fffdf8;color:var(--forest);padding:3px 10px;text-decoration:none;font-size:13px;font-weight:800}.filter-chip.is-active{border-color:#4f745f;background:#4f745f;color:var(--bone-warm)}.switch-field{align-self:center;display:flex!important;grid-template-columns:none!important;flex-direction:row;align-items:center;gap:8px;color:var(--ink)!important}.switch-field input[type=checkbox]{min-height:auto;width:18px;height:18px}
.entry-card{background:rgba(255,253,248,.94);border:1px solid rgba(86,121,133,.16);border-left:5px solid #5f846b;border-radius:16px;overflow:hidden;box-shadow:0 18px 60px -54px rgba(39,62,70,.65)}.entry-card:nth-of-type(3n+2){border-left-color:#b8893e}.entry-card:nth-of-type(3n){border-left-color:var(--blue)}.entry-card a{display:grid;grid-template-columns:148px minmax(0,1fr);min-height:168px;text-decoration:none;height:100%}.entry-card__media{border-right:1px solid rgba(86,121,133,.12);height:168px;display:flex;align-items:center;justify-content:center;overflow:hidden}.entry-card__media img{width:100%;height:100%;object-fit:cover;display:block;background:transparent}.entry-card__media.empty:before{content:"HM";color:var(--line);font-family:Marcellus,Georgia,serif;font-size:28px}.entry-card__body{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:16px;padding:14px 16px;min-width:0}.entry-card__main{min-width:0;overflow:hidden}.entry-card__top{display:flex;align-items:center;gap:8px;margin-bottom:5px}.entry-card__number{border-radius:999px;background:var(--sky-soft);color:var(--blue);padding:3px 9px;font-size:13px;font-weight:900}.entry-card h2{font-family:Marcellus,"Noto Serif SC",Georgia,serif;font-size:24px;font-weight:500;line-height:1.18;margin:4px 0 10px;max-width:760px;overflow-wrap:anywhere}.entry-card p{color:var(--muted);margin:0 0 10px}.entry-card__facts{display:grid;grid-template-columns:repeat(3,minmax(92px,1fr));gap:8px;margin:0 0 10px;padding:0;max-width:620px}.entry-card__facts div{border-top:1px solid rgba(95,132,107,.24);padding-top:7px}.entry-card__facts dt{color:var(--muted);font-size:12px}.entry-card__facts dd{margin:2px 0 0;font-size:15px;font-weight:800}.entry-card__date{border:1px solid rgba(191,152,84,.28);border-radius:999px;background:var(--gold-soft);color:var(--ink);font-size:13px;font-weight:900;line-height:1;padding:5px 10px;white-space:nowrap}.entry-card__action{align-self:center;border-bottom:1px solid currentColor;color:var(--green);font-size:14px;font-weight:900;white-space:nowrap}
.pagination{display:flex;align-items:center;justify-content:center;gap:12px;margin:26px 0}.pagination a,.pagination span,.pagination strong{border:1px solid var(--line);border-radius:999px;background:#fffaf1;padding:8px 14px;text-decoration:none;color:var(--ink);font-weight:800}.pagination span{opacity:.42}.empty-state,.contact-cta{padding:24px;background:var(--paper);border:1px solid var(--line);border-radius:16px;color:var(--muted)}.contact-cta{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:18px;align-items:center;margin:28px 0 0}.contact-cta h2{font-family:Marcellus,"Noto Serif SC",Georgia,serif;color:var(--ink);font-size:28px;line-height:1.2;margin:4px 0 8px}.contact-cta p{margin:0}.eyebrow{color:var(--green);font-size:12px;font-weight:800;letter-spacing:.18em;text-transform:uppercase}.contact-cta__actions{display:flex;flex-wrap:wrap;align-items:center;justify-content:flex-end;gap:10px}.inline-cta.secondary{background:transparent;color:var(--forest)}.site-footer{width:min(1120px,100%);margin:0 auto;padding:26px clamp(18px,4vw,52px) 42px;color:var(--muted);border-top:1px solid var(--line)}.site-footer strong{color:var(--forest)}.site-footer p{margin:6px 0}body.is-lightbox-open{overflow:hidden}.image-lightbox[hidden]{display:none}.image-lightbox{position:fixed;inset:0;z-index:50;display:grid;place-items:center;padding:24px;background:rgba(23,20,18,.74);backdrop-filter:blur(10px)}.image-lightbox__backdrop{position:absolute;inset:0;border:0;background:transparent;cursor:zoom-out}.image-lightbox__panel{position:relative;z-index:1;margin:0;display:grid;gap:10px;justify-items:center;max-width:min(94vw,980px);max-height:88vh}.image-lightbox__panel img{max-width:100%;max-height:78vh;object-fit:contain;border-radius:16px;background:#fffdf8;box-shadow:0 28px 90px -34px rgba(0,0,0,.72)}.image-lightbox__panel figcaption{max-width:min(90vw,760px);color:#fffdf8;text-align:center;font-size:14px;font-weight:800}.image-lightbox__close{position:absolute;right:10px;top:10px;border:1px solid rgba(255,255,255,.45);border-radius:999px;background:rgba(255,253,248,.94);color:var(--forest);padding:7px 12px;font:inherit;font-weight:900;cursor:pointer;box-shadow:0 12px 34px -22px rgba(0,0,0,.8)}
@media(max-width:760px){.site-header{align-items:flex-start;flex-direction:column;padding:10px 14px}.site-header nav{width:100%;justify-content:flex-start;gap:6px 10px;font-size:13px}.entry-page{padding:12px}.list-page{padding:8px 12px 24px}.entry-article{border-radius:12px}.entry-shell{padding:16px}.entry-layout{grid-template-columns:1fr;gap:14px}.entry-heading,.entry-content,.entry-media-panel{grid-column:1;grid-row:auto}.entry-media-panel{padding:8px}.entry-poster-preview,.entry-poster-preview[data-orientation=portrait],.entry-poster-preview[data-orientation=square],.entry-poster-preview[data-orientation=landscape]{max-width:min(100%,190px);justify-self:center}.entry-poster-preview img{max-height:250px}h1{font-size:28px;line-height:1.14;word-break:break-word;overflow-wrap:anywhere}.entry-summary{font-size:17px}.entry-body{font-size:17px;padding:14px}.entry-gallery-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.list-heading{grid-template-columns:1fr;padding:4px 0 8px}.list-heading h1{font-size:28px;margin-bottom:2px}.list-heading p{font-size:14px;line-height:1.45}.list-metrics{display:none}.list-tools{font-size:13px;margin-bottom:8px}.filter-panel{grid-template-columns:minmax(0,1fr) 82px;gap:6px;border-radius:13px;padding:8px;margin-bottom:8px}.filter-panel label{gap:3px;font-size:11px}.filter-panel label span{display:none}.filter-search{grid-column:1/2}.filter-region{grid-column:1/-1}.filter-panel button{grid-column:2/3;grid-row:1}.filter-panel input,.filter-panel select,.filter-panel button{min-height:34px}.filter-chip-row{grid-column:1/-1!important;gap:5px;flex-wrap:nowrap;overflow-x:auto;padding-bottom:2px}.filter-chip-title{font-size:11px}.filter-chip{min-height:30px;font-size:12px;padding:4px 9px;flex:0 0 auto}.entry-grid{display:block}.entry-card{border-radius:0;border-width:1px 0 1px 5px;margin:0 -12px 8px;box-shadow:none}.entry-card a{grid-template-columns:92px minmax(0,1fr);min-height:136px}.entry-card__media{height:136px}.entry-card__body{display:flex;flex-direction:column;gap:6px;padding:9px 10px;min-width:0}.entry-card__top{margin-bottom:0}.entry-card h2{font-size:16px;line-height:1.28;margin:3px 0 2px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;word-break:break-word;overflow-wrap:anywhere}.entry-card p{font-size:14px;line-height:1.55}.entry-card__facts{display:none}.entry-card__action{display:none}.entry-card .entry-meta{gap:5px;max-height:25px;overflow:hidden}.entry-card .entry-meta span{font-size:12px;padding:2px 8px}.entry-card .entry-meta span:nth-child(n+5){display:none}.entry-card__date{font-size:12px;padding:4px 8px}.contact-cta{grid-template-columns:1fr;padding:18px}.contact-cta h2{font-size:24px}.contact-cta__actions{justify-content:flex-start}.site-footer{padding:22px 14px 36px}}
@media(max-width:760px){.site-header{gap:8px;padding:8px 12px}.site-brand img{width:34px;height:34px}.site-brand{font-size:16px}.site-header nav{flex-wrap:nowrap;overflow-x:auto;white-space:nowrap;padding-bottom:2px;gap:12px;font-size:12px;scrollbar-width:none}.site-header nav::-webkit-scrollbar{display:none}}

/* ===== HM 主站视觉归队 + 移动优先升级（2026-07-05，追加覆盖层） ===== */
/* T1 暖纸色系归队：覆盖上方 token，蓝灰系整体转暖 */
:root{--forest:#3A2E26;--bone:#F2EAD8;--bone-warm:#F8F1E2;--line:#ded4c4;--paper:#fffdf8;--paper-2:#f8f4ea;--sage:#6B7A5A;--sage-soft:#edf1e7;--gold:#a8813c;--gold-soft:#f8ecd6;--sky-soft:#f2ede1;--blue:#7c6a49;--rose:#a4432e;--rose-soft:#f7e9e2}
html{background:#f2ead8}body{background:linear-gradient(180deg,#faf6ec 0%,#f6efdf 38%,#f2ead8 76%,#efe4cd 100%)}
.entry-article{border-color:rgba(90,76,62,.16);box-shadow:0 22px 64px -50px rgba(74,60,46,.55)}
.entry-card{border-color:rgba(90,76,62,.15);box-shadow:0 18px 60px -54px rgba(74,60,46,.6)}
.entry-card__media{border-right-color:rgba(90,76,62,.12)}
.filter-panel{border-color:rgba(90,76,62,.16);background:rgba(253,250,242,.8)}
.entry-media-panel{border-color:rgba(90,76,62,.14);background:linear-gradient(180deg,#faf6ec,#f4ecdb)}
.entry-body{border-color:rgba(90,76,62,.12)}
.list-metrics span{border-color:rgba(90,76,62,.16)}
.adaptive-media{background:linear-gradient(135deg,rgba(243,238,226,.9),rgba(247,236,212,.72))}

/* T5/T6 排版 */
h1,h2,.entry-card h2{text-wrap:balance}
.list-metrics strong,.entry-card__number,.entry-card__date,.entry-facts dd,.entry-card__facts dd,.pagination strong{font-variant-numeric:tabular-nums}

/* T7 header CTA + T4 当前页高亮 */
.site-header__cta{flex:0 0 auto;border:1px solid var(--forest);border-radius:999px;background:var(--forest);color:var(--bone-warm);padding:8px 16px;font-size:14px;font-weight:800;text-decoration:none;transition:transform .2s cubic-bezier(.22,1,.36,1),box-shadow .2s}
.site-header__cta:hover{transform:translateY(-1px);box-shadow:0 10px 26px -14px rgba(58,46,38,.55)}
.site-header nav a{position:relative}
.site-header nav a.is-active{color:var(--forest)}
.site-header nav a.is-active::after{content:"";position:absolute;left:0;right:0;bottom:-4px;height:2px;background:var(--gold);border-radius:2px}

/* T2 语义徽章：状态=实心+呼吸点，事实=线框，标签=纸底 */
.entry-meta span.chip{border:1px solid var(--line);border-radius:999px;padding:4px 12px;background:var(--paper);color:#5c5148;font-size:14px;font-weight:700}
.entry-meta .chip--pinned{border-color:rgba(58,46,38,.24);background:var(--forest);color:var(--bone-warm)}
.entry-meta .chip--category{border-color:rgba(107,122,90,.3);background:var(--sage-soft);color:#4a5c3e}
.entry-meta .chip--tag{background:var(--bone-warm);color:#6d6156}
.entry-meta .chip--fact{background:transparent;color:#6d6156}
.entry-meta .chip--m{display:none}

/* C-M4 NEW 标记 */
.new-flag{border-radius:6px;background:var(--gold);color:#fff;padding:2px 7px;font-size:11px;font-weight:900;letter-spacing:.06em;animation:hm-blur-in .6s cubic-bezier(.22,1,.36,1) both}
@keyframes hm-blur-in{from{opacity:0;filter:blur(4px)}to{opacity:1;filter:blur(0)}}

/* C-M1 卡片入场 stagger（纯 CSS，基态可见，JS 失效也绝不空白） */
.entry-grid .entry-card{animation:hm-card-in .5s cubic-bezier(.22,1,.36,1) both}
.entry-grid .entry-card:nth-of-type(1){animation-delay:.02s}.entry-grid .entry-card:nth-of-type(2){animation-delay:.08s}.entry-grid .entry-card:nth-of-type(3){animation-delay:.14s}.entry-grid .entry-card:nth-of-type(4){animation-delay:.2s}.entry-grid .entry-card:nth-of-type(5){animation-delay:.26s}.entry-grid .entry-card:nth-of-type(6){animation-delay:.32s}.entry-grid .entry-card:nth-of-type(n+7){animation-delay:.38s}
@keyframes hm-card-in{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}

/* MB1 筛选折叠 */
.filter-panel{display:block}
.filter-primary{display:grid;grid-template-columns:minmax(230px,1fr) 260px 96px;gap:8px;align-items:end}
.filter-more{margin-top:8px}
.filter-more summary{display:none;cursor:pointer;list-style:none;user-select:none;color:var(--forest);font-size:13px;font-weight:800;border:1px solid var(--line);border-radius:999px;background:var(--paper);padding:9px 14px;align-items:center;gap:8px}
.filter-more summary::-webkit-details-marker{display:none}
.filter-more__icon{display:inline-block;margin-right:6px;transition:transform .2s}
.filter-more[open] .filter-more__icon{transform:rotate(180deg)}
.filter-more__body{display:grid;gap:6px;margin-top:8px}

/* MB2 移动端底部悬浮联系条（仅详情页移动端显示） */
.mobile-contact-bar{display:none}

/* 桌面 hover 细节 */
@media(hover:hover){.entry-card{transition:transform .25s cubic-bezier(.22,1,.36,1),box-shadow .25s}.entry-card:hover{transform:translateY(-2px);box-shadow:0 26px 70px -50px rgba(74,60,46,.75)}.filter-chip{transition:border-color .2s,background .2s}.filter-chip:hover{border-color:var(--sage)}}

@media(max-width:760px){
  /* T7：移动端隐藏 header CTA（由悬浮条/底部 CTA 承担） */
  .site-header__cta{display:none}
  /* T3：移动端用事实 chips 补位（桌面隐藏）；营销标签让位给事实，控制卡片高度 ≤5 枚 */
  .entry-meta .chip--m{display:inline-flex}
  .entry-card .entry-meta{max-height:none;overflow:visible}
  .entry-card .entry-meta span:nth-child(n+5){display:inline-flex}
  .entry-card .entry-meta .chip--tag{display:none}
  /* 缩略图随卡片高度伸展，杜绝下方留白 */
  .entry-card__media{height:auto;min-height:136px;align-self:stretch}
  .entry-card__media img{position:absolute;inset:0;width:100%;height:100%}
  .entry-card__media.adaptive-media{position:relative}
  /* MB1：移动端摘要可见、面板紧凑 */
  .filter-primary{grid-template-columns:minmax(0,1fr) 88px;gap:6px}
  .filter-search{grid-column:1/2}
  .filter-primary button{grid-column:2/3;grid-row:1}
  .filter-region{grid-column:1/-1}
  .filter-more summary{display:flex}
  /* MB2：悬浮联系条 */
  .mobile-contact-bar{position:fixed;left:0;right:0;bottom:0;z-index:40;display:flex;gap:8px;padding:10px 12px calc(10px + env(safe-area-inset-bottom));background:rgba(248,241,226,.96);backdrop-filter:blur(14px);border-top:1px solid var(--line);box-shadow:0 -14px 34px -26px rgba(58,46,38,.5)}
  .mobile-contact-bar .inline-cta{flex:1;min-height:44px;font-size:15px;white-space:nowrap}
  body.has-contact-bar .site-footer{padding-bottom:calc(96px + env(safe-area-inset-bottom))}
  /* MB4：触控目标 ≥44px */
  .filter-chip{min-height:44px;display:inline-flex;align-items:center;padding:4px 14px}
  .filter-chip-row{flex-wrap:wrap;overflow-x:visible}
  .pagination a,.pagination span,.pagination strong{min-height:44px;display:inline-flex;align-items:center;padding:8px 18px}
  .filter-more summary{min-height:44px;display:flex;align-items:center}
  .filter-panel input,.filter-panel select,.filter-panel button{min-height:44px}
  /* MB3：锚点落点避开吸顶 header */
  #list{scroll-margin-top:96px}
}
@media(min-width:761px){#list{scroll-margin-top:84px}}

/* 尊重系统减弱动态偏好：所有装饰动效关闭 */
@media (prefers-reduced-motion: reduce){
  .entry-grid .entry-card,.new-flag{animation:none}
  .entry-card,.site-header__cta,.filter-chip,.filter-more__icon{transition:none}
}
`;
}

function escapeXml(value) {
  return String(value || "").replace(/[<>&'"]/g, (char) => {
    const map = { "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" };
    return map[char];
  });
}

function createId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `entry-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
