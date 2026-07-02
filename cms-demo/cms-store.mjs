import { findDuplicateApartmentNumber, prepareEntryForSave, seedEntries } from "./cms-core.mjs";

const STORAGE_KEY = "hm_cms_demo_entries_v2";
const PREVIEW_STORAGE_KEY = "hm_cms_demo_preview_entry_v1";

export function loadEntries() {
  if (!window.localStorage.getItem(STORAGE_KEY)) {
    saveEntries(seedEntries);
    return [...seedEntries];
  }

  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY));
    return Array.isArray(parsed) ? parsed : [...seedEntries];
  } catch {
    saveEntries(seedEntries);
    return [...seedEntries];
  }
}

export function saveEntries(entries) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

export function upsertEntry(entry, status) {
  const entries = loadEntries();
  const nextEntry = prepareEntryForSave(entry, status);
  const duplicate = findDuplicateApartmentNumber(entries, nextEntry);

  if (duplicate) {
    throw new Error(`公寓编号 #${nextEntry.apartmentNumber} 已被「${duplicate.title || "未命名内容"}」使用`);
  }

  const index = entries.findIndex((item) => item.id === nextEntry.id);

  if (index >= 0) {
    entries[index] = nextEntry;
  } else {
    entries.unshift(nextEntry);
  }

  saveEntries(entries);
  return nextEntry;
}

export function deleteEntry(id) {
  const entries = loadEntries().filter((entry) => entry.id !== id);
  saveEntries(entries);
  return entries;
}

export function resetDemoEntries() {
  saveEntries(seedEntries);
  return [...seedEntries];
}

export function savePreviewEntry(entry) {
  const previewEntry = prepareEntryForSave(entry, entry.contentStatus);
  window.sessionStorage.setItem(PREVIEW_STORAGE_KEY, JSON.stringify(previewEntry));
  return previewEntry;
}

export function loadPreviewEntry() {
  try {
    const parsed = JSON.parse(window.sessionStorage.getItem(PREVIEW_STORAGE_KEY));
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}
