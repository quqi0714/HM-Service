import test from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
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

test("AI-ready enhancements do not add visible service-page copy", async () => {
  for (const page of ["index.html", "vehicle.html", "health.html", "love-health.html"]) {
    const html = await readFile(join(rootDir, page), "utf8");
    assert.doesNotMatch(html, /class="hero-topic/);
    assert.doesNotMatch(html, /<section class="ai-ready-summary"/);
  }

  const accessibilityCss = await readFile(join(rootDir, "css/accessibility.css"), "utf8");
  assert.doesNotMatch(accessibilityCss, /\.hero-topic\s*\{/);
  assert.doesNotMatch(accessibilityCss, /\.ai-ready-summary\s*\{/);
});

test("current static content images declare intrinsic dimensions and useful alt intent", async () => {
  for (const page of ["index.html", "vehicle.html", "health.html", "love-health.html"]) {
    const html = await readFile(join(rootDir, page), "utf8");
    const tags = [...html.matchAll(/<img\b[^>]*\bsrc=["']images\/[^"]+["'][^>]*>/g)].map((match) => match[0]);
    assert.ok(tags.length > 0, `${page} should contain local content images`);
    for (const tag of tags) {
      assert.match(tag, /\bwidth="\d+"/);
      assert.match(tag, /\bheight="\d+"/);
      assert.match(tag, /\balt="[^"]*"/);
    }
  }
});

test("CMS stores optional source, scope, and review metadata without blocking publishing", async () => {
  const adminHtml = await readFile(join(rootDir, "cms-demo/admin.html"), "utf8");
  const adminJs = await readFile(join(rootDir, "cms-demo/admin.js"), "utf8");
  const renderer = await readFile(join(rootDir, "functions/_lib/cms-core.js"), "utf8");
  const repository = await readFile(join(rootDir, "functions/_lib/content-repository.js"), "utf8");
  const migration = await readFile(join(rootDir, "migrations/0003_add_editorial_review_fields.sql"), "utf8");

  for (const id of ["reviewerName", "lastReviewedAt", "applicability", "sourceUrls"]) {
    assert.match(adminHtml, new RegExp(`id="${id}"`));
    assert.match(adminJs, new RegExp(id));
  }
  assert.doesNotMatch(adminJs, /发布政策文章前/);
  assert.doesNotMatch(repository, /assertPublicationMetadata/);
  assert.match(adminHtml, /选填；填写后会显示在“来源与更新”模块，不影响发布/);
  assert.match(adminHtml, /建议填写，不影响发布/);
  assert.match(renderer, /来源与更新/);
  assert.match(renderer, /base\.citation/);
  assert.match(renderer, /base\.editor/);
  assert.match(migration, /reviewer_name/);
  assert.match(migration, /last_reviewed_at/);
  assert.match(migration, /applicability/);
  assert.match(migration, /source_urls_json/);
});

test("content governance files separate confirmed facts from unresolved claims", async () => {
  const factSheet = await readFile(join(rootDir, "content-governance/official-fact-sheet.md"), "utf8");
  const claims = await readFile(join(rootDir, "content-governance/claims-register.md"), "utf8");
  const checklist = await readFile(join(rootDir, "content-governance/cms-publishing-checklist.md"), "utf8");

  assert.match(factSheet, /待业务方逐项确认/);
  assert.match(factSheet, /法定公司名/);
  assert.match(factSheet, /许可证\/资质/);
  assert.match(claims, /HCV-001/);
  assert.match(claims, /HUD HCV Applicant and Tenant Resources/);
  assert.match(claims, /待修正|待举证/);
  assert.match(checklist, /IndexNow/);
  assert.match(checklist, /最后审核日/);
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
  assert.match(productionRenderer, /href="\/accessibility">无障碍声明<\/a>/);
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
    assert.match(html, /href="\/accessibility">无障碍声明<\/a>/, `${page} must link the statement`);
  }
});

test("static pages use the extensionless URLs served by Cloudflare as their canonicals", async () => {
  const pages = new Map([
    ["index.html", "https://huameihope.com/"],
    ["vehicle.html", "https://huameihope.com/vehicle"],
    ["health.html", "https://huameihope.com/health"],
    ["love-health.html", "https://huameihope.com/love-health"],
    ["privacy.html", "https://huameihope.com/privacy"],
    ["terms.html", "https://huameihope.com/terms"],
    ["accessibility.html", "https://huameihope.com/accessibility"],
  ]);

  for (const [page, canonical] of pages) {
    const html = await readFile(join(rootDir, page), "utf8");
    assert.match(html, new RegExp(`<link rel="canonical" href="${canonical.replaceAll(".", "\\.")}">`));
  }
});

test("search and AI discovery controls allow search, retrieval, and training crawlers", async () => {
  const robots = await readFile(join(rootDir, "robots.txt"), "utf8");
  assert.match(robots, /Content-Signal: search=yes, ai-input=yes, ai-train=yes/);
  assert.match(robots, /User-agent: OAI-SearchBot[\s\S]*?Allow: \//);
  assert.match(robots, /User-agent: ChatGPT-User[\s\S]*?Allow: \//);
  assert.match(robots, /User-agent: GPTBot[\s\S]*?Allow: \//);
  assert.match(robots, /User-agent: Google-Extended[\s\S]*?Allow: \//);
  assert.match(robots, /User-agent: ClaudeBot[\s\S]*?Allow: \//);
  assert.match(robots, /User-agent: Claude-SearchBot[\s\S]*?Allow: \//);
  assert.match(robots, /User-agent: Claude-User[\s\S]*?Allow: \//);
  assert.match(robots, /User-agent: PerplexityBot[\s\S]*?Allow: \//);
  assert.match(robots, /User-agent: Perplexity-User[\s\S]*?Allow: \//);
  assert.doesNotMatch(
    robots,
    /ai-train=no|User-agent: (?:GPTBot|Google-Extended|ClaudeBot|Claude-SearchBot|Claude-User|PerplexityBot|Perplexity-User)\nDisallow: \//,
  );

  const headers = await readFile(join(rootDir, "_headers"), "utf8");
  assert.match(headers, /\/selected\.html\n\s+X-Robots-Tag: noindex, nofollow/);
  assert.match(headers, /\/index-old\.html\n\s+X-Robots-Tag: noindex, nofollow/);

  const routes = JSON.parse(await readFile(join(rootDir, "_routes.json"), "utf8"));
  assert.deepEqual(routes.include, ["/*"]);
});

test("public structured data is valid JSON and keeps the canonical Huamei identity", async () => {
  const structuredPages = ["index.html", "vehicle.html", "health.html", "love-health.html"];

  for (const page of structuredPages) {
    const html = await readFile(join(rootDir, page), "utf8");
    const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((match) =>
      JSON.parse(match[1]),
    );

    assert.ok(blocks.length > 0, `${page} must contain JSON-LD`);
    assert.ok(
      blocks.some((block) => block["@type"] === "Organization" && block["@id"] === "https://huameihope.com/#organization"),
      `${page} must identify the canonical organization`,
    );
    assert.doesNotMatch(JSON.stringify(blocks), /https?:\/\/www\.huameihope\.com|127\.0\.0\.1|localhost/);
  }
});

test("public and CMS pages record recognized AI referrals in GA4", async () => {
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
    assert.match(html, /<script defer src="\/js\/ai-referral\.js"><\/script>/, `${page} must load AI referral tracking`);
  }

  const tracker = await readFile(join(rootDir, "js/ai-referral.js"), "utf8");
  assert.match(tracker, /ai_referral_visit/);
  assert.match(tracker, /chatgpt\.com/);
  assert.match(tracker, /perplexity\.ai/);
  assert.match(tracker, /URLSearchParams\(window\.location\.search\)/);
  assert.match(tracker, /detection_method/);
  assert.match(tracker, /typeof window\.gtag !== "function"/);

  const productionRenderer = await readFile(join(rootDir, "functions/_lib/cms-core.js"), "utf8");
  assert.match(productionRenderer, /<script defer src="\/js\/ai-referral\.js"><\/script>/);
});

test("all public footers use the MaxHope AI-READY v2.1.1 CSP signature", async () => {
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
    assert.match(html, /MaxHope 落款 v2\.1\.1 · CSP 外链版/);
    assert.match(html, /<link rel="stylesheet" href="\/maxhope-assets\/maxhope-footer\.css">/);
    assert.match(html, /<script defer src="\/maxhope-assets\/maxhope-footer\.js"><\/script>/);
    assert.match(html, /class="mhk mhk--dark"/);
    assert.match(html, /class="mhk-ready-mark"/);
    assert.match(html, /class="mhk-card-head"/);
    assert.match(html, /mhk-card-ready mhk-ready-mark mhk-ready-mark--light/);
    assert.match(html, /\/maxhope-assets\/assets\/ai-ready-word-dark\.svg/);
    assert.match(html, /\/maxhope-assets\/assets\/ai-ready-word-light\.svg/);
    assert.match(html, /aria-label="AI-READY"/);
    assert.match(html, /utm_source=huameihope&amp;utm_medium=footer-credit/);
    assert.equal(html.match(/utm_source=huameihope&amp;utm_medium=footer-credit/g)?.length, 2);
    assert.doesNotMatch(html, /MaxHope 落款 v(?:1\.0|2\.0|2\.1(?!\.1))|__UTM_SOURCE__|width:72px|class="mhk-m[^>]+src="data:image/);
  }

  const productionRenderer = await readFile(join(rootDir, "functions/_lib/cms-core.js"), "utf8");
  assert.match(productionRenderer, /MaxHope 落款 v2\.1\.1 · CSP 外链版/);
  assert.match(productionRenderer, /<link rel="stylesheet" href="\/maxhope-assets\/maxhope-footer\.css">/);
  assert.match(productionRenderer, /<script defer src="\/maxhope-assets\/maxhope-footer\.js"><\/script>/);
  assert.match(productionRenderer, /class="mhk-ready-mark"/);
  assert.match(productionRenderer, /mhk-card-ready mhk-ready-mark mhk-ready-mark--light/);
  assert.match(productionRenderer, /\/maxhope-assets\/assets\/ai-ready-word-dark\.svg/);
  assert.match(productionRenderer, /utm_source=huameihope&amp;utm_medium=footer-credit/);
  assert.doesNotMatch(productionRenderer, /MaxHope 落款 v(?:1\.0|2\.0|2\.1(?!\.1))|__UTM_SOURCE__|width:72px|class="mhk-m[^>]+src="data:image/);

  const signatureCss = await readFile(join(rootDir, "maxhope-assets/maxhope-footer.css"), "utf8");
  assert.match(signatureCss, /MaxHope 落款 v2\.1\.1/);
  assert.match(signatureCss, /--mhk-safe-edge:\s*12px/);
  assert.match(signatureCss, /width:\s*min\(306px, calc\(100vw - 24px\)\)/);
  assert.match(signatureCss, /visibility:\s*hidden/);
  assert.match(signatureCss, /@media \(any-hover: hover\)/);
  assert.match(signatureCss, /@media \(prefers-reduced-motion: reduce\)/);

  const signatureJs = await readFile(join(rootDir, "maxhope-assets/maxhope-footer.js"), "utf8");
  assert.match(signatureJs, /var SAFE_EDGE = 12/);
  assert.match(signatureJs, /getBoundingClientRect\(\)/);
  assert.match(signatureJs, /--mhk-card-left/);
  assert.match(signatureJs, /--mhk-arrow-left/);
  assert.match(signatureJs, /visualViewport/);
});
test("deploy build output contains public files only", async () => {
  await execFileAsync(process.execPath, [join(scriptsDir, "build-deploy.mjs")], {
    cwd: rootDir,
  });

  const requiredPublicFiles = [
    "404.html",
    "index.html",
    "vehicle.html",
    "health.html",
    "love-health.html",
    "accessibility.html",
    "robots.txt",
    "llms.txt",
    "openapi.json",
    "f6472ce0775f9ed111d6c1585a63ba47.txt",
    "_headers",
    "_routes.json",
    ".well-known/agent-skills/index.json",
    ".well-known/agent-skills/huamei-public-information/SKILL.md",
    ".well-known/mcp/server-card.json",
    "css/accessibility.css",
    "css/tailwind.min.css",
    "js/ai-referral.js",
    "maxhope-assets/maxhope-footer.css",
    "maxhope-assets/maxhope-footer.js",
    "maxhope-assets/assets/mh-tight-blue.png",
    "maxhope-assets/assets/mh-tight-white.png",
    "maxhope-assets/assets/ai-ready-word-dark.svg",
    "maxhope-assets/assets/ai-ready-word-light.svg",
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
      (file.endsWith(".md") && !file.startsWith(".well-known/agent-skills/")) ||
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
  assert.match(sitemap, /<loc>https:\/\/huameihope\.com\/privacy<\/loc>/);
  assert.match(sitemap, /<loc>https:\/\/huameihope\.com\/terms<\/loc>/);
  assert.match(sitemap, /<loc>https:\/\/huameihope\.com\/accessibility<\/loc>/);
  assert.match(sitemap, /<loc>https:\/\/huameihope\.com\/apartments<\/loc>/);
  assert.match(sitemap, /<loc>https:\/\/huameihope\.com\/blog<\/loc>/);
  assert.doesNotMatch(sitemap, /<loc>[^<]+\.html<\/loc>/);
  assert.doesNotMatch(sitemap, /<lastmod>/);

  const indexNowKeyFile = await readFile(join(distDir, "f6472ce0775f9ed111d6c1585a63ba47.txt"), "utf8");
  assert.equal(indexNowKeyFile.trim(), "f6472ce0775f9ed111d6c1585a63ba47");

  const notFound = await readFile(join(distDir, "404.html"), "utf8");
  assert.match(notFound, /<meta name="robots" content="noindex,follow">/);
  assert.match(notFound, /页面不存在/);

  const llms = await readFile(join(distDir, "llms.txt"), "utf8");
  assert.match(llms, /# HM 华美服务中心/);
  assert.match(llms, /https:\/\/huameihope\.com\/apartments/);
  assert.match(llms, /不要把华美描述为政府部门/);
  assert.match(llms, /https:\/\/huameihope\.com\/public-data\/v1/);
  assert.match(llms, /https:\/\/agent\.huameihope\.com\/mcp/);

  const openapi = JSON.parse(await readFile(join(distDir, "openapi.json"), "utf8"));
  assert.equal(openapi.openapi, "3.1.0");
  assert.equal(openapi.servers[0].url, "https://huameihope.com");
  assert.ok(openapi.paths["/public-data/v1/apartments"]);
  assert.ok(openapi.paths["/public-data/v1/articles/{slug}"]);
  assert.equal(openapi.components.parameters.Limit.schema.maximum, 50);

  const mcpCard = JSON.parse(await readFile(join(distDir, ".well-known/mcp/server-card.json"), "utf8"));
  assert.equal(mcpCard.transport.endpoint, "https://agent.huameihope.com/mcp");
  assert.equal(mcpCard.authentication.required, false);

  const skill = await readFile(
    join(distDir, ".well-known/agent-skills/huamei-public-information/SKILL.md"),
    "utf8",
  );
  const skillIndex = JSON.parse(await readFile(join(distDir, ".well-known/agent-skills/index.json"), "utf8"));
  const digest = createHash("sha256").update(skill).digest("hex");
  assert.equal(skillIndex.$schema, "https://schemas.agentskills.io/discovery/0.2.0/schema.json");
  assert.equal(skillIndex.skills[0].digest, `sha256:${digest}`);
});

test("public agent interfaces remain read-only and isolated from CMS authentication", async () => {
  const publicApi = await readFile(join(rootDir, "functions/_lib/public-api.js"), "utf8");
  const repository = await readFile(join(rootDir, "functions/_lib/content-repository.js"), "utf8");
  const workerSource = await readFile(join(rootDir, "agent-worker/src/index.js"), "utf8");
  const workerConfig = await readFile(join(rootDir, "agent-worker/wrangler.toml"), "utf8");
  const publicRouteSources = await Promise.all([
    "functions/public-data/v1/apartments/index.js",
    "functions/public-data/v1/apartments/[slug].js",
    "functions/public-data/v1/articles/index.js",
    "functions/public-data/v1/articles/[slug].js",
  ].map((file) => readFile(join(rootDir, file), "utf8")));

  assert.match(repository, /if \(!filters\.includeDrafts\)[\s\S]*?content_status = \?/);
  for (const source of publicRouteSources) assert.doesNotMatch(source, /includeDrafts:\s*true/);
  assert.doesNotMatch(publicApi, /lastEditorEmail|editorEmail|contentStatus|createdAt|seoTitle|seoDescription/);
  assert.doesNotMatch(workerConfig, /d1_databases|HM_CMS_DB|r2_buckets|HM_CMS_ASSETS/);
  assert.doesNotMatch(workerSource, /\/api\/|HM_CMS_DB|HM_CMS_ASSETS|method:\s*["'](?:POST|PUT|PATCH|DELETE)["']/);
  assert.match(workerSource, /method:\s*"GET"/);
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
