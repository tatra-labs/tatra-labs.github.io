# Foundation papers (Markdown or JSON)

## Current (JSON sections)

The default paper viewer uses **`data/foundation/papers/<slug>.json`** with `content.sections` (text, heading, image, video, embed). See the main project README.

## Markdown (optional)

To add a **single-file Markdown paper** with a generated in-page TOC:

1. Add `paper.md` under e.g. `content/foundation/papers/<slug>/paper.md`.
2. Extend `data/foundation/papers/<slug>.json` with `"reader": "markdown"` and `"markdownFile": "/content/foundation/papers/<slug>/paper.md"` (when you wire `viewer.js` for this mode).

Until that mode is implemented, keep using JSON `sections` with `heading` entries for the table of contents.

## Boilerplate

- Use `heading` sections with unique `id` values for TOC anchors.
- Include **abstract**, **figures**, and **equations** in Markdown or JSON sections as described in the README.
