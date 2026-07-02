export const CMS_BACKEND_MODES = Object.freeze({
  LOCAL: "local",
  REMOTE: "remote",
});

const LOCAL_HOSTS = new Set(["", "localhost", "127.0.0.1", "::1"]);
const IMAGE_UPLOAD_OPTIONS = Object.freeze({
  maxDimension: 1600,
  webpQuality: 0.82,
});

export function getCmsBackendMode(locationLike = globalThis.location) {
  const url = toUrl(locationLike);
  const forcedMode = url.searchParams.get("cmsMode");

  if (forcedMode === "remote") return CMS_BACKEND_MODES.REMOTE;
  if (forcedMode === "demo" || forcedMode === "local") return CMS_BACKEND_MODES.LOCAL;
  if (url.protocol === "file:") return CMS_BACKEND_MODES.LOCAL;
  if (LOCAL_HOSTS.has(url.hostname)) return CMS_BACKEND_MODES.LOCAL;

  return CMS_BACKEND_MODES.REMOTE;
}

export function getCmsBackendModeCopy(mode) {
  if (mode === CMS_BACKEND_MODES.REMOTE) {
    return {
      title: "正式后台",
      body: "内容会保存到网站后台。需要先完成 Cloudflare 登录权限设置。",
    };
  }

  return {
    title: "本地演示",
    body: "内容只保存在这台电脑的这个浏览器里，适合上线前试用和审计。",
  };
}

export async function fetchRemoteEntries(fetchImpl = globalThis.fetch) {
  const response = await fetchImpl("/api/content?limit=5000", {
    credentials: "include",
    headers: { accept: "application/json" },
  });

  const payload = await readJsonResponse(response);
  return Array.isArray(payload.entries) ? payload.entries.map(normalizeRemoteEntry) : [];
}

export async function saveRemoteEntry(entry, options = {}, fetchImpl = globalThis.fetch) {
  const isUpdate = Boolean(options.isUpdate);
  const endpoint = isUpdate ? `/api/content/${encodeURIComponent(entry.id)}` : "/api/content";
  const expectedUpdatedAt = isUpdate ? options.expectedUpdatedAt || entry.expectedUpdatedAt || "" : "";
  const response = await fetchImpl(endpoint, {
    method: isUpdate ? "PUT" : "POST",
    credentials: "include",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
    },
    body: JSON.stringify(toRemoteEntryPayload(entry, { expectedUpdatedAt })),
  });

  const payload = await readJsonResponse(response);
  return normalizeRemoteEntry(payload.entry);
}

export async function archiveRemoteEntry(id, fetchImpl = globalThis.fetch) {
  const response = await fetchImpl(`/api/content/${encodeURIComponent(id)}`, {
    method: "DELETE",
    credentials: "include",
    headers: { accept: "application/json" },
  });

  await readJsonResponse(response);
  return true;
}

export async function deletePermanentRemoteEntry(id, confirmation, fetchImpl = globalThis.fetch) {
  const response = await fetchImpl(`/api/content/${encodeURIComponent(id)}?permanent=1`, {
    method: "DELETE",
    credentials: "include",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
    },
    body: JSON.stringify({ confirmation }),
  });

  await readJsonResponse(response);
  return true;
}

export async function uploadRemoteImage(file, fetchImpl = globalThis.fetch) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetchImpl("/api/upload", {
    method: "POST",
    credentials: "include",
    body: formData,
  });

  const payload = await readJsonResponse(response);
  if (!payload.url) throw new Error("图片上传成功但没有返回图片地址");
  return payload.url;
}

export async function compressImageForUpload(file, options = {}) {
  const settings = { ...IMAGE_UPLOAD_OPTIONS, ...options };
  if (!canCompressImage(file)) return file;

  try {
    const bitmap = await loadImageBitmap(file);
    const longestSide = Math.max(bitmap.width, bitmap.height);
    const scale = Math.min(1, settings.maxDimension / longestSide);
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d", { alpha: true });
    if (!context) return file;

    context.drawImage(bitmap, 0, 0, width, height);
    const blob = await canvasToBlob(canvas, "image/webp", settings.webpQuality);
    if (!blob || blob.size >= file.size) return file;

    const name = `${file.name.replace(/\.[^.]+$/, "") || "image"}.webp`;
    return new File([blob], name, { type: "image/webp", lastModified: Date.now() });
  } catch {
    return file;
  }
}

function canCompressImage(file) {
  return (
    file &&
    typeof document !== "undefined" &&
    typeof File !== "undefined" &&
    typeof URL !== "undefined" &&
    typeof file.type === "string" &&
    /^image\/(?:jpeg|png|webp)$/i.test(file.type)
  );
}

async function loadImageBitmap(file) {
  if (typeof createImageBitmap === "function") return createImageBitmap(file);

  const url = URL.createObjectURL(file);
  try {
    const image = await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = url;
    });
    return image;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve) => {
    canvas.toBlob(resolve, type, quality);
  });
}

export function formatFileSize(bytes) {
  const size = Number(bytes || 0);
  if (!Number.isFinite(size) || size <= 0) return "0 KB";
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

export function normalizeRemoteEntry(entry = {}) {
  const coverImage = entry.coverImage || entry.coverImageUrl || "";
  return {
    ...entry,
    coverImage,
    coverImageUrl: entry.coverImageUrl || coverImage,
    roomTypes: Array.isArray(entry.roomTypes) ? entry.roomTypes : [],
    tags: Array.isArray(entry.tags) ? entry.tags : [],
  };
}

export function toRemoteEntryPayload(entry = {}, options = {}) {
  const coverImageUrl = entry.coverImageUrl || entry.coverImage || "";
  const payload = {
    ...entry,
    coverImageUrl,
  };
  if (options.expectedUpdatedAt) payload.expectedUpdatedAt = options.expectedUpdatedAt;
  return payload;
}

async function readJsonResponse(response) {
  let payload = {};
  try {
    payload = await response.json();
  } catch {
    payload = {};
  }

  if (!response.ok) {
    const message = payload.error || `后台请求失败 (${response.status})`;
    throw new Error(message);
  }

  return payload;
}

function toUrl(locationLike) {
  if (locationLike instanceof URL) return locationLike;
  if (typeof locationLike === "string") return new URL(locationLike);
  if (locationLike?.href) return new URL(locationLike.href);
  return new URL("http://localhost/");
}
