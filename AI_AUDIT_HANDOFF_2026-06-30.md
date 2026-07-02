# Huamei Website CMS Demo Audit Handoff

Audit date: 2026-06-30
Workspace: `/Users/qu/Documents/Huamei-官网`

## What To Review

This package contains the current Huamei static website plus the new CMS/blog/apartment demo under `cms-demo/`.

Key paths:

- `index.html`, `selected.html`, `health.html`, `love-health.html`, `vehicle.html`: existing public website pages.
- `cms-demo/admin.html`: simulated content admin UI.
- `cms-demo/apartments.html`: public apartment list demo.
- `cms-demo/blog.html`: public blog list demo.
- `cms-demo/detail.html`: public detail page demo.
- `cms-demo/preview.html`: draft preview demo.
- `cms-demo/cms-core.mjs`: shared content model, URL generation, filtering, seed data.
- `cms-demo/cms-store.mjs`: demo persistence layer using browser `localStorage`.
- `cms-demo/admin.js`: admin UI behavior.
- `cms-demo/public.js`: public list/detail rendering.
- `cms-demo/styles.css`: demo UI and responsive styles.
- `cms-demo/cms-core.test.mjs`: Node test coverage for shared behavior.
- `audit-2026-06-30/website-upgrade-audit.md`: prior website audit notes.

## Current System Status

This is not production backend code yet. It is a frontend demo that proves the content workflow and mobile public listing experience.

Current demo storage:

- Data is stored in browser `localStorage`.
- Images are previewed locally or referenced from existing static assets.
- There is no real login, Cloudflare Access, D1 database, R2 image upload, server API, or production publishing workflow yet.

Intended production direction:

- Cloudflare Pages + Pages Functions or Workers.
- Cloudflare Access for admin authentication.
- Cloudflare D1 for content records.
- Cloudflare R2 for uploaded images.
- SEO-friendly public routes for apartment and blog detail pages.

## User Requirements Captured So Far

- Add a backend-style publishing system so staff can log in and publish without editing local files.
- Support apartment updates and blog posts.
- Apartment fields:
  - Internal apartment number, numeric. Current known range: 1 to 395.
  - Region: South California / North California.
  - Age requirement: 18+, 55+, 62+.
  - Room type: 1B, 2B, 3B, 3B+.
  - Status/tag examples: featured, new apartment, limited open, lottery, open, full, expired.
- Public apartment list must be mobile-readable at high volume, potentially hundreds of apartments.
- Cards on mobile should be dense enough for fast browsing.
- URL slug should not be manually typed by staff; apartments should use internal number based URLs.
- Image alt text should be explained as SEO/accessibility metadata and should not be expected to visibly appear in blog content.
- Before deployment, avoid any P0 bugs.

## Recent Changes Worth Auditing

- Apartment URL generation now uses internal apartment number:
  - Example: apartment number `396` becomes slug `apartment-396`.
- Public mobile apartment list now uses compact left-thumbnail cards instead of large image cards.
- Mobile filter area was reduced to search row plus three compact dropdowns.
- Status badges on images are now opaque solid badges for readability.
- Admin field label changed from `URL slug` to automatic public URL.
- Alt text field now explains SEO/screen-reader purpose.
- Demo storage key changed from `hm_cms_demo_entries_v1` to `hm_cms_demo_entries_v2` so updated seed data appears cleanly.

## Suggested P0 Audit Checklist

Look specifically for issues that could cause:

- Public website or apartment/blog pages to render blank.
- Admin publish/save/delete actions to corrupt content data.
- Published content to disappear unexpectedly.
- Draft content to appear publicly when it should not.
- Wrong public URL generation for apartment numbers.
- Image upload or image rendering failures that break page layout.
- Mobile apartment list becoming unusable with many items.
- XSS or unsafe HTML injection through rich text body, titles, summaries, tags, or image alt fields.
- Broken routing, sitemap, robots, or SEO-critical metadata before production.
- Authentication bypass risk once production backend is implemented.
- Data loss risk in the future D1/R2 migration.

## Local Verification Commands

Run from the package root:

```bash
node --test cms-demo/cms-core.test.mjs
node --check cms-demo/admin.js
node --check cms-demo/public.js
```

To view the demo locally:

```bash
python3 -m http.server 8765 --bind 127.0.0.1
```

Open:

- `http://127.0.0.1:8765/cms-demo/admin.html`
- `http://127.0.0.1:8765/cms-demo/apartments.html`
- `http://127.0.0.1:8765/cms-demo/blog.html`

## Known Limitations Not To Mistake For Production Bugs

- This demo intentionally uses `localStorage`; cross-device persistence is not implemented yet.
- Admin authentication is not implemented yet.
- D1/R2/API routes are not implemented yet.
- Uploaded images in the demo are stored as browser data URLs and are not production-ready.
- Public pages are rendered by client-side JavaScript in the demo; production should use SEO-friendly HTML/routes.
