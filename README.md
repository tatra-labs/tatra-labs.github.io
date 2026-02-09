# Tatra Labs – Blog & Projects

A minimal, fast blog and project site (inspired by [Lil'Log](https://lilianweng.github.io/)). No build step, no heavy frameworks. Optimized for **lightweight**, **responsive**, and **efficient** delivery.

## Features

- **Posts & Projects** – Switch between blog posts and projects from the same list view.
- **Tags** – Every post/project has tags; the tag cloud is built automatically from your data. Click a tag to filter.
- **Search** – Filter by typing in the search box (matches title, excerpt, and tags).
- **Date** – Each item shows “Date written” (and reading time for posts).
- **Content** – Posts and projects support **text**, **images**, and **video** (including embeds).

## How to run locally

Serve the folder with any static server, e.g.:

```bash
# Python
python -m http.server 8000

# Node (npx)
npx serve .
```

Then open `http://localhost:8000`.

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
- **image** – `value`: image URL, optional `alt`.
- **video** – `value`: direct video URL (e.g. `.mp4`).
- **embed** – `value`: iframe URL (e.g. YouTube embed link). Uses lazy loading.

### New project

1. Add an entry to `data/projects-list.json` (same shape as post, without `readingTime`).
2. Create `data/projects/your-slug.json` with the same `content.sections` format as a post.

## Tech notes

- **Light** – Single CSS file, small vanilla JS, no runtime framework. System font stack (no extra font requests).
- **Responsive** – Mobile-first CSS, flexible layout, touch-friendly.
- **Efficient** – List data loaded once; each post/project page loads only its JSON. Images use `loading="lazy"`.
- **Filter** – Tags and search run in the browser; no server required. Works on GitHub Pages.

## Deploy on GitHub Pages

1. Push this repo to GitHub.
2. In the repo: **Settings → Pages** → Source: deploy from the **main** branch (root).
3. Your site will be at `https://<username>.github.io/<repo>/`. If the repo is `username.github.io`, it will be `https://username.github.io/`.

If the site is in a subpath (e.g. `/tatra-labs.github.io/`), update links in `index.html`, `post.html`, and `project.html` to use that base path, or use a base tag.
