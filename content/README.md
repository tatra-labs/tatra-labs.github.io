# Site content (single folder)

Everything you **author or configure** for the live site lives under **`content/`**. There is no separate `data/` tree—only this directory and **`assets/`** for optional shared images used by posts (e.g. diagrams).

## Layout

| Path | Purpose |
|------|--------|
| **`content/posts/index.json`** | List of posts for the home page (title, excerpt, slug, tags, …). |
| **`content/posts/<slug>.json`** | Full post body (`content.sections`: text, image, video, embed). |
| **`content/projects/index.json`** | List of projects for the home page. |
| **`content/projects/<slug>.json`** | Full project JSON (same section types as posts). |
| **`assets/images/projects/`** | Screenshots and clips used by project cards and pages. |
| **`content/foundation/books/index.json`** | List of books (cards on Foundation tab). |
| **`content/foundation/papers/index.json`** | List of papers. |
| **`content/foundation/media/`** | Shared images for foundation cards and Markdown (e.g. `deep_learning.webp`). |
| **`content/foundation/books/<slug>/`** | One folder per book. |
| **`content/foundation/books/<slug>/book.json`** | Metadata + `"reader": "markdown-toc"` and paths to TOC + section files. |
| **`content/foundation/books/<slug>/toc.json`** | Generated table of contents (run `python tools/generate_dl_toc.py`). |
| **`content/foundation/books/<slug>/toc-source.txt`** | Editable outline before regenerating `toc.json`. |
| **`content/foundation/books/<slug>/sections/*.md`** | Markdown for each section (filenames must match `toc.json`). |
| **`content/foundation/papers/<slug>.json`** | Paper article (JSON sections + optional headings for in-page TOC). |
| **`content/foundation/overview.json`** | Optional copy for foundation marketing text (if you wire it in the UI). |

## Section types

Both posts and projects use `content.sections`. Every type takes a `value`; media types also take an optional `caption`.

| `type` | `value` | Extras |
|--------|---------|--------|
| `text` | Paragraph text; newlines split paragraphs. | — |
| `heading` | Heading text. | `id` (for a paper's in-page TOC), `level: 3` for `<h3>` |
| `image` | Image URL. | `alt`, `caption` |
| `video` | Video URL. | `caption`, `poster`, and `autoplay` + `loop` together to make it a silent, controls-free animated screenshot |
| `embed` | Iframe URL (e.g. a YouTube embed). | `caption` |
| `links` | An **array** of `{ label, url }`. | `primary: true` on one of them for the filled button |
| `markdown` | A markdown string: tables, code fences, lists, blockquotes and `$…$` / `$$…$$` math. | — |

**On `markdown`:** it is the right choice for anything technical — a comparison table or a code block is far clearer than the same content flattened into `text` paragraphs. It reuses the parser, sanitiser and KaTeX that the book reader already loads, and **only a document that actually contains one pays for them**, so a plain JSON post still ships zero extra bytes. Output is sanitised through DOMPurify, wide tables get a scroll container, and the prose stylesheet already styles every element it can emit. Start headings at `##` — `#` is the page title, and a stray markdown `h1` is defensively restyled as an `h2` anyway.

```json
{ "type": "links", "value": [
  { "label": "Open the live tool", "url": "/project/jobs/", "primary": true },
  { "label": "Source on GitHub", "url": "https://github.com/tatra-labs/jobs" }
] }
```

Links to another origin get `target="_blank"` and an arrow icon automatically. Only `http`, `https` and `mailto` URLs are rendered.

### Fields a list entry can carry

`index.json` entries render as rows in a **register** (a ruled contents table), not as cards.

| Field | Effect |
|-------|--------|
| `title`, `slug`, `date`, `excerpt`, `tags` | the row itself. The **year prints only when it changes**, so a run of same-year entries shows it once. |
| `image` | projects/posts: a 16:9 plate under the excerpt, full width of the band |
| `readingTime` | posts: shown in the rail |
| `icon` | foundation: the cover. **Omit it** and an initials plate renders instead — honest, and better than reusing another item's cover. |
| `authors` | foundation: the byline. The site owner is filtered out, so list the *work's* authors. |
| `venue` | foundation: appended to the byline (e.g. `Nature 521, 436–444 (2015)`) |
| `summary` | foundation: the row's body copy — this is the only prose on a Foundation row, so it carries the section |

Book rows additionally show how much is written (`1 / 164 sections`), read live from that book's `toc.json`. Nothing is hand-maintained.

## Rules of thumb

1. **`index.json`** = “what appears in lists” (posts, projects, books, papers).  
2. **Same slug** in the list and in the article file (`welcome-post` → `welcome-post.json`).  
3. **Books** with Markdown: everything for that title is under **`content/foundation/books/<slug>/`** (`book.json`, `toc.json`, `sections/`).  
4. **URLs** in the browser stay the same (`/post/…`, `/foundation/book/…`); only file paths on disk moved under **`content/`**.
