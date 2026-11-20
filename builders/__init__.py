"""The observatory's builders: they regenerate every published file from ``raw/``.

``uv run geo4bolivia build [geo|<dataset>]`` runs them (the command comes from the
geo4bolivia package, which finds this folder in the checkout). The geo builder runs first:
dataset builders take their geo IDs from ``geo/units``. Register each new dataset builder
in DATASETS (see CONTRIBUTING_DATA.md); the package's generic helpers are in
``geo4bolivia.build`` (``common``, ``gadm``, ``geoboundaries``).
"""

from . import emb, geo, ntl, pop, sdg

build_geo = geo.build
DATASETS = {"pop": pop.build, "ntl": ntl.build, **sdg.BUILDERS, "emb": emb.build, "embpw": emb.build_pw}
