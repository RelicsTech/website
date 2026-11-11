# Relics website

Static site for [relicstech.site](https://relicstech.site), served by GitHub Pages. No build step.

| Path | What |
| --- | --- |
| `index.html` | Public landing page |
| `handbook/` | Staff hub, `specialist/` and `moderation/` handbooks (noindex) |
| `login/` | Staff login page |
| `assets/handbook.css`, `handbook.js` | Shared handbook styling and behaviour |
| `assets/auth.js` | Login guard (frontend only) |

## Staff login: frontend only for now

`assets/auth.js` ships with `enabled: false`, so the handbooks are open and the login button only explains that the backend is missing. When a backend exists, set `window.RELICS_AUTH = { enabled: true }` (or change the default in `auth.js`). It expects, on the same origin:

- `GET /api/session` → `200 {"user":{"id","name","avatar"},"roles":["specialist","moderator","admin"]}` or `401`
- `GET /api/auth/discord?next=/handbook/` → Discord OAuth, then redirect to `next`
- `POST /api/auth/logout`
- Optional login redirect errors: `/login/?error=forbidden|expired|denied`

`/handbook/moderation/` requires the `moderator` (or `admin`) role; other handbook pages need any staff session.

**Important:** hiding a page in the browser is not access control. Static files on GitHub Pages are public. For real protection the backend (or a proxy) must serve `/handbook/*` only to authenticated staff, and the handbook files should not be reachable from the public Pages origin.
