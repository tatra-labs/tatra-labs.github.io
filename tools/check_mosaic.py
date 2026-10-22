#!/usr/bin/env python3
"""Validate content/mosaic/index.json — the tiles InsightMosaic renders.

A tile is meant to be read in a glance, and the page has no way to enforce
that: js/main.js lays out whatever it is given, and a 900-character tile simply
becomes a tall one. So the limits live here, checked before anything ships:

  1. Short. A tile's visible text is at most MAX_TEXT characters, counting an
     inline link by its label, not its URL. A title is optional and short.
  2. Kinds are a closed, authored vocabulary. A tile's `kind` must resolve in
     `kinds[]`, or it renders its raw id as its label.
  3. Every link goes somewhere. External links must be http(s) or mailto;
     root-relative links must resolve — a write-up at /project/<slug> or
     /post/<slug> must exist, and any other path must be a file on disk.
  4. Ids are permanent. Each is unique and lower-case-kebab, because it is the
     tile's permalink (/?tab=mosaic#m-<id>) and someone may have shared it.

It writes nothing. When it finds a problem it names the tile, says what is
wrong, and exits non-zero.

Usage:
    python tools/check_mosaic.py
"""

from __future__ import annotations

import datetime as dt
import json
import re
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
MOSAIC = REPO / "content" / "mosaic" / "index.json"

MAX_TEXT = 400      # "a few hundred letters"
MAX_TITLE = 80
MAX_LINKS = 4
MAX_TAGS = 3        # the tile renders the first three
SLUG = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
INLINE_LINK = re.compile(r"\[([^\]]+)\]\(([^)\s]+)\)")
TILE_KEYS = {"id", "date", "kind", "title", "text", "links", "tags", "size", "pin"}

problems: list[str] = []
notes: list[str] = []


def bad(where: str, msg: str) -> None:
    problems.append(f"{where}: {msg}")


def check_url(where: str, url: str) -> None:
    if not isinstance(url, str) or not url.strip():
        bad(where, "empty link URL")
        return
    if url.startswith(("https://", "http://", "mailto:")):
        return
    if not url.startswith("/"):
        bad(where, f"link must be absolute (https://...) or root-relative (/...): {url}")
        return
    path = url.split("#")[0].split("?")[0]
    for prefix, folder in (("/project/", "projects"), ("/post/", "posts")):
        if path.startswith(prefix) and path.count("/") == 2:
            slug = path[len(prefix):].strip("/")
            if not (REPO / "content" / folder / f"{slug}.json").exists():
                bad(where, f"no write-up for {url}")
            return
    m = re.match(r"^/foundation/(book|paper)/([a-z0-9-]+)$", path)
    if m:
        kind, slug = m.groups()
        target = (REPO / "content/foundation/books" / slug / "book.json") if kind == "book" \
            else (REPO / "content/foundation/papers" / f"{slug}.json")
        if not target.exists():
            bad(where, f"no {kind} for {url}")
        return
    if path in ("", "/"):
        return
    if not (REPO / path.lstrip("/")).exists():
        bad(where, f"no file at {url}")


def main() -> int:
    try:
        data = json.loads(MOSAIC.read_text(encoding="utf-8"))
    except (OSError, ValueError) as e:
        print(f"error: cannot read {MOSAIC.relative_to(REPO)}: {e}", file=sys.stderr)
        return 2

    kinds = {}
    for i, k in enumerate(data.get("kinds") or []):
        where = f"kinds[{i}]"
        if not SLUG.match(str(k.get("id", ""))):
            bad(where, f"id must be lower-case-kebab, got {k.get('id')!r}")
        elif k["id"] in kinds:
            bad(where, f"duplicate kind '{k['id']}'")
        if not str(k.get("label", "")).strip():
            bad(where, "missing label")
        kinds[k.get("id")] = k.get("label")
    if not kinds:
        bad("kinds", "no kinds declared")

    tiles = data.get("tiles")
    if not isinstance(tiles, list):
        bad("tiles", "must be a list")
        tiles = []

    seen = set()
    used = set()
    for i, t in enumerate(tiles):
        tid = t.get("id")
        where = f"tile '{tid}'" if tid else f"tiles[{i}]"

        for key in sorted(set(t) - TILE_KEYS):
            bad(where, f"unknown field '{key}' (known: {', '.join(sorted(TILE_KEYS))})")

        if not SLUG.match(str(tid or "")):
            bad(where, "id must be lower-case-kebab; it is the tile's permalink")
        elif tid in seen:
            bad(where, "duplicate id")
        seen.add(tid)

        try:
            dt.date.fromisoformat(str(t.get("date")))
        except ValueError:
            bad(where, f"date must be YYYY-MM-DD, got {t.get('date')!r}")

        if t.get("kind") not in kinds:
            bad(where, f"kind '{t.get('kind')}' is not in kinds[] ({', '.join(kinds)})")
        used.add(t.get("kind"))

        text = t.get("text")
        if not isinstance(text, str) or not text.strip():
            bad(where, "missing text")
            text = ""
        visible = INLINE_LINK.sub(r"\1", text)
        if len(visible) > MAX_TEXT:
            bad(where, f"text is {len(visible)} characters; a tile holds at most {MAX_TEXT}")
        if re.search(r"\bTODO\b|\bTBD\b|lorem ipsum", text, re.I):
            bad(where, "text still holds a placeholder")
        for label, url in INLINE_LINK.findall(text):
            check_url(f"{where} inline link '{label}'", url)

        title = t.get("title")
        if title is not None and (not isinstance(title, str) or len(title) > MAX_TITLE):
            bad(where, f"title must be a string of at most {MAX_TITLE} characters")

        links = t.get("links") or []
        if len(links) > MAX_LINKS:
            bad(where, f"{len(links)} links; a tile holds at most {MAX_LINKS}")
        for j, link in enumerate(links):
            if not isinstance(link, dict) or not str(link.get("label", "")).strip():
                bad(f"{where} links[{j}]", "needs a label")
                continue
            check_url(f"{where} link '{link['label']}'", link.get("url"))

        tags = t.get("tags") or []
        if len(tags) > MAX_TAGS:
            notes.append(f"{where}: {len(tags)} tags; only the first {MAX_TAGS} are shown")

        if t.get("size") not in (None, "wide"):
            bad(where, f"size must be omitted or \"wide\", got {t.get('size')!r}")
        if t.get("pin") not in (None, True, False):
            bad(where, "pin must be true or false")

    for p in problems:
        print(f"  {p}")
    for n in notes:
        print(f"note: {n}")
    if problems:
        print(f"{len(problems)} problem(s) in {MOSAIC.relative_to(REPO).as_posix()}")
        return 1
    pins = sum(1 for t in tiles if t.get("pin"))
    print(f"mosaic: clean - {len(tiles)} tile(s), {len(used & set(kinds))} of {len(kinds)} kinds in use"
          + (f", {pins} pinned" if pins else ""))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
