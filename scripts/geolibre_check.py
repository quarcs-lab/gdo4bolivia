"""Is "Open in GeoLibre" still working? A weekly check of the website's GeoLibre projects.

    uv run --no-project --with geolibre python scripts/geolibre_check.py

The website opens every indicator flagged `geolibre` in site/src/content.js in GeoLibre
(https://geolibre.app) through a project file that site/geolibre.mjs writes at each build. That file
relies on details of GeoLibre that may change, since GeoLibre is young and moves fast, so this script
checks three things and exits 1 with what broke (.github/workflows/geolibre.yml runs it every Monday;
GitHub emails the failure):

1. GeoLibre's side (its main branch on GitHub): the project format version, the viridis ramp, the
   natural-breaks code that site/geolibre.mjs ports (a fingerprint of the functions), the swipe plugin
   and the plugins GeoLibre activates by default (from its Python package).
2. The live site: every project, in every language, loads with CORS, and so does its data, which holds
   the columns the project styles.
3. GeoLibre's Python package opens every project and keeps its layers, classes, swipe and legend.

Generic: the site comes from project.yaml, the indicators from site/src/content.js.
"""

from __future__ import annotations

import hashlib
import json
import re
import sys
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
UPSTREAM = "https://raw.githubusercontent.com/opengeos/GeoLibre/main/"
PROJECT_VERSION = "0.2.0"
# sha256 (first 16 hex) of GeoLibre's naturalClassBreaks + downsampleSortedValues + MAX_NATURAL_BREAK_SAMPLES
# and of interpolateColors + interpolateHexColor (packages/core/src/color-ramp.ts) when site/geolibre.mjs
# ported them. A new value means GeoLibre changed how it classifies: compare, port, update these.
FINGERPRINTS = {"natural breaks": "96b97d1ed3b1ae01", "colour ramp": "a63fdd7566eebafa"}

errors: list[str] = []


def fail(message: str) -> None:
    errors.append(message)
    print(f"  FAIL {message}")


def fetch(url: str) -> tuple[bytes, dict[str, str]]:
    with urllib.request.urlopen(urllib.request.Request(url, headers={"Origin": "https://web.geolibre.app"}), timeout=60) as r:
        return r.read(), {k.lower(): v for k, v in r.headers.items()}


def function_source(text: str, name: str) -> str:
    start = text.index(f"function {name}(")
    return text[start: text.index("\n}\n", start) + 3]


def upstream() -> None:
    print("GeoLibre (main branch)")
    constants = json.loads(fetch(UPSTREAM + "packages/core/src/project-constants.json")[0])
    if constants["PROJECT_VERSION"] != PROJECT_VERSION:
        fail(f"GeoLibre's project version is {constants['PROJECT_VERSION']}, site/geolibre.mjs writes {PROJECT_VERSION}")
    ours = re.search(r"viridis: \[([^\]]+)\]", (ROOT / "site/geolibre.mjs").read_text()).group(1)
    ours = re.findall(r"#[0-9a-f]{6}", ours)
    theirs = next(r["colors"] for r in constants["VECTOR_COLOR_RAMPS"] if r["value"] == "viridis")
    if ours != theirs:
        fail(f"GeoLibre's viridis ramp is {theirs}, site/geolibre.mjs has {ours}")
    if "maplibre-gl-swipe" not in constants["PLUGIN_STATE_IDS"]:
        fail("GeoLibre no longer saves the swipe plugin (maplibre-gl-swipe) in projects")
    ramp = fetch(UPSTREAM + "packages/core/src/color-ramp.ts")[0].decode()
    parts = {
        "natural breaks": function_source(ramp, "naturalClassBreaks") + function_source(ramp, "downsampleSortedValues")
        + re.search(r"const MAX_NATURAL_BREAK_SAMPLES = \d+;", ramp).group(0),
        "colour ramp": function_source(ramp, "interpolateColors") + function_source(ramp, "interpolateHexColor"),
    }
    for name, source in parts.items():
        got = hashlib.sha256(source.encode()).hexdigest()[:16]
        if got != FINGERPRINTS[name]:
            fail(f"GeoLibre changed its {name} code (fingerprint {got}): compare with site/geolibre.mjs, then update FINGERPRINTS")
    types = fetch(UPSTREAM + "packages/core/src/types.ts")[0].decode()
    for needle in ("vectorStyleStops: VectorStyleStop[];", "popup?: LayerPopupConfig;"):
        if needle not in types:
            fail(f"GeoLibre's types.ts no longer has {needle!r}")
    if '"natural-breaks"' not in ramp:
        fail("GeoLibre no longer has the natural-breaks scheme (color-ramp.ts)")
    print(f"  checked project version, viridis, swipe, {len(parts)} fingerprints, the layer style keys")


def indicators() -> list[tuple[str, list[str]]]:
    """(dataset, languages) of every indicator flagged geolibre in content.js."""
    content = (ROOT / "site/src/content.js").read_text()
    datasets = re.findall(r"dataset: '([a-z0-9_]+)', scale: '[a-z0-9]+', geolibre:", content)
    langs = ["en"] + sorted(p.parent.name for p in (ROOT / "site/i18n").glob("*/content.json"))
    return [(d, langs) for d in datasets]


def project_url(site: str, dataset: str, lang: str) -> str:
    return f"{site}geolibre/{dataset}{'' if lang == 'en' else '.' + lang}.geolibre.json"


def live(site: str) -> list[dict]:
    print(f"Live site ({site})")
    projects, data = [], {}
    for dataset, langs in indicators():
        for lang in langs:
            url = project_url(site, dataset, lang)
            try:
                body, headers = fetch(url)
            except Exception as exc:  # noqa: BLE001 - report every failure, keep going
                fail(f"{url}: {exc}")
                continue
            if headers.get("access-control-allow-origin") != "*":
                fail(f"{url}: no Access-Control-Allow-Origin: *")
            project = json.loads(body)
            projects.append(project)
            for layer in project["layers"]:
                source = layer["source"]["data"]
                if source not in data:
                    try:
                        raw, h = fetch(source)
                        data[source] = json.loads(raw)
                        if h.get("access-control-allow-origin") != "*":
                            fail(f"{source}: no Access-Control-Allow-Origin: *")
                    except Exception as exc:  # noqa: BLE001
                        fail(f"{source}: {exc}")
                        data[source] = None
                        continue
                if data[source] is None:
                    continue
                column = layer["style"]["vectorStyleProperty"]
                if not any(isinstance(f["properties"].get(column), (int, float)) for f in data[source]["features"]):
                    fail(f"{url}: {source} has no values of {column}")
    print(f"  {len(projects)} projects, {len(data)} data files")
    return projects


def round_trip(projects: list[dict]) -> None:
    print("GeoLibre's Python package")
    try:
        import geolibre
        from geolibre import Map
        from geolibre import project as gp
    except ImportError:
        fail("geolibre is not installed: run with `uv run --no-project --with geolibre`")
        return
    content = (ROOT / "site/geolibre.mjs").read_text()
    for plugin in gp.DEFAULT_ACTIVE_PLUGIN_IDS:
        if f"'{plugin}'" not in content:
            fail(f"GeoLibre now activates {plugin} by default: add it to activePluginIds in site/geolibre.mjs")
    for project in projects:
        m = Map()
        try:
            m.load_project(project)
        except Exception as exc:  # noqa: BLE001
            fail(f"{project['name']}: geolibre cannot open it ({exc})")
            continue
        back = m.to_project()
        if [l["id"] for l in back["layers"]] != [l["id"] for l in project["layers"]]:
            fail(f"{project['name']}: layers changed when opened")
        for a, b in zip(project["layers"], back["layers"]):
            for key in ("vectorStyleMode", "vectorStyleProperty", "vectorStyleStops"):
                if a["style"][key] != b["style"].get(key):
                    fail(f"{project['name']}: {a['id']} lost its {key}")
        if "plugins" in project and back.get("plugins", {}).get("settings", {}).get("maplibre-gl-swipe") != project["plugins"]["settings"]["maplibre-gl-swipe"]:
            fail(f"{project['name']}: the swipe settings changed when opened")
        if not back.get("legend", {}).get("panelVisible"):
            fail(f"{project['name']}: the legend panel is no longer open")
    print(f"  geolibre {getattr(geolibre, '__version__', '?')} opened {len(projects)} projects")


def main() -> int:
    site = re.search(r"^website:\s*(\S+)", (ROOT / "project.yaml").read_text(), flags=re.MULTILINE).group(1).strip("\"'")
    site = site if site.endswith("/") else site + "/"
    upstream()
    round_trip(live(site))
    print(f"\n{len(errors)} problem(s)" if errors else "\nGeoLibre integration OK")
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
