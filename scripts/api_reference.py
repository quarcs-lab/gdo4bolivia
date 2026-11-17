"""Write the package's function reference for the website (site/data/api.json) from its docstrings.

Generic: it reads the package named in project.yaml. Run after changing a public
function or its docstring; tests/test_core.py fails while the file is stale.

    uv run python scripts/api_reference.py          # write site/data/api.json
    uv run python scripts/api_reference.py --check  # exit 1 if it is out of date
"""

from __future__ import annotations

import importlib
import inspect
import json
import re
import sys
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "site/data/api.json"

# The tutorial's order: find and understand the data, load it, work with it, move it, build, analyse
FAMILIES = [
    ("Discover", "Find datasets and variables and read their documentation.",
     ["datasets", "search", "info", "dictionary", "reference_years", "cite"]),
    ("Load", "Panels, units, boundaries and crosswalks, from GitHub or a local checkout.",
     ["load", "units", "boundaries", "crosswalk", "scales", "ancestors", "scale_of", "config"]),
    ("Understand", "Labels, summaries, change between periods and quick maps.",
     ["labels", "describe", "add_names", "change", "map"]),
    ("Move across scales", "Up the hierarchy with each variable's rule, or onto units that do not nest.",
     ["aggregate", "combine", "overlay", "overlay_weights"]),
    ("Build", "Link your own data, extract indicators from rasters, check and save them.",
     ["link", "check", "zonal", "save"]),
    ("Analyse", "Labelled inputs for the companion packages.",
     ["for_expdpy", "for_geometrics"]),
]
SECTION = re.compile(r"^(Parameters|Returns|Raises|Examples|Notes)\n-{3,}\n", re.M)


def _parse(doc: str) -> dict:
    """Summary, body and the numpy-style sections of a docstring."""
    doc = inspect.cleandoc(doc or "")
    parts = SECTION.split(doc)
    head, sections = parts[0].strip(), dict(zip(parts[1::2], (p.strip() for p in parts[2::2])))
    summary, _, body = head.partition("\n\n")
    # the parameter list ends at the first blank line; text after it is the return value or a note
    plist, _, after = sections.get("Parameters", "").partition("\n\n")
    params = []
    for line in plist.splitlines():
        m = re.match(r"^(\*{0,2}\w+(?:, \w+)*) : (.*)$", line)
        if m:
            params.append({"name": m.group(1), "text": m.group(2).strip()})
        elif params and line.strip():
            params[-1]["text"] += " " + line.strip()
    returns, notes = sections.get("Returns", ""), sections.get("Notes", "")
    after = after.strip()
    if after.startswith("Returns ") and not returns:
        returns = after
    elif after:
        notes = (after + "\n\n" + notes).strip()
    return {"summary": " ".join(summary.split()), "body": body.strip(), "params": params,
            "returns": returns, "raises": sections.get("Raises", ""), "notes": notes}


def reference() -> dict:
    package = yaml.safe_load((ROOT / "project.yaml").read_text())["package"]
    sys.path.insert(0, str(ROOT / "src"))
    mod = importlib.import_module(package)
    public = list(mod.__all__)
    placed = [n for _, _, names in FAMILIES for n in names]
    families = [(t, d, [n for n in names if n in public]) for t, d, names in FAMILIES]
    rest = [n for n in public if n not in placed]
    if rest:
        families.append(("Other", "", rest))
    out = {"package": package, "version": mod.__version__, "families": []}
    for title, text, names in families:
        fns = []
        for name in names:
            obj = getattr(mod, name)
            sig = inspect.signature(obj)
            plain = sig.replace(parameters=[p.replace(annotation=inspect.Parameter.empty) for p in sig.parameters.values()],
                                return_annotation=inspect.Signature.empty)
            fns.append({"name": name, "module": obj.__module__.split(".")[-1],
                        "signature": f"{name}{plain}", **_parse(obj.__doc__)})
        out["families"].append({"title": title, "text": text, "functions": fns})
    return out


def main(argv: list[str]) -> int:
    text = json.dumps(reference(), indent=2, ensure_ascii=False) + "\n"
    if "--check" in argv:
        current = OUT.read_text() if OUT.exists() else ""
        if current != text:
            print(f"{OUT.relative_to(ROOT)} is out of date: uv run python scripts/api_reference.py")
            return 1
        return 0
    OUT.write_text(text)
    print(f"wrote {OUT.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
