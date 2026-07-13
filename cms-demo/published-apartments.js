import {
  buildEntryUrl,
  buildRemoteEntryUrl,
  formatPostDate,
  getPublishedApartmentRows,
  getRegionLabel,
  sortPublishedApartmentRows,
} from "./cms-core.mjs";
import {
  CMS_BACKEND_MODES,
  fetchRemoteEntries,
  getCmsBackendMode,
  getCmsBackendModeCopy,
} from "./cms-backend.mjs";
import { loadEntries } from "./cms-store.mjs";

const state = {
  backendMode: getCmsBackendMode(window.location),
  entries: [],
  rows: [],
};

const els = {
  backendMode: document.getElementById("backendMode"),
  count: document.getElementById("publishedCount"),
  query: document.getElementById("publishedQuery"),
  sort: document.getElementById("publishedSort"),
  stats: document.getElementById("publishedStats"),
  table: document.getElementById("publishedApartmentTable"),
};

async function init() {
  renderBackendMode();
  state.entries = await loadContentEntries();
  state.rows = getPublishedApartmentRows(state.entries);
  renderStats();
  bindEvents();
  renderRows();
}

function bindEvents() {
  els.query.addEventListener("input", renderRows);
  els.sort.addEventListener("change", renderRows);
}

function renderStats() {
  const pinned = state.rows.filter((entry) => entry.isPinned).length;
  const recent = state.rows.filter((entry) => Date.parse(entry.publishedAt || entry.updatedAt || "") >= Date.now() - 30 * 24 * 60 * 60 * 1000).length;
  els.stats.innerHTML = `
    <div class="metric"><strong>${state.rows.length}</strong><span>已发布</span></div>
    <div class="metric"><strong>${pinned}</strong><span>置顶</span></div>
    <div class="metric"><strong>${recent}</strong><span>近 30 天</span></div>
  `;
}

function renderRows() {
  const [sortKey, direction] = els.sort.value.split(":");
  const filtered = filterRows(state.rows, els.query.value);
  const sorted = sortPublishedApartmentRows(filtered, sortKey, direction);
  els.count.textContent = `${sorted.length} 条`;
  els.table.innerHTML = sorted.length
    ? `
      <div class="published-table__head" role="row">
        <span>编号</span>
        <span>帖子</span>
        <span>发布时间</span>
        <span>地区</span>
        <span>年龄</span>
        <span>房型</span>
        <span>操作</span>
      </div>
      ${sorted.map(renderRow).join("")}
    `
    : `<div class="empty-state">没有符合条件的已发布公寓。</div>`;
}

function renderBackendMode() {
  const copy = getCmsBackendModeCopy(state.backendMode);
  els.backendMode.className = `backend-mode ${state.backendMode === CMS_BACKEND_MODES.REMOTE ? "remote" : "local"}`;
  els.backendMode.innerHTML = `
    <strong>${escapeHtml(copy.title)}</strong>
    <span>${escapeHtml(copy.body)}</span>
  `;
}

async function loadContentEntries() {
  if (state.backendMode !== CMS_BACKEND_MODES.REMOTE) return loadEntries();

  try {
    return await fetchRemoteEntries();
  } catch (error) {
    els.table.innerHTML = `<div class="empty-state">${escapeHtml(error.message || "读取后台内容失败")}</div>`;
    return [];
  }
}

function renderRow(entry) {
  const editUrl = `admin.html?entry=${encodeURIComponent(entry.id)}`;
  return `
    <article class="published-row">
      <div class="published-row__number">#${escapeHtml(entry.apartmentNumber || "未编号")}</div>
      <div class="published-row__main">
        <h2>${escapeHtml(entry.title || "未命名内容")}</h2>
        <div class="entry-meta">
          ${entry.isPinned ? `<span class="badge dark">置顶</span>` : ""}
          ${(entry.tags || []).map((tag) => `<span class="badge gold">${escapeHtml(tag)}</span>`).join("")}
        </div>
      </div>
      <div>${formatPostDate(entry.publishedAt || entry.updatedAt)}</div>
      <div>${escapeHtml(getRegionLabel(entry.region))}</div>
      <div>${escapeHtml(entry.ageRequirement || "未设置")}</div>
      <div>${escapeHtml((entry.roomTypes || []).join(" / ") || "未设置")}</div>
      <div class="published-row__actions">
        <a class="btn ghost" href="${editUrl}">编辑</a>
        <a class="btn ghost" href="${state.backendMode === CMS_BACKEND_MODES.REMOTE ? buildRemoteEntryUrl(entry) : buildEntryUrl(entry)}" target="_blank" rel="noopener">公开页</a>
      </div>
    </article>
  `;
}

function filterRows(items, query) {
  const normalized = String(query || "").trim().toLowerCase();
  if (!normalized) return items;

  return items.filter((entry) => {
    const haystack = [
      entry.apartmentNumber,
      entry.title,
      entry.summary,
      getRegionLabel(entry.region),
      entry.ageRequirement,
      ...(entry.roomTypes || []),
      ...(entry.tags || []),
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(normalized);
  });
}

function escapeHtml(value) {
  return String(value || "").replace(/[&<>"']/g, (char) => {
    const map = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" };
    return map[char];
  });
}

init().catch((error) => {
  els.table.innerHTML = `<div class="empty-state">${escapeHtml(error.message || "初始化失败")}</div>`;
});
