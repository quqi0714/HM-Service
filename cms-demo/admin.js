import {
  AGE_OPTIONS,
  APARTMENT_TAG_OPTIONS,
  CONTENT_STATUS,
  CONTENT_TYPES,
  ROOM_OPTIONS,
  buildAdminPreviewUrl,
  buildAdminTitle,
  buildRemoteEntryUrl,
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
  compressImageForUpload,
  deletePermanentRemoteEntry,
  fetchRemoteEntries,
  formatFileSize,
  getCmsBackendMode,
  getCmsBackendModeCopy,
  saveRemoteEntry,
  uploadRemoteImage,
} from "./cms-backend.mjs";
import { deleteEntry, loadEntries, resetDemoEntries, savePreviewEntry, upsertEntry } from "./cms-store.mjs";

const state = {
  listQuery: "",
  entries: [],
  selectedId: "",
  selectedType: CONTENT_TYPES.APARTMENT,
  currentEntry: null,
  backendMode: CMS_BACKEND_MODES.LOCAL,
  busy: false,
  pendingPermanentDelete: null,
};

const els = {};

function applyLocalNavFallback() {
  if (!isRemoteMode()) {
    document.querySelectorAll('a[href="/apartments"]').forEach((a) => a.setAttribute("href", "apartments.html"));
    document.querySelectorAll('a[href="/blog"]').forEach((a) => a.setAttribute("href", "blog.html"));
  }
}

async function init() {
  applyLocalNavFallback();
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
    "permanentDelete",
    "moreActions",
    "preview",
    "city",
    "entrySearch",
    "fabNew",
    "resetDemo",
    "toast",
    "contentStats",
    "backendMode",
    "deleteConfirmDialog",
    "deleteConfirmTitle",
    "deleteConfirmText",
    "deleteConfirmInput",
    "deleteConfirmExpected",
    "deleteConfirmCancel",
    "deleteConfirmSubmit",
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
  els.preview.addEventListener("click", openPreview);
  els.fabNew.addEventListener("click", () => {
    selectNew(CONTENT_TYPES.APARTMENT);
    document.querySelector(".editor-form").scrollIntoView({ behavior: "smooth", block: "start" });
    setTimeout(() => els.title.focus(), 350);
  });
  els.entrySearch.addEventListener("input", () => {
    state.listQuery = els.entrySearch.value.trim().toLowerCase();
    renderEntryList();
  });
  [els.title, els.apartmentNumber, els.city].forEach((el) =>
    el.addEventListener("input", () => clearFieldError(el))
  );
  els.roomTypes.addEventListener("change", () => clearFieldError(els.roomTypes));
  els.permanentDelete.addEventListener("click", () => {
    if (els.moreActions) els.moreActions.removeAttribute("open");
    deletePermanentCurrent();
  });
  els.deleteConfirmCancel.addEventListener("click", closePermanentDeleteDialog);
  els.deleteConfirmSubmit.addEventListener("click", submitPermanentDeleteDialog);
  els.deleteConfirmInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      submitPermanentDeleteDialog();
    } else if (event.key === "Escape") {
      closePermanentDeleteDialog();
    }
  });
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

function openPreview() {
  syncFormToEntry();
  if (!state.currentEntry.title.trim()) {
    fieldError(els.title, "先填写标题再预览");
    return;
  }
  const staged = prepareEntryForSave(state.currentEntry, state.currentEntry.contentStatus || CONTENT_STATUS.DRAFT);
  savePreviewEntry(staged);
  const url = isRemoteMode() && staged.contentStatus === CONTENT_STATUS.PUBLISHED
    ? buildRemoteEntryUrl(staged)
    : buildAdminPreviewUrl(staged);
  window.open(url, "_blank", "noopener");
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
  let sorted = sortByNewest(state.entries);
  if (state.listQuery) {
    const q = state.listQuery;
    sorted = sorted.filter((e) =>
      (e.title || "").toLowerCase().includes(q) ||
      String(e.apartmentNumber || "").includes(q) ||
      (e.city || "").toLowerCase().includes(q)
    );
  }
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
  els.city.value = entry.city || "";
  els.summary.value = entry.summary || "";
  els.coverAlt.value = entry.coverAlt || "";
  els.bodyEditor.innerHTML = entry.bodyHtml || "";
  els.region.value = entry.region || "south";
  els.ageRequirement.value = entry.ageRequirement || "62+";
  els.applicationStatus.value = entry.applicationStatus || "";
  els.isPinned.checked = Boolean(entry.isPinned);
  els.blogCategory.value = entry.blogCategory || "申请攻略";
  renderCoverGallery(getEntryImages(entry));
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

  // 按内容状态收敛可见动作:没保存过的新内容不给"下架/永久删除",草稿不给"下架"
  const exists = state.entries.some((item) => item.id === (state.currentEntry || {}).id);
  const isPublishedNow = entry.contentStatus === CONTENT_STATUS.PUBLISHED;
  els.archive.hidden = !exists || (!isPublishedNow && !isArchived);
  els.moreActions.hidden = !exists;
  els.moreActions.removeAttribute("open");
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

function getEntryImages(entry = {}) {
  return normalizeImageList(entry.galleryImages, entry.coverImageUrl || entry.coverImage);
}

function renderCoverGallery(images = []) {
  const normalizedImages = normalizeImageList(images);
  els.coverPreview.dataset.images = JSON.stringify(normalizedImages);
  els.coverPreview.dataset.src = normalizedImages[0] || "";

  if (!normalizedImages.length) {
    els.coverPreview.innerHTML = `<div class="cover-preview-empty">尚未上传图片</div>`;
    return;
  }

  els.coverPreview.innerHTML = `
    <div class="cover-preview-grid">
      ${normalizedImages
        .map(
          (image, index) => `
            <div class="cover-thumb${index === 0 ? " is-cover" : ""}">
              <img src="${escapeAttribute(image)}" alt="">
              <span class="cover-thumb-label">${index === 0 ? "列表封面" : `图片 ${index + 1}`}</span>
              <button type="button" data-cover-remove="${index}" aria-label="移除第 ${index + 1} 张图片">移除</button>
            </div>
          `,
        )
        .join("")}
    </div>
  `;

  els.coverPreview.querySelectorAll("[data-cover-remove]").forEach((button) => {
    button.addEventListener("click", () => {
      const index = Number.parseInt(button.dataset.coverRemove, 10);
      const nextImages = readCoverImages();
      nextImages.splice(index, 1);
      renderCoverGallery(nextImages);
    });
  });
}

function readCoverImages() {
  try {
    const images = JSON.parse(els.coverPreview.dataset.images || "[]");
    return normalizeImageList(images);
  } catch {
    return [];
  }
}

function normalizeImageList(values, fallbackCover = "") {
  const images = [];
  const seen = new Set();
  const add = (value) => {
    const image = normalizeImageUrl(value);
    if (!image || seen.has(image)) return;
    seen.add(image);
    images.push(image);
  };

  add(fallbackCover);
  (Array.isArray(values) ? values : []).forEach(add);
  return images;
}

function normalizeImageUrl(value) {
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

function syncFormToEntry() {
  const current = state.currentEntry || createEmptyEntry(els.entryType.value);
  const galleryImages = readCoverImages();
  const coverImage = galleryImages[0] || "";
  state.currentEntry = {
    ...current,
    type: els.entryType.value,
    contentStatus: els.contentStatus.value,
    title: els.title.value.trim(),
    slug: els.slug.value.trim(),
    apartmentNumber: normalizeApartmentNumber(els.apartmentNumber.value),
    city: els.city.value.trim(),
    summary: els.summary.value.trim(),
    coverImage,
    coverImageUrl: coverImage,
    galleryImages,
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
  clearAllFieldErrors();
  if (!state.currentEntry.title.trim()) {
    fieldError(els.title, "请先填写标题");
    return;
  }
  if (state.currentEntry.type === CONTENT_TYPES.APARTMENT && !state.currentEntry.apartmentNumber) {
    fieldError(els.apartmentNumber, "请填写公寓编号");
    return;
  }
  const duplicate = findDuplicateApartmentNumber(state.entries, state.currentEntry);
  if (duplicate) {
    fieldError(els.apartmentNumber, `编号 #${state.currentEntry.apartmentNumber} 已被「${duplicate.title || "未命名内容"}」使用`);
    return;
  }
  if (state.currentEntry.type === CONTENT_TYPES.APARTMENT && state.currentEntry.roomTypes.length === 0) {
    fieldError(els.roomTypes, "请至少选择一个房型");
    return;
  }
  if (!confirmStatusChange(status)) return;

  let saved;
  setBusy(true);
  try {
    const isUpdate = state.entries.some((entry) => entry.id === state.currentEntry.id);
    const expectedUpdatedAt = isUpdate ? getLoadedUpdatedAt(state.currentEntry.id) : "";
    const entryForSave = prepareEntryForSave(state.currentEntry, status);
    saved = isRemoteMode()
      ? await saveRemoteEntry(entryForSave, { isUpdate, expectedUpdatedAt })
      : upsertEntry(state.currentEntry, status);
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


function confirmStatusChange(nextStatus) {
  const currentStatus = state.currentEntry.contentStatus || CONTENT_STATUS.DRAFT;
  const exists = state.entries.some((entry) => entry.id === state.currentEntry.id);
  if (currentStatus === CONTENT_STATUS.PUBLISHED && nextStatus === CONTENT_STATUS.PUBLISHED && exists) {
    return window.confirm("更新后会立即对客户可见，确认更新？");
  }
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

async function deletePermanentCurrent() {
  if (state.busy) return;
  if (!state.currentEntry) return;

  const existing = state.entries.find((entry) => entry.id === state.currentEntry.id);
  if (!existing) {
    toast("这条内容还没有保存，不需要永久删除");
    return;
  }

  const confirmation = getPermanentDeleteConfirmation(existing);
  openPermanentDeleteDialog(existing, confirmation);
}

function openPermanentDeleteDialog(entry, confirmation) {
  state.pendingPermanentDelete = { entry, confirmation };
  els.deleteConfirmTitle.textContent = "永久删除内容";
  els.deleteConfirmText.textContent = `删除「${entry.title || "未命名内容"}」后无法恢复，也不会再出现在后台列表。`;
  els.deleteConfirmExpected.textContent = `请完整输入：${confirmation}`;
  els.deleteConfirmInput.value = "";
  els.deleteConfirmDialog.hidden = false;
  els.deleteConfirmInput.focus();
}

function closePermanentDeleteDialog() {
  state.pendingPermanentDelete = null;
  els.deleteConfirmDialog.hidden = true;
  els.deleteConfirmInput.value = "";
}

async function submitPermanentDeleteDialog() {
  if (state.busy) return;
  const pending = state.pendingPermanentDelete;
  if (!pending) return;

  const input = els.deleteConfirmInput.value.trim();
  if (input !== pending.confirmation) {
    toast("确认文字不匹配，已取消永久删除");
    return;
  }

  setBusy(true);
  try {
    if (isRemoteMode()) {
      await deletePermanentRemoteEntry(pending.entry.id, pending.confirmation);
      state.entries = await loadContentEntries();
    } else {
      state.entries = deleteEntry(pending.entry.id);
    }
  } catch (error) {
    toast(error.message || "永久删除失败");
    setBusy(false);
    return;
  }

  state.currentEntry = state.entries[0] || createEmptyEntry(CONTENT_TYPES.APARTMENT);
  state.selectedId = state.currentEntry.id;
  state.selectedType = state.currentEntry.type;
  setBusy(false);
  closePermanentDeleteDialog();
  render();
  toast("内容已永久删除");
}

function getPermanentDeleteConfirmation(entry) {
  if (entry.type === CONTENT_TYPES.APARTMENT && entry.apartmentNumber) return String(entry.apartmentNumber);
  return String(entry.title || entry.id || "").trim();
}

async function handleCoverUpload(event) {
  const files = [...(event.target.files || [])].filter((file) => file.type.startsWith("image/"));
  if (!files.length) {
    toast("请选择图片文件");
    return;
  }

  setBusy(true);
  try {
    const uploaded = [];
    for (const file of files) {
      const uploadFile = await compressImageForUpload(file);
      const imageUrl = isRemoteMode() ? await uploadRemoteImage(uploadFile) : await readFileAsDataUrl(uploadFile);
      uploaded.push({ originalFile: file, uploadFile, imageUrl });
    }

    renderCoverGallery([...readCoverImages(), ...uploaded.map((item) => item.imageUrl)]);
    if (!els.coverAlt.value.trim()) {
      els.coverAlt.value = `${els.title.value || "内容"}宣传图`;
    }
    toast(buildGalleryUploadToast(uploaded));
  } catch (error) {
    toast(error.message || "图片上传失败");
  } finally {
    event.target.value = "";
    setBusy(false);
  }
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("图片读取失败"));
    reader.readAsDataURL(file);
  });
}

function buildGalleryUploadToast(items) {
  if (items.length === 1) return buildUploadToast(items[0].originalFile, items[0].uploadFile);
  const originalSize = items.reduce((total, item) => total + item.originalFile.size, 0);
  const uploadSize = items.reduce((total, item) => total + item.uploadFile.size, 0);
  const compressed = uploadSize < originalSize && items.some((item) => item.uploadFile.type === "image/webp");
  if (compressed) {
    return `${items.length} 张图片已压缩上传：${formatFileSize(originalSize)} → ${formatFileSize(uploadSize)}`;
  }
  return `已上传 ${items.length} 张图片`;
}

function buildUploadToast(originalFile, uploadFile) {
  if (uploadFile.size < originalFile.size && uploadFile.type === "image/webp") {
    return `图片已压缩上传：${formatFileSize(originalFile.size)} → ${formatFileSize(uploadFile.size)}`;
  }
  return "图片已上传";
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

function getLoadedUpdatedAt(id) {
  return state.entries.find((entry) => entry.id === id)?.updatedAt || state.currentEntry?.updatedAt || "";
}

function setBusy(value) {
  state.busy = Boolean(value);
  [
    els.saveDraft,
    els.publish,
    els.archive,
    els.togglePin,
    els.delete,
    els.permanentDelete,
    els.coverFile,
    els.deleteConfirmSubmit,
    els.deleteConfirmInput,
  ].forEach((element) => {
    if (element) element.disabled = state.busy;
  });
}

function fieldError(el, message) {
  const field = el.closest(".field") || el.parentElement;
  if (!field) { toast(message); return; }
  field.classList.add("field-error");
  let msg = field.querySelector(".field-msg");
  if (!msg) {
    msg = document.createElement("span");
    msg.className = "field-msg";
    field.appendChild(msg);
  }
  msg.textContent = message;
  field.scrollIntoView({ behavior: "smooth", block: "center" });
  if (typeof el.focus === "function") setTimeout(() => el.focus({ preventScroll: true }), 300);
  toast(message);
}

function clearFieldError(el) {
  const field = el.closest(".field") || el.parentElement;
  if (field) field.classList.remove("field-error");
}

function clearAllFieldErrors() {
  document.querySelectorAll(".field.field-error").forEach((f) => f.classList.remove("field-error"));
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
