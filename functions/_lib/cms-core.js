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

  return {
    id: String(entry?.id || createId()).trim(),
    type,
    title,
    slug: apartmentSlug || inputSlug || titleSlug || `post-${Date.now()}`,
    contentStatus,
    summary,
    bodyHtml,
    coverImageUrl: normalizeAssetUrl(entry?.coverImageUrl || entry?.coverImage),
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
  const description = normalizeDisplayText(entry.seoDescription || entry.summary || `${entry.title} - ${siteName}`);
  const imageUrl = entry.coverImageUrl ? absoluteUrl(entry.coverImageUrl, origin) : "";
  const schema = buildJsonLd(entry, { canonicalUrl, imageUrl, siteName });
  const factsHtml = entry.type === CONTENT_TYPES.APARTMENT ? renderApartmentFacts(entry) : renderBlogFacts(entry);
  const chipsHtml = renderChips(entry);
  const bodyHtml = sanitizeRichText(entry.bodyHtml);
  const summaryHtml =
    entry.type === CONTENT_TYPES.BLOG && normalizeDisplayText(entry.summary)
      ? `<p class="entry-summary">${escapeHtml(normalizeDisplayText(entry.summary))}</p>`
      : "";
  const imageHtml = imageUrl
    ? `<figure class="entry-poster-preview"><img src="${escapeAttribute(imageUrl)}" alt="${escapeAttribute(
        entry.coverAlt || entry.title
      )}" decoding="async"><figcaption><a href="${escapeAttribute(
        imageUrl
      )}" target="_blank" rel="noopener">查看完整海报</a></figcaption></figure>`
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
</head>
<body>
  ${renderSiteHeader(siteName)}
  <main class="entry-page">
    <article class="entry-article">
      <div class="entry-shell">
        <div class="entry-hero-grid">
          <div class="entry-heading">
            <div class="entry-meta">${chipsHtml}</div>
            <h1>${escapeHtml(entry.title)}</h1>
            ${summaryHtml}
            ${factsHtml}
          </div>
          ${imageHtml}
        </div>
        <div class="entry-content">
          <div class="entry-body">${bodyHtml || "<p>内容整理中。</p>"}</div>
        </div>
        ${renderContactCta()}
        ${renderPrimaryAction(entry)}
      </div>
    </article>
  </main>
  ${renderSiteFooter()}
</body>
</html>`;
}

export function renderListPage(entries, type, options = {}) {
  const origin = normalizeOrigin(options.origin);
  const siteName = options.siteName || "HM 华美服务中心";
  const isBlog = type === CONTENT_TYPES.BLOG;
  const title = isBlog ? "申请攻略" : "加州公寓更新";
  const description = isBlog
    ? "华美服务中心整理的低收入住房申请攻略与材料准备提醒。"
    : "华美服务中心整理的加州公寓信息、年龄要求、房型和申请提醒。";
  const path = isBlog ? "/blog" : "/apartments";
  const filters = normalizeListFilters(options.filters, type);
  const page = Math.max(1, Number.parseInt(options.page || 1, 10) || 1);
  const pageSize = Math.max(1, Number.parseInt(options.pageSize || 24, 10) || 24);
  const totalEntries = Number.isFinite(options.totalEntries) ? options.totalEntries : entries.length;
  const totalPages = Math.max(1, Number.isFinite(options.totalPages) ? options.totalPages : Math.ceil(totalEntries / pageSize));
  const canonicalUrl = absoluteUrl(buildListPath(path, filters, page), origin);
  const publicEntries = sortPublicEntries(entries).filter((entry) => entry.type === type);

  return `<!doctype html>
<html lang="zh-Hans">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)} | ${escapeHtml(siteName)}</title>
  <meta name="description" content="${escapeAttribute(description)}">
  <link rel="canonical" href="${escapeAttribute(canonicalUrl)}">
  ${renderSharedHeadAssets()}
  ${renderSocialMeta({
    type: "website",
    title,
    description,
    url: canonicalUrl,
    siteName,
  })}
  ${renderAnalyticsScript()}
  <style>${renderBaseCss()}</style>
</head>
<body>
  ${renderSiteHeader(siteName)}
  <main class="list-page">
    <section class="list-hero">
      <h1>${escapeHtml(title)}</h1>
      <p>${escapeHtml(description)}</p>
    </section>
    ${isBlog ? "" : renderApartmentFilters(filters)}
    <div class="list-summary">${escapeHtml(totalEntries)} 条内容 · 第 ${escapeHtml(page)} / ${escapeHtml(totalPages)} 页</div>
    <section class="entry-grid" aria-label="${escapeAttribute(title)}列表">
      ${
        publicEntries.length
          ? publicEntries.map((entry) => renderEntryCard(entry, origin)).join("")
          : '<p class="empty-state">暂时没有符合条件的已发布内容。</p>'
      }
    </section>
    ${renderPagination(path, filters, page, totalPages)}
    ${renderContactCta()}
  </main>
  ${renderSiteFooter()}
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

function renderSiteHeader(siteName) {
  return `<header class="site-header">
    <a class="site-brand" href="/">
      <img src="/images/brand/huamei-logo.webp" alt="${escapeAttribute(siteName)}">
      <span>HM 华美服务中心</span>
    </a>
    <nav aria-label="主要导航">
      <a href="/">首页</a>
      <a href="/#housing">住房服务</a>
      <a href="/apartments">公寓清单</a>
      <a href="/vehicle.html">购车补贴</a>
      <a href="/health.html">健康关怀</a>
      <a href="/blog">申请攻略</a>
    </nav>
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
  return `<form class="filter-panel" action="/apartments" method="get" role="search">
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
    ${renderFilterChipGroup("年龄", "年龄筛选", AGE_OPTIONS, filters, "ageRequirement", "全部年龄")}
    ${renderFilterChipGroup("房型", "房型筛选", ROOM_OPTIONS, filters, "roomType", "全部房型")}
  </form>`;
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
    buildListPath("/apartments", nextFilters)
  )}"${active ? ' aria-current="true"' : ""}>${escapeHtml(label)}</a>`;
}

function renderPagination(path, filters, page, totalPages) {
  if (totalPages <= 1) return "";
  const prev = page > 1 ? `<a href="${escapeAttribute(buildListPath(path, filters, page - 1))}">上一页</a>` : `<span>上一页</span>`;
  const next = page < totalPages ? `<a href="${escapeAttribute(buildListPath(path, filters, page + 1))}">下一页</a>` : `<span>下一页</span>`;
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
  const facts = [
    ["城市", entry.city],
    ["地区", REGION_LABELS[entry.region] || ""],
    ["年龄要求", entry.ageRequirement],
    ["房型", entry.roomTypes.join(" / ")],
    ["租金范围", entry.rentRange],
    ["收入限制", entry.incomeLimit],
    ["申请截止", formatDisplayDate(entry.applicationDeadline)],
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

function renderChips(entry) {
  const chips = [];
  if (entry.type === CONTENT_TYPES.APARTMENT) {
    if (entry.isPinned) chips.push("置顶");
    if (REGION_LABELS[entry.region]) chips.push(REGION_LABELS[entry.region]);
    if (entry.ageRequirement) chips.push(entry.ageRequirement);
    chips.push(...entry.roomTypes);
  } else if (entry.blogCategory) {
    chips.push(entry.blogCategory);
  }
  chips.push(...entry.tags);

  return uniqueStrings(chips).map((chip) => `<span>${escapeHtml(chip)}</span>`).join("");
}

function renderPrimaryAction(entry) {
  if (entry.type !== CONTENT_TYPES.APARTMENT || !entry.externalApplyLink) return "";
  return `<p class="entry-action"><a href="${escapeAttribute(
    entry.externalApplyLink
  )}" target="_blank" rel="noopener nofollow">查看项目申请页面</a></p>`;
}

function renderEntryCard(entry, origin) {
  const image = entry.coverImageUrl
    ? `<img src="${escapeAttribute(absoluteUrl(entry.coverImageUrl, origin))}" alt="${escapeAttribute(
        entry.coverAlt || entry.title
      )}">`
    : "";

  return `<article class="entry-card">
    <a href="${escapeAttribute(buildEntryPath(entry))}">
      ${image}
      <div class="entry-card__body">
        <div class="entry-card__thread">
          <span class="entry-card__date">发布 ${escapeHtml(formatPostDate(entry.publishedAt || entry.updatedAt))}</span>
          <div class="entry-meta">${renderCardChips(entry)}</div>
        </div>
        <h2>${escapeHtml(entry.title)}</h2>
        <p>${escapeHtml(normalizeDisplayText(entry.summary))}</p>
      </div>
    </a>
  </article>`;
}

function renderCardChips(entry) {
  if (entry.type !== CONTENT_TYPES.APARTMENT) return renderChips(entry);
  const chips = [
    entry.isPinned ? "置顶" : "",
    REGION_LABELS[entry.region] || "",
    entry.ageRequirement,
    ...(entry.roomTypes || []).slice(0, 1),
  ];
  return uniqueStrings(chips)
    .slice(0, 5)
    .map((chip) => `<span>${escapeHtml(chip)}</span>`)
    .join("");
}

function renderBaseCss() {
  return `
:root{color-scheme:light;--forest:#3a2e26;--forest-2:#5c4a3e;--bone:#f2ead8;--bone-warm:#f8f1e2;--ink:#342b24;--muted:#6f655d;--line:#ded4c4;--paper:#f8f1e5;--green:#486f5a;--gold:#c8a667}
*{box-sizing:border-box}html{background:var(--bone)}body{margin:0;background:linear-gradient(180deg,#f8f1e2 0%,var(--bone) 42%,#e8dcc5 100%);color:var(--ink);font-family:Inter,"Noto Sans SC",-apple-system,BlinkMacSystemFont,"PingFang SC",sans-serif;line-height:1.65}
a{color:inherit}.site-header{display:flex;justify-content:space-between;gap:22px;align-items:center;padding:16px clamp(18px,4vw,56px);border-bottom:1px solid var(--line);background:rgba(248,241,226,.94);backdrop-filter:blur(16px);position:sticky;top:0;z-index:2}
.site-brand{display:flex;align-items:center;gap:10px;font-family:Marcellus,"Noto Serif SC",Georgia,serif;font-size:18px;font-weight:600;text-decoration:none}.site-brand img{width:42px;height:42px;object-fit:contain}.site-header nav{display:flex;flex-wrap:wrap;justify-content:flex-end;gap:14px;font-size:14px}.site-header nav a{text-decoration:none;color:var(--muted);font-weight:600}.site-header nav a:hover{color:var(--forest)}
.entry-page,.list-page{width:min(1120px,100%);margin:0 auto;padding:clamp(18px,4vw,52px)}.entry-article{background:var(--paper);border:1px solid var(--line);border-radius:18px;overflow:hidden;box-shadow:0 24px 70px -52px rgba(58,46,38,.6)}.entry-hero-grid{display:grid;grid-template-columns:minmax(0,1fr) minmax(300px,440px);gap:32px;align-items:start}.entry-heading{min-width:0}.entry-content{margin-top:28px}.entry-poster-preview{width:100%;max-width:440px;margin:4px 0 0;justify-self:end;background:#fffaf1;border:1px solid var(--line);border-radius:16px;padding:10px;box-shadow:0 20px 60px -46px rgba(58,46,38,.7)}.entry-poster-preview img{width:100%;max-height:620px;object-fit:contain;display:block;background:#fffaf1}.entry-poster-preview figcaption{margin-top:8px;text-align:center;font-size:13px;font-weight:800;color:var(--muted)}.entry-poster-preview a{text-decoration:none;border-bottom:1px solid currentColor}
.entry-shell{padding:clamp(22px,5vw,58px)}h1{font-family:Marcellus,"Noto Serif SC",Georgia,serif;font-size:clamp(34px,6vw,64px);font-weight:500;line-height:1.08;margin:12px 0 16px;letter-spacing:0}.entry-summary{font-size:clamp(18px,2.1vw,24px);color:var(--muted);margin:0 0 24px}
.entry-meta{display:flex;flex-wrap:wrap;gap:8px}.entry-meta span{border:1px solid var(--line);border-radius:999px;padding:4px 12px;background:#fffaf1;color:#5c5148;font-size:14px;font-weight:700}.entry-facts{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin:26px 0;padding:0}.entry-facts div{border-top:1px solid var(--line);padding-top:10px}.entry-facts dt{color:var(--muted);font-size:13px}.entry-facts dd{margin:3px 0 0;font-weight:800}
.entry-body{font-size:18px}.entry-body h2,.entry-body h3{line-height:1.25;margin:28px 0 10px}.entry-body p,.entry-body ul,.entry-body ol{margin:0 0 16px}.entry-body a{color:#6f4a12;font-weight:800}.entry-action a{display:inline-flex;text-decoration:none;background:var(--forest);color:var(--bone-warm);border-radius:999px;padding:12px 18px;font-weight:800}
.list-hero{padding:20px 0 28px}.list-hero h1{margin-bottom:10px}.list-hero p{color:var(--muted);font-size:19px;margin:0}.list-summary{margin:0 0 16px;color:var(--muted);font-weight:700}.entry-grid{display:grid;grid-template-columns:1fr;gap:14px}
.filter-panel{display:grid;grid-template-columns:minmax(180px,.8fr) 190px auto;gap:10px;align-items:end;margin:0 0 18px;padding:14px;border:1px solid var(--line);border-radius:16px;background:rgba(248,241,226,.78)}.filter-panel label{display:grid;gap:6px;color:var(--muted);font-size:13px;font-weight:800}.filter-panel input,.filter-panel select{min-height:42px;border:1px solid var(--line);border-radius:10px;background:#fffaf1;color:var(--ink);padding:0 12px;font:inherit}.filter-panel button,.inline-cta{min-height:42px;border:1px solid var(--forest);border-radius:999px;background:var(--forest);color:var(--bone-warm);padding:0 16px;font:inherit;font-weight:800;text-decoration:none;display:inline-flex;align-items:center;justify-content:center}.filter-chip-row{grid-column:1/-1;display:flex;align-items:center;flex-wrap:wrap;gap:8px}.filter-chip-title{color:var(--muted);font-size:13px;font-weight:800;margin-right:2px}.filter-chip{min-height:36px;border:1px solid var(--line);border-radius:999px;background:#fffaf1;color:var(--forest);padding:6px 12px;text-decoration:none;font-size:14px;font-weight:800}.filter-chip.is-active{border-color:var(--forest);background:var(--forest);color:var(--bone-warm)}.switch-field{align-self:center;display:flex!important;grid-template-columns:none!important;flex-direction:row;align-items:center;gap:8px;color:var(--ink)!important}.switch-field input[type=checkbox]{min-height:auto;width:18px;height:18px}
.entry-card{background:var(--paper);border:1px solid var(--line);border-radius:14px;overflow:hidden}.entry-card a{display:grid;grid-template-columns:220px minmax(0,1fr);min-height:260px;text-decoration:none;height:100%}.entry-card img{width:100%;height:260px;object-fit:contain;background:#fffaf1;display:block}.entry-card__body{padding:16px;min-width:0}.entry-card h2{font-family:Marcellus,"Noto Serif SC",Georgia,serif;font-size:28px;font-weight:500;line-height:1.15;margin:10px 0 8px}.entry-card p{color:var(--muted);margin:0 0 12px}.entry-card__thread{display:flex!important;align-items:flex-start;justify-content:space-between;gap:8px;padding:0!important}.entry-card__thread .entry-meta{margin:0;padding:0!important;justify-content:flex-end}.entry-card__date{border:1px solid var(--line);border-radius:999px;background:#fffaf1;color:var(--ink);font-size:13px;font-weight:800;line-height:1;padding:5px 10px;white-space:nowrap}
.pagination{display:flex;align-items:center;justify-content:center;gap:12px;margin:26px 0}.pagination a,.pagination span,.pagination strong{border:1px solid var(--line);border-radius:999px;background:#fffaf1;padding:8px 14px;text-decoration:none;color:var(--ink);font-weight:800}.pagination span{opacity:.42}.empty-state,.contact-cta{padding:24px;background:var(--paper);border:1px solid var(--line);border-radius:16px;color:var(--muted)}.contact-cta{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:18px;align-items:center;margin:28px 0 0}.contact-cta h2{font-family:Marcellus,"Noto Serif SC",Georgia,serif;color:var(--ink);font-size:28px;line-height:1.2;margin:4px 0 8px}.contact-cta p{margin:0}.eyebrow{color:var(--green);font-size:12px;font-weight:800;letter-spacing:.18em;text-transform:uppercase}.contact-cta__actions{display:flex;flex-wrap:wrap;align-items:center;justify-content:flex-end;gap:10px}.inline-cta.secondary{background:transparent;color:var(--forest)}.site-footer{width:min(1120px,100%);margin:0 auto;padding:26px clamp(18px,4vw,52px) 42px;color:var(--muted);border-top:1px solid var(--line)}.site-footer strong{color:var(--forest)}.site-footer p{margin:6px 0}
@media(max-width:760px){.site-header{align-items:flex-start;flex-direction:column;padding:14px 16px}.site-header nav{width:100%;justify-content:flex-start;gap:10px 14px}.entry-page,.list-page{padding:14px}.entry-article{border-radius:12px}.entry-shell{padding:18px}.entry-hero-grid{grid-template-columns:1fr;gap:18px}.entry-poster-preview{max-width:320px;justify-self:start}h1{font-size:34px}.entry-summary{font-size:17px}.entry-body{font-size:17px}.filter-panel{grid-template-columns:1fr;gap:9px;border-radius:12px}.filter-chip-row{gap:6px}.filter-chip{min-height:34px;font-size:13px;padding:5px 10px}.entry-grid{display:block}.entry-card{border-radius:0;border-width:1px 0;margin:0 -14px}.entry-card a{grid-template-columns:112px 1fr;min-height:126px}.entry-card img{height:126px;object-fit:contain}.entry-card h2{font-size:19px;margin:6px 0}.entry-card p{font-size:14px;line-height:1.55}.entry-card__body{padding:10px 12px}.entry-card__thread{flex-direction:column;align-items:flex-start;gap:6px}.entry-card__thread .entry-meta{justify-content:flex-start;width:100%;gap:5px}.entry-card .entry-meta span{font-size:12px;padding:2px 8px}.entry-card__date{font-size:12px;padding:4px 8px}.contact-cta{grid-template-columns:1fr;padding:18px}.contact-cta h2{font-size:24px}.contact-cta__actions{justify-content:flex-start}.site-footer{padding:22px 14px 36px}}
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
