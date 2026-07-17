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

test("mobile admin panels can shrink to the viewport", async () => {
  const styles = await readFile(join(rootDir, "cms-demo/styles.css"), "utf8");

  assert.match(
    styles,
    /@media \(max-width: 640px\)[\s\S]*?\.admin-grid > \.panel\s*\{[^}]*min-width:\s*0;/,
  );
  assert.match(
    styles,
    /@media \(max-width: 640px\)[\s\S]*?\.admin-grid \.editor-state \.badge\s*\{[^}]*white-space:\s*normal;/,
  );
});

test("public pages keep the ADA navigation and focus baseline", async () => {
  const publicPages = [
    "index.html",
    "vehicle.html",
    "health.html",
    "love-health.html",
    "accessibility.html",
    "privacy.html",
    "terms.html",
  ];

  for (const page of publicPages) {
    const html = await readFile(join(rootDir, page), "utf8");
    assert.match(html, /<link rel="stylesheet" href="css\/accessibility\.css">/);
    assert.match(html, /<a class="skip-link" href="#main-content">跳到主要内容<\/a>/);
    assert.match(html, /<main\b[^>]*\bid="main-content"[^>]*\btabindex="-1"/);
    assert.equal((html.match(/class="skip-link"/g) || []).length, 1, `${page} must have one skip link`);
    assert.equal((html.match(/id="main-content"/g) || []).length, 1, `${page} must have one main target`);
  }

  const accessibilityCss = await readFile(join(rootDir, "css/accessibility.css"), "utf8");
  assert.match(accessibilityCss, /:focus-visible/);
  assert.match(accessibilityCss, /min-(?:block-size|height):\s*44px/);
  assert.match(accessibilityCss, /prefers-reduced-motion:\s*reduce/);
});

test("targeted WCAG labels, landmarks, contrast, and scroll keyboard support remain in source", async () => {
  const home = await readFile(join(rootDir, "index.html"), "utf8");
  const health = await readFile(join(rootDir, "health.html"), "utf8");
  const loveHealth = await readFile(join(rootDir, "love-health.html"), "utf8");
  const accessibilityCss = await readFile(join(rootDir, "css/accessibility.css"), "utf8");

  assert.equal((home.match(/class="[^"]*h-scroll-mobile[^"]*" role="region"[^>]*tabindex="0"/g) || []).length, 3);
  assert.match(home, /aria-label="华美服务板块，横向滚动查看更多"/);
  assert.match(home, /aria-label="团队服务优势，横向滚动查看更多"/);
  assert.match(home, /aria-label="公寓社区类型，横向滚动查看更多"/);
  assert.match(home, /class="rent-watermark" aria-hidden="true"[^>]*><\/div>/);
  assert.match(accessibilityCss, /\.rent-watermark::before\s*\{[^}]*content:\s*"RENT";/);
  assert.match(health, /h-scroll-mobile" role="region" aria-label="健康关怀服务，横向滚动查看更多" tabindex="0"/);
  for (const html of [home, health]) {
    assert.match(html, /event\.key !== 'ArrowLeft' && event\.key !== 'ArrowRight'/);
    assert.match(html, /scroller\.scrollBy\(/);
  }
  assert.match(accessibilityCss, /\.h-scroll-mobile:focus-visible/);

  for (const page of ["index.html", "vehicle.html", "health.html", "love-health.html"]) {
    const html = await readFile(join(rootDir, page), "utf8");
    assert.match(html, /<aside aria-label="快速咨询">\s*<a[^>]+id="floatCta"/);
  }

  for (const page of ["index.html", "vehicle.html", "health.html", "love-health.html", "accessibility.html", "privacy.html", "terms.html"]) {
    const html = await readFile(join(rootDir, page), "utf8");
    assert.doesNotMatch(html, /huamei-logo\.webp"[^>]*alt="HM 华美服务中心"/);
    assert.match(html, /huamei-logo\.webp"[^>]*alt=""/);
  }

  assert.ok(contrastRatio("#5F6C50", "#F8F1E2") >= 4.5);
  assert.ok(contrastRatio("#536048", "#F8F1E2") >= 4.5);
  assert.match(loveHealth, /\.day-step \.day-num\s*\{[\s\S]*?color:\s*#5F6C50;\s*opacity:\s*1;/);
  assert.match(loveHealth, /\.day-step:hover \.day-num\s*\{\s*color:\s*#536048;\s*opacity:\s*1;/);
});

test("interactive cards, forms, and dialogs retain keyboard semantics", async () => {
  const home = await readFile(join(rootDir, "index.html"), "utf8");
  assert.match(home, /<label for="annualIncome"/);
  assert.match(home, /<label for="currentRent"/);
  assert.match(home, /role="button" tabindex="0" aria-haspopup="dialog"/);
  assert.match(home, /role="dialog" aria-modal="true"/);
  assert.match(home, /event\.key === ['"]Enter['"] \|\| event\.key === ['"] ['"]/);
  assert.match(home, /(?:event|e)\.key === ['"]Escape['"]/);

  for (const page of ["vehicle.html", "health.html"]) {
    const html = await readFile(join(rootDir, page), "utf8");
    assert.match(html, /role="button" tabindex="0" aria-haspopup="dialog"/);
    assert.match(html, /role="dialog" aria-modal="true"/);
    assert.match(html, /aria-hidden="true"/);
    assert.match(html, /data-modal-trigger/);
    assert.match(html, /(?:event|e)\.key === ['"]Escape['"]/);
  }

  const productionRenderer = await readFile(join(rootDir, "functions/_lib/cms-core.js"), "utf8");
  assert.match(productionRenderer, /<a class="skip-link" href="#main-content">跳到主要内容<\/a>/);
  assert.match(productionRenderer, /<main id="main-content"/);
  assert.match(productionRenderer, /if \(event\.key !== "Tab"\) return;/);
  assert.match(productionRenderer, /:focus-visible/);
  assert.match(productionRenderer, /href="\/accessibility\.html">无障碍声明<\/a>/);
});

test("accessibility statement is honest, reachable, and actionable", async () => {
  const statement = await readFile(join(rootDir, "accessibility.html"), "utf8");
  assert.match(statement, /WCAG 2\.1/);
  assert.match(statement, /两个工作日内/);
  assert.match(statement, /href="tel:\+16505768590"/);
  assert.match(statement, /href="mailto:info\.cacar@gmail\.com"/);
  assert.doesNotMatch(statement, /100% 无障碍|完全符合 ADA|ADA 官方认证/);

  for (const page of ["index.html", "vehicle.html", "health.html", "love-health.html", "privacy.html", "terms.html"]) {
    const html = await readFile(join(rootDir, page), "utf8");
    assert.match(html, /href="accessibility\.html">无障碍声明<\/a>/, `${page} must link the statement`);
  }
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
    "accessibility.html",
    "robots.txt",
    "_headers",
    "_routes.json",
    "css/accessibility.css",
    "css/tailwind.min.css",
    "images/brand/huamei-logo.webp",
    "images/blog/section-8-qa-01-basics-eligibility.webp",
    "images/blog/section-8-qa-02-application-waitlist.webp",
    "images/blog/section-8-qa-03-rent-housing-portability.webp",
    "cms-demo/admin.html",
    "cms-demo/admin.js",
    "cms-demo/cms-core.mjs",
    "cms-demo/cms-backend.mjs",
    "cms-demo/published-apartments.html",
  ];

  for (const file of requiredPublicFiles) {
    await assertFileExists(join(distDir, file));
  }

  // "客户样"demo 页不得进入生产（正式页为 /apartments、/blog）
  for (const file of ["cms-demo/apartments.html", "cms-demo/blog.html", "cms-demo/detail.html"]) {
    await assertFileMissing(join(distDir, file));
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

  const sitemap = await readFile(join(distDir, "sitemap.xml"), "utf8");
  assert.match(sitemap, /<loc>https:\/\/huameihope\.com\/privacy\.html<\/loc>/);
  assert.match(sitemap, /<loc>https:\/\/huameihope\.com\/terms\.html<\/loc>/);
  assert.match(sitemap, /<loc>https:\/\/huameihope\.com\/accessibility\.html<\/loc>/);
});

test("love-health consultation form does not collect health information", async () => {
  const source = await readFile(join(rootDir, "love-health.html"), "utf8");
  assert.doesNotMatch(source, /health_notes|lh-health|特殊健康情况要先告知/);
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

async function assertFileMissing(path) {
  const { access } = await import("node:fs/promises");
  let exists = true;
  try { await access(path); } catch { exists = false; }
  if (exists) throw new Error(`expected file to be absent from dist: ${path}`);
}

function contrastRatio(foreground, background) {
  const lighter = Math.max(relativeLuminance(foreground), relativeLuminance(background));
  const darker = Math.min(relativeLuminance(foreground), relativeLuminance(background));
  return (lighter + 0.05) / (darker + 0.05);
}

function relativeLuminance(hex) {
  const channels = hex.match(/[0-9a-f]{2}/gi).map((value) => Number.parseInt(value, 16) / 255);
  const [r, g, b] = channels.map((value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
