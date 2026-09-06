#!/usr/bin/env python3
"""Validate content/agents/registry.json — the file the Agent Register renders.

The register makes three promises on every page it draws, and only two of them
can be kept by the renderer alone:

  1. Every record states its author, its licence and its origin. project/agents/
     app.js derives that byline from a fixed map, so a record cannot soften its
     own attribution — but it CAN omit the fields, and then the page prints
     PROVENANCE MISSING. This script refuses the omission before it ships.
  2. A result never appears without its caveat. app.js suppresses the numbers
     when a caveat is absent; this script says so at commit time instead.
  3. Domains and patterns are a closed, authored vocabulary. A typo in
     `domain` would silently drop a record out of its own schedule row, which
     is the one failure the page cannot show you.

It writes nothing. When it finds a problem it names the record, says what is
wrong, and exits non-zero.

Usage:
    python tools/check_agents.py
    python tools/check_agents.py --check   # accepted, same behaviour; the flag
                                           # exists so this reads like its
                                           # siblings in tools/
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
REGISTRY = REPO_ROOT / "content" / "agents" / "registry.json"
PROJECT_INDEX = REPO_ROOT / "content" / "projects" / "index.json"

ORIGINS = {"original", "fork", "mirror"}
STATUSES = {"live", "study", "archived", "withdrawn", "private"}
SLUG_RE = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")

# An empty domain states a standard the work would have to meet. It never
# states an intention, because an intention is not a fact about today.
VAPOUR = ("coming soon", "planned", "work in progress", "wip", "roadmap", "tbd")

problems: list[str] = []
notes: list[str] = []


def bad(where: str, message: str) -> None:
    problems.append(f"{where}: {message}")


def walk_strings(node, path="$"):
    """Every string in the document, with a JSON path, for the TODO sweep."""
    if isinstance(node, str):
        yield path, node
    elif isinstance(node, dict):
        for k, v in node.items():
            yield from walk_strings(v, f"{path}.{k}")
    elif isinstance(node, list):
        for i, v in enumerate(node):
            yield from walk_strings(v, f"{path}[{i}]")


def check_vocabularies(data) -> tuple[set[str], set[str]]:
    domain_ids: set[str] = set()
    for d in data.get("domains", []):
        did = d.get("id")
        if not did:
            bad("domains", "an entry has no id")
            continue
        if did in domain_ids:
            bad(f"domains/{did}", "duplicate id")
        domain_ids.add(did)
        if not d.get("name"):
            bad(f"domains/{did}", "no name")
        note = d.get("note") or ""
        if not note:
            bad(f"domains/{did}", "no scope note — an empty domain with no stated "
                                  "standard is a placeholder, which is the one thing "
                                  "the register must not print")
        low = note.lower()
        for word in VAPOUR:
            # Word boundaries, so "wip" does not fire inside an ordinary word.
            if re.search(r"\b" + re.escape(word) + r"\b", low):
                bad(f"domains/{did}", f"scope note says {word!r}. A scope note states a "
                                      f"standard the work must meet, not an intention.")

    pattern_ids: set[str] = set()
    for p in data.get("patterns", []):
        pid = p.get("id")
        if not pid:
            bad("patterns", "an entry has no id")
            continue
        if pid in pattern_ids:
            bad(f"patterns/{pid}", "duplicate id")
        pattern_ids.add(pid)
        if not p.get("name") or not p.get("gloss"):
            bad(f"patterns/{pid}", "needs both name and gloss")

    return domain_ids, pattern_ids


def check_provenance(where: str, a: dict) -> None:
    p = a.get("provenance")
    if not isinstance(p, dict):
        bad(where, "no provenance block. Every record states who wrote it.")
        return

    origin = p.get("origin")
    if origin not in ORIGINS:
        bad(where, f"provenance.origin is {origin!r}; expected one of {sorted(ORIGINS)}")
    if not p.get("author"):
        bad(where, "provenance.author is required on every record, mirror or not")

    if not p.get("licence"):
        if origin == "original":
            notes.append(f"{where}: no licence recorded; the byline will read "
                         f"'licence not stated'")
        else:
            bad(where, "provenance.licence is required when the work is not yours")

    if origin in {"fork", "mirror"}:
        upstream = p.get("upstream") or {}
        if not upstream.get("url"):
            bad(where, f"origin is {origin!r}, so provenance.upstream.url is required")
        if not p.get("contribution"):
            bad(where, f"origin is {origin!r}, so provenance.contribution must say what "
                       f"part of this is yours")
    if origin == "fork" and not (p.get("changes") or []):
        bad(where, "origin is 'fork', so provenance.changes must list what you changed")


def check_evaluation(where: str, a: dict) -> None:
    e = a.get("evaluation")
    if e is None:
        return
    if not isinstance(e, dict):
        bad(where, "evaluation must be an object or null")
        return
    if e.get("headline"):
        if not (e.get("caveat") or "").strip():
            bad(where, "evaluation.headline is set with no caveat. app.js suppresses "
                       "the numbers in that case; fix the record rather than ship a "
                       "suppressed result.")
        if not (e.get("short") or "").strip():
            bad(where, "evaluation.headline is set with no 'short'. The register row "
                       "needs one sentence carrying the number AND its qualification, "
                       "so a result cannot be skimmed off its caveat.")


def check_links(where: str, a: dict, writeup_slugs: set[str]) -> None:
    links = a.get("links") or []
    primaries = 0
    for i, link in enumerate(links):
        if not link.get("url"):
            bad(where, f"links[{i}] has no url")
        if not link.get("label"):
            bad(where, f"links[{i}] has no label")
        if link.get("primary"):
            primaries += 1
    if primaries > 1:
        bad(where, f"{primaries} links marked primary. There is one filled surface on "
                   f"this site; app.js honours the first and strips the rest, but the "
                   f"data should say what it means.")

    if a.get("slug") in writeup_slugs:
        rels = {link.get("rel") for link in links}
        if "writeup" not in rels:
            bad(where, "this slug also has a project write-up in "
                       "content/projects/index.json, so it needs a rel:'writeup' link")


def check_tools(where: str, a: dict) -> None:
    """The effect column is the point of the table; a blank cell reads as
    'no effect', which is the most expensive thing a record can imply."""
    rows = (a.get("tools") or {}).get("rows") or []
    for i, r in enumerate(rows):
        for field in ("name", "does", "effect"):
            if not (r.get(field) or "").strip():
                bad(where, f"tools.rows[{i}] has no {field!r}")


def check_media(where: str, a: dict) -> None:
    media = a.get("media")
    if not media:
        return
    plate = media.get("plate")
    if not plate:
        return
    if not plate.startswith("/"):
        bad(where, f"media.plate {plate!r} must be a root-relative path")
        return
    if not (REPO_ROOT / plate.lstrip("/")).is_file():
        bad(where, f"media.plate {plate} does not exist on disk")
    if not media.get("alt"):
        bad(where, "media.plate has no alt text")


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--check", action="store_true",
                    help="accepted for symmetry with the other tools; this script "
                         "never writes")
    ap.parse_args()

    if not REGISTRY.is_file():
        print(f"error: {REGISTRY.relative_to(REPO_ROOT).as_posix()} is missing",
              file=sys.stderr)
        return 2

    try:
        data = json.loads(REGISTRY.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        print(f"error: registry.json is not valid JSON — {exc}", file=sys.stderr)
        return 2

    writeup_slugs: set[str] = set()
    if PROJECT_INDEX.is_file():
        try:
            writeup_slugs = {p.get("slug") for p in
                             json.loads(PROJECT_INDEX.read_text(encoding="utf-8"))}
        except json.JSONDecodeError:
            bad("content/projects/index.json", "is not valid JSON")

    domain_ids, pattern_ids = check_vocabularies(data)

    # A TODO left in a shipped record is a claim nobody checked.
    for path, value in walk_strings(data):
        if value.strip().upper().startswith("TODO"):
            bad(path, "starts with TODO — fill it in or remove the field")

    seen_no: dict[int, str] = {}
    seen_slug: set[str] = set()
    agents = data.get("agents", [])

    for a in agents:
        slug = a.get("slug") or "<no slug>"
        where = f"agents/{slug}"

        no = a.get("no")
        if not isinstance(no, int) or no < 1:
            bad(where, f"'no' must be a positive integer, got {no!r}")
        elif no in seen_no:
            bad(where, f"accession number {no} is already used by {seen_no[no]}. "
                       f"Numbers are permanent and never reused.")
        else:
            seen_no[no] = slug

        if not a.get("slug"):
            bad(where, "no slug")
        elif not SLUG_RE.match(a["slug"]):
            bad(where, f"slug {a['slug']!r} is not lower-case-kebab")
        elif a["slug"] in seen_slug:
            bad(where, "duplicate slug")
        else:
            seen_slug.add(a["slug"])

        if not a.get("title"):
            bad(where, "no title")
        if not a.get("oneLine"):
            bad(where, "no oneLine — it is the register row's only description")

        if a.get("status") not in STATUSES:
            bad(where, f"status is {a.get('status')!r}; expected one of {sorted(STATUSES)}")

        if a.get("domain") not in domain_ids:
            bad(where, f"domain {a.get('domain')!r} is not in domains[]. A typo here "
                       f"drops the record out of its own schedule row silently.")

        pats = a.get("patterns") or []
        if not pats:
            bad(where, "no patterns")
        for pid in pats:
            if pid not in pattern_ids:
                bad(where, f"pattern {pid!r} is not in patterns[]")

        steps = ((a.get("loop") or {}).get("steps")) or []
        if not 3 <= len(steps) <= 8:
            bad(where, f"loop.steps has {len(steps)} entries; 3-8 keeps records "
                       f"comparable to each other")

        if not a.get("autonomy"):
            bad(where, "no autonomy line — what this agent can change in the world is "
                       "the first thing a reader needs")
        if not a.get("limits"):
            bad(where, "no limits")

        check_provenance(where, a)
        check_evaluation(where, a)
        check_links(where, a, writeup_slugs)
        check_tools(where, a)
        check_media(where, a)

    register = data.get("register") or {}
    updated = register.get("updated") or ""
    newest = max([a.get("updated") or a.get("added") or "" for a in agents] or [""])
    if newest and updated < newest:
        bad("register.updated", f"is {updated!r} but the newest record is {newest!r}. "
                                f"Bump it.")

    for note in notes:
        print(f"note: {note}")

    if problems:
        print(f"\nregistry.json has {len(problems)} problem(s):")
        for p in problems:
            print(f"  {p}")
        return 1

    used = {p for a in agents for p in (a.get("patterns") or [])}
    covered = {a.get("domain") for a in agents}
    print(f"registry.json: clean — {len(agents)} record(s), "
          f"{len(covered)} of {len(domain_ids)} domains covered, "
          f"{len(used)} of {len(pattern_ids)} patterns in use")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
