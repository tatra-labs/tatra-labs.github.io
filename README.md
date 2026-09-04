# Tatra Labs – Blog & Projects

A minimal, fast blog and project site. No build step, no heavy frameworks. Optimized for **lightweight**, **responsive**, and **efficient** delivery.

## Where everything lives

| Area | On disk | What it is |
|------|---------|------------|
| **Authoring** | **`content/`** | All posts, projects, foundation lists, book/paper JSON, Markdown sections, and shared foundation images. Start with **`content/README.md`** for the full map. |
| **Optional assets** | **`assets/images/`** | Extra images referenced from JSON posts (e.g. diagrams) and project screenshots under `assets/images/projects/`. Not required for foundation. |
| **App shell** | **`index.html`**, **`404.html`**, **`css/`**, **`js/`**, **`foundation/`** | Pages and scripts. `foundation/book/.../index.html` is optional for local static servers. |
| **Hosted apps** | **`project/<name>/`** | Self-contained static apps served from this site, vendored from their own repos. See [Hosting a project here](#hosting-a-project-here). |
| **Tools** | **`tools/`** | Utility scripts: the Deep Learning TOC generator and the hosted-app sync script. |

There is **no** separate `data/` folder—everything you edit for the site is under **`content/`** so you only look in one place.

## The design system

The stylesheet is token-driven and states its own rules at the top of `css/style.css`. **Read that block before editing it** — the layout has no fallback boundary underneath these:

1. **No `border-radius`, no `box-shadow`.** Structure is rules and alignment. The one exception is `--r-plate` (2px) on media frames.
2. **Two stroke weights only** — 1px `--rule` for separation, 2px `--rule-strong`/`--accent` for emphasis.
3. **One filled surface on the site** — `.article-link--primary`. `--accent` never fills anything else, and never marks a status or validation state.
4. **No colour literal outside the token block.** No hex, no `rgba()`, none baked into a data-URI.

**Layout** is one primitive, `.spread`: a centred `rail | main` pair with full-bleed margins. Rail is 136px of metadata; main is the reading column, capped at a 66-character measure. Below 56rem the rail collapses to `0px` and each surface re-composes its rail content inline.

**JS never appends a direct child of `.spread`** — it only sets `innerHTML` on static containers that already carry their own `grid-column`. A node without one would land in the left margin, and there is no build step to catch that.

**Three theme states, all reachable.** The boot script stamps `data-theme` *only* on an explicit choice, so the unset state genuinely follows `prefers-color-scheme`; the toggle cycles system → light → dark. Both palettes are AAA for body text.

**Fonts**: one downloaded family (Source Serif 4, variable, ~66KB, roman + italic) with a metric-matched `@font-face` fallback so the swap does not reflow. Chrome and code use the system sans and mono — zero bytes.

## Features

- **Posts & Projects** – Switch between blog posts and projects from the same list view.
- **Tags** – Every post/project has tags; the tag cloud is built automatically. Click a tag to filter.
- **Search** – Filter by typing in the search box (matches title, excerpt, and tags).
- **Date** – Each item shows “Date written” (and reading time for posts).
- **Content** – Posts and projects support **text**, **images**, and **video** (including embeds).
- **Foundation** – Books and papers use `/foundation/book/{slug}` and `/foundation/paper/{slug}` with a **table of contents** (Markdown sections for books; heading anchors for papers). The viewer reuses the same site header as the home page.

## How to run locally

Use any static server from the project root:

### Approach 1: Python built-in server (no install)

```bash
python -m http.server 8000
```

Open: `http://127.0.0.1:8000/`

### Approach 2: Node `serve` (recommended fallback behavior)

```bash
npx serve .
```

Open the URL shown in the terminal (usually `http://localhost:3000/`).

### Approach 3: VS Code Live Server

1. Install the **Live Server** extension.
2. Right-click `index.html` and choose **Open with Live Server**.
3. Open the URL provided by the extension.

### Routing note

This site uses clean URLs such as `/foundation/book/deep-learning`. If your local server does not handle fallback routing, open the root page and navigate from there.

## Adding content

### New post

1. **List entry** – Add an object to **`content/posts/index.json`**.
2. **Full content** – Create **`content/posts/your-slug.json`** with the same shape as below.

```json
{
  "slug": "my-new-post",
  "title": "My New Post",
  "date": "2025-02-08",
  "readingTime": "5 min",
  "tags": ["topic-a", "topic-b"],
  "author": "Your Name",
  "content": {
    "sections": [
      { "type": "text", "value": "First paragraph." },
      { "type": "image", "value": "https://example.com/image.jpg", "alt": "Description" },
      { "type": "video", "value": "https://example.com/video.mp4" },
      { "type": "embed", "value": "https://www.youtube.com/embed/VIDEO_ID" }
    ]
  }
}
```

- **text** – `value`: plain text (paragraphs split by newlines).
- **image** – `value`: URL (`/assets/images/...` for repo images), optional `alt`.
- **video** – `value`: direct video URL (e.g. `.mp4`).
- **embed** – `value`: iframe URL (e.g. YouTube embed). Uses lazy loading.

### New project

1. Add an entry to **`content/projects/index.json`** (same shape as a post list item, without `readingTime`). Add an **`image`** to give the card a preview strip.
2. Create **`content/projects/your-slug.json`** with the same `content.sections` format as a post.

Projects usually want a **`links`** section for "open the live thing" and "read the source" — see the section-type table in **`content/README.md`**.

## Hosting a project here

A project that is a **static** site (no server, relative asset paths) can be served from this one at `/project/<name>/`, alongside its write-up at `/project/<slug>`. Real files win over the `404.html` fallback, so the two do not collide — but the app directory name and the write-up slug must differ.

Currently hosted:

| URL | App | Source |
|-----|-----|--------|
| [`/project/jobs/`](https://tatra-labs.github.io/project/jobs/) | US Job Market Visualizer + Remote Job Explorer (write-up at `/project/us-job-market`) | [tatra-labs/jobs](https://github.com/tatra-labs/jobs) |

`project/jobs/` is **vendored**, not a submodule — do not hand-edit it. Refresh it from a local checkout of the source repo:

```bash
python tools/sync_project_jobs.py                 # expects ../jobs
python tools/sync_project_jobs.py --source /path/to/jobs
python tools/sync_project_jobs.py --check         # exits non-zero if out of date
```

The script copies `jobs/site/` verbatim and injects one "← Tatra Labs" link into each page's header so visitors can get back. It fails loudly if the upstream markup moves rather than silently dropping the link.

**`.nojekyll`** at the repo root keeps GitHub Pages from running these vendored files through Jekyll.

## The three reader shells

`404.html` is the viewer shell GitHub Pages serves for `/post/…` and `/project/…`. Two byte-identical copies live at `foundation/book/deep-learning/index.html` and `foundation/paper/deep-learning-paper/index.html` so those known routes return **HTTP 200** instead of a 404 status.

**Every markup change to the reader must land in all three**, or two of the three routes regress. Don't do it by hand:

```bash
python tools/sync_shells.py            # mirror 404.html into both
python tools/sync_shells.py --check    # exits non-zero if they drift
```

### Foundation: books and papers

**URLs** in the browser (slug = folder / filename, not the long title):

- Book: `/foundation/book/deep-learning` → loads **`content/foundation/books/deep-learning/book.json`**
- Paper: `/foundation/paper/deep-learning-paper` → **`content/foundation/papers/deep-learning-paper.json`**

**Lists for the home page:** **`content/foundation/books/index.json`** and **`content/foundation/papers/index.json`** (same `slug` values as above).

**Books (Markdown + TOC)** – The Deep Learning book uses **`content/foundation/books/deep-learning/book.json`** with `"reader": "markdown-toc"`, **`toc.json`** (generated), and **`sections/*.md`**. The viewer loads Marked + DOMPurify + KaTeX from a CDN. Sidebar links use `?section=sec-X-Y`.

Regenerate the TOC after editing **`content/foundation/books/deep-learning/toc-source.txt`**:

```bash
python tools/generate_dl_toc.py
```

**Books (JSON-only, legacy)** – If you omit `reader: markdown-toc`, use `content.chapters` in **`book.json`** as before (see `viewer.js`).

**Papers** – One scrollable page; use `heading` sections with unique `id` for the in-page TOC. Optional: `"level": 3` renders `<h3>`.

**Local server** – Use any static server from the repo root (examples above).

## Tech notes

- **Light** – Single CSS file, small vanilla JS, no runtime framework. System font stack (no extra font requests).
- **Responsive** – Mobile-first CSS, flexible layout, touch-friendly.
- **Efficient** – List JSON is loaded once; each article loads its own file. Images use `loading="lazy"`.
- **Filter** – Tags and search run in the browser; no server required. Works on GitHub Pages.

## Deploy on GitHub Pages

1. Push this repo to GitHub.
2. In the repo: **Settings → Pages** → Source: deploy from the **main** branch (root).
3. Your site will be at `https://<username>.github.io/<repo>/`. If the repo is `username.github.io`, it will be `https://username.github.io/`.

**URL structure** – `/` (home), `/post/...`, `/project/...`, `/foundation/book/...`, `/foundation/paper/...`. **`404.html`** loads the viewer for those routes, so they are served with a 404 status and rendered client-side; a real directory such as `project/jobs/` is served directly instead. Use root-relative paths in JSON and Markdown (e.g. **`/content/foundation/media/...`** for shared foundation images). For local testing, prefer a server with fallback behavior for missing paths (e.g. `npx serve`).
