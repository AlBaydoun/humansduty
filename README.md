# Human's Duty — website

Live site for the Human's Duty Association (Bint Jbeil, Lebanon).

- `index.html` + `css/` + `js/` — the site (static, no build step)
- `content/content.json` — all editable text, projects, timeline, gallery (English + Arabic)
- `admin/` — the admin dashboard (open `/admin/`, paste your GitHub token, edit, publish)
- `assets/` — fonts, images, hero film frames
- `.github/workflows/fetch-assets.yml` — fetches generated media listed in `asset-manifest.json`

Editing without the admin: change `content/content.json` and commit; the site updates automatically.

## Running on your own hosting (Hostinger or any PHP host)

1. Upload the whole folder to your hosting web root (e.g. `public_html/`).
2. Open `yoursite.com/admin/` and set the admin password (first visit).
3. Edit `admin/config.js` so it reads: `window.HD_REPO = { mode: "php" };`
4. Make sure the `content/` and `assets/gallery/` folders are writable (permissions 755 usually work; the panel will tell you if not).

The admin then saves directly to the server: no GitHub involved.
