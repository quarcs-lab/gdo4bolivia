# Adding data

Every dataset is a **panel**: one row per spatial unit (`geo_id`) and `year`, with one column per variable. Datasets live by spatial scale in `data/<scale>/<dataset>.csv` (+ `.parquet`), are described by a Frictionless datapackage in `metadata/`, and are regenerated from untouched originals in `raw/` by `uv run geo4bolivia build`, which runs the builders in [`builders/`](builders/). How the pieces fit together is explained in [`docs/data-infrastructure.md`](docs/data-infrastructure.md).

The `geo4bolivia` command and the helpers the builders use come from the Python package, which lives in its own repository ([quarcs-lab/geo4bolivia](https://github.com/quarcs-lab/geo4bolivia)) and is installed here by `uv sync`. Adding data changes this repository only: the originals, the metadata and a builder.

> To build an indicator for your own analysis (in Colab, without contributing it), you need none of this. Use `geo.link()`, `geo.zonal()`, `geo.combine()` and `geo.save()`, described in [section 6 of the guide](docs/data-infrastructure.md#6-building-your-own-indicators-with-the-package).

## Add a dataset at an existing scale

1. **Put the originals in `raw/<dataset>/`** and list them in `raw/README.md`. Never edit them. If something must be fixed, fix it in the builder, so the fix is documented and reproducible.
2. **Describe it in `metadata/<dataset>.datapackage.json`.** Copy an existing package (e.g. `metadata/pop.datapackage.json`), or the one `geo.save()` writes, and edit:
   - `name`, `title`, `description`, `geo:categories`, `geo:citation`, `geo:notes`, `geo:updated`
   - `licenses`: the license of the published files. CC BY 4.0 (`LICENSE-DATA`), unless a source requires otherwise
   - `sources`: one entry per source with its full citation (`title`, `path`) and `geo:role` (`original` or `intermediary`). Add `geo:creator`, `geo:homepage`, `geo:license` (`{name, title, path}`, the source's own license) and `geo:attribution` (the credit sentence it asks for)
   - `geo:map`: the headline map of the website, `{"variable": ..., "year": ...}` (add `"classify": "log"` for very skewed variables)
   - one resource per scale with:
     - `path`: the public URL, `https://raw.githubusercontent.com/<repository>/main/<geo:path>`
     - `geo:scale` and `geo:period` (`[first, last]` year)
     - `geo:path` and `geo:parquet`
   - `schema.fields`, in output column order:
     - `geo_id`, with role `id` and the scale's ID pattern
     - `year`, with role `time`
     - optionally the original key, with role `source_key` and `geo:units_column` naming the matching column of `geo/units.csv`
     - every field, keys included, with a `title` (a readable label for plots) and a `description` that says how it was built (definition, unit, source, year)
     - the variables, also with `geo:unit`, `geo:source` and `geo:aggregation`
     - for values stored at nominal years (e.g. an atlas's initial and final periods), `geo:reference_years` with the actual years behind each stored year (see `metadata/sdg01.datapackage.json`)

   Then add the dataset id to `metadata/index.json`.
3. **Write a builder.** Copy the package's template, `geo4bolivia.build._template` ([source](https://github.com/quarcs-lab/geo4bolivia/blob/main/src/geo4bolivia/build/_template.py)), to `builders/<dataset>.py`:
   ```bash
   cp "$(uv run python -c 'import geo4bolivia.build._template as t; print(t.__file__)')" builders/<dataset>.py
   ```
   It reads the raw file, maps its key to `geo_id`, and calls `publish()` and `write_docs()`:
   - map a source code with `ids_from_units(scale, "<units column>")`
   - map names with `geo4bolivia.link(df, scale, on=...)`
   - import the package by its name (`from geo4bolivia import store`, `from geo4bolivia.build.common import ids_from_units, publish, write_docs`) and another builder of the folder relatively (`from .geo import link_ds4bolivia_polygons`)

   Register the builder in `DATASETS` in `builders/__init__.py`: import the module (`from . import <dataset>`) and add `"<dataset>": <dataset>.build`.
4. **Build and check:**
   ```bash
   uv run geo4bolivia build <dataset>
   uv run geo4bolivia validate <dataset>
   uv run pytest
   ```
   `publish()` writes the columns in schema order with schema types. `write_docs()` generates `docs/datasets/<dataset>.md`. `validate` reports any mismatch between the data, the metadata and `geo/`, and `pytest` fails when a dataset listed in `metadata/index.json` has no builder.

   Then look at the result the two ways users will load it. With the package (inside this repository it reads the local files, so it shows what you just built), here for `pop`:
   ```python
   !pip install -q geo4bolivia
   import geo4bolivia as geo

   print(geo.dictionary("pop"))                 # the variables, as the metadata describe them
   geo.map("pop", "pop_density", year=2020)     # the published values on a map
   ```
   [![Open in Colab](https://colab.research.google.com/assets/colab-badge.svg)](https://colab.research.google.com/notebooks/empty.ipynb)

   And by plain URL, once the files are pushed:
   ```python
   import pandas as pd
   import plotly.express as px

   BASE = "https://raw.githubusercontent.com/quarcs-lab/gdo4bolivia/main/"
   df = pd.read_csv(BASE + "data/municipality/pop.csv")
   px.histogram(df[df.year == 2020], x="pop_density", title="Population density, 2020")
   ```
   [![Open in Colab](https://colab.research.google.com/assets/colab-badge.svg)](https://colab.research.google.com/notebooks/empty.ipynb)
5. **Optional: add it to the website.** The `create-indicator-website` skill (`.claude/skills/`) does this end to end. By hand:
   - render the headline map and the card with `uv run python scripts/indicator_map.py <dataset>`
   - add an `indicator` entry to `CONTENT_REGISTRY` in `site/src/content.js` (copy an existing one)
   - preview it with `npm run --prefix site preview`

   The page reads the variables, sources and licenses from the metadata; the build writes its JSON-LD `Dataset` (without download URLs), its interactive-map data and its search entry.

### Aggregation rules (`geo:aggregation`)

| Rule | Use for | Example |
| --- | --- | --- |
| `sum` | counts and totals that add up across units | population, GDP, zonal sums of lights |
| `weighted_mean:<field>` | rates and averages, weighted by another field of the dataset, or of the dataset that the package property `geo:weights` names | a poverty rate weighted by a `pop` field; the SDG indicators, weighted by `population` from `sdg` |
| `mean`, `min`, `max` | unweighted summaries (use with care) | — |
| `none` | values that cannot be aggregated without extra data | logs, HP trends, per-capita values without population |

`geo.aggregate()` and `geo.combine()` use these rules to move data up the hierarchy. `aggregate()` raises an error for `none` variables requested explicitly and otherwise leaves them out with a warning; `combine()` drops them with a warning. An explicit rule (`rules=`) keeps them.

## Add a new spatial scale

Scales are registered in [`geo/scales.yaml`](geo/scales.yaml). `municipality_ine` and `grid10k` are already reserved (`status: planned`).

- **Administrative scales** nest by prefix: `BO-04-17-04` lies in province `BO-04-17`.
  1. Put the boundaries in `raw/boundaries/`.
  2. In `builders/geo.py`, add their units (`geo_id`, `scale`, `name`, `parent_id`) and their layer. The package's helpers do most of it: `geo4bolivia.build.gadm` (`from_gadm`, or `gadm_units` from GADM codes alone) does this for any GADM file, and `geo4bolivia.build.geoboundaries` (`from_polygons`, or `from_geoboundaries` for geoBoundaries files) builds every layer from a polygon file of the finest scale and a `key -> geo_id` lookup, cleaning and simplifying it as a coverage.
  3. Set `status: active`. `publish_geo()` (`geo4bolivia.build.common`) then adds the `<scale>_id` column and the crosswalks to every coarser scale.
- **Groupings** (unions of whole units of another scale, e.g. statistical regions made of whole departments) set `children:` to the scale they group. They then nest exactly and work with `geo.aggregate()`.
- **Grids, custom zones and historical boundaries** do not nest. Give them an `id_pattern` such as `^BO-G10K-r\d{3}c\d{3}$` and boundaries in `geo/boundaries/<scale>.parquet`. Use `geo.overlay()` / `geo.overlay_weights()` to move data onto or off them with area weights.

### Add a municipality map of another vintage

Bolivia keeps creating municipalities and indigenous autonomies. Since version 0.4 the `municipality` scale is SDSN Bolivia's map of 2025 (343 units, the units of the SDG Atlas 2026), which replaced GeoBolivia's 2015 map (339). The switch kept every published ID meaningful: the 339 units kept their geo IDs and the four new ones were numbered after the last municipality of their province (a new province where INE created one). A future map can be adopted the same way when its new units are carved out of existing ones:

1. **Boundaries.** Put the official map in `raw/boundaries/<source><year>/` unedited, with an INE code per polygon, and document it in `raw/README.md` (source, license, citation).
2. **Match it.** Write a one-off script like `scripts/match_municipalities343.py` that matches the map to the current geo IDs by INE code, numbers the new units, compares each polygon with its old one (area overlap) and flags the units whose territory `changed`. Review its lookup (`raw/lookups/municipalities<N>.csv`) by hand.
3. **Build.** Point `builders/geo.py` at the new map and lookup (new provinces go in `NEW_PROVINCES`), and update `N_MUNICIPALITIES`, the scale's label in `geo/scales.yaml` and `tests/test_project.py`.
4. **Data on the old polygons.** Datasets computed on the previous polygons (here `pop`, `ntl`, `emb`, `embpw`, from DS4Bolivia) apply only to units whose territory did not change: `link_ds4bolivia_polygons()` in `builders/geo.py` keeps those and drops the rest. Recompute such datasets on the new polygons when their rasters are available.
5. **Website.** Regenerate `site/data/` (`scripts/web_boundaries.py`) and every map and card; rename the page IDs if they carry the unit count, with `REDIRECTS` from the old ones.

When a map cannot keep the IDs (e.g. municipalities merged or redrawn wholesale), add it as its own scale instead: `municipality_ine` is reserved for an INE map, with IDs `BO-INE-DDPPMM`. Register it in `geo/scales.yaml` (`status: active`, `parent: null` unless every unit lies at least 99.5% inside one province), add its units and layer in `builders/geo.py`, link it to `municipality` with `geo.overlay_weights("municipality", "municipality_ine", id_col="geo_id")` and `geo.overlay()`, and give datasets on it a resource with `geo:scale: municipality_ine`.

After any change: `uv run geo4bolivia build && uv run geo4bolivia validate && uv run pytest`.
