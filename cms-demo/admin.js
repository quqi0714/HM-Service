import {
  AGE_OPTIONS,
  APARTMENT_STATUS_OPTIONS,
  APARTMENT_TAG_OPTIONS,
  CONTENT_STATUS,
  CONTENT_TYPES,
  ROOM_OPTIONS,
  buildAdminPreviewUrl,
  buildAdminTitle,
  buildApartmentSlug,
  createEmptyEntry,
  findDuplicateApartmentNumber,
  getEditorActionLabels,
  getEntryTypeLabel,
  getRegionLabel,
  getStatusLabel,
  normalizeApartmentNumber,
  normalizeSlug,
  prepareEntryForSave,
  sortByNewest,
} from "./cms-core.mjs";
import {
  CMS_BACKEND_MODES,
  archiveRemoteEntry,
  fetchRemoteEntries,
  getCmsBackendMode,
  getCmsBackendModeCopy,
  saveRemoteEntry,
  uploadRemoteImage,
} from "./cms-backend.mjs";
import { deleteEntry, loadEntries, resetDemoEntries, savePreviewEntry, upsertEntry } from "./cms-store.mjs";

const state = {
  entries: [],
  selectedId: "",
  selectedType: CONTENT_TYPES.APARTMENT,
  currentEntry: null,
  backendMode: CMS_BACKEND_MODES.LOCAL,
  busy: false,
};

const els = {};

async function init() {
  bindElements();
  state.backendMode = getCmsBackendMode(window.location);
  renderBackendMode();
  state.entries = await loadContentEntries();
  const selectedEntry = getInitialEntry();
  state.currentEntry = selectedEntry || state.entries[0] || createEmptyEntry(CONTENT_TYPES.APARTMENT);
  state.selectedId = state.currentEntry.id;
  state.selectedType = state.currentEntry.type;
  render();
  bindEvents();
}

function getInitialEntry() {
  const entryId = new URLSearchParams(window.location.search).get("entry");
  if (!entryId) return null;
  return state.entries.find((entry) => entry.id === entryId) || null;
}

function bindElements() {
  [
    "entryList",
    "entryType",
    "contentStatus",
    "title",
    "slug",
    "slugHelp",
    "summary",
    "coverAlt",
    "coverFile",
    "coverPreview",
    "bodyEditor",
    "apartmentNumber",
    "region",
    "ageRequirement",
    "roomTypes",
    "applicationStatus",
    "isPinned",
    "tags",
    "apartmentFields",
    "blogFields",
    "blogCategory",
    "editorMode",
    "metaLine",
    "newApartment",
    "newBlog",
    "saveDraft",
    "publish",
    "archive",
    "togglePin",
    "delete",
    "preview",
    "resetDemo",
    "toast",
    "contentStats",
    "backendMode",
  ].forEach((id) => {
    els[id] = document.getElementById(id);
  });
}

function bindEvents() {
  els.newApartment.addEventListener("click", () => selectNew(CONTENT_TYPES.APARTMENT));
  els.newBlog.addEventListener("click", () => selectNew(CONTENT_TYPES.BLOG));
  els.saveDraft.addEventListener("click", () => saveCurrent(CONTENT_STATUS.DRAFT));
  els.publish.addEventListener("click", () => saveCurrent(CONTENT_STATUS.PUBLISHED));
  els.archive.addEventListener("click", () => saveCurrent(CONTENT_STATUS.ARCHIVED));
  els.togglePin.addEventListener("click", togglePinned);
  els.delete.addEventListener("click", deleteCurrent);
  els.preview.addEventListener("click", openPreview);
  els.resetDemo.addEventListener("click", () => {
    if (isRemoteMode()) {
      toast("正式后台不能重置演示数据");
      return;
    }
    state.entries = resetDemoEntries();
    state.currentEntry = state.entries[0];
    state.selectedId = state.currentEntry.id;
    state.selectedType = state.currentEntry.type;
    render();
    toast("演示数据已重置");
  });

  els.entryType.addEventListener("change", () => {
    state.selectedType = els.entryType.value;
    syncFormToEntry();
    state.currentEntry.type = state.selectedType;
    renderConditionalFields();
    renderEditorControls();
  });

  els.contentStatus.addEventListener("change", () => {
    syncFormToEntry();
    renderEditorControls();
  });

  els.title.addEventListener("input", () => {
    if (els.entryType.value === CONTENT_TYPES.BLOG) {
      els.slug.value = normalizeSlug(els.title.value);
    }
  });

  els.apartmentNumber.addEventListener("input", () => {
    if (els.entryType.value === CONTENT_TYPES.APARTMENT) {
      els.apartmentNumber.value = normalizeApartmentNumber(els.apartmentNumber.value);
      els.slug.value = buildApartmentSlug(els.apartmentNumber.value);
    }
  });

  els.isPinned.addEventListener("change", () => {
    syncFormToEntry();
    renderEditorControls();
  });

  els.coverFile.addEventListener("change", handleCoverUpload);

  document.querySelectorAll("[data-command]").forEach((button) => {
    button.addEventListener("click", () => {
      const command = button.dataset.command;
      if (command === "createLink") {
        const url = window.prompt("输入链接 URL");
        if (url) document.execCommand(command, false, url);
        return;
      }
      document.execCommand(command, false, button.dataset.value || null);
      els.bodyEditor.focus();
    });
  });
}

function selectNew(type) {
  state.currentEntry = createEmptyEntry(type);
  state.selectedId = state.currentEntry.id;
  state.selectedType = type;
  render();
}

function selectEntry(id) {
  const entry = state.entries.find((item) => item.id === id);
  if (!entry) return;
  state.currentEntry = { ...entry };
  state.selectedId = id;
  state.selectedType = entry.type;
  render();
}

function render() {
  renderBackendMode();
  renderStats();
  renderEntryList();
  renderForm();
}

function renderBackendMode() {
  if (!els.backendMode) return;
  const copy = getCmsBackendModeCopy(state.backendMode);
  els.backendMode.className = `backend-mode ${isRemoteMode() ? "remote" : "local"}`;
  els.backendMode.innerHTML = `
    <strong>${escapeHtml(copy.title)}</strong>
    <span>${escapeHtml(copy.body)}</span>
  `;
  if (els.resetDemo) {
    els.resetDemo.hidden = isRemoteMode();
  }
}

function renderStats() {
  const published = state.entries.filter((entry) => entry.contentStatus === CONTENT_STATUS.PUBLISHED).length;
  const drafts = state.entries.filter((entry) => entry.contentStatus === CONTENT_STATUS.DRAFT).length;
  const apartments = state.entries.filter((entry) => entry.type === CONTENT_TYPES.APARTMENT).length;
  els.contentStats.innerHTML = `
    <div class="metric"><strong>${published}</strong><span>已发布</span></div>
    <div class="metric"><strong>${drafts}</strong><span>草稿</span></div>
    <div class="metric"><strong>${apartments}</strong><span>公寓更新</span></div>
  `;
}

function renderEntryList() {
  const sorted = sortByNewest(state.entries);
  els.entryList.innerHTML = sorted.length
    ? sorted
    .map((entry) => {
      const active = entry.id === state.selectedId ? " active" : "";
      const typeLabel = getEntryTypeLabel(entry.type);
      const statusClass = entry.contentStatus === CONTENT_STATUS.PUBLISHED ? "sage" : entry.contentStatus === CONTENT_STATUS.ARCHIVED ? "danger" : "";
      const secondary =
        entry.type === CONTENT_TYPES.APARTMENT
          ? `#${entry.apartmentNumber || "未编号"} · ${getRegionLabel(entry.region)} · ${entry.ageRequirement || "年龄未设"} · ${(entry.roomTypes || []).join(" / ") || "房型未设"}`
          : entry.blogCategory || "Blog";
      const pinnedBadge = entry.isPinned ? `<span class="badge dark">置顶</span>` : "";
      return `
        <button class="entry-item${active}" type="button" data-entry-id="${entry.id}">
          <strong>${escapeHtml(buildAdminTitle(entry))}</strong>
          <div class="entry-meta">
            ${pinnedBadge}
            <span class="badge">${typeLabel}</span>
            <span class="badge ${statusClass}">${getStatusLabel(entry.contentStatus)}</span>
            <span class="badge">${escapeHtml(secondary)}</span>
          </div>
        </button>
      `;
    })
    .join("")
    : `<div class="empty-state">当前还没有内容。</div>`;

  els.entryList.querySelectorAll("[data-entry-id]").forEach((button) => {
    button.addEventListener("click", () => selectEntry(button.dataset.entryId));
  });
}

function renderForm() {
  const entry = state.currentEntry || createEmptyEntry(CONTENT_TYPES.APARTMENT);
  els.entryType.value = entry.type;
  els.contentStatus.value = entry.contentStatus || CONTENT_STATUS.DRAFT;
  els.contentStatus.disabled = true;
  els.title.value = entry.title || "";
  els.slug.value = entry.slug || "";
  els.apartmentNumber.value = entry.apartmentNumber || "";
  els.summary.value = entry.summary || "";
  els.coverAlt.value = entry.coverAlt || "";
  els.bodyEditor.innerHTML = entry.bodyHtml || "";
  els.region.value = entry.region || "south";
  els.ageRequirement.value = entry.ageRequirement || "62+";
  els.applicationStatus.value = entry.applicationStatus || "开放中";
  els.isPinned.checked = Boolean(entry.isPinned);
  els.blogCategory.value = entry.blogCategory || "申请攻略";
  renderCover(entry.coverImage || entry.coverImageUrl);
  renderCheckOptions(els.roomTypes, ROOM_OPTIONS, entry.roomTypes || []);
  renderCheckOptions(els.tags, APARTMENT_TAG_OPTIONS, entry.tags || []);
  renderConditionalFields();
  renderEditorControls();
  els.metaLine.textContent = `${buildAdminTitle(entry)} · 更新: ${formatDateTime(entry.updatedAt || entry.createdAt)}`;
}

function renderConditionalFields() {
  const isApartment = els.entryType.value === CONTENT_TYPES.APARTMENT;
  els.apartmentFields.hidden = !isApartment;
  els.blogFields.hidden = isApartment;
  els.slug.placeholder = isApartment ? "例如：apartment-395" : "根据标题自动生成";
  els.slugHelp.textContent = isApartment
    ? "公寓公开地址由内部编号生成，例如编号 395 会生成 apartment-395。"
    : "Blog 公开地址会根据标题自动生成，一般不需要手动填写。";
  if (isApartment) {
    els.slug.value = buildApartmentSlug(els.apartmentNumber.value);
  } else if (!els.slug.value.trim()) {
    els.slug.value = normalizeSlug(els.title.value);
  }
}

function renderEditorControls() {
  const entry = {
    ...(state.currentEntry || {}),
    type: els.entryType.value,
    contentStatus: els.contentStatus.value,
    isPinned: els.entryType.value === CONTENT_TYPES.APARTMENT && els.isPinned.checked,
  };
  const labels = getEditorActionLabels(entry);
  const isApartment = entry.type === CONTENT_TYPES.APARTMENT;
  const isArchived = entry.contentStatus === CONTENT_STATUS.ARCHIVED;

  els.editorMode.textContent = labels.modeLabel;
  els.saveDraft.textContent = labels.draftAction;
  els.publish.textContent = labels.publishAction;
  els.archive.textContent = labels.archiveAction;
  els.archive.disabled = isArchived;
  els.togglePin.hidden = !isApartment;
  els.togglePin.textContent = labels.pinAction;
  els.togglePin.className = `btn ${entry.isPinned ? "danger" : "ghost"}`;
}

function renderCheckOptions(container, options, selected) {
  container.innerHTML = options
    .map((option) => {
      const checked = selected.includes(option) ? "checked" : "";
      return `
        <label class="check-chip">
          <input type="checkbox" value="${escapeHtml(option)}" ${checked}>
          <span>${escapeHtml(option)}</span>
        </label>
      `;
    })
    .join("");
}

function renderCover(src) {
  const image = src || "../images/v2/bg-housing-banner-v2.webp";
  els.coverPreview.innerHTML = `<img src="${escapeAttribute(image)}" alt="">`;
  els.coverPreview.dataset.src = image;
}

function syncFormToEntry() {
  const current = state.currentEntry || createEmptyEntry(els.entryType.value);
  state.currentEntry = {
    ...current,
    type: els.entryType.value,
    contentStatus: els.contentStatus.value,
    title: els.title.value.trim(),
    slug: els.slug.value.trim(),
    apartmentNumber: normalizeApartmentNumber(els.apartmentNumber.value),
    summary: els.summary.value.trim(),
    coverImage: els.coverPreview.dataset.src || "",
    coverImageUrl: els.coverPreview.dataset.src || "",
    coverAlt: els.coverAlt.value.trim(),
    bodyHtml: els.bodyEditor.innerHTML.trim(),
    region: els.region.value,
    ageRequirement: els.ageRequirement.value,
    roomTypes: checkedValues(els.roomTypes),
    applicationStatus: els.applicationStatus.value,
    isPinned: els.entryType.value === CONTENT_TYPES.APARTMENT && els.isPinned.checked,
    tags: checkedValues(els.tags),
    blogCategory: els.blogCategory.value,
  };
}

function checkedValues(container) {
  return [...container.querySelectorAll("input:checked")].map((input) => input.value);
}

async function saveCurrent(status) {
  if (state.busy) return;
  syncFormToEntry();
  if (!state.currentEntry.title.trim()) {
    toast("请先填写标题");
    return;
  }
  if (!state.currentEntry.summary.trim()) {
    toast("请先填写摘要");
    return;
  }
  if (state.currentEntry.type === CONTENT_TYPES.APARTMENT && !state.currentEntry.apartmentNumber) {
    toast("请填写公寓编号");
    return;
  }
  const duplicate = findDuplicateApartmentNumber(state.entries, state.currentEntry);
  if (duplicate) {
    toast(`公寓编号 #${state.currentEntry.apartmentNumber} 已被「${duplicate.title || "未命名内容"}」使用`);
    return;
  }
  if (state.currentEntry.type === CONTENT_TYPES.APARTMENT && state.currentEntry.roomTypes.length === 0) {
    toast("请至少选择一个房型");
    return;
  }
  if (!confirmStatusChange(status)) return;

  let saved;
  setBusy(true);
  try {
    const entryForSave = prepareEntryForSave(state.currentEntry, status);
    const isUpdate = state.entries.some((entry) => entry.id === state.currentEntry.id);
    saved = isRemoteMode() ? await saveRemoteEntry(entryForSave, { isUpdate }) : upsertEntry(state.currentEntry, status);
  } catch (error) {
    toast(error.message || "保存失败");
    setBusy(false);
    return;
  }
  state.entries = await loadContentEntries();
  state.currentEntry = { ...saved };
  state.selectedId = saved.id;
  setBusy(false);
  render();
  toast(`${getStatusLabel(saved.contentStatus)}：${saved.title}`);
}

async function togglePinned() {
  if (state.busy) return;
  syncFormToEntry();
  if (state.currentEntry.type !== CONTENT_TYPES.APARTMENT) return;

  state.currentEntry.isPinned = !state.currentEntry.isPinned;
  els.isPinned.checked = state.currentEntry.isPinned;

  const hasSavedEntry = state.entries.some((entry) => entry.id === state.currentEntry.id);
  if (!hasSavedEntry) {
    renderEditorControls();
    toast(state.currentEntry.isPinned ? "发布后将置顶" : "已取消置顶标记");
    return;
  }

  let saved;
  setBusy(true);
  try {
    const entryForSave = prepareEntryForSave(state.currentEntry, state.currentEntry.contentStatus || CONTENT_STATUS.DRAFT);
    saved = isRemoteMode() ? await saveRemoteEntry(entryForSave, { isUpdate: true }) : upsertEntry(state.currentEntry, state.currentEntry.contentStatus || CONTENT_STATUS.DRAFT);
  } catch (error) {
    toast(error.message || "置顶状态保存失败");
    setBusy(false);
    return;
  }

  state.entries = await loadContentEntries();
  state.currentEntry = { ...saved };
  state.selectedId = saved.id;
  setBusy(false);
  render();
  toast(saved.isPinned ? `已置顶：${saved.title}` : `已取消置顶：${saved.title}`);
}

function confirmStatusChange(nextStatus) {
  const currentStatus = state.currentEntry.contentStatus || CONTENT_STATUS.DRAFT;
  if (currentStatus === nextStatus) return true;
  if (!state.entries.some((entry) => entry.id === state.currentEntry.id)) return true;

  if (currentStatus === CONTENT_STATUS.PUBLISHED && nextStatus === CONTENT_STATUS.DRAFT) {
    return window.confirm("这会让该帖子暂时离开公开列表，确认转为草稿？");
  }
  if (currentStatus === CONTENT_STATUS.PUBLISHED && nextStatus === CONTENT_STATUS.ARCHIVED) {
    return window.confirm("这会下架该帖子，公开列表将不再显示，确认下架？");
  }
  return true;
}

async function deleteCurrent() {
  if (state.busy) return;
  if (!state.currentEntry) return;
  const actionText = isRemoteMode() ? "下架存档" : "删除";
  const confirmed = window.confirm(`${actionText}「${state.currentEntry.title || "未命名内容"}」？`);
  if (!confirmed) return;
  setBusy(true);
  try {
    if (isRemoteMode()) {
      await archiveRemoteEntry(state.currentEntry.id);
      state.entries = await loadContentEntries();
    } else {
      state.entries = deleteEntry(state.currentEntry.id);
    }
  } catch (error) {
    toast(error.message || "操作失败");
    setBusy(false);
    return;
  }
  state.currentEntry = state.entries[0] || createEmptyEntry(CONTENT_TYPES.APARTMENT);
  state.selectedId = state.currentEntry.id;
  state.selectedType = state.currentEntry.type;
  setBusy(false);
  render();
  toast(isRemoteMode() ? "内容已下架" : "内容已删除");
}

function openPreview() {
  syncFormToEntry();
  const staged = prepareEntryForSave(state.currentEntry, state.currentEntry.contentStatus || CONTENT_STATUS.DRAFT);
  const previewEntry = staged.contentStatus === CONTENT_STATUS.PUBLISHED ? staged : savePreviewEntry(staged);
  const previewUrl = buildAdminPreviewUrl(previewEntry);
  const previewWindow = window.open(previewUrl, "_blank", "noopener");
  if (!previewWindow) {
    toast(`浏览器阻止了新页面，请允许弹窗后再预览：${previewUrl}`);
  }
}

async function handleCoverUpload(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  if (!file.type.startsWith("image/")) {
    toast("请选择图片文件");
    return;
  }
  if (isRemoteMode()) {
    setBusy(true);
    try {
      const imageUrl = await uploadRemoteImage(file);
      renderCover(imageUrl);
      if (!els.coverAlt.value.trim()) {
        els.coverAlt.value = `${els.title.value || "内容"}封面图`;
      }
      toast("图片已上传");
    } catch (error) {
      toast(error.message || "图片上传失败");
    } finally {
      setBusy(false);
    }
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    renderCover(reader.result);
    if (!els.coverAlt.value.trim()) {
      els.coverAlt.value = `${els.title.value || "内容"}封面图`;
    }
  };
  reader.readAsDataURL(file);
}

async function loadContentEntries() {
  if (!isRemoteMode()) return loadEntries();

  try {
    return await fetchRemoteEntries();
  } catch (error) {
    toast(error.message || "读取后台内容失败");
    return [];
  }
}

function isRemoteMode() {
  return state.backendMode === CMS_BACKEND_MODES.REMOTE;
}

function setBusy(value) {
  state.busy = Boolean(value);
  [els.saveDraft, els.publish, els.archive, els.togglePin, els.delete, els.preview, els.coverFile].forEach((element) => {
    if (element) element.disabled = state.busy;
  });
}

function toast(message) {
  els.toast.textContent = message;
  els.toast.classList.add("visible");
  window.clearTimeout(toast.timer);
  toast.timer = window.setTimeout(() => els.toast.classList.remove("visible"), 2400);
}

function formatDateTime(value) {
  if (!value) return "未保存";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("zh-CN", { hour12: false });
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

init().catch((error) => {
  console.error(error);
  toast(error.message || "后台初始化失败");
});
