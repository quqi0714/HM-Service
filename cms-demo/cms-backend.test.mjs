import test from "node:test";
import assert from "node:assert/strict";

import {
  CMS_BACKEND_MODES,
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
    roomTypes: ["1B"],
    tags: ["重点推荐"],
  });

  assert.equal(entry.coverImage, "/cms-assets/cms/2026-07-01/image.webp");
  assert.equal(entry.coverImageUrl, "/cms-assets/cms/2026-07-01/image.webp");
});

test("toRemoteEntryPayload sends cover images in the Cloudflare field name", () => {
  const payload = toRemoteEntryPayload({
    id: "apt-397",
    type: "apartment",
    title: "测试公寓",
    coverImage: "data:image/webp;base64,abc",
  });

  assert.equal(payload.coverImageUrl, "data:image/webp;base64,abc");
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
