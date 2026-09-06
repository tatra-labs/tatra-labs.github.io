#!/usr/bin/env python3
"""Verify every internal link in the Markdown book sections resolves.

The reading-list books cross-reference each other heavily — an entry that says
"the mechanism is in Sutskever's List" links straight to that section. Those
links are the first on the site that point *between* books, and nothing else
catches one that rots: a renumbered section or a renamed slug leaves a link
that still looks fine in the source and lands on an empty reader.

Checks, for links of the form `/foundation/book/<slug>?section=<id>`:
  - the book slug exists in content/foundation/books/
  - the section id appears in that book's toc.json
  - the section's Markdown file is actually written (a link into an unwritten
    section renders as a blank page, which is worse than no link)

Also flags root-relative links to paths that do not exist on disk, skipping
the client-side routes the viewer owns (/post/, /project/, /foundation/).

Usage:
    python tools/check_links.py            # report and exit non-zero on failure
    python tools/check_links.py --list     # also print every link found
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
BOOKS = REPO / "content" / "foundation" / "books"

LINK = re.compile(r"\]\((/[^)\s]*)\)")
BOOK_LINK = re.compile(r"^/foundation/book/([a-z0-9-]+)(?:\?section=([a-z0-9-]+))?$")

# Routes the client-side viewer resolves; there is no file on disk to check.
CLIENT_ROUTES = ("/post/", "/project/", "/foundation/")


def load_books() -> dict[str, dict]:
    """slug -> {ids: set of section ids, written: set of ids with a file}"""
    out = {}
    for toc_path in sorted(BOOKS.glob("*/toc.json")):
        slug = toc_path.parent.name
        toc = json.loads(toc_path.read_text(encoding="utf-8"))
        flat = toc.get("flatSections") or []
        present = {p.name for p in (toc_path.parent / "sections").glob("*.md")}
        out[slug] = {
            "ids": {s["id"] for s in flat},
            "written": {s["id"] for s in flat if s.get("file") in present},
        }
    return out


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--list", action="store_true", help="print every link found")
    args = ap.parse_args()

    books = load_books()
    if not books:
        print("error: no books found", file=sys.stderr)
        return 2

    problems, checked = [], 0
    for md in sorted(BOOKS.glob("*/sections/*.md")):
        where = md.relative_to(REPO).as_posix()
        for href in LINK.findall(md.read_text(encoding="utf-8")):
            checked += 1
            if args.list:
                print(f"  {where}: {href}")

            m = BOOK_LINK.match(href)
            if m:
                slug, sec = m.group(1), m.group(2)
                if slug not in books:
                    problems.append(f"{where}: no such book '{slug}' -> {href}")
                elif sec and sec not in books[slug]["ids"]:
                    problems.append(f"{where}: '{slug}' has no section '{sec}'")
                elif sec and sec not in books[slug]["written"]:
                    problems.append(f"{where}: '{slug}/{sec}' is declared but "
                                    f"not written - the link renders blank")
                continue

            if href.startswith(CLIENT_ROUTES):
                continue  # a client-side route the viewer owns

            target = REPO / href.split("?")[0].split("#")[0].lstrip("/")
            if not target.exists():
                problems.append(f"{where}: no file at {href}")

    for p in problems:
        print(f"  {p}")
    if problems:
        print(f"{len(problems)} broken link(s) of {checked} checked")
        return 1
    print(f"all {checked} internal links resolve")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
