import { cp, mkdir, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = join(dirname(fileURLToPath(import.meta.url)), "..");
const distDir = join(rootDir, "dist");

const PUBLIC_ROOT_FILES = [
  "index.html",
  "vehicle.html",
  "health.html",
  "love-health.html",
  "accessibility.html",
  "privacy.html",
  "terms.html",
  "robots.txt",
  "sitemap.xml",
  "f6472ce0775f9ed111d6c1585a63ba47.txt",
  "_headers",
  "_routes.json",
  "CNAME",
];

const PUBLIC_DIRECTORIES = ["css", "images", "js", "maxhope-assets"];

// 注意：apartments.html / blog.html / detail.html 是本地演示用的"客户样"页面，
// 只存在于仓库，不随生产部署（正式客户页是 /apartments、/blog、/apartments/:id）。
const CMS_DEMO_FILES = [
  "admin.html",
  "admin.js",
  "cms-backend.mjs",
  "cms-core.mjs",
  "cms-store.mjs",
  "preview.html",
  "public.js",
  "published-apartments.html",
  "published-apartments.js",
  "styles.css",
];

await rm(distDir, { recursive: true, force: true });
await mkdir(distDir, { recursive: true });

for (const file of PUBLIC_ROOT_FILES) {
  await copyFromRoot(file);
}

for (const directory of PUBLIC_DIRECTORIES) {
  await copyFromRoot(directory);
}

await mkdir(join(distDir, "cms-demo"), { recursive: true });
for (const file of CMS_DEMO_FILES) {
  await copyFromRoot(join("cms-demo", file));
}

console.log(`Built clean Cloudflare Pages output at ${distDir}`);

async function copyFromRoot(relativePath) {
  await cp(join(rootDir, relativePath), join(distDir, relativePath), {
    recursive: true,
    force: true,
    errorOnExist: false,
  });
}
