# Tatra Labs – Blog & Projects

A minimal, fast blog and project site. No build step, no heavy frameworks. Optimized for **lightweight**, **responsive**, and **efficient** delivery.

## Where everything lives

| Area | On disk | What it is |
|------|---------|------------|
| **Authoring** | **`content/`** | All posts, projects, foundation lists, book/paper JSON, Markdown sections, and shared foundation images. Start with **`content/README.md`** for the full map. |
| **Optional assets** | **`assets/images/`** | Extra images referenced from JSON posts (e.g. diagrams) and project screenshots under `assets/images/projects/`. Not required for foundation. |
| **App shell** | **`index.html`**, **`404.html`**, **`css/`**, **`js/`**, **`foundation/`** | Pages and scripts. `foundation/book/.../index.html` is optional for local static servers. |
| **Hosted apps** | **`project/<name>/`** | Self-contained static apps served from this site — `project/jobs/` is vendored from its own repo, `project/agents/` is authored here. See [Hosting a project here](#hosting-a-project-here). |
| **Tools** | **`tools/`** | Utility scripts: the Deep Learning TOC generator, the book-extent stamper, the hosted-app sync script, the reader-shell mirror, the agent-registry checker, and the internal-link checker. |

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
- **No dates** – Publication dates are **never displayed**. Every content file still carries `date` (and the register its `added`/`updated`), and those still order the lists — nothing renders them. `js/util.js` has no date helpers at all; that is deliberate, and its header says so. Posts still show reading time.
- **Sticky masthead** – The nav is `position: sticky` at the top of the viewport, so the three tabs stay reachable from the middle of a long article or a 164-section book. Anything that positions against the viewport top clears it via the `--masthead-h` token: the sticky article rail and book TOC, and `scroll-margin-top` on anchored headings.
- **Content** – Posts and projects support **text**, **images**, and **video** (including embeds).
- **Agent Hub** – Every agent, at `/project/agents/`, rendered from `content/agents/registry.json`: an authored domain list beside the agents themselves, a derived provenance byline on every one, and a detail page per agent at `?agent={slug}`.
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

### New agent

The **Agent Hub** at [`/project/agents/`](https://tatra-labs.github.io/project/agents/) renders from a single file. Adding an agent is one JSON object in **`content/agents/registry.json`** (plus a bump of `register.updated` to at least the new record's date) — no new page, no HTML, no build step:

```bash
$EDITOR content/agents/registry.json
python tools/check_agents.py            # exits non-zero on a record that cuts corners
```

The field contract is documented in **`content/README.md`**. Three things about it are load-bearing rather than stylistic, and the checker enforces all three:

1. **`provenance.author` and `.origin` are required on every record; `.licence` is required whenever the work is not yours**, and its absence on your own work is reported as a note (the byline then reads "licence not stated"). The byline shown on each row is *derived* from these by a fixed map in `project/agents/app.js` (`author · licence · {original work | forked, changes listed | mirrored unmodified}`), so it is not a field anyone can author — no record can soften or omit its own attribution. When the work is not yours, `upstream.url` and `contribution` are required too.
2. **A result may not appear without its caveat.** If `evaluation.headline` is set and `evaluation.caveat` is empty, the renderer *suppresses the numbers*. Fix the record rather than ship a suppressed result.
3. **`domains[]` and `patterns[]` are a closed, authored vocabulary.** A record's `domain` must resolve, because a typo there would silently drop it out of its own row in the domain table — the one failure the page cannot show you.

A domain with no agents is not a bug and must not be hidden: it renders as an open row whose scope note states the **standard** an agent there would have to meet. The checker rejects "coming soon", "planned", "work in progress", "WIP", "roadmap" and "TBD" in a scope note, and rejects any string beginning `TODO`.

## Hosting a project here

A project that is a **static** site (no server, relative asset paths) can be served from this one at `/project/<name>/`, alongside its write-up at `/project/<slug>`. Real files win over the `404.html` fallback, so the two do not collide — but the app directory name and the write-up slug must differ.

Currently hosted:

| URL | App | Source | Kind |
|-----|-----|--------|------|
| [`/project/jobs/`](https://tatra-labs.github.io/project/jobs/) | US Job Market Visualizer + Remote Job Explorer (write-up at `/project/us-job-market`) | [tatra-labs/jobs](https://github.com/tatra-labs/jobs) | vendored |
| [`/project/agents/`](https://tatra-labs.github.io/project/agents/) | The **Agent Hub** (write-up at `/project/agent-hub`) | this repo | authored here |

**The two kinds are different and the distinction matters.** `project/jobs/` is *vendored* from another repo and must not be hand-edited (see the sync script below). `project/agents/` is *authored in this repo*: edit it directly, and note that it deliberately loads `/css/style.css` and follows the design law rather than shipping a palette of its own, so it reads as a page of the site and not as a bolted-on app.

`project/jobs/` is **vendored**, not a submodule — do not hand-edit it. Refresh it from a local checkout of the source repo:

```bash
python tools/sync_project_jobs.py                 # expects ../jobs
python tools/sync_project_jobs.py --source /path/to/jobs
python tools/sync_project_jobs.py --check         # exits non-zero if out of date
```

The script copies `jobs/site/` verbatim and injects one "← Tatra Labs" link into each page's header so visitors can get back. It fails loudly if the upstream markup moves rather than silently dropping the link.

**`.nojekyll`** at the repo root keeps GitHub Pages from running these vendored files through Jekyll.

## The reader shells

`404.html` is the viewer shell GitHub Pages serves for `/post/…` and `/project/…`. Byte-identical copies live under `foundation/book/<slug>/index.html` (and `foundation/paper/<slug>/` if a paper exists) so those known routes return **HTTP 200** instead of a 404 status.

**Every markup change to the reader must land in all of them**, or those routes regress. Don't do it by hand — the script derives the shell list from `content/foundation/`, so adding a book or paper is enough to get one:

```bash
python tools/sync_shells.py            # mirror 404.html into every shell
python tools/sync_shells.py --check    # exits non-zero if they drift
```

It also warns about a shell left behind by a deleted book or paper; delete that directory when it does.

### Foundation: books and papers

**URLs** in the browser (slug = folder / filename, not the long title):

- Book: `/foundation/book/<slug>` → loads **`content/foundation/books/<slug>/book.json`**
- Paper: `/foundation/paper/<slug>` → **`content/foundation/papers/<slug>.json`**

**Lists for the home page:** **`content/foundation/books/index.json`** and **`content/foundation/papers/index.json`** (same `slug` values as above). Either list may be empty (`[]`) — a group with no items is hidden, header included. There are currently four books and no papers.

Three of the four are **reading lists** rather than books — Sutskever's List, Karpathy's List and Weng's Guide. They use the same `markdown-toc` reader and the same folder layout; a "section" is one work rather than one chapter section, and each entry opens with a bold byline (`Authors · Year · [link](url)`) instead of a heading. They cross-reference each other with links of the form `/foundation/book/<slug>?section=<id>`, which `tools/check_links.py` validates.

After adding or removing a section file, restamp how much of a book is written:

```bash
python tools/update_book_extent.py            # counts sections/*.md into toc.json
python tools/update_book_extent.py --check    # exits non-zero if out of date
```

Then check that the links inside those sections still go somewhere. The reading lists link into each other's sections, and a renumbered section leaves a link that looks fine in the source and lands on a blank page:

```bash
python tools/check_links.py            # exits non-zero on a broken link
python tools/check_links.py --list     # also prints every link it found
```

It resolves `/foundation/book/<slug>?section=<id>` against each book's `toc.json`, and fails on a link into a section that is declared but not yet written.

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
