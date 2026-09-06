# Site content (single folder)

Everything you **author or configure** for the live site lives under **`content/`**. There is no separate `data/` tree—only this directory and **`assets/`** for optional shared images used by posts (e.g. diagrams).

## Layout

| Path | Purpose |
|------|--------|
| **`content/posts/index.json`** | List of posts for the home page (title, excerpt, slug, tags, …). |
| **`content/posts/<slug>.json`** | Full post body (`content.sections`: text, image, video, embed). |
| **`content/projects/index.json`** | List of projects for the home page. |
| **`content/projects/<slug>.json`** | Full project JSON (same section types as posts). |
| **`content/agents/registry.json`** | The Agent Hub: the domain list, the pattern vocabulary, and one record per agent. Rendered by `/project/agents/`. |
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
| `title`, `slug`, `date`, `excerpt`, `tags` | the row itself. **`date` is never displayed** — it orders the list and nothing more. Keep authoring it. |
| `image` | projects/posts: a 16:9 plate under the excerpt, full width of the band |
| `readingTime` | posts: shown in the rail |
| `icon` | foundation: the cover. **Omit it** and an initials plate renders instead — honest, and better than reusing another item's cover. |
| `authors` | foundation: the byline. The site owner is filtered out, so list the *work's* authors. |
| `venue` | foundation: appended to the byline (e.g. `Nature 521, 436–444 (2015)`) |
| `summary` | foundation: the row's body copy — this is the only prose on a Foundation row, so it carries the section |

Book rows additionally show how much is written (`1 / 164 sections`), read live from that book's `toc.json`. Nothing is hand-maintained.

## The Agent Hub — `content/agents/registry.json`

One file. Adding an agent is one object in `agents[]`; the page at `/project/agents/` is rendered from it and nothing outside this file changes — bump `register.updated` to the new record's date while you are in there. Run `python tools/check_agents.py` afterwards; it refuses records that cut corners, and it names which corner.

The file has three top-level parts:

| Key | What it is |
|-----|-----------|
| `register` | `scope` is the one-line lede under the title. `opened` and `updated` are authored but **never rendered** — `updated` exists so the checker can catch a register dated before its own newest record. |
| `domains[]` | `id`, `name`, `note`. **Authored, not derived** — a domain exists whether or not anything has been built in it, which is what makes an empty one a stated gap rather than an empty filter. Keep `note` to one line: it is a table cell, not a paragraph. |
| `patterns[]` | `id`, `name`, `gloss`. The closed vocabulary the chips filter on. A pattern no agent uses gets no chip at all. |

### A record

| Field | Notes |
|-------|-------|
| `no` | Accession number. Permanent and never reused — a withdrawn agent keeps its number. Renders as `001` in the rail. |
| `slug` | Lower-case-kebab, unique. It is the `?agent=` key. |
| `added`, `updated` | ISO dates, **never displayed** (no date is, anywhere on this site). They order nothing today, but `check_agents.py` fails if the later of the two is newer than `register.updated`. |
| `title`, `oneLine` | The row's title and its only description. |
| `domain` | Exactly one id, and it **must** resolve in `domains[]`. |
| `status` | `live`, `study`, `archived`, `withdrawn`, `private`. Lifecycle only. |
| `patterns[]` | **At least one** id, each of which must resolve in `patterns[]`. |
| `autonomy` | One sentence: what this agent can change in the world. |
| `loop.steps` | 3–8 imperative sentences, rendered as an ordered list. Deliberately not free prose, so the step is comparable across records. `loop.note` is optional. |
| `stack`, `interfaces[]` | `runtime`, `models[]`, `key[]`; and the surfaces it is reached through. |
| `tools` | `note` plus `rows[]` of `{ name, does, effect }`. **`effect` is the point** — `read-only`, `billed model call`, `staged write, approval before commit`. |
| `budget` | `latency`, `cost`, `calls`. Keep these **short**: they render in a 136px rail. Put the range in `tools.note`. |
| `evaluation` | An object or `null`. `null` prints “Not evaluated.” — the heading is never suppressed. If `headline` is set, **`caveat` and `short` are both required**; `short` is the one sentence carrying the number *and* its qualification that the register row prints. |
| `provenance` | `origin` (`original` \| `fork` \| `mirror`), `author`, `licence` (required unless `origin` is `original`, where its absence is only noted), optional `note`; and when the work is not yours, `upstream.url` (required) plus `contribution` — record `upstream.mirror` and `upstream.commit` too, though the checker does not demand them. A `fork` must also list `changes[]`. |
| `links[]` | `{ rel, label, url, primary? }`. At most one `primary` — the site has exactly one filled surface. A slug that also has a project write-up must carry a `rel: "writeup"` link. |
| `media` | `{ plate, alt }` or `null`. The plate must exist on disk. |
| `limits`, `tags[]` | What it does not do, and the row's chips. |

**Status and origin are two orthogonal axes.** “Mirrored” is not a status; a mirrored agent can be `live` or `study` like any other. The byline under each row title —

```
author · licence · {original work | forked, changes listed | mirrored unmodified}
```

— is **derived in `project/agents/app.js` from a fixed map, never authored**. That is the register's one honesty guarantee: no record can soften, shorten or omit its own attribution, because the string is not a field.

## Rules of thumb

1. **`index.json`** = “what appears in lists” (posts, projects, books, papers).  
2. **Same slug** in the list and in the article file (`welcome-post` → `welcome-post.json`).  
3. **Books** with Markdown: everything for that title is under **`content/foundation/books/<slug>/`** (`book.json`, `toc.json`, `sections/`).  
4. **URLs** in the browser stay the same (`/post/…`, `/foundation/book/…`); only file paths on disk moved under **`content/`**.
