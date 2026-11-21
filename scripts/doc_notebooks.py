"""A Colab notebook for every Python code block of the repository's Markdown docs.

    uv run python scripts/doc_notebooks.py           # write the notebooks and point the badges at them
    uv run python scripts/doc_notebooks.py --check   # change nothing; exit 1 if anything is out of date

Every ```python block of a tracked Markdown file (README.md, CONTRIBUTING_DATA.md, docs/*.md, the
generated docs/datasets/*.md, ...) that is followed by an "Open in Colab" badge gets a notebook with
exactly its code, notebooks/docs/<doc>/box-<n>.ipynb, and the badge is pointed at it, so it opens the
code ready to run (as the website's code boxes do, site/src/snippets.js). Badges that link to any other
notebook (notebooks/README.md) are left alone. The notebooks are committed: Colab opens them from GitHub.

`geo4bolivia build` rewrites docs/datasets/*.md with badges to a blank notebook, then runs this script
(`after_build` in builders/__init__.py). tests/test_data.py and the website's CI fail while anything is out of date.

Generic, standard library only: the repository and its branch come from project.yaml.
"""

from __future__ import annotations

import json
import re
import subprocess
import sys
import textwrap
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "notebooks" / "docs"
PROJECT = (ROOT / "project.yaml").read_text(encoding="utf-8")


def _setting(key: str) -> str:
    match = re.search(rf"^{key}:\s*(\S+)", PROJECT, flags=re.M)
    if match is None:
        raise SystemExit(f"project.yaml has no {key}")
    return match.group(1).strip("\"'")


REPOSITORY, REF = _setting("repository"), _setting("default_ref")
NAME = re.search(r"^name:\s*(.+)$", PROJECT, flags=re.M).group(1).strip()
BLOB = f"https://github.com/{REPOSITORY}/blob/{REF}/"
COLAB = f"https://colab.research.google.com/github/{REPOSITORY}/blob/{REF}/notebooks/docs/"
COLAB_EMPTY = "https://colab.research.google.com/notebooks/empty.ipynb"
BADGE_IMG = "[![Open in Colab](https://colab.research.google.com/assets/colab-badge.svg)]"

# A ```python fence (possibly indented, as inside a list), its code, then blank lines and a Colab badge
BLOCK = re.compile(
    r"^(?P<indent>[ \t]*)```python[ \t]*\n(?P<code>.*?)^(?P=indent)```[ \t]*\n"
    r"(?P<gap>(?:[ \t]*\n)*)(?P<bindent>[ \t]*)" + re.escape(BADGE_IMG) + r"\((?P<url>[^)]*)\)",
    flags=re.M | re.S,
)


def doc_name(path: str) -> str:
    """notebooks/docs/<doc name>/: README.md -> readme, docs/datasets/sdg.md -> datasets/sdg."""
    stem = path[:-3]
    if stem.startswith("docs/"):
        stem = stem[5:]
    return stem.replace("_", "-").lower()


def notebook(code: str, title: str, doc: str, n: int) -> str:
    link = BLOB + doc
    cells = [
        {"cell_type": "markdown", "metadata": {}, "source": (
            f"# {title}\n\n"
            f"Code block {n} of [{doc}]({link}) ({NAME}), on its own. "
            "Run the cell (Runtime > Run all); it installs what it needs.")},
        {"cell_type": "code", "execution_count": None, "metadata": {}, "outputs": [], "source": code.strip()},
    ]
    nb = {"cells": cells, "metadata": {
        "colab": {"provenance": []},
        "kernelspec": {"display_name": "Python 3", "language": "python", "name": "python3"},
        "language_info": {"name": "python"}}, "nbformat": 4, "nbformat_minor": 5}
    return json.dumps(nb, indent=1, ensure_ascii=False) + "\n"


def ours(url: str) -> bool:
    return url == COLAB_EMPTY or url.startswith(COLAB)


def plan() -> tuple[dict[Path, str], dict[Path, str]]:
    """The wanted notebooks {path: text} and the rewritten docs {path: text}."""
    files = subprocess.run(["git", "ls-files", "*.md"], cwd=ROOT, capture_output=True, text=True,
                           check=True).stdout.split()
    files = [f for f in files if not f.startswith(("notebooks/", "site/node_modules/"))]
    notebooks: dict[Path, str] = {}
    docs: dict[Path, str] = {}
    for doc in files:
        text = (ROOT / doc).read_text(encoding="utf-8")
        heading = re.search(r"^#\s+(.+)$", text, flags=re.M)
        title = re.sub(r"[`*]", "", heading.group(1)).strip() if heading else doc
        count = 0

        def replace(m: re.Match) -> str:
            nonlocal count
            if not ours(m.group("url")):
                return m.group(0)
            count += 1
            rel = f"{doc_name(doc)}/box-{count}.ipynb"
            code = textwrap.dedent(m.group("code"))
            notebooks[OUT / rel] = notebook(code, title, doc, count)
            return m.group(0)[: m.start("url") - m.start(0)] + COLAB + rel + ")"

        new = BLOCK.sub(replace, text)
        if new != text:
            docs[ROOT / doc] = new
    return notebooks, docs


def main(check: bool) -> int:
    notebooks, docs = plan()
    existing = set(OUT.rglob("*.ipynb")) if OUT.exists() else set()
    stale = sorted(existing - set(notebooks))
    changed = sorted(p for p, t in notebooks.items() if not p.exists() or p.read_text(encoding="utf-8") != t)
    edited = sorted(docs)
    rel = lambda p: p.relative_to(ROOT).as_posix()  # noqa: E731
    if check:
        if stale or changed or edited:
            print("docs' Colab notebooks are out of date: run `uv run python scripts/doc_notebooks.py` and commit",
                  file=sys.stderr)
            for p in [*edited, *changed, *stale][:20]:
                print(f"  {rel(p)}", file=sys.stderr)
            return 1
    else:
        for p in stale:
            p.unlink()
        for p in changed:
            p.parent.mkdir(parents=True, exist_ok=True)
            p.write_text(notebooks[p], encoding="utf-8")
        for p in edited:
            p.write_text(docs[p], encoding="utf-8")
        for d in sorted((d for d in OUT.rglob("*") if d.is_dir()), reverse=True):
            if not any(d.iterdir()):
                d.rmdir()
    print(f"docs' Colab notebooks: {len(notebooks)} in {rel(OUT)}/ "
          f"({len(changed)} to write, {len(stale)} to remove, {len(edited)} docs to point at them)"
          + (" [check]" if check else ""))
    return 0


if __name__ == "__main__":
    sys.exit(main("--check" in sys.argv[1:]))
