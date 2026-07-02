import { CONTENT_STATUS, normalizeEntryForStorage } from "./cms-core.js";
import { HttpError } from "./http.js";

const SELECT_COLUMNS = `
  id,
  type,
  slug,
  apartment_number,
  title,
  summary,
  body_html,
  content_status,
  cover_image_url,
  cover_alt,
  published_at,
  created_at,
  updated_at,
  is_pinned,
  city,
  region,
  age_requirement,
  room_types_json,
  application_status,
  tags_json,
  rent_range,
  income_limit,
  application_deadline,
  external_apply_link,
  blog_category,
  author_name,
  seo_title,
  seo_description,
  last_editor_email
`;

export async function listEntries(env, filters = {}) {
  const db = requireDb(env);
  const { whereSql, bindings } = buildWhere(filters);
  const limit = clampInteger(filters.limit, 1, 5000, 100);
  const offset = clampInteger(filters.offset, 0, 100000, 0);
  const result = await db
    .prepare(
      `SELECT ${SELECT_COLUMNS}
       FROM cms_entries
       ${whereSql}
       ORDER BY is_pinned DESC, COALESCE(published_at, updated_at, created_at) DESC
       LIMIT ? OFFSET ?`
    )
    .bind(...bindings, limit, offset)
    .all();

  return (result.results || []).map(rowToEntry);
}

export async function countEntries(env, filters = {}) {
  const db = requireDb(env);
  const { whereSql, bindings } = buildWhere(filters);
  const row = await db
    .prepare(
      `SELECT COUNT(*) AS total
       FROM cms_entries
       ${whereSql}`
    )
    .bind(...bindings)
    .first();

  return Number(row?.total || 0);
}

export async function getEntryBySlug(env, type, slug, options = {}) {
  const db = requireDb(env);
  const whereDrafts = options.includeDrafts ? "" : "AND content_status = ?";
  const bindings = options.includeDrafts ? [type, slug] : [type, slug, CONTENT_STATUS.PUBLISHED];
  const row = await db
    .prepare(
      `SELECT ${SELECT_COLUMNS}
       FROM cms_entries
       WHERE type = ? AND slug = ? ${whereDrafts}
       LIMIT 1`
    )
    .bind(...bindings)
    .first();

  return row ? rowToEntry(row) : null;
}

export async function getEntryByApartmentNumber(env, number, options = {}) {
  const db = requireDb(env);
  const whereDrafts = options.includeDrafts ? "" : "AND content_status = ?";
  const bindings = options.includeDrafts ? [number] : [number, CONTENT_STATUS.PUBLISHED];
  const row = await db
    .prepare(
      `SELECT ${SELECT_COLUMNS}
       FROM cms_entries
       WHERE type = 'apartment' AND apartment_number = ? ${whereDrafts}
       LIMIT 1`
    )
    .bind(...bindings)
    .first();

  return row ? rowToEntry(row) : null;
}

export async function getEntryById(env, id, options = {}) {
  const db = requireDb(env);
  const whereDrafts = options.includeDrafts ? "" : "AND content_status = ?";
  const bindings = options.includeDrafts ? [id] : [id, CONTENT_STATUS.PUBLISHED];
  const row = await db
    .prepare(
      `SELECT ${SELECT_COLUMNS}
       FROM cms_entries
       WHERE id = ? ${whereDrafts}
       LIMIT 1`
    )
    .bind(...bindings)
    .first();

  return row ? rowToEntry(row) : null;
}

export async function upsertEntry(env, input, options = {}) {
  const db = requireDb(env);
  const entry = normalizeEntryForStorage(input);
  const params = entryToParams(entry, options.editorEmail);

  if (options.requireFreshUpdatedAt) {
    const existing = await getEntryById(env, entry.id, { includeDrafts: true });
    if (!existing) throw new HttpError(404, "内容不存在");
    if (!input?.expectedUpdatedAt || existing.updatedAt !== input.expectedUpdatedAt) {
      throw new HttpError(409, "内容已被他人修改，请刷新后再编辑");
    }
  }

  try {
    await db
      .prepare(
        `INSERT INTO cms_entries (
        id, type, slug, apartment_number, title, summary, body_html, content_status,
        cover_image_url, cover_alt, published_at, created_at, updated_at, is_pinned, city, region,
        age_requirement, room_types_json, application_status, tags_json, rent_range,
        income_limit, application_deadline, external_apply_link, blog_category, author_name,
        seo_title, seo_description, last_editor_email
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
      )
      ON CONFLICT(id) DO UPDATE SET
        type = excluded.type,
        slug = excluded.slug,
        apartment_number = excluded.apartment_number,
        title = excluded.title,
        summary = excluded.summary,
        body_html = excluded.body_html,
        content_status = excluded.content_status,
        cover_image_url = excluded.cover_image_url,
        cover_alt = excluded.cover_alt,
        published_at = excluded.published_at,
        updated_at = excluded.updated_at,
        is_pinned = excluded.is_pinned,
        city = excluded.city,
        region = excluded.region,
        age_requirement = excluded.age_requirement,
        room_types_json = excluded.room_types_json,
        application_status = excluded.application_status,
        tags_json = excluded.tags_json,
        rent_range = excluded.rent_range,
        income_limit = excluded.income_limit,
        application_deadline = excluded.application_deadline,
        external_apply_link = excluded.external_apply_link,
        blog_category = excluded.blog_category,
        author_name = excluded.author_name,
        seo_title = excluded.seo_title,
        seo_description = excluded.seo_description,
        last_editor_email = excluded.last_editor_email`
      )
      .bind(...params)
      .run();
  } catch (error) {
    if (isApartmentNumberConflict(error)) {
      throw new HttpError(409, `公寓编号 #${entry.apartmentNumber} 已被其他帖子使用`);
    }
    if (isSlugConflict(error)) {
      throw new HttpError(409, "公开地址已被其他帖子使用");
    }
    throw error;
  }

  await writeAuditLog(env, {
    entryId: entry.id,
    action: "upsert",
    editorEmail: options.editorEmail,
  });

  return entry;
}

function isApartmentNumberConflict(error) {
  const message = String(error?.message || error || "").toLowerCase();
  return message.includes("apartment_number") || message.includes("idx_cms_entries_apartment_number");
}

function isSlugConflict(error) {
  const message = String(error?.message || error || "").toLowerCase();
  return message.includes("type_slug") || (message.includes("type") && message.includes("slug"));
}

export async function archiveEntry(env, id, options = {}) {
  const db = requireDb(env);
  const existing = await getEntryById(env, id, { includeDrafts: true });
  if (!existing) throw new HttpError(404, "内容不存在");
  const now = new Date().toISOString();
  await db
    .prepare(
      `UPDATE cms_entries
       SET content_status = ?, updated_at = ?, last_editor_email = ?
       WHERE id = ?`
    )
    .bind(CONTENT_STATUS.ARCHIVED, now, options.editorEmail || "", id)
    .run();

  await writeAuditLog(env, {
    entryId: id,
    action: "archive",
    editorEmail: options.editorEmail,
  });
}

function buildWhere(filters = {}) {
  const where = [];
  const bindings = [];

  if (filters.type) {
    where.push("type = ?");
    bindings.push(filters.type);
  }

  if (!filters.includeDrafts) {
    where.push("content_status = ?");
    bindings.push(CONTENT_STATUS.PUBLISHED);
  }

  if (filters.region) {
    where.push("region = ?");
    bindings.push(filters.region);
  }

  if (filters.ageRequirement) {
    where.push("age_requirement = ?");
    bindings.push(filters.ageRequirement);
  }

  if (filters.roomType) {
    where.push("room_types_json LIKE ?");
    bindings.push(`%"${filters.roomType}"%`);
  }

  const query = String(filters.query || "").trim().toLowerCase();
  if (query) {
    const like = `%${query}%`;
    where.push(`(
      LOWER(title) LIKE ?
      OR LOWER(summary) LIKE ?
      OR LOWER(city) LIKE ?
      OR LOWER(apartment_number) LIKE ?
    )`);
    bindings.push(like, like, like, like);
  }

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
  return { whereSql, bindings };
}

function rowToEntry(row) {
  return {
    id: row.id,
    type: row.type,
    slug: row.slug,
    apartmentNumber: row.apartment_number || "",
    title: row.title || "",
    summary: row.summary || "",
    bodyHtml: row.body_html || "",
    contentStatus: row.content_status,
    coverImageUrl: row.cover_image_url || "",
    coverAlt: row.cover_alt || "",
    publishedAt: row.published_at || "",
    createdAt: row.created_at || "",
    updatedAt: row.updated_at || "",
    isPinned: Boolean(row.is_pinned),
    city: row.city || "",
    region: row.region || "",
    ageRequirement: row.age_requirement || "",
    roomTypes: parseJsonArray(row.room_types_json),
    applicationStatus: row.application_status || "",
    tags: parseJsonArray(row.tags_json),
    rentRange: row.rent_range || "",
    incomeLimit: row.income_limit || "",
    applicationDeadline: row.application_deadline || "",
    externalApplyLink: row.external_apply_link || "",
    blogCategory: row.blog_category || "",
    authorName: row.author_name || "",
    seoTitle: row.seo_title || "",
    seoDescription: row.seo_description || "",
    lastEditorEmail: row.last_editor_email || "",
  };
}

function entryToParams(entry, editorEmail = "") {
  return [
    entry.id,
    entry.type,
    entry.slug,
    entry.apartmentNumber || null,
    entry.title,
    entry.summary,
    entry.bodyHtml,
    entry.contentStatus,
    entry.coverImageUrl,
    entry.coverAlt,
    entry.publishedAt,
    entry.createdAt,
    entry.updatedAt,
    entry.isPinned ? 1 : 0,
    entry.city,
    entry.region,
    entry.ageRequirement,
    JSON.stringify(entry.roomTypes || []),
    entry.applicationStatus,
    JSON.stringify(entry.tags || []),
    entry.rentRange,
    entry.incomeLimit,
    entry.applicationDeadline,
    entry.externalApplyLink,
    entry.blogCategory,
    entry.authorName,
    entry.seoTitle,
    entry.seoDescription,
    editorEmail || "",
  ];
}

function parseJsonArray(value) {
  try {
    const parsed = JSON.parse(value || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function requireDb(env) {
  if (!env.HM_CMS_DB) throw new Error("HM_CMS_DB binding is missing");
  return env.HM_CMS_DB;
}

async function writeAuditLog(env, item) {
  const db = requireDb(env);
  await db
    .prepare(
      `INSERT INTO cms_audit_log (id, entry_id, action, editor_email, created_at)
       VALUES (?, ?, ?, ?, ?)`
    )
    .bind(createId(), item.entryId, item.action, item.editorEmail || "", new Date().toISOString())
    .run();
}

function clampInteger(value, min, max, fallback) {
  const number = Number.parseInt(value, 10);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, number));
}

function createId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `audit-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
