#!/usr/bin/env python3
"""Mirror 404.html into one directory reader shell per foundation item.

`404.html` is the client-side viewer shell GitHub Pages serves for
`/post/<slug>` and `/project/<slug>`. Each foundation item additionally gets a
byte-identical copy at `foundation/book/<slug>/index.html` (or `paper/`), so
those known routes return HTTP 200 rather than a 404 status — better for
crawlers and link previews.

The shell list is DERIVED from `content/foundation/`, not hardcoded: adding a
book used to mean remembering to add a shell here too, and forgetting left the
new route serving a 404 status. Now a new book gets its shell automatically.

Every markup change to the reader must land in all copies or those routes
regress. This script is that guarantee.

Usage:
    python tools/sync_shells.py            # write/refresh every shell
    python tools/sync_shells.py --check    # exit non-zero if any differs

This is a hand-run maintenance helper, not a build step: the served files
stay literal static HTML.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
SOURCE = REPO_ROOT / "404.html"
CONTENT = REPO_ROOT / "content" / "foundation"


def expected_shells() -> list[Path]:
    """One shell per foundation item that actually exists in content/."""
    out = []
    for book in sorted((CONTENT / "books").glob("*/book.json")):
        out.append(REPO_ROOT / "foundation" / "book" / book.parent.name / "index.html")
    for paper in sorted((CONTENT / "papers").glob("*.json")):
        if paper.name == "index.json":
            continue
        out.append(REPO_ROOT / "foundation" / "paper" / paper.stem / "index.html")
    return out


SHELLS = expected_shells()


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    parser.add_argument("--check", action="store_true",
                        help="report drift and exit non-zero instead of writing")
    args = parser.parse_args()

    if not SOURCE.is_file():
        print(f"error: {SOURCE} is missing", file=sys.stderr)
        return 2

    want = SOURCE.read_bytes()
    drift = [p for p in SHELLS if not p.is_file() or p.read_bytes() != want]

    # A shell left behind by a deleted book serves a stale page on a live URL.
    wanted = {p.resolve() for p in SHELLS}
    orphans = [p for p in sorted(REPO_ROOT.glob("foundation/*/*/index.html"))
               if p.resolve() not in wanted]
    for p in orphans:
        print(f"warning: {p.relative_to(REPO_ROOT).as_posix()} has no item in "
              f"content/foundation — delete it or the route serves a stale page")

    if args.check:
        if drift:
            print("reader shells are out of date:")
            for p in drift:
                print(f"  {p.relative_to(REPO_ROOT).as_posix()}")
            print("run: python tools/sync_shells.py")
            return 1
        print(f"all {len(SHELLS)} reader shells match 404.html")
        return 0

    for p in drift:
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_bytes(want)
        print(f"wrote {p.relative_to(REPO_ROOT).as_posix()}")

    if not drift:
        print("already in sync")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
