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

export const CONTENT_STATUS_LABELS = Object.freeze({
  draft: "草稿",
  published: "已发布",
  archived: "已下架",
});

const LEGACY_APARTMENT_STATUS_OPTIONS = [
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
  const digits = String(value || "").trim().replace(/[^\d]/g, "").replace(/^0+(?=\d)/, "");
  return digits;
}

export function buildApartmentSlug(apartmentNumber) {
  const normalizedNumber = normalizeApartmentNumber(apartmentNumber);
  return normalizedNumber ? `apartment-${normalizedNumber}` : "";
}

const ALLOWED_RICH_TEXT_TAGS = new Set(["h2", "h3", "p", "ul", "ol", "li", "strong", "em", "a", "br"]);
const RICH_TEXT_VOID_TAGS = new Set(["br"]);
const BLOCKED_RICH_TEXT_TAGS = ["script", "style", "iframe", "object", "embed", "svg", "math", "template"];
const RICH_TEXT_BLOCK_TAG_PATTERN = /<\/?(?:h2|h3|p|ul|ol|li)\b/i;

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

function readAttribute(tag, name) {
  const pattern = new RegExp(`${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s"'=<>` + "`" + `]+))`, "i");
  const match = tag.match(pattern);
  return match ? match[1] ?? match[2] ?? match[3] ?? "" : "";
}

function normalizeSafeHref(value) {
  const href = decodeHtmlEntitiesDeep(String(value || "")).trim();
  const compact = href.replace(/[\u0000-\u001F\u007F\s]+/g, "").toLowerCase();
  if (compact.startsWith("http://") || compact.startsWith("https://") || compact.startsWith("mailto:")) {
    return href;
  }
  return "";
}

function normalizeAssetUrl(value) {
  const url = String(value || "").trim();
  if (!url) return "";
  const compact = url.replace(/[\u0000-\u001F\u007F\s]+/g, "").toLowerCase();
  if (
    compact.startsWith("http://") ||
    compact.startsWith("https://") ||
    compact.startsWith("/") ||
    compact.startsWith("./") ||
    compact.startsWith("../") ||
    compact.startsWith("data:image/")
  ) {
    return url;
  }
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

function escapeHtml(value) {
  return String(value || "").replace(/[&<>"']/g, (char) => {
    const map = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" };
    return map[char];
  });
}

function escapeAttribute(value) {
  return escapeHtml(value).replace(/`/g, "&#096;");
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

export function normalizeApartmentTags(tags) {
  const allowedTags = new Set(APARTMENT_TAG_OPTIONS);
  const statusTags = new Set(LEGACY_APARTMENT_STATUS_OPTIONS);
  return uniqueStrings(tags).filter((tag) => allowedTags.has(tag) && !statusTags.has(tag));
}

export function findDuplicateApartmentNumber(entries, entry) {
  if (entry?.type !== CONTENT_TYPES.APARTMENT) return null;
  const apartmentNumber = normalizeApartmentNumber(entry.apartmentNumber);
  if (!apartmentNumber) return null;

  return (
    (Array.isArray(entries) ? entries : []).find((item) => {
      return (
        item.type === CONTENT_TYPES.APARTMENT &&
        item.id !== entry.id &&
        normalizeApartmentNumber(item.apartmentNumber) === apartmentNumber
      );
    }) || null
  );
}

export function buildEntryUrl(entry) {
  const type = entry.type === CONTENT_TYPES.BLOG ? "blog" : "apartment";
  return `detail.html?type=${type}&slug=${encodeURIComponent(entry.slug)}`;
}

export function buildPreviewUrl(entry) {
  const type = entry.type === CONTENT_TYPES.BLOG ? "blog" : "apartment";
  return `preview.html?type=${type}&slug=${encodeURIComponent(entry.slug)}`;
}

export function buildRemoteEntryUrl(entry) {
  if (entry?.type === CONTENT_TYPES.BLOG) return `/blog/${encodeURIComponent(entry.slug || "")}`;

  const apartmentNumber = normalizeApartmentNumber(entry?.apartmentNumber);
  if (apartmentNumber) return `/apartments/${encodeURIComponent(apartmentNumber)}`;

  return `/apartments/${encodeURIComponent(String(entry?.slug || "").replace(/^apartment-/, ""))}`;
}

export function buildAdminPreviewUrl(entry) {
  return isPublished(entry) ? buildEntryUrl(entry) : buildPreviewUrl(entry);
}

export function buildAdminTitle(entry) {
  const title = String(entry?.title || "未命名内容").trim() || "未命名内容";
  if (entry?.type !== CONTENT_TYPES.APARTMENT) return title;

  const apartmentNumber = normalizeApartmentNumber(entry.apartmentNumber);
  return apartmentNumber ? `#${apartmentNumber} ${title}` : title;
}

export function getEntryTypeLabel(type) {
  return type === CONTENT_TYPES.BLOG ? "Blog 文章" : "公寓更新";
}

export function getStatusLabel(status) {
  return CONTENT_STATUS_LABELS[status] || "草稿";
}

export function getEditorActionLabels(entry = {}) {
  const status = entry.contentStatus || CONTENT_STATUS.DRAFT;
  const isPublished = status === CONTENT_STATUS.PUBLISHED;
  const isArchived = status === CONTENT_STATUS.ARCHIVED;

  return {
    modeLabel: isPublished ? "编辑已发布帖子" : isArchived ? "编辑已下架帖子" : "准备发布",
    draftAction: isPublished ? "转为草稿" : isArchived ? "恢复为草稿" : "保存草稿",
    publishAction: isPublished ? "更新帖子" : isArchived ? "重新发布" : "发布帖子",
    archiveAction: isArchived ? "已下架" : "下架帖子",
    pinAction: entry.type === CONTENT_TYPES.APARTMENT && entry.isPinned ? "取消置顶" : "设为置顶",
  };
}

export function formatDisplayDate(value) {
  if (!value) return "未设置";
  const plainDate = String(value).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (plainDate) {
    return `${plainDate[1]}/${plainDate[2]}/${plainDate[3]}`;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

export function formatPostDate(value) {
  if (!value) return "未设置";
  const plainDate = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (plainDate) return `${plainDate[2]}-${plainDate[3]}-${plainDate[1]}`;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${month}-${day}-${date.getFullYear()}`;
}

export function getRegionLabel(region) {
  return REGION_LABELS[region] || "未设置";
}

export function isPublished(entry) {
  return entry.contentStatus === CONTENT_STATUS.PUBLISHED;
}

export function sortByNewest(entries) {
  return [...entries].sort((a, b) => {
    const pinnedDelta = Number(Boolean(b.isPinned)) - Number(Boolean(a.isPinned));
    if (pinnedDelta) return pinnedDelta;

    const bDate = Date.parse(b.publishedAt || b.updatedAt || b.createdAt || "");
    const aDate = Date.parse(a.publishedAt || a.updatedAt || a.createdAt || "");
    return (Number.isFinite(bDate) ? bDate : 0) - (Number.isFinite(aDate) ? aDate : 0);
  });
}

export function getPublicEntries(entries, type) {
  return sortByNewest(entries).filter((entry) => entry.type === type && isPublished(entry));
}

export function getPublishedApartmentRows(entries) {
  return sortPublishedApartmentRows(
    (Array.isArray(entries) ? entries : []).filter((entry) => entry.type === CONTENT_TYPES.APARTMENT && isPublished(entry)),
    "publishedAt",
    "desc",
  );
}

export function sortPublishedApartmentRows(entries, sortKey = "publishedAt", direction = "desc") {
  const multiplier = direction === "asc" ? 1 : -1;
  return [...(Array.isArray(entries) ? entries : [])].sort((a, b) => {
    if (sortKey === "apartmentNumber") {
      return multiplier * (Number(normalizeApartmentNumber(a.apartmentNumber) || 0) - Number(normalizeApartmentNumber(b.apartmentNumber) || 0));
    }

    if (sortKey === "title") {
      return multiplier * String(a.title || "").localeCompare(String(b.title || ""), "zh-Hans");
    }

    const bDate = Date.parse(b[sortKey] || b.publishedAt || b.updatedAt || b.createdAt || "");
    const aDate = Date.parse(a[sortKey] || a.publishedAt || a.updatedAt || a.createdAt || "");
    return multiplier * ((Number.isFinite(aDate) ? aDate : 0) - (Number.isFinite(bDate) ? bDate : 0));
  });
}

export function filterApartmentEntries(entries, filters = {}) {
  const publicApartments = getPublicEntries(entries, CONTENT_TYPES.APARTMENT);

  return publicApartments.filter((entry) => {
    if (filters.region && entry.region !== filters.region) return false;
    if (filters.ageRequirement && entry.ageRequirement !== filters.ageRequirement) return false;
    if (filters.roomType && !entry.roomTypes?.includes(filters.roomType)) return false;
    if (filters.tag && !entry.tags?.includes(filters.tag)) return false;

    const query = String(filters.query || "").trim().toLowerCase();
    if (query) {
      const searchable = [
        entry.title,
        entry.summary,
        entry.region,
        entry.ageRequirement,
        ...(entry.roomTypes || []),
        ...(entry.tags || []),
      ]
        .join(" ")
        .toLowerCase();
      if (!searchable.includes(query)) return false;
    }

    return true;
  });
}

export function findEntryBySlug(entries, type, slug, { includeDrafts = false } = {}) {
  return entries.find((entry) => {
    if (entry.type !== type) return false;
    if (entry.slug !== slug) return false;
    return includeDrafts || isPublished(entry);
  });
}

export function createEmptyEntry(type = CONTENT_TYPES.APARTMENT) {
  const now = new Date().toISOString();
  return {
    id: `entry-${Date.now()}`,
    type,
    title: "",
    slug: "",
    contentStatus: CONTENT_STATUS.DRAFT,
    coverImage: "",
    coverImageUrl: "",
    galleryImages: [],
    coverAlt: "",
    summary: "",
    bodyHtml: "",
    publishedAt: "",
    createdAt: now,
    updatedAt: now,
    apartmentNumber: "",
    region: "south",
    ageRequirement: "62+",
    roomTypes: ["1B"],
    applicationStatus: "",
    tags: [],
    blogCategory: "申请攻略",
    isPinned: false,
  };
}

export function prepareEntryForSave(entry, status) {
  const now = new Date().toISOString();
  const titleSlug = normalizeSlug(entry.title);
  const currentSlug = normalizeSlug(entry.slug);
  const apartmentNumber = normalizeApartmentNumber(entry.apartmentNumber);
  const apartmentSlug = entry.type === CONTENT_TYPES.APARTMENT ? buildApartmentSlug(apartmentNumber) : "";
  const contentStatus = status || entry.contentStatus || CONTENT_STATUS.DRAFT;
  const bodyHtml = sanitizeRichText(entry.bodyHtml);
  const publishedAt =
    contentStatus === CONTENT_STATUS.PUBLISHED
      ? entry.publishedAt || now.slice(0, 10)
      : entry.publishedAt || "";
  const title = String(entry.title || "").trim();
  const galleryImages = normalizeGalleryImages(entry.galleryImages, entry.coverImageUrl || entry.coverImage);
  const coverImage = galleryImages[0] || "";

  return {
    ...entry,
    apartmentNumber: entry.type === CONTENT_TYPES.APARTMENT ? apartmentNumber : "",
    slug: apartmentSlug || currentSlug || titleSlug || `post-${Date.now()}`,
    summary: deriveSummary(entry, bodyHtml),
    bodyHtml,
    coverImage,
    coverImageUrl: coverImage,
    galleryImages,
    coverAlt: String(entry.coverAlt || "").trim() || `${title || "内容"}宣传图`,
    contentStatus,
    publishedAt,
    updatedAt: now,
    roomTypes: Array.isArray(entry.roomTypes) ? entry.roomTypes : [],
    applicationStatus: "",
    tags: entry.type === CONTENT_TYPES.APARTMENT ? normalizeApartmentTags(entry.tags) : uniqueStrings(entry.tags),
    isPinned: entry.type === CONTENT_TYPES.APARTMENT ? Boolean(entry.isPinned) : false,
  };
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

export const seedEntries = [
  {
    id: "apt-san-gabriel-lottery",
    type: CONTENT_TYPES.APARTMENT,
    title: "San Gabriel 62+ 长者公寓抽签开放",
    apartmentNumber: "318",
    slug: "apartment-318",
    contentStatus: CONTENT_STATUS.PUBLISHED,
    coverImage: "../images/v2/community-62.webp",
    coverAlt: "加州长者公寓社区外观",
    summary: "南加州 62+ 长者公寓近期抽签开放，适合需要稳定租金与安静社区的家庭关注。",
    bodyHtml:
      "<h2>本次更新重点</h2><p>该项目适合正在寻找圣盖博周边长者公寓的家庭。建议提前准备身份证明、收入证明、银行流水和租房历史。</p><ul><li>地区：南加州</li><li>年龄：62+</li><li>房型：1B / 2B</li></ul><p>名额和资格以项目方最终公告为准，华美团队可协助整理材料并提醒申请时间。</p>",
    publishedAt: "2026-07-03",
    createdAt: "2026-07-03T10:00:00.000Z",
    updatedAt: "2026-07-03T10:00:00.000Z",
    region: "south",
    ageRequirement: "62+",
    roomTypes: ["1B", "2B"],
    applicationStatus: "抽签中",
    tags: ["重点推荐", "适合长者"],
    blogCategory: "",
    isPinned: true,
  },
  {
    id: "apt-oakland-family-open",
    type: CONTENT_TYPES.APARTMENT,
    title: "Oakland 全新家庭公寓开放申请",
    apartmentNumber: "244",
    slug: "apartment-244",
    contentStatus: CONTENT_STATUS.PUBLISHED,
    coverImage: "../images/v2/community-18.webp",
    coverAlt: "北加州家庭公寓社区",
    summary: "北加州 18+ 家庭公寓新一轮申请开放，适合需要 2B 或 3B+ 房型的家庭。",
    bodyHtml:
      "<h2>适合谁关注</h2><p>适合在北加州工作、需要家庭型房源，并希望控制长期租金压力的申请人。</p><p>本次开放以 2B、3B+ 房型为主，建议先确认家庭人数、收入区间和现有租约时间。</p>",
    publishedAt: "2026-07-02",
    createdAt: "2026-07-02T09:00:00.000Z",
    updatedAt: "2026-07-02T09:00:00.000Z",
    region: "north",
    ageRequirement: "18+",
    roomTypes: ["2B", "3B+"],
    applicationStatus: "开放中",
    tags: ["全新公寓", "适合家庭"],
    blogCategory: "",
    isPinned: false,
  },
  {
    id: "apt-pasadena-draft",
    type: CONTENT_TYPES.APARTMENT,
    title: "Pasadena 55+ 公寓资料整理中",
    apartmentNumber: "395",
    slug: "apartment-395",
    contentStatus: CONTENT_STATUS.DRAFT,
    coverImage: "../images/v2/community-55.webp",
    coverAlt: "55+ 社区环境",
    summary: "这是一条后台草稿示例，不会出现在公开列表。",
    bodyHtml: "<p>后台可以先保存草稿，确认信息后再发布。</p>",
    publishedAt: "",
    createdAt: "2026-07-01T09:00:00.000Z",
    updatedAt: "2026-07-01T09:00:00.000Z",
    region: "south",
    ageRequirement: "55+",
    roomTypes: ["1B"],
    applicationStatus: "开放中",
    tags: ["限时开放"],
    blogCategory: "",
    isPinned: false,
  },
  {
    id: "blog-document-guide",
    type: CONTENT_TYPES.BLOG,
    title: "申请低收入公寓前，先准备这 6 类材料",
    slug: "affordable-housing-document-checklist",
    contentStatus: CONTENT_STATUS.PUBLISHED,
    coverImage: "../images/v2/bg-faq-side.webp",
    coverAlt: "整理申请材料的桌面",
    summary: "把身份证明、收入证明、资产证明、租房历史等材料提前整理好，可以减少来回补件。",
    bodyHtml:
      "<h2>为什么材料要提前准备</h2><p>低收入住房申请通常不是只填一张表。项目方会审核身份、收入、资产、家庭成员和租房历史。</p><ul><li>身份证明</li><li>收入证明</li><li>资产证明</li><li>租房历史</li><li>车辆信息</li><li>特殊情况说明</li></ul>",
    publishedAt: "2026-07-01",
    createdAt: "2026-07-01T08:00:00.000Z",
    updatedAt: "2026-07-01T08:00:00.000Z",
    region: "",
    ageRequirement: "",
    roomTypes: [],
    applicationStatus: "",
    tags: ["申请攻略"],
    blogCategory: "申请攻略",
    isPinned: false,
  },
];
