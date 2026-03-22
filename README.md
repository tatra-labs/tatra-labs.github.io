# Tatra Labs – Blog & Projects

A minimal, fast blog and project site (inspired by [Lil'Log](https://lilianweng.github.io/)). No build step, no heavy frameworks. Optimized for **lightweight**, **responsive**, and **efficient** delivery.

## Features

- **Posts & Projects** – Switch between blog posts and projects from the same list view.
- **Tags** – Every post/project has tags; the tag cloud is built automatically from your data. Click a tag to filter.
- **Search** – Filter by typing in the search box (matches title, excerpt, and tags).
- **Date** – Each item shows “Date written” (and reading time for posts).
- **Content** – Posts and projects support **text**, **images**, and **video** (including embeds).
- **Foundation** – Books and papers live under `/foundation/book/{slug}` and `/foundation/paper/{slug}` with a **table of contents** (chapters for books; section anchors for papers). The viewer uses the same site header as the home page.

## How to run locally

**Recommended (Python):** use the included dev server so clean URLs like `/foundation/book/deep-learning` work (same idea as GitHub Pages serving `404.html` for unknown paths):

```bash
python dev_server.py
```

Then open `http://127.0.0.1:8000/foundation/book/deep-learning` (or `localhost`).

**Why not `python -m http.server`?** That server only maps URLs to files on disk. There is no file at `/foundation/book/deep-learning`, so you get a plain 404 and the viewer never loads. `dev_server.py` serves `404.html` for those routes so `viewer.js` can run.

**Optional:** For each foundation slug you can add a real page at `foundation/book/<slug>/index.html` (and `foundation/paper/<slug>/index.html`) — same shell as `404.html`. Then plain `python -m http.server` can open `/foundation/book/<slug>/` without `dev_server.py`. `viewer.js` strips a trailing `/index.html` from the path so routing still works.

**Alternatives:** `npx serve .` (also serves SPA-style routes), or any static server that falls back to `404.html` for missing paths.

## Adding content

### New post

1. **List entry** – Add an object to `data/posts-list.json`:

```json
{
  "slug": "my-new-post",
  "title": "My New Post",
  "excerpt": "Short summary for the card.",
  "date": "2025-02-08",
  "readingTime": "5 min",
  "tags": ["topic-a", "topic-b"],
  "author": "Your Name"
}
```

2. **Full content** – Create `data/posts/my-new-post.json`:

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
      { "type": "text", "value": "Second paragraph." },
      { "type": "image", "value": "https://example.com/image.jpg", "alt": "Description" },
      { "type": "video", "value": "https://example.com/video.mp4" },
      { "type": "embed", "value": "https://www.youtube.com/embed/VIDEO_ID" }
    ]
  }
}
```

- **text** – `value`: plain text (paragraphs split by newlines).
- **image** – `value`: image URL (use `/assets/images/...` for local images), optional `alt`.
- **video** – `value`: direct video URL (e.g. `.mp4`).
- **embed** – `value`: iframe URL (e.g. YouTube embed link). Uses lazy loading.

### New project

1. Add an entry to `data/projects-list.json` (same shape as post, without `readingTime`).
2. Create `data/projects/your-slug.json` with the same `content.sections` format as a post.

### Foundation: books and papers

**URLs** (slug is the filename without `.json`, not the display title):

- Book: `/foundation/book/deep-learning` → `data/foundation/books/deep-learning.json`
- Paper: `/foundation/paper/deep-learning-paper` → `data/foundation/papers/deep-learning-paper.json`

List entries go in `data/foundation/books-list.json` and `data/foundation/papers-list.json` (same `slug` values).

**Books – Markdown + generated TOC (recommended for long books)** – Set `"reader": "markdown-toc"`, `"contentRoot"`, and `"tocFile"` in the book JSON. The viewer loads **Marked** + **DOMPurify** + **KaTeX** (CDN) to render `.md` files with math and images. The sidebar shows the full TOC; each leaf links with `?section=sec-X-Y`. Content files live under `content/foundation/books/<slug>/` (e.g. `sec-1-1.md`). See `content/foundation/books/README.md`.

The **Deep Learning** book ships with a TOC aligned to the standard textbook outline (`data/foundation/books/deep-learning-toc.json`). Regenerate it after editing `tools/dl-toc-source.txt`:

```bash
python tools/generate_dl_toc.py
```

**Books – JSON-only (legacy)** – One **chapter per page** in the reader. The table of contents links to `?chapter=chapter-id`. Define chapters in `content.chapters` with `sections` (text, image, video, embed, heading). If you omit `content.chapters`, the viewer uses a single **Overview** chapter from `content.sections`.

**Papers** – **One long page** with a TOC that jumps to in-page anchors. Add `heading` sections with unique `id` values:

```json
"content": {
  "sections": [
    { "type": "heading", "id": "abstract", "value": "Abstract" },
    { "type": "text", "value": "..." },
    { "type": "heading", "id": "method", "value": "Method" }
  ]
}
```

Optional: `"level": 3` on a heading renders `<h3>` instead of `<h2>`.

Section types for JSON-driven content: `text`, `heading`, `image`, `video`, `embed` (same as posts). Paper boilerplate notes: `content/foundation/papers/README.md`.

**Local server** – Use `python dev_server.py` or `npx serve .`, or add a `foundation/book/<slug>/index.html` (see earlier note) so plain `python -m http.server` can open `/foundation/book/<slug>/`.

## Tech notes

- **Light** – Single CSS file, small vanilla JS, no runtime framework. System font stack (no extra font requests).
- **Responsive** – Mobile-first CSS, flexible layout, touch-friendly.
- **Efficient** – List data loaded once; each post/project page loads only its JSON. Images use `loading="lazy"`.
- **Filter** – Tags and search run in the browser; no server required. Works on GitHub Pages.

## Deploy on GitHub Pages

1. Push this repo to GitHub.
2. In the repo: **Settings → Pages** → Source: deploy from the **main** branch (root).
3. Your site will be at `https://<username>.github.io/<repo>/`. If the repo is `username.github.io`, it will be `https://username.github.io/`.

**URL structure** – Clean path-based URLs: `/` (home), `/post/welcome-post`, `/project/sample-project`, `/foundation/book/{slug}`, `/foundation/paper/{slug}`. A custom `404.html` loads the viewer script for those paths. Use root-relative paths (e.g. `/data/foundation/...`) for images. For local testing, use a server that serves `404.html` for missing paths (e.g. `npx serve`); Python's `http.server` does not.
