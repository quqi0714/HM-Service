import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { normalizeEntryForStorage, renderEntryPage } from "../functions/_lib/cms-core.js";

const rootDir = join(dirname(fileURLToPath(import.meta.url)), "..");
const seriesDir = join(rootDir, "blog-drafts", "section-8-series");
const previewDir = join(seriesDir, "preview");
const generatedAt = new Date().toISOString();

const drafts = [
  {
    source: "01-section-8-basics-and-eligibility.md",
    preview: "01-basics-and-eligibility.html",
    coverImageUrl: "/images/blog/section-8-qa-01-basics-eligibility.webp",
    coverAlt: "华人家庭在家中一起了解 Section 8 住房券申请资格",
  },
  {
    source: "02-section-8-application-and-waitlist.md",
    preview: "02-application-and-waitlist.html",
    coverImageUrl: "/images/blog/section-8-qa-02-application-waitlist.webp",
    coverAlt: "申请人在桌前整理 Section 8 等候名单与申请材料",
  },
  {
    source: "03-section-8-rent-housing-and-portability.md",
    preview: "03-rent-housing-and-portability.html",
    coverImageUrl: "/images/blog/section-8-qa-03-rent-housing-portability.webp",
    coverAlt: "租客使用地图、钥匙和住房资料规划 Section 8 找房与搬迁",
  },
];

await mkdir(previewDir, { recursive: true });

const entries = [];
for (const draft of drafts) {
  const markdown = await readFile(join(seriesDir, draft.source), "utf8");
  const parsed = parseDraft(markdown);
  const entry = normalizeEntryForStorage(
    {
      id: parsed.slug,
      type: "blog",
      title: parsed.title,
      slug: parsed.slug,
      contentStatus: "draft",
      summary: parsed.summary,
      bodyHtml: markdownToCmsHtml(parsed.bodyMarkdown),
      coverImageUrl: draft.coverImageUrl,
      galleryImages: [draft.coverImageUrl],
      coverAlt: draft.coverAlt,
      tags: parsed.tags,
      blogCategory: parsed.category,
      authorName: parsed.authorName,
      reviewerName: parsed.reviewerName,
      lastReviewedAt: parsed.lastReviewedAt,
      applicability: parsed.applicability,
      sourceUrls: parsed.sourceUrls,
      seoTitle: parsed.seoTitle,
      seoDescription: parsed.seoDescription,
    },
    { now: generatedAt },
  );

  entries.push(entry);
  await writeFile(
    join(previewDir, draft.preview),
    renderEntryPage(entry, {
      origin: "http://127.0.0.1:4173",
      siteName: "HM 华美服务中心 · 审核预览",
      now: Date.parse(generatedAt),
    }),
  );
}

await writeFile(join(seriesDir, "cms-drafts.json"), `${JSON.stringify(entries, null, 2)}\n`);
await writeFile(join(previewDir, "index.html"), buildReviewIndex(entries, drafts));

console.log(`Built ${entries.length} CMS drafts and review previews in ${previewDir}`);

function parseDraft(markdown) {
  return {
    title: firstMatch(markdown, /^#\s+(.+)$/m),
    category: firstMatch(markdown, /^- 分类：(.+)$/m),
    slug: firstMatch(markdown, /^- Slug：`([^`]+)`$/m),
    authorName: firstMatch(markdown, /^- 作者：(.+)$/m),
    reviewerName: firstMatch(markdown, /^- 审核：(.+)$/m),
    lastReviewedAt: firstMatch(markdown, /^- 最后审核日：(.+)$/m),
    applicability: firstMatch(markdown, /^- 适用范围：(.+)$/m),
    sourceUrls: markdownLinks(firstMatch(markdown, /^- 官方来源：(.+)$/m)),
    tags: firstMatch(markdown, /^- 建议标签：(.+)$/m)
      .split("、")
      .map((tag) => tag.trim())
      .filter(Boolean),
    summary: sectionText(markdown, "### 列表摘要", "### SEO 标题"),
    seoTitle: sectionText(markdown, "### SEO 标题", "### SEO 描述"),
    seoDescription: sectionText(markdown, "### SEO 描述", "---"),
    bodyMarkdown: markdown.split("## 正文")[1]?.trim() || "",
  };
}

function markdownLinks(value) {
  return [...String(value || "").matchAll(/\[[^\]]+\]\((https:\/\/[^)]+)\)/g)].map((match) => match[1]);
}

function firstMatch(value, pattern) {
  const match = value.match(pattern);
  if (!match?.[1]?.trim()) throw new Error(`Missing draft metadata for ${pattern}`);
  return match[1].trim();
}

function sectionText(value, start, end) {
  const startIndex = value.indexOf(start);
  const endIndex = value.indexOf(end, startIndex + start.length);
  if (startIndex < 0 || endIndex < 0) throw new Error(`Missing section between ${start} and ${end}`);
  return value.slice(startIndex + start.length, endIndex).trim().replace(/\s+/g, " ");
}

function markdownToCmsHtml(markdown) {
  const lines = markdown.split(/\r?\n/);
  const html = [];
  let paragraph = [];
  let listType = "";

  const closeParagraph = () => {
    if (!paragraph.length) return;
    html.push(`<p>${renderInline(paragraph.join(" "))}</p>`);
    paragraph = [];
  };

  const closeList = () => {
    if (!listType) return;
    html.push(`</${listType}>`);
    listType = "";
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      closeParagraph();
      closeList();
      continue;
    }

    const heading = line.match(/^#{2,4}\s+(.+)$/);
    if (heading) {
      closeParagraph();
      closeList();
      html.push(`<h2>${renderInline(heading[1])}</h2>`);
      continue;
    }

    const quote = line.match(/^>\s+(.+)$/);
    if (quote) {
      closeParagraph();
      closeList();
      html.push(`<blockquote><p>${renderInline(quote[1])}</p></blockquote>`);
      continue;
    }

    const unordered = line.match(/^-\s+(.+)$/);
    const ordered = line.match(/^\d+\.\s+(.+)$/);
    if (unordered || ordered) {
      closeParagraph();
      const nextType = unordered ? "ul" : "ol";
      if (listType && listType !== nextType) closeList();
      if (!listType) {
        listType = nextType;
        html.push(`<${listType}>`);
      }
      html.push(`<li>${renderInline((unordered || ordered)[1])}</li>`);
      continue;
    }

    paragraph.push(line);
  }

  closeParagraph();
  closeList();
  return html.join("\n");
}

function renderInline(value) {
  const links = [];
  let text = String(value || "").replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+|\/[^\s)]+)\)/g, (_, label, href) => {
    const index = links.push({ label, href }) - 1;
    return `@@CMS_LINK_${index}@@`;
  });

  text = escapeHtml(text)
    .replace(/&lt;strong&gt;/g, "<strong>")
    .replace(/&lt;\/strong&gt;/g, "</strong>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");

  links.forEach(({ label, href }, index) => {
    text = text.replace(
      `@@CMS_LINK_${index}@@`,
      `<a href="${escapeAttribute(href)}">${escapeHtml(label)}</a>`,
    );
  });
  return text;
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeAttribute(value) {
  return escapeHtml(value).replace(/`/g, "&#096;");
}

function buildReviewIndex(entries, configs) {
  const cards = entries
    .map(
      (entry, index) => `<article class="card">
        <img src="${escapeAttribute(entry.coverImageUrl)}" width="1200" height="630" alt="${escapeAttribute(entry.coverAlt)}">
        <div><span>${escapeHtml(entry.blogCategory)} · 第 ${index + 1} 期</span>
        <h2>${escapeHtml(entry.title)}</h2>
        <p>${escapeHtml(entry.summary)}</p>
        <a href="./${escapeAttribute(configs[index].preview)}">审核这篇文章</a></div>
      </article>`,
    )
    .join("\n");

  return `<!doctype html><html lang="zh-Hans"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Section 8 系列 · 审核预览</title><style>
  :root{font-family:Inter,"PingFang SC",sans-serif;color:#302a25;background:#f2f5ee}body{margin:0}.shell{width:min(1080px,calc(100% - 32px));margin:0 auto;padding:48px 0 64px}header{max-width:760px;margin-bottom:28px}h1{font-family:Georgia,"Noto Serif SC",serif;font-size:clamp(34px,6vw,62px);line-height:1.02;margin:0 0 16px}header p{color:#6d6760;font-size:18px}.grid{display:grid;gap:18px}.card{display:grid;grid-template-columns:minmax(260px,38%) 1fr;background:#fffdf8;border:1px solid #ddd8ca;border-radius:20px;overflow:hidden;box-shadow:0 24px 70px -58px #193c30}.card img{width:100%;height:100%;min-height:250px;object-fit:cover;background:#e6ede4}.card div{padding:28px}.card span{color:#567985;font-weight:800}.card h2{font:500 30px/1.14 Georgia,"Noto Serif SC",serif;margin:8px 0 12px}.card p{color:#6d6760}.card a{display:inline-block;margin-top:8px;background:#496f5b;color:white;text-decoration:none;font-weight:800;border-radius:999px;padding:10px 18px}@media(max-width:720px){.shell{padding-top:28px}.card{grid-template-columns:1fr}.card img{aspect-ratio:1200/630;min-height:0}.card div{padding:22px}.card h2{font-size:25px}}
  </style></head><body><main class="shell"><header><p>华美官网 · Blog 待审核稿</p><h1>Section 8 住房券<br>三期系列问答</h1><p>以下页面使用正式 CMS 渲染器生成，当前仅供内部审核，不会被发布或收录。</p></header><section class="grid">${cards}</section></main></body></html>`;
}
