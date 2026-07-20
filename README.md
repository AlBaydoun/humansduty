# Human's Duty — website

Live site for the Human's Duty Association (Bint Jbeil, Lebanon).

- `index.html` + `css/` + `js/` — the site (static, no build step)
- `content/content.json` — all editable text, projects, timeline, gallery (English + Arabic)
- `admin/` — the admin dashboard (open `/admin/`, paste your GitHub token, edit, publish)
- `assets/` — fonts, images, hero film frames
- `.github/workflows/fetch-assets.yml` — fetches generated media listed in `asset-manifest.json`

Editing without the admin: change `content/content.json` and commit; the site updates automatically.
