import test from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { access, readFile, readdir, stat } from "node:fs/promises";
import { promisify } from "node:util";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const execFileAsync = promisify(execFile);
const scriptsDir = dirname(fileURLToPath(import.meta.url));
const rootDir = join(scriptsDir, "..");
const distDir = join(rootDir, "dist");

test("Cloudflare Pages uses a clean dist output directory", async () => {
  const wrangler = await readFile(join(rootDir, "wrangler.toml"), "utf8");
  const gitignore = await readFile(join(rootDir, ".gitignore"), "utf8");

  assert.match(wrangler, /^pages_build_output_dir\s*=\s*"dist"/m);
  assert.match(gitignore, /^dist\/$/m);
});

test("deploy build output contains public files only", async () => {
  await execFileAsync(process.execPath, [join(scriptsDir, "build-deploy.mjs")], {
    cwd: rootDir,
  });

  const requiredPublicFiles = [
    "index.html",
    "vehicle.html",
    "health.html",
    "love-health.html",
    "robots.txt",
    "_headers",
    "_routes.json",
    "css/tailwind.min.css",
    "images/brand/huamei-logo.webp",
    "cms-demo/admin.html",
    "cms-demo/admin.js",
    "cms-demo/cms-core.mjs",
    "cms-demo/cms-backend.mjs",
    "cms-demo/published-apartments.html",
  ];

  for (const file of requiredPublicFiles) {
    await assertFileExists(join(distDir, file));
  }

  const distFiles = await listFiles(distDir);
  const unreferencedRootAssets = [
    "Mei.png",
    "E4EE92B8-4908-494B-8920-3C3DB6CC240E.png",
    "cb3080ee545793e1015ce904c81584bf.jpg",
  ];
  const forbiddenFiles = distFiles.filter((file) => {
    return (
      unreferencedRootAssets.includes(file) ||
      file.endsWith(".md") ||
      file.endsWith(".test.mjs") ||
      file === "wrangler.toml" ||
      file === "package.json" ||
      file.startsWith("audit-") ||
      file.startsWith("scripts/") ||
      file.startsWith("tailwind-build/") ||
      file.startsWith("functions/") ||
      file.startsWith("migrations/")
    );
  });

  assert.deepEqual(forbiddenFiles, []);
});

async function assertFileExists(path) {
  await access(path);
}

async function listFiles(dir) {
  const results = [];
  const entries = await readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const absolutePath = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...(await listFiles(absolutePath)));
      continue;
    }
    if ((await stat(absolutePath)).isFile()) {
      results.push(relative(distDir, absolutePath));
    }
  }

  return results.sort();
}
