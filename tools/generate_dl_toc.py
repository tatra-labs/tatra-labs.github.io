#!/usr/bin/env python3
"""One-time generator: dl-toc-source.txt -> data/foundation/books/deep-learning-toc.json"""

import json
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "tools", "dl-toc-source.txt")
OUT = os.path.join(ROOT, "data", "foundation", "books", "deep-learning-toc.json")


def main():
    with open(SRC, "r", encoding="utf-8") as f:
        lines = [ln.strip() for ln in f if ln.strip()]

    prelude = {"title": None, "chapters": []}
    parts = []
    current_part = None
    current_chapter = None

    def ensure_part():
        nonlocal current_part
        if current_part is None:
            current_part = {"title": None, "chapters": []}
            parts.append(current_part)

    for line in lines:
        sub = re.match(r"^(\d+)\.(\d+)\s+(.+)$", line)
        if sub:
            a, b, title = sub.groups()
            sec = {
                "id": "sec-%s-%s" % (a, b),
                "number": "%s.%s" % (a, b),
                "title": title.strip(),
                "file": "sec-%s-%s.md" % (a, b),
            }
            if current_chapter is None:
                raise RuntimeError("subsection before chapter: %r" % line)
            current_chapter.setdefault("sections", []).append(sec)
            continue

        part = re.match(r"^(I|II|III)\s+(.+)$", line)
        if part:
            roman, rest = part.groups()
            title = "Part %s: %s" % (roman, rest.strip())
            current_part = {"title": title, "chapters": []}
            parts.append(current_part)
            current_chapter = None
            continue

        chap = re.match(r"^(\d+)\s+(.+)$", line)
        if chap:
            num, title = chap.groups()
            ch = {
                "id": "ch-%s" % num,
                "number": num,
                "title": title.strip(),
                "sections": [],
            }
            if num == "1" and not prelude["chapters"]:
                prelude["chapters"].append(ch)
                current_chapter = ch
            else:
                if current_part is None:
                    ensure_part()
                current_part["chapters"].append(ch)
                current_chapter = ch
            continue

        raise RuntimeError("unparsed line: %r" % line)

    tree = {"prelude": prelude, "parts": parts}

    def flatten_sections():
        """Ordered leaf sections for prev/next navigation."""
        leaves = []

        def walk_chapter(ch):
            for sec in ch.get("sections") or []:
                leaves.append(sec)

        for ch in prelude.get("chapters") or []:
            walk_chapter(ch)
        for p in parts:
            for ch in p.get("chapters") or []:
                walk_chapter(ch)
        return leaves

    tree["flatSections"] = flatten_sections()

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(tree, f, ensure_ascii=False, indent=2)
    print("Wrote", OUT, "(%d sections)" % len(tree["flatSections"]))


if __name__ == "__main__":
    main()
