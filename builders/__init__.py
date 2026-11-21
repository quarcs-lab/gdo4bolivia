"""The observatory's builders: they regenerate every published file from ``raw/``.

``uv run geo4bolivia build [geo|<dataset>]`` runs them (the command comes from the
geo4bolivia package, which finds this folder in the checkout). The geo builder runs first:
dataset builders take their geo IDs from ``geo/units``. Register each new dataset builder
in DATASETS (see CONTRIBUTING_DATA.md); the package's generic helpers are in
``geo4bolivia.build`` (``common``, ``gadm``, ``geoboundaries``). The package calls
``after_build`` last (geo4bolivia 0.8.1 and later).
"""

import importlib.util
from pathlib import Path

from . import emb, geo, ntl, pop, sdg

build_geo = geo.build
DATASETS = {"pop": pop.build, "ntl": ntl.build, **sdg.BUILDERS, "emb": emb.build, "embpw": emb.build_pw}


def after_build(target: str) -> None:
    """Give every Python block of the docs, including the dataset docs just written, its Colab notebook."""
    script = Path(__file__).resolve().parents[1] / "scripts" / "doc_notebooks.py"
    spec = importlib.util.spec_from_file_location("doc_notebooks", script)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    if module.main(check=False):
        raise SystemExit("scripts/doc_notebooks.py failed")
