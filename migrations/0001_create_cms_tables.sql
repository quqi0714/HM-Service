CREATE TABLE IF NOT EXISTS cms_entries (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('apartment', 'blog')),
  slug TEXT NOT NULL,
  apartment_number TEXT,
  title TEXT NOT NULL,
  summary TEXT NOT NULL DEFAULT '',
  body_html TEXT NOT NULL DEFAULT '',
  content_status TEXT NOT NULL DEFAULT 'draft' CHECK (content_status IN ('draft', 'published', 'archived')),
  cover_image_url TEXT NOT NULL DEFAULT '',
  cover_alt TEXT NOT NULL DEFAULT '',
  published_at TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  is_pinned INTEGER NOT NULL DEFAULT 0,
  city TEXT NOT NULL DEFAULT '',
  region TEXT NOT NULL DEFAULT '',
  age_requirement TEXT NOT NULL DEFAULT '',
  room_types_json TEXT NOT NULL DEFAULT '[]',
  application_status TEXT NOT NULL DEFAULT '',
  tags_json TEXT NOT NULL DEFAULT '[]',
  rent_range TEXT NOT NULL DEFAULT '',
  income_limit TEXT NOT NULL DEFAULT '',
  application_deadline TEXT NOT NULL DEFAULT '',
  external_apply_link TEXT NOT NULL DEFAULT '',
  blog_category TEXT NOT NULL DEFAULT '',
  author_name TEXT NOT NULL DEFAULT '',
  seo_title TEXT NOT NULL DEFAULT '',
  seo_description TEXT NOT NULL DEFAULT '',
  last_editor_email TEXT NOT NULL DEFAULT ''
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_cms_entries_type_slug
  ON cms_entries (type, slug);

CREATE UNIQUE INDEX IF NOT EXISTS idx_cms_entries_apartment_number
  ON cms_entries (apartment_number)
  WHERE type = 'apartment' AND apartment_number IS NOT NULL AND apartment_number <> '';

CREATE INDEX IF NOT EXISTS idx_cms_entries_public_list
  ON cms_entries (type, content_status, is_pinned DESC, published_at DESC, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_cms_entries_updated_at
  ON cms_entries (updated_at DESC);

CREATE TABLE IF NOT EXISTS cms_audit_log (
  id TEXT PRIMARY KEY,
  entry_id TEXT NOT NULL,
  action TEXT NOT NULL,
  editor_email TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_cms_audit_log_entry_id
  ON cms_audit_log (entry_id, created_at DESC);
