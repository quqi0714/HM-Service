import {
  AGE_OPTIONS,
  APARTMENT_TAG_OPTIONS,
  CONTENT_TYPES,
  ROOM_OPTIONS,
  buildEntryUrl,
  filterApartmentEntries,
  findEntryBySlug,
  formatPostDate,
  getPublicEntries,
  getRegionLabel,
  isPublished,
  sanitizeRichText,
} from "./cms-core.mjs";
import { loadEntries, loadPreviewEntry } from "./cms-store.mjs";

const entries = loadEntries();

const page = document.body.dataset.page;

if (page === "apartments") renderApartmentList();
if (page === "blog") renderBlogList();
if (page === "detail") renderDetail({ preview: false });
if (page === "preview") renderDetail({ preview: true });

function renderApartmentList() {
  const container = document.getElementById("contentList");
  const filters = {
    query: document.getElementById("query"),
    region: document.getElementById("region"),
    ageRequirement: "",
    roomType: "",
  };

  function update() {
    const results = filterApartmentEntries(entries, {
      query: filters.query.value,
      region: filters.region.value,
      ageRequirement: filters.ageRequirement,
      roomType: filters.roomType,
    });
    container.innerHTML = results.length
      ? results.map(renderApartmentCard).join("")
      : `<div class="empty-state">暂时没有符合筛选条件的公寓更新。请清空筛选或稍后再看。</div>`;
    document.getElementById("resultCount").textContent = `${results.length} 条公开房源更新`;
  }

  function setFilter(filterName, value) {
    filters[filterName] = value;
    document.querySelectorAll(`[data-filter="${filterName}"]`).forEach((button) => {
      button.classList.toggle("is-active", button.dataset.value === value);
      if (button.dataset.value === value) {
        button.setAttribute("aria-current", "true");
      } else {
        button.removeAttribute("aria-current");
      }
    });
    update();
  }

  [filters.query, filters.region].forEach((control) => control.addEventListener("input", update));
  [filters.query, filters.region].forEach((control) => control.addEventListener("change", update));
  document.querySelectorAll("[data-filter]").forEach((button) => {
    button.addEventListener("click", () => setFilter(button.dataset.filter, button.dataset.value || ""));
  });
  update();
}

function renderBlogList() {
  const container = document.getElementById("contentList");
  const blogs = getPublicEntries(entries, CONTENT_TYPES.BLOG);
  document.getElementById("resultCount").textContent = `${blogs.length} 篇公开文章`;
  container.innerHTML = blogs.length
    ? blogs.map(renderBlogCard).join("")
    : `<div class="empty-state">还没有发布 Blog 文章。</div>`;
}

function renderApartmentCard(entry) {
  const tagBadges = [
    entry.isPinned ? `<span class="badge dark">置顶</span>` : "",
    ...(entry.tags || []).map((tag) => `<span class="badge gold">${escapeHtml(tag)}</span>`),
  ]
    .filter(Boolean)
    .join("");
  return `
    <a class="content-card apartment-card" href="${buildEntryUrl(entry)}">
      <div class="media">
        <img src="${escapeAttribute(entry.coverImage)}" alt="${escapeAttribute(entry.coverAlt || entry.title)}">
        <div class="status-ribbon">
          ${entry.isPinned ? `<span class="badge dark card-pin">置顶</span>` : ""}
          ${(entry.tags || []).slice(0, 2).map((tag) => `<span class="badge gold card-tag">${escapeHtml(tag)}</span>`).join("")}
        </div>
      </div>
      <div class="body">
        <div class="entry-meta">
          <span class="badge id-badge">#${escapeHtml(entry.apartmentNumber || "未编号")}</span>
          <span class="badge">${getRegionLabel(entry.region)}</span>
          <span class="badge">${escapeHtml(entry.ageRequirement)}</span>
          ${(entry.roomTypes || []).map((room) => `<span class="badge">${escapeHtml(room)}</span>`).join("")}
        </div>
        <div class="post-strip">
          <span class="post-date">发布 ${formatDate(entry.publishedAt || entry.updatedAt)}</span>
          <span class="post-tags">${tagBadges}</span>
        </div>
        <h2>${escapeHtml(entry.title)}</h2>
        <p>${escapeHtml(entry.summary)}</p>
        <div class="card-footer">
          <span>#${escapeHtml(entry.apartmentNumber || "未编号")}</span>
          <span>查看详情</span>
        </div>
      </div>
    </a>
  `;
}

function renderBlogCard(entry) {
  const tags = uniqueStrings([entry.blogCategory || "Blog", ...(entry.tags || [])])
    .map((tag) => `<span class="badge gold">${escapeHtml(tag)}</span>`)
    .join("");
  return `
    <a class="content-card blog-card" href="${buildEntryUrl(entry)}">
      <div class="media">
        <img src="${escapeAttribute(entry.coverImage)}" alt="${escapeAttribute(entry.coverAlt || entry.title)}">
        <div class="status-ribbon">
          <span class="badge sage">${escapeHtml(entry.blogCategory || "Blog")}</span>
        </div>
      </div>
      <div class="body">
        <div class="post-strip">
          <span class="post-date">发布 ${formatDate(entry.publishedAt || entry.updatedAt)}</span>
          <span class="post-tags">${tags}</span>
        </div>
        <h2>${escapeHtml(entry.title)}</h2>
        <p>${escapeHtml(entry.summary)}</p>
        <div class="card-footer">
          <span>${escapeHtml(entry.blogCategory || "Blog")}</span>
          <span>阅读全文</span>
        </div>
      </div>
    </a>
  `;
}

function renderDetail({ preview }) {
  const params = new URLSearchParams(window.location.search);
  const type = params.get("type") === "blog" ? CONTENT_TYPES.BLOG : CONTENT_TYPES.APARTMENT;
  const slug = params.get("slug") || "";
  const previewEntry = preview ? loadPreviewEntry() : null;
  const entry =
    preview && previewEntry?.type === type && previewEntry?.slug === slug
      ? previewEntry
      : findEntryBySlug(entries, type, slug, { includeDrafts: preview });
  const root = document.getElementById("articleRoot");

  if (!entry || (!preview && !isPublished(entry))) {
    root.innerHTML = `
      <div class="article-body">
        <h1 class="display">内容不存在或尚未发布</h1>
        <p>请返回列表页查看当前公开内容。</p>
        <p><a class="btn primary" href="${type === CONTENT_TYPES.BLOG ? "blog.html" : "apartments.html"}">返回列表</a></p>
      </div>
    `;
    return;
  }

  const isApartment = entry.type === CONTENT_TYPES.APARTMENT;
  const imageHtml = entry.coverImage
    ? `<figure class="article-poster-preview">
        <img src="${escapeAttribute(entry.coverImage)}" alt="${escapeAttribute(entry.coverAlt || entry.title)}">
        <figcaption><a href="${escapeAttribute(entry.coverImage)}" target="_blank" rel="noopener">查看完整海报</a></figcaption>
      </figure>`
    : "";
  document.title = `${entry.title} | HM 华美内容演示`;
  root.innerHTML = `
    ${preview ? `<div class="preview-banner">预览模式：此内容不会出现在公开列表，除非状态为“已发布”</div>` : ""}
    <div class="article-shell">
      <div class="article-hero-grid">
        <div class="article-head">
          <div>
            <div class="entry-meta">
              ${isApartment ? "" : `<span class="badge sage">${escapeHtml(entry.blogCategory || "Blog")}</span>`}
              ${entry.isPinned ? `<span class="badge dark">置顶</span>` : ""}
              ${isApartment ? `<span class="badge id-badge">#${escapeHtml(entry.apartmentNumber || "未编号")}</span><span class="badge">${getRegionLabel(entry.region)}</span><span class="badge">${escapeHtml(entry.ageRequirement)}</span>${(entry.roomTypes || []).map((room) => `<span class="badge">${escapeHtml(room)}</span>`).join("")}` : ""}
              ${(entry.tags || []).map((tag) => `<span class="badge gold">${escapeHtml(tag)}</span>`).join("")}
            </div>
            <h1 class="display">${escapeHtml(entry.title)}</h1>
            <p class="article-summary">${escapeHtml(entry.summary)}</p>
          </div>
        </div>
        ${imageHtml}
      </div>
      <div class="article-content">
        <article class="article-body">
          ${sanitizeRichText(entry.bodyHtml) || "<p>暂无详细说明。</p>"}
          <div class="article-side">
            <span>更新：${formatDate(entry.publishedAt || entry.updatedAt)}</span>
            <a class="btn primary" href="../index.html#contact">咨询梅老师</a>
          </div>
        </article>
      </div>
    </div>
  `;
}

function uniqueStrings(values) {
  const seen = new Set();
  return values.filter((value) => {
    const normalized = String(value || "").trim();
    if (!normalized || seen.has(normalized)) return false;
    seen.add(normalized);
    return true;
  });
}

function formatDate(value) {
  return formatPostDate(value);
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
