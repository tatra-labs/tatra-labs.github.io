#!/usr/bin/env python3
"""Vendor the static build of tatra-labs/jobs into /project/jobs/ on this site.

The jobs repo ships a zero-dependency static site under `site/` (a treemap in
`index.html` and the Remote Job Explorer in `explore.html`, both loading their
JSON with *relative* paths). That means it can be served unchanged from any
sub-path, so hosting it here is a file copy plus one injected "back to the
portfolio" link per page.

Usage:
    python tools/sync_project_jobs.py [--source PATH] [--check]

    --source  path to a checkout of https://github.com/tatra-labs/jobs
              (default: ../jobs, relative to this repo)
    --check   report what would change and exit non-zero if out of date;
              nothing is written

Re-run this after rebuilding the jobs data pipeline; it wipes and rewrites
`project/jobs/` so deleted upstream payloads do not linger.
"""

from __future__ import annotations

import argparse
import filecmp
import shutil
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
DEST = REPO_ROOT / "project" / "jobs"

BACK_LINK = '<a href="/?tab=projects">&larr; Tatra Labs</a>'

# (file, anchor found in the upstream page, replacement).  The anchor is the
# existing link row inside each page's <h1>, so the injected link inherits the
# page's own styling instead of needing any CSS of ours.
INJECTIONS = {
    "index.html": (
        '<a href="https://github.com/karpathy/jobs">GitHub</a></h1>',
        '<a href="https://github.com/karpathy/jobs">GitHub</a> ' + BACK_LINK + "</h1>",
    ),
    "explore.html": (
        '      <a href="index.html">&larr; Treemap</a>\n',
        '      <a href="index.html">&larr; Treemap</a>\n      ' + BACK_LINK + "\n",
    ),
}


def build(source_site: Path, staging: Path) -> None:
    shutil.copytree(source_site, staging)
    for name, (anchor, replacement) in INJECTIONS.items():
        page = staging / name
        html = page.read_text(encoding="utf-8")
        if BACK_LINK in html:
            continue
        if anchor not in html:
            raise SystemExit(
                f"{name}: upstream markup changed, cannot inject the back link.\n"
                f"  expected to find: {anchor!r}\n"
                f"  update INJECTIONS in {Path(__file__).name}."
            )
        page.write_text(html.replace(anchor, replacement, 1), encoding="utf-8")


def differences(fresh: Path, current: Path) -> list[str]:
    """Relative paths that differ between two trees, as a `git status`-ish list."""

    def relative_files(root: Path) -> set[Path]:
        return {p.relative_to(root) for p in root.rglob("*") if p.is_file()}

    fresh_files = relative_files(fresh)
    current_files = relative_files(current)

    out = [f"missing  {p.as_posix()}" for p in fresh_files - current_files]
    out += [f"stale    {p.as_posix()}" for p in current_files - fresh_files]
    out += [
        f"changed  {p.as_posix()}"
        for p in sorted(fresh_files & current_files)
        if not filecmp.cmp(fresh / p, current / p, shallow=False)
    ]
    return sorted(out)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    parser.add_argument(
        "--source",
        type=Path,
        default=REPO_ROOT.parent / "jobs",
        help="checkout of tatra-labs/jobs (default: ../jobs)",
    )
    parser.add_argument(
        "--check",
        action="store_true",
        help="report drift and exit non-zero instead of writing",
    )
    args = parser.parse_args()

    source_site = args.source.expanduser().resolve() / "site"
    if not (source_site / "index.html").is_file():
        print(f"error: no static build at {source_site}", file=sys.stderr)
        print("       pass --source /path/to/jobs", file=sys.stderr)
        return 2

    staging = DEST.with_name("jobs.staging")
    if staging.exists():
        shutil.rmtree(staging)
    try:
        build(source_site, staging)

        if args.check:
            if not DEST.exists():
                print(f"{DEST.relative_to(REPO_ROOT)} is missing")
                return 1
            drift = differences(staging, DEST)
            if drift:
                print(f"{DEST.relative_to(REPO_ROOT)} is out of date:")
                print("\n".join(f"  {line}" for line in drift))
                return 1
            print(f"{DEST.relative_to(REPO_ROOT)} is up to date")
            return 0

        if DEST.exists():
            shutil.rmtree(DEST)
        staging.rename(DEST)
    finally:
        if staging.exists():
            shutil.rmtree(staging)

    files = [p for p in DEST.rglob("*") if p.is_file()]
    total = sum(p.stat().st_size for p in files)
    print(f"synced {len(files)} files ({total / 1_048_576:.1f} MB) -> {DEST.relative_to(REPO_ROOT)}")
    print("serve the site and open /project/jobs/ to check it")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
