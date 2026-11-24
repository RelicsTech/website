# Relics website

Static site for [relicstech.site](https://relicstech.site), served by GitHub Pages. No build step.

| Path | What |
| --- | --- |
| `index.html` | Public landing page |
| `handbook/` | Public handbooks: hub, `specialist/` and `moderation/` |
| `guides/` | Short public PC help guides (hub + 8 guides, HowTo structured data), listed in the sitemap |
| `assets/og/` | One 1200x630 share image per page (referenced by og:image/twitter:image) |
| `dashboard/` | Staff dashboard placeholder, the only page behind login |
| `login/` | Staff login page (Discord) |
| `assets/main.css`, `site.js` | Landing page styling; theme toggle, pointer effects, smooth scrolling (all pages) |
| `assets/handbook.css`, `handbook.js` | Handbook styling; search palette (Ctrl K or /), table filters, copy-on-click, phone cards for tables |
| `login/`, `dashboard/`, `404.html` | Same shell as the handbooks (`handbook.css`), rail, theme button, gear, footer |
| `assets/img/`, `assets/fonts/` | Logo marks; self-hosted Hanken Grotesk (no Google Fonts, no third-party requests) |
| `assets/auth.js` | Login guard (frontend only) |

## Dashboard login: frontend only for now

`assets/auth.js` ships with `enabled: false`, so the dashboard is open and the login button only explains that the backend is missing. When a backend exists, set `window.RELICS_AUTH = { enabled: true }` (or change the default in `auth.js`). It expects, on the same origin:

- `GET /api/session` → `200 {"user":{"id","name","avatar"},"roles":["specialist","moderator","admin"]}` or `401`
- `GET /api/auth/discord?next=/handbook/` → Discord OAuth, then redirect to `next`
- `POST /api/auth/logout`
- Optional login redirect errors: `/login/?error=forbidden|expired|denied`

Only `/dashboard/` is guarded (any signed-in staff session). The handbooks are public. To require a role, add `data-requires="moderator"` to the page's `<html>` tag.

**Important:** hiding a page in the browser is not access control. Static files on GitHub Pages are public. Real protection for the dashboard needs the backend (or a proxy) to serve it only to authenticated staff.

## Tags and questionnaires

`/tags/` is a public, searchable library with six categories, 26 static tag pages and all 12 current bot questionnaires. The 18 imported Discord tags and overlapping bot questionnaires share a page with separate versions and copy buttons. The site menu and home/guide links expose the library without JavaScript. Each page includes visible content, a unique title, description, canonical URL, Open Graph metadata, breadcrumbs and Article structured data; the library uses CollectionPage/ItemList. All pages are in the sitemap.

Edit reviewed public text in `tags/data.json`, then run `python3 scripts/build-tags.py` (Python standard library, no installation or runtime build). The generator escapes content and permits HTTPS links; it never interprets content as instructions or HTML. `assets/tags.js` provides full-text search, category filtering, shareable filters, per-version full Discord Markdown copy and copy all filtered results. Reference image URLs are included in copied text. Raw Markdown remains available for manual selection, with a clipboard fallback. Long copies may exceed Discord message limits and should be split or sent as a text file. Bot questionnaire buttons remain available through `/getstarted`.

Uploaded hand-measurement and keyboard references are stored locally in `assets/tags/`; the expired photo-guide attachment is described in text rather than embedding a broken image. Public text uses readable Discord channel links. BIOS guidance follows the manufacturer and Microsoft BitLocker guidance; destructive DiskPart steps include a backup/target check and corrected partition syntax.
