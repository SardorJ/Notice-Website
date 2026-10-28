# Notice – Mindful Screen Time · website

The static website for [Notice – Mindful Screen Time](https://apps.apple.com/app/id6794823541), the iPhone app that shows a live timer while you're in an app. It's plain HTML, CSS and a little JavaScript, with no build step and no dependencies.

## Pages

| File | What it is |
|:--|:--|
| `index.html` | Landing page: Dynamic Island hero, a scroll-driven 5/10/20 demo (Balanced), a before/during/after timeline, how setup works, a tap-through app preview, privacy, App Store screenshots and FAQ |
| `privacy.html` | Privacy policy (same content as the 17 Oct 2026 policy) |
| `support.html` | Support: contact, setup, permissions, troubleshooting, deleting data |
| `terms.html` | Terms of use (**draft, needs review**) |
| `404.html` | Not-found page (GitHub Pages and Netlify pick it up automatically) |
| `styles.css`, `app.js` | Shared styles and the interactive demo/preview |
| `assets/` | App icon, App Store badge, OG image, screenshots |
| `sitemap.xml` | Sitemap for search engines |
| `.nojekyll` | Tells GitHub Pages to serve the files as they are |

## Preview locally

```sh
python3 -m http.server 8000
# open http://localhost:8000
```

## Publish with GitHub Pages

1. In this repository go to **Settings › Pages**.
2. Under **Build and deployment**, set **Source** to **Deploy from a branch**.
3. Pick the branch **main** and the folder **/ (root)**, then click **Save**.
4. After a minute the site is live at `https://sardorj.github.io/Notice-Website/`. A custom domain can be added on the same page.

Canonical links, `og:image`, `og:url`, the JSON-LD and `sitemap.xml` use absolute URLs on `https://sardorj.github.io/Notice-Website/`. If you move to a custom domain, search and replace that address in all files. The 404 page uses absolute links under `/Notice-Website/...` so it works at any depth on the project URL. If you move to a custom domain served from the root, change them back to `/...`.

`sitemap.xml` can be submitted in Google Search Console. The FAQ answers on the landing page also appear in a `FAQPage` JSON-LD block in `index.html`; keep the two in sync when you edit a question.

Small UI icons use `assets/icon-192.png` (20 KB). `icon-512.png` is kept for the JSON-LD image and `icon-1024.png` as the source.

## Contact

Noticemindfullscreentime@gmail.com
