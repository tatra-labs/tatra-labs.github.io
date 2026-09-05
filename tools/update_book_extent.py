#!/usr/bin/env python3
"""Stamp `written` into every book's toc.json by counting the section files that
actually exist on disk.

A toc declares the sections a book *will* have; the `sections/` directory holds the
ones that are written. The Foundation card reports "N / M sections written", and
without this the N is a guess. Run after adding or removing a section file.

Usage:
    python tools/update_book_extent.py [--check]

    --check   report drift and exit non-zero; nothing is written.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

BOOKS = Path(__file__).resolve().parent.parent / "content" / "foundation" / "books"


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--check", action="store_true", help="report drift, write nothing")
    args = ap.parse_args()

    drift = False
    for toc_path in sorted(BOOKS.glob("*/toc.json")):
        book = toc_path.parent
        toc = json.loads(toc_path.read_text(encoding="utf-8"))
        flat = toc.get("flatSections") or []
        if not flat:
            print(f"  {book.name}: no flatSections, skipped")
            continue

        present = {p.name for p in (book / "sections").glob("*.md")}
        written = sum(1 for s in flat if s.get("file") in present)
        declared = len(flat)

        orphans = present - {s.get("file") for s in flat}
        if orphans:
            print(f"  {book.name}: WARNING {len(orphans)} file(s) not in toc: "
                  f"{', '.join(sorted(orphans))}")

        if toc.get("written") == written:
            print(f"  {book.name}: {written} / {declared} (unchanged)")
            continue

        drift = True
        if args.check:
            print(f"  {book.name}: toc says {toc.get('written')!r}, disk says {written}")
            continue

        toc["written"] = written
        toc_path.write_text(json.dumps(toc, indent=2, ensure_ascii=False) + "\n",
                            encoding="utf-8")
        print(f"  {book.name}: {written} / {declared} (updated)")

    if args.check and drift:
        print("toc.json extents are out of date; run without --check")
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
