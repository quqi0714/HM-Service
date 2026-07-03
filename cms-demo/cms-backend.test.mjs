import test from "node:test";
import assert from "node:assert/strict";

import {
  CMS_BACKEND_MODES,
  compressImageForUpload,
  deletePermanentRemoteEntry,
  formatFileSize,
  getCmsBackendMode,
  getCmsBackendModeCopy,
  normalizeRemoteEntry,
  toRemoteEntryPayload,
} from "./cms-backend.mjs";

test("getCmsBackendMode keeps localhost and file URLs in demo mode", () => {
  assert.equal(getCmsBackendMode("http://127.0.0.1:8766/cms-demo/admin.html"), CMS_BACKEND_MODES.LOCAL);
  assert.equal(getCmsBackendMode("http://localhost:8766/cms-demo/admin.html"), CMS_BACKEND_MODES.LOCAL);
  assert.equal(getCmsBackendMode("file:///Users/qu/Documents/Huamei-官网/cms-demo/admin.html"), CMS_BACKEND_MODES.LOCAL);
});

test("getCmsBackendMode uses remote mode on production-like hosts and respects manual overrides", () => {
  assert.equal(getCmsBackendMode("https://huameihope.com/cms-demo/admin.html"), CMS_BACKEND_MODES.REMOTE);
  assert.equal(
    getCmsBackendMode("https://huameihope.com/cms-demo/admin.html?cmsMode=demo"),
    CMS_BACKEND_MODES.LOCAL,
  );
  assert.equal(
    getCmsBackendMode("http://127.0.0.1:8766/cms-demo/admin.html?cmsMode=remote"),
    CMS_BACKEND_MODES.REMOTE,
  );
});

test("getCmsBackendModeCopy gives non-technical labels for the admin banner", () => {
  assert.match(getCmsBackendModeCopy(CMS_BACKEND_MODES.LOCAL).title, /本地演示/);
  assert.match(getCmsBackendModeCopy(CMS_BACKEND_MODES.REMOTE).title, /正式后台/);
});

test("normalizeRemoteEntry makes Cloudflare image records readable by the demo UI", () => {
  const entry = normalizeRemoteEntry({
    id: "apt-397",
    type: "apartment",
    title: "测试公寓",
    coverImageUrl: "/cms-assets/cms/2026-07-01/image.webp",
    galleryImages: ["/cms-assets/cms/2026-07-01/image.webp", "/cms-assets/cms/2026-07-01/lobby.webp"],
    roomTypes: ["1B"],
    tags: ["重点推荐"],
  });

  assert.equal(entry.coverImage, "/cms-assets/cms/2026-07-01/image.webp");
  assert.equal(entry.coverImageUrl, "/cms-assets/cms/2026-07-01/image.webp");
  assert.deepEqual(entry.galleryImages, [
    "/cms-assets/cms/2026-07-01/image.webp",
    "/cms-assets/cms/2026-07-01/lobby.webp",
  ]);
});

test("toRemoteEntryPayload sends gallery images and keeps the first image as the cover", () => {
  const payload = toRemoteEntryPayload({
    id: "apt-397",
    type: "apartment",
    title: "测试公寓",
    coverImage: "data:image/webp;base64,abc",
    galleryImages: ["data:image/webp;base64,abc", "/cms-assets/cms/2026-07-01/lobby.webp"],
  });

  assert.equal(payload.coverImageUrl, "data:image/webp;base64,abc");
  assert.deepEqual(payload.galleryImages, ["data:image/webp;base64,abc", "/cms-assets/cms/2026-07-01/lobby.webp"]);
});

test("saveRemoteEntry sends the loaded updatedAt as the expected update version", async () => {
  let seenUrl = "";
  let seenBody = null;
  const fetchImpl = async (url, options) => {
    seenUrl = url;
    seenBody = JSON.parse(options.body);
    return new Response(JSON.stringify({ entry: seenBody }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  };

  const { saveRemoteEntry } = await import("./cms-backend.mjs");
  await saveRemoteEntry(
    {
      id: "apt-397",
      type: "apartment",
      title: "测试公寓",
      updatedAt: "2026-07-01T12:30:00.000Z",
    },
    {
      isUpdate: true,
      expectedUpdatedAt: "2026-07-01T10:00:00.000Z",
    },
    fetchImpl,
  );

  assert.equal(seenUrl, "/api/content/apt-397");
  assert.equal(seenBody.updatedAt, "2026-07-01T12:30:00.000Z");
  assert.equal(seenBody.expectedUpdatedAt, "2026-07-01T10:00:00.000Z");
});

test("fetchRemoteEntries requests enough records for large apartment inventories", async () => {
  const seenUrls = [];
  const fetchImpl = async (url) => {
    seenUrls.push(url);
    return new Response(JSON.stringify({ entries: [] }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  };

  const { fetchRemoteEntries } = await import("./cms-backend.mjs");
  await fetchRemoteEntries(fetchImpl);

  assert.deepEqual(seenUrls, ["/api/content?limit=5000"]);
});

test("deletePermanentRemoteEntry sends explicit confirmation for dangerous deletes", async () => {
  let seenUrl = "";
  let seenOptions = null;
  const fetchImpl = async (url, options) => {
    seenUrl = url;
    seenOptions = options;
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  };

  await deletePermanentRemoteEntry("apt-1", "1", fetchImpl);

  assert.equal(seenUrl, "/api/content/apt-1?permanent=1");
  assert.equal(seenOptions.method, "DELETE");
  assert.equal(seenOptions.headers["content-type"], "application/json");
  assert.deepEqual(JSON.parse(seenOptions.body), { confirmation: "1" });
});

test("compressImageForUpload safely falls back when browser canvas is unavailable", async () => {
  const file = new File(["image-bytes"], "poster.png", { type: "image/png" });
  const compressed = await compressImageForUpload(file);

  assert.equal(compressed, file);
});

test("formatFileSize gives staff readable upload sizes", () => {
  assert.equal(formatFileSize(1500), "1 KB");
  assert.equal(formatFileSize(2.25 * 1024 * 1024), "2.3 MB");
});
