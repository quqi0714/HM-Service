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
  "robots.txt",
  "sitemap.xml",
  "_headers",
  "_routes.json",
  "CNAME",
  "Mei.png",
  "E4EE92B8-4908-494B-8920-3C3DB6CC240E.png",
  "cb3080ee545793e1015ce904c81584bf.jpg",
];

const PUBLIC_DIRECTORIES = ["css", "images"];

const CMS_DEMO_FILES = [
  "admin.html",
  "admin.js",
  "apartments.html",
  "blog.html",
  "cms-backend.mjs",
  "cms-core.mjs",
  "cms-store.mjs",
  "detail.html",
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
