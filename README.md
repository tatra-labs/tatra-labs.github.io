# Tatra Labs – Blog & Projects

A minimal, fast blog and project site (inspired by [Lil'Log](https://lilianweng.github.io/)). No build step, no heavy frameworks. Optimized for **lightweight**, **responsive**, and **efficient** delivery.

## Where everything lives

| Area | On disk | What it is |
|------|---------|------------|
| **Authoring** | **`content/`** | All posts, projects, foundation lists, book/paper JSON, Markdown sections, and shared foundation images. Start with **`content/README.md`** for the full map. |
| **Optional assets** | **`assets/images/`** | Extra images referenced from JSON posts (e.g. diagrams). Not required for foundation. |
| **App shell** | **`index.html`**, **`404.html`**, **`css/`**, **`js/`**, **`foundation/`** | Pages and scripts. `foundation/book/.../index.html` is optional for local static servers. |
| **Dev helper** | **`dev_server.py`**, **`tools/`** | Local server and the Deep Learning TOC generator. |

There is **no** separate `data/` folder—everything you edit for the site is under **`content/`** so you only look in one place.

## Features

- **Posts & Projects** – Switch between blog posts and projects from the same list view.
- **Tags** – Every post/project has tags; the tag cloud is built automatically. Click a tag to filter.
- **Search** – Filter by typing in the search box (matches title, excerpt, and tags).
- **Date** – Each item shows “Date written” (and reading time for posts).
- **Content** – Posts and projects support **text**, **images**, and **video** (including embeds).
- **Foundation** – Books and papers use `/foundation/book/{slug}` and `/foundation/paper/{slug}` with a **table of contents** (Markdown sections for books; heading anchors for papers). The viewer reuses the same site header as the home page.

## How to run locally

**Recommended (Python):** use the included dev server so clean URLs like `/foundation/book/deep-learning` work (same idea as GitHub Pages serving `404.html` for unknown paths):

```bash
python dev_server.py
```

Then open `http://127.0.0.1:8000/foundation/book/deep-learning` (or `localhost`).

**Why not `python -m http.server`?** That server only maps URLs to files on disk. There is no file at `/foundation/book/deep-learning`, so you get a plain 404 and the viewer never loads. `dev_server.py` serves `404.html` for those routes so `viewer.js` can run.

**Optional:** Add a real page at `foundation/book/<slug>/index.html` (same shell as `404.html`). Then plain `python -m http.server` can open `/foundation/book/<slug>/`. `viewer.js` strips a trailing `/index.html` from the path so routing still works.

**Alternatives:** `npx serve .`, or any static server that falls back to `404.html` for missing paths.

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

1. Add an entry to **`content/projects/index.json`** (same shape as a post list item, without `readingTime`).
2. Create **`content/projects/your-slug.json`** with the same `content.sections` format as a post.

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

**Local server** – Use `python dev_server.py` or `npx serve .`, or the optional `foundation/book/<slug>/index.html` for plain `http.server`.

## Tech notes

- **Light** – Single CSS file, small vanilla JS, no runtime framework. System font stack (no extra font requests).
- **Responsive** – Mobile-first CSS, flexible layout, touch-friendly.
- **Efficient** – List JSON is loaded once; each article loads its own file. Images use `loading="lazy"`.
- **Filter** – Tags and search run in the browser; no server required. Works on GitHub Pages.

## Deploy on GitHub Pages

1. Push this repo to GitHub.
2. In the repo: **Settings → Pages** → Source: deploy from the **main** branch (root).
3. Your site will be at `https://<username>.github.io/<repo>/`. If the repo is `username.github.io`, it will be `https://username.github.io/`.

**URL structure** – `/` (home), `/post/...`, `/project/...`, `/foundation/book/...`, `/foundation/paper/...`. **`404.html`** loads the viewer for those routes. Use root-relative paths in JSON and Markdown (e.g. **`/content/foundation/media/...`** for shared foundation images). For local testing, use a server that serves `404.html` for missing paths (e.g. `npx serve`); Python’s `http.server` does not—unless you use **`dev_server.py`** or the optional **`foundation/book/<slug>/index.html`**.
