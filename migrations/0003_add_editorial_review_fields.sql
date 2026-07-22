ALTER TABLE cms_entries
  ADD COLUMN reviewer_name TEXT NOT NULL DEFAULT '';

ALTER TABLE cms_entries
  ADD COLUMN last_reviewed_at TEXT NOT NULL DEFAULT '';

ALTER TABLE cms_entries
  ADD COLUMN applicability TEXT NOT NULL DEFAULT '';

ALTER TABLE cms_entries
  ADD COLUMN source_urls_json TEXT NOT NULL DEFAULT '[]';
