import { readFile, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { resolve } from "node:path";

const inputPath = resolve("blog-drafts/section-8-series/cms-drafts.json");
const outputPath = process.argv[2] || "/tmp/huamei-section8-publish.sql";
const editorEmail = "quqi0714@gmail.com";
const publishDate = "2026-07-13";
const now = new Date().toISOString();
const entries = JSON.parse(await readFile(inputPath, "utf8"));

if (!Array.isArray(entries) || entries.length !== 3) {
  throw new Error(`Expected exactly 3 Section 8 entries, received ${entries?.length ?? "invalid input"}`);
}

function sqlValue(value) {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "number") return String(value);
  return `'${String(value).replaceAll("'", "''")}'`;
}

function entryValues(entry) {
  return [
    entry.id,
    entry.type,
    entry.slug,
    entry.apartmentNumber || null,
    entry.title,
    entry.summary,
    entry.bodyHtml,
    "published",
    entry.coverImageUrl,
    JSON.stringify(entry.galleryImages || []),
    entry.coverAlt,
    publishDate,
    entry.createdAt || now,
    now,
    entry.isPinned ? 1 : 0,
    entry.city || "",
    entry.region || "",
    entry.ageRequirement || "",
    JSON.stringify(entry.roomTypes || []),
    entry.applicationStatus || "",
    JSON.stringify(entry.tags || []),
    entry.rentRange || "",
    entry.incomeLimit || "",
    entry.applicationDeadline || "",
    entry.externalApplyLink || "",
    entry.blogCategory || "",
    entry.authorName || "华美服务中心",
    entry.reviewerName || "",
    entry.lastReviewedAt || "",
    entry.applicability || "",
    JSON.stringify(entry.sourceUrls || []),
    entry.seoTitle || "",
    entry.seoDescription || "",
    editorEmail,
  ];
}

const statements = entries.flatMap((entry) => {
  if (entry.type !== "blog" || !entry.id.startsWith("section-8-qa-")) {
    throw new Error(`Unexpected entry in Section 8 publish batch: ${entry.id || "unknown"}`);
  }

  const insertEntry = `INSERT INTO cms_entries (
  id, type, slug, apartment_number, title, summary, body_html, content_status,
  cover_image_url, gallery_images_json, cover_alt, published_at, created_at, updated_at,
  is_pinned, city, region, age_requirement, room_types_json, application_status,
  tags_json, rent_range, income_limit, application_deadline, external_apply_link,
  blog_category, author_name, reviewer_name, last_reviewed_at, applicability,
  source_urls_json, seo_title, seo_description, last_editor_email
) VALUES (
  ${entryValues(entry).map(sqlValue).join(",\n  ")}
);`;

  const insertAudit = `INSERT INTO cms_audit_log (id, entry_id, action, editor_email, created_at)
VALUES (${sqlValue(randomUUID())}, ${sqlValue(entry.id)}, 'upsert', ${sqlValue(editorEmail)}, ${sqlValue(now)});`;

  return [insertEntry, insertAudit];
});

// Wrangler's remote D1 file importer provides rollback on failure and rejects
// explicit BEGIN/COMMIT statements.
const sql = [...statements, ""].join("\n\n");
await writeFile(outputPath, sql, "utf8");
console.log(`Prepared ${entries.length} published entries at ${outputPath}`);
