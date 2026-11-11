# Relics website

Static site for [relicstech.site](https://relicstech.site), served by GitHub Pages. No build step.

| Path | What |
| --- | --- |
| `index.html` | Public landing page |
| `handbook/` | Public handbooks: hub, `specialist/` and `moderation/` |
| `dashboard/` | Staff dashboard placeholder, the only page behind login |
| `login/` | Staff login page (Discord) |
| `assets/handbook.css`, `handbook.js` | Shared handbook styling and behaviour |
| `assets/auth.js` | Login guard (frontend only) |

## Dashboard login: frontend only for now

`assets/auth.js` ships with `enabled: false`, so the dashboard is open and the login button only explains that the backend is missing. When a backend exists, set `window.RELICS_AUTH = { enabled: true }` (or change the default in `auth.js`). It expects, on the same origin:

- `GET /api/session` → `200 {"user":{"id","name","avatar"},"roles":["specialist","moderator","admin"]}` or `401`
- `GET /api/auth/discord?next=/handbook/` → Discord OAuth, then redirect to `next`
- `POST /api/auth/logout`
- Optional login redirect errors: `/login/?error=forbidden|expired|denied`

Only `/dashboard/` is guarded (any signed-in staff session). The handbooks are public. To require a role, add `data-requires="moderator"` to the page's `<html>` tag.

**Important:** hiding a page in the browser is not access control. Static files on GitHub Pages are public. Real protection for the dashboard needs the backend (or a proxy) to serve it only to authenticated staff.
