#!/usr/bin/env python3
"""Mirror 404.html into the two directory reader shells.

`404.html` is the client-side viewer shell GitHub Pages serves for
`/post/<slug>` and `/project/<slug>`. The two files under `foundation/` are
byte-identical copies that exist so those known routes return HTTP 200
instead of a 404 status (better for crawlers and link previews).

Every markup change to the reader must land in all three files or two of the
three routes regress. This script is that guarantee.

Usage:
    python tools/sync_shells.py            # copy 404.html over both shells
    python tools/sync_shells.py --check    # exit non-zero if they differ

This is a hand-run maintenance helper, not a build step: the served files
stay literal static HTML.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
SOURCE = REPO_ROOT / "404.html"
SHELLS = [
    REPO_ROOT / "foundation" / "book" / "deep-learning" / "index.html",
    REPO_ROOT / "foundation" / "paper" / "deep-learning-paper" / "index.html",
]


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
