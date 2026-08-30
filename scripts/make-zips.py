#!/usr/bin/env python3
"""Rebuild the downloadable zips from the files git tracks.

    python3 scripts/make-zips.py

  downloads/bloom-app-full.zip      the whole project (minus downloads/)
  downloads/bloom-cycle-page.zip     just the cycle route + everything it imports
  downloads/bloom-trackers-page.zip just the trackers route + everything it imports

The two page zips are for dropping one route into an existing project; the
file lists are worked out by walking the import graph, so they don't drift.
"""

from __future__ import annotations

import re
import subprocess
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DOWNLOADS = ROOT / "downloads"
PREFIX = "bloom-app"
SRC = ROOT / "src"

IMPORT = re.compile(r"""from\s+["']([^"']+)["']|import\(\s*["']([^"']+)["']\s*\)""")

ROUTES = {
    "cycle": ["cycle.tsx", "cycle-styles.tsx", "cycle-classic.tsx"],
    "trackers": ["trackers.tsx", "trackers-styles.tsx"],
}

EXTRA = {
    "cycle": [
        "supabase/migrations/20260829_cycle_intelligence.sql",
        ".env.example",
        "README.md",
    ],
    "trackers": [
        "supabase/migrations/20260830120000_tracker_days.sql",
        ".env.example",
        "README.md",
    ],
}


def resolve(spec: str, from_file: Path) -> list[Path]:
    """Turn one import specifier into real files, or [] when it's external."""
    if spec.startswith("@/"):
        base = SRC / spec[2:]
    elif spec.startswith("."):
        base = (from_file.parent / spec).resolve()
    else:
        return []
    candidates = [base, *[base.with_suffix(s) for s in (".ts", ".tsx", ".css", ".js")]]
    for c in candidates:
        if c.is_file():
            return [c]
    if base.is_dir() and (base / "index.ts").is_file():
        return [base / "index.ts"]
    return []


def walk(entry: Path) -> list[Path]:
    """Everything `entry` pulls in, transitively."""
    seen: set[Path] = set()
    stack = [entry]
    while stack:
        f = stack.pop().resolve()
        if f in seen or not f.is_file():
            continue
        seen.add(f)
        if f.suffix not in {".ts", ".tsx", ".js", ".jsx", ".css"}:
            continue
        for spec in IMPORT.findall(f.read_text(errors="ignore")):
            for dep in resolve(spec[0] or spec[1], f):
                if dep not in seen:
                    stack.append(dep)
    return sorted(seen)


def tracked() -> list[Path]:
    out = subprocess.run(
        ["git", "ls-files"], cwd=ROOT, capture_output=True, text=True, check=True
    ).stdout.split()
    return [
        ROOT / f for f in out if not str(ROOT / f).startswith(str(DOWNLOADS) + "/")
    ]


def write(path: Path, pairs: list[tuple[Path, str]]) -> None:
    seen: set[str] = set()
    with zipfile.ZipFile(path, "w", zipfile.ZIP_DEFLATED) as z:
        for src, name in pairs:
            if name in seen or not src.exists():
                continue
            seen.add(name)
            z.write(src, name)
    print(f"{path.name}: {len(seen)} files, {path.stat().st_size:,} bytes")


def main() -> None:
    DOWNLOADS.mkdir(exist_ok=True)

    full = [(f, f"{PREFIX}/{f.relative_to(ROOT)}") for f in tracked()]
    full.append((DOWNLOADS / "CHANGED-FILES.md", f"{PREFIX}/CHANGED-FILES.md"))
    full.append((DOWNLOADS / "START-HERE.md", f"{PREFIX}/START-HERE.md"))
    write(DOWNLOADS / "bloom-app-full.zip", full)

    for name, routes in ROUTES.items():
        files: list[Path] = []
        for entry in routes:
            for f in walk(SRC / "routes" / entry):
                if f not in files:
                    files.append(f)
        pairs = [(f, f"{PREFIX}/{f.relative_to(ROOT)}") for f in files]
        pairs += [(ROOT / e, f"{PREFIX}/{e}") for e in EXTRA[name]]
        pairs.append((DOWNLOADS / f"COPY-MAP{'' if name == 'cycle' else '-TRACKERS'}.md", f"{PREFIX}/COPY-MAP.md"))
        write(DOWNLOADS / f"bloom-{name}-page.zip", pairs)


if __name__ == "__main__":
    main()
