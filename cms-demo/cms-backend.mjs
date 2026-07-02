export const CMS_BACKEND_MODES = Object.freeze({
  LOCAL: "local",
  REMOTE: "remote",
});

const LOCAL_HOSTS = new Set(["", "localhost", "127.0.0.1", "::1"]);

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
  const response = await fetchImpl(endpoint, {
    method: isUpdate ? "PUT" : "POST",
    credentials: "include",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
    },
    body: JSON.stringify(toRemoteEntryPayload(entry)),
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

export function toRemoteEntryPayload(entry = {}) {
  const coverImageUrl = entry.coverImageUrl || entry.coverImage || "";
  return {
    ...entry,
    coverImageUrl,
  };
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
