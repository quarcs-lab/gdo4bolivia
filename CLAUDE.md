# Working with Claude on GDO-Bolivia (the observatory repository)

This guide helps you work effectively with Claude (AI assistant) on the GeoDevelopment Observatory of Bolivia: maintaining its data, analysing them with the `geo4bolivia` package, extending the notebooks, and updating the website.

Since version 0.6 the observatory is **two repositories**:

| Repository | Holds | Website |
| --- | --- | --- |
| **`quarcs-lab/gdo4bolivia`** (this one, the data repository) | `raw/`, `builders/`, `geo/`, `data/`, `metadata/`, `docs/`, `notebooks/`, `scripts/`, `site/`, `tests/` | the observatory, https://quarcs-lab.github.io/gdo4bolivia/ |
| **`quarcs-lab/geo4bolivia`** (the package) | `src/geo4bolivia/`, its tests, its documentation site | the package's documentation, https://quarcs-lab.github.io/geo4bolivia/ (get started, articles, function reference at `reference/`) |

The package reads this repository's published files (from GitHub, or from a local checkout) and provides the `build` and `validate` commands. This repository depends on the package (`geo4bolivia[all]` in `pyproject.toml`) and holds no package code: a change to a function, a docstring or the package's documentation is made in the package repository.

The project belongs to the family of `geo4<country>` projects that started with the **geo4cambodia template** (see `TEMPLATE.md`). **Keep generic code generic.** The generic Python code now lives in the package repository (its `TEMPLATE.md` lists it). What must stay generic here, never hard-coding Bolivia, the repository or the package name: `scripts/indicator_map.py`, the `create-indicator-website` skill and the website's components (`site/src/app.jsx`, `site/src/map.jsx`, `site/build.mjs`). They read the project from `project.yaml`, the metadata and `site/src/content.js`. The builders (`builders/`) are Bolivia-specific by design.

## Read first

| File | What it explains |
| --- | --- |
| `docs/data-infrastructure.md` | How the indicators database works: scales, geo IDs, units, metadata, aggregation rules, loading with and without the package, recipes for building and analysing indicators, an overview of the package |
| `CONTRIBUTING_DATA.md` | Step by step: add a dataset, a spatial scale, or a municipal map |
| `raw/README.md` | Every raw input, the 343-unit map and DS4Bolivia's polygon data, and DS4Bolivia's swapped homonyms |
| `TEMPLATE.md` | The two-repository layout, and what is generic and what is project-specific |
| The package repository (`quarcs-lab/geo4bolivia`; the sibling folder `../geo4bolivia-package`): `CLAUDE.md`, `TEMPLATE.md`, `RELEASING.md` | The package's modules and conventions, the contract between the two repositories, releasing on PyPI |
| https://quarcs-lab.github.io/geo4bolivia/ | The package's documentation: get started, articles that work one question each, and the function reference (`reference/`) with an example per function |

## Working across the two repositories

The observatory is two repositories that change together: a package change often needs the data repository's dependency, examples or website updated, and a data or website change can touch the package's documentation. Both are usually open side by side in one session. **This section is mirrored in `../geo4bolivia-package/CLAUDE.md`; when you change one, change the other.**

| | Data repository | Package repository |
| --- | --- | --- |
| GitHub | `quarcs-lab/gdo4bolivia` | `quarcs-lab/geo4bolivia` |
| Local folder (siblings) | `geo4bolivia/` (its name before the split; not renamed yet) | `geo4bolivia-package/` |
| Holds | `raw/`, `builders/`, `geo/`, `data/`, `metadata/`, the observatory website (`site/`), notebooks | `src/geo4bolivia/`, its tests, its documentation site (`docs/`), the Colab notebooks of the guides |
| Instructions | `CLAUDE.md`, `TEMPLATE.md`, `CONTRIBUTING_DATA.md` | `CLAUDE.md`, `TEMPLATE.md`, `RELEASING.md` |
| Website, deployed on push to `main` | https://quarcs-lab.github.io/gdo4bolivia/ (`pages.yml`) | https://quarcs-lab.github.io/geo4bolivia/ (`docs.yml`) |
| A tag `vX.Y.Z` | freezes the data for `ref="vX.Y.Z"` | publishes the package to PyPI (`release.yml`) |

You are in the **data repository**. The local folder names do not match the GitHub names, so the package does not find the data checkout by itself: in `geo4bolivia-package/`, run its tests and docs build with `GEO4BOLIVIA_DATA_DIR=../geo4bolivia` (or rename the folder to `gdo4bolivia`, after which the package finds it by itself, and update this section in both files and `RELEASING.md`).

**Which repository a change belongs to**

| Change | Made in | Then |
| --- | --- | --- |
| A function, its arguments, docstring, figure or `.interpret()` text | package | its tests and ruff; a release if users should get it (below) |
| The package's documentation (guides, articles, reference examples, `docs/_ipython/.../00-dark.py`) | package | `tools/build_docs.py`, commit `docs/_freeze`; push deploys it |
| The build helpers (`geo4bolivia.build`), the validator, the CLI | package | also `validate` and `pytest` in the data repository |
| Raw inputs, builders, metadata, published data, `geo/` | data | `build`, `validate`, `pytest`; no release (the package reads `main`). If numbers quoted in the package's docs change, re-run those pages there |
| The observatory website, indicator pages, notebooks | data | `npm run --prefix site preview` |
| The geo4bolivia page on the website (`CONTENT_REGISTRY` entry and its snippets) | data | keep it in line with the package after a release that changes what it shows |
| Fields both `project.yaml` files have | both | keep them equal: the package bundles its own copy into the wheel |
| The shared look: Altiplano palette, Inter, the night-sky background | both | `site/src/styles.css` (data) and `docs/g4-common.scss` (package) |
| The geo4bolivia card | package draws it (`tools/build_images.py`, `hero-card.webp`) | copy it to the data repository as `images/tools/geo4bolivia-package.webp` |

**Developing across both before a release.** To try the data repository on an unreleased package, add `[tool.uv.sources]` `geo4bolivia = { path = "../geo4bolivia-package", editable = true }` to its `pyproject.toml` and `uv sync`; never commit it. Run the data repository's `validate` and `pytest` before raising its dependency to an unreleased version (uv cannot resolve it until it is on PyPI).

**Releasing `vX.Y.Z` (the order matters).** Pushing, tagging and publishing are outward steps: ask the user first. Find every version string with `grep -rn 'X\.Y\.Z' --exclude-dir={.venv,_site,_freeze,dist} .` in each repository.

1. Package: `version` in `pyproject.toml`, `__version__` in `src/geo4bolivia/__init__.py`, `CITATION.cff`; `ref="vX.Y.Z"` and the citation in `README.md` and `docs/index.qmd`; date the entry in `docs/changelog.qmd`; `uv lock`; tests and ruff; `tools/build_docs.py`; build and test the wheel in a clean environment (`RELEASING.md`); commit "Release X.Y.Z: ...", tag, push `main` and the tag. The tag publishes to PyPI.
2. Data, once PyPI has it: `geo4bolivia[all]>=X.Y.Z` and `version` in `pyproject.toml`, `CITATION.cff`, `ref="vX.Y.Z"` in `README.md`, `CLAUDE.md` and `docs/data-infrastructure.md`; `uv lock --refresh-package geo4bolivia` (retry for a minute while PyPI indexes it), `uv sync`, `validate`, `pytest`; commit "Depend on geo4bolivia X.Y.Z: ...", tag, push `main` and the tag.
3. Check `gh run list` in both (CI, Docs, Release, Pages) and the live sites.

**A change of the data layout** (a renamed scale, moved files, as in 0.8.0 when `municipality` became `map343` and `map339`) reverses the first two steps: the released package reads the data repository's `main`, and the package's docs build reads it too, so push the data repository's `main` first (still depending on the previous package), then release the package, then raise the data repository's dependency and tag it. Released versions that do not pin `ref=` break in between, so do it in one sitting, and say so in the changelog.

A push carrying many re-executed `docs/_freeze` pages can fail with "the remote end hung up unexpectedly": retry with `git -c http.postBuffer=524288000 push origin main`.

## Quick start prompts

```
"Load multidimensional poverty (sdg1_2_mpi) in 2012 and 2024 with geo4bolivia,
map both periods in common Fisher-Jenks classes and then their change (geo.map),
and report Moran's I and the LISA clusters of 2024 (geo.moran, geo.lisa)."
```

```
"Test beta-convergence of the Sustainable Development Index (sdg, index_sdg)
across the 343 municipalities, ~2012 to ~2024, with geo.beta_convergence, and
compare the OLS estimate with the spatial Durbin one (model="sdm")."
```

```
"Add a new dataset at the municipality scale from raw/<dataset>/, following
CONTRIBUTING_DATA.md, and register it on the website."
```

## Project structure

- **`project.yaml`**: project identity. Holds the name, the package name, the GitHub repository (`quarcs-lab/gdo4bolivia`) and default ref, the country codes (`BO`, `BOL`), the equal-area CRS (an Albers projection fitted to Bolivia), the default view of `geo.map()`, the catalog file name and the website maps' settings (`site:`). The package bundles its own `project.yaml` into the wheel; inside this checkout it reads this file on top of its own, so keep the fields they share equal.
- **The Python packages.** `geo4bolivia` is the way into the data and, since version 0.6, runs the fundamental analyses itself: exploring, maps and spatial dependence, convergence, transitions and mobility, inequality, regression, panel and spatial models, and MGWR. Each analysis is one call that returns a result object with `.fig` (Plotly), `.df`, `.gt` and `.interpret()`. `expdpy` (panels) and `geometrics` (space) are companions for specialised methods; `geo.for_expdpy()` and `geo.for_geometrics()` prepare their inputs. On the website the packages are cards of Indicators & tools with a page each (`type: 'package'` entries of `CONTENT_REGISTRY`). The geo4bolivia page is short (what it does, how to install it, one example) and links to the package's documentation site for the guides and the function reference. The website has no function reference of its own and nothing on it is generated from docstrings.
- **`site/`**: the website, built by `site/build.mjs` (Node: esbuild, Tailwind CLI, sharp; pinned in `site/package.json`) into `_site/` and deployed by `.github/workflows/pages.yml` (Pages source: GitHub Actions). `_site/` is never committed.
  - `src/content.js`: the site's constants and the `CONTENT_REGISTRY` (plain data, no JSX); `src/app.jsx`: components and the path router; `src/map.jsx`: the interactive indicator map (Leaflet, a lazy chunk); `src/styles.css`, `tailwind.config.cjs`, `template.html`.
  - The build pre-renders a page per route (`<section>/<id>/index.html`, with its own title, description, preview image and JSON-LD), `404.html` and `sitemap.xml`, and writes `assets/data/<dataset>.json` (map values from `data/`) and `assets/search.json` (items and every variable).
  - `data/{municipality,department,country}.geojson`: the maps' boundaries (SDSN Bolivia's 2025 municipal map, simplified), keyed by `geo_id`; generated by `scripts/web_boundaries.py`.
- **`raw/`**: original inputs. Never edit them; fixes belong in the builders.
- **`builders/`**: the observatory's builders, the code that regenerates every published file from `raw/`. `uv run geo4bolivia build` (the package's command) imports this folder from the checkout and runs it. The contract with the package: `builders/__init__.py` defines `build_geo` (a function that writes `geo/`) and `DATASETS` (`{dataset id: function}`). Builders import the generic helpers from the package by name (`from geo4bolivia.build.common import publish, write_docs`) and each other relatively (`from .geo import link_ds4bolivia_polygons`).

  | File | Builds |
  | --- | --- |
  | `__init__.py` | the registry: `build_geo` and `DATASETS` |
  | `geo.py` | `geo/`: units, boundaries and crosswalks of every active scale, from SDSN Bolivia's 343-unit map (map343), DS4Bolivia's 2015 polygons (map339) and the lookups in `raw/lookups/`, plus the crosswalk `map339__map343`; also `link_ds4bolivia_polygons()`, which gives polygon-based data their map339 geo IDs |
  | `sdg.py` | `sdg` (the IDS, its ranking, census population, urbanization) and `sdg01`…`sdg17` from the Atlas workbook (`BUILDERS`); checks the workbook against the normalisation bounds |
  | `pop.py` | `pop` (with `pop_density`) |
  | `ntl.py` | `ntl` |
  | `emb.py` | `emb` (`build`) and `embpw` (`build_pw`) |

  The generic helpers (`geo4bolivia.build.common`, `.gadm`, `.geoboundaries`), the builder templates (`geo4bolivia.build._template`, `._geo_template`) and every other module of the package are documented in the package repository's `CLAUDE.md`.
- **`geo/`**: the spatial backbone.
  - `scales.yaml`: the scale registry, edited by hand.
  - `units.csv/.parquet`, `boundaries/<scale>.geojson/.parquet`, `crosswalks/<from>__<to>.csv`: generated.
- **`data/<scale>/<dataset>.csv/.parquet`**: published panels, one row per `geo_id` × `year`. Generated.
- **`metadata/<dataset>.datapackage.json`** + `metadata/index.json`: Frictionless metadata, the source of truth for variables (each field's `title` is its plot label, its `description` how it was built), units, sources (with their licenses and required credits), licenses, reference years, aggregation rules and the headline map (`geo:` properties). The website's indicator pages read it directly.
- **`docs/datasets/*.md`**, **`data/README.md`**, **`definitions_gdo-bolivia.csv`**: generated from the metadata.
- **`tests/test_data.py`**: the published files validate and every dataset has a builder. **`tests/test_project.py`**: Bolivia facts. The package's generic tests (loading, aggregation, the analyses) are in the package repository and run against this repository's files.
- **`scripts/match_municipalities343.py`**: one-off matching of SDSN Bolivia's 343-unit map (2025) to the geo IDs by INE code, with the new units' IDs, names and the `changed` flag (`raw/lookups/municipalities343.csv`; it read the 339-unit `geo/` of version 0.3). **`scripts/web_boundaries.py`**: simplifies `geo/boundaries/` for the website (`site/data/*.geojson`). **`scripts/match_municipalities.py`**: one-off matching of the GADM municipality codes to DS4Bolivia (`raw/lookups/municipalities339_gadm.csv`; rerunning it needs the GADM file, no longer in the repo). **`scripts/indicator_map.py`** (generic): the indicator pages' headline maps and cards, three Fisher–Jenks classes on the `site/data/` boundaries over Esri's keyless World Dark Gray Canvas; with `geo:map` `panels` the page map shows each period side by side in classes pooled over both (settings in `project.yaml` `site:`, which also holds the five-class `ramp` of the interactive maps and the `boundary_credit`). **`scripts/site_images.py`**: renders the website's other images. **`scripts/project_images.py`**: the Projects cards (`images/projects/`) and pillar, from pictures drawn in ChatGPT with its `PROMPTS` (Bolivian places only, no maps or borders); any map on a card is drawn by the script from the official `site/data/` boundaries. **`scripts/new_project.py`** + `scripts/template/*.tpl`: the template generator; it still writes the one-repository layout of version 0.5 (see `TEMPLATE.md`).
- **`notebooks/`**: Colab notebooks paired with MyST `.md` files through jupytext. They load the data with geo4bolivia and run their analyses with its functions (`geo.map`, `geo.moran`, `geo.lisa`, `geo.beta_convergence`, `geo.inequality`, `geo.mgwr`, ...), keeping other libraries for what the package does not cover.
  - `geo4bolivia_quickstart`: the package tutorial (discover, load, understand, change, scales, link, raster, save).
  - `three_packages`: one question (did the IDS converge, ~2012 to ~2024?) answered with geo4bolivia, then taken one specialised step further with expdpy and with geometrics.
  - `eda`, `esda`, `esda_dependence`, `esda_inequality`, `esda_heterogeneity`, `eda_esda`: ported from DS4Bolivia, on multidimensional poverty (`sdg1_2_mpi`, 2012 and 2024) and night-time lights (339 units of map339).
  - `embeddings_mpi_ml`: predicting poverty from satellite embeddings (scikit-learn, xgboost).
  - `sdg_dynamics`: change, convergence, rank mobility and spatial dynamics of the SDG Atlas 2026, ~2012 to ~2024.
  - The notebooks of the package's own guides and articles are in the package repository (`notebooks/` there), not here.
- **`apps/`**: Google Earth Engine app source (`.js`).
- **`code/`**: pointers to data-preparation code.
- **`images/`**: site assets.
- **`.claude/skills/create-indicator-website/`**: the skill that turns a dataset and its information into an indicator page (generic; port it with the template).
- **Licenses**: code MIT (`LICENSE`), data CC BY 4.0 (`LICENSE-DATA`), except where a source requires otherwise. The boundaries of map343 and of every coarser scale (`geo/boundaries/`, `site/data/`, every map) come from SDSN Bolivia's municipal map of 2025, which states no open license and is used and shared with SDSN Bolivia's permission; credit it as "SDSN Bolivia (2025). Límites Municipales Bolivia 2025 [Archivo shapefile]. https://sdsnbolivia.org/datos-espaciales/". map339's come from GeoBolivia's municipal map of 2015 as geoBoundaries publishes it (gbOpen BOL ADM3, public domain; credit geoBoundaries, Runfola et al. 2020). `project.yaml` `site.boundary_credit` gives each map's credit. No GADM geometry is in the repository since version 0.2; GADM's codes and names stay as source keys (`gid`, `name_gadm`). The SDG Atlas 2026 states no open license either and is used with SDSN Bolivia's permission.
- `geo4cambodia/` and `ds4bolivia/` at the root, if present, are local reference clones. They are ignored by git and pytest; never edit or commit them.

## Environment setup (uv)

```bash
uv sync                                    # the geo4bolivia package with every extra + the notebooks' and builders' libraries
uv run geo4bolivia build [geo|<dataset>]   # regenerate geo/, data/, docs/ from raw/ (runs builders/)
uv run geo4bolivia validate                # check IDs, schemas, nesting, URLs, CSV = Parquet
uv run geo4bolivia list                    # datasets x scales x years
uv run geo4bolivia search poverty          # find variables; `info <dataset>` describes a dataset
uv run pytest                              # tests/test_data.py + tests/test_project.py
uv run jupyter lab notebooks/              # open notebooks
uv run jupytext --sync notebooks/*.ipynb   # re-pair after editing a notebook
uv add --group analysis <package>          # add a notebook library (commit uv.lock)
npm ci --prefix site                       # website build tools (once)
npm run --prefix site preview              # build with base / and serve at http://localhost:8765/
npm run --prefix site build                # build _site/ for the Pages URL (CI adds --full)
uv run python scripts/web_boundaries.py    # regenerate the website's boundaries (site/data/) from geo/boundaries/
```

- Always use `uv run` for Python and Jupyter.
- **Where the package comes from.** `pyproject.toml` describes a project that is not published (`gdo4bolivia`, `package = false`) and depends on `geo4bolivia[all]>=0.7.2`, normally from PyPI. While a version is in development, `[tool.uv.sources]` points the dependency at a sibling checkout of the package, installed editable (`geo4bolivia = { path = "../geo4bolivia-package", editable = true }`), so edits there take effect here at once. That block is for development only: remove it and run `uv lock` once the version is on PyPI, so a fresh clone installs the released package.
- **Package changes are made and tested in the package repository** (`uv sync --all-extras`, `uv run pytest -n 6 -p no:warnings` and `uv run ruff check src tests` there). Its data tests read this checkout when it sits next to the package under the repository's name (`gdo4bolivia`) or when `GEO4BOLIVIA_DATA_DIR` points to it, and GitHub otherwise. After a package change that touches the build helpers or the validator, also run `validate` and `pytest` here.
- After changing anything in `raw/`, `metadata/`, `geo/scales.yaml` or `builders/`, run `build`, `validate` and `pytest`, and commit the regenerated files.
- **Dependencies.** The rule of a light default install with heavier libraries in extras (`[dynamics]`, `[mgwr]`, `[panel]`, `[raster]`, `[all]`) now belongs to the package repository (its `RELEASING.md`). Here `dependencies` holds only the package; the `analysis` group holds what the notebooks use besides it (matplotlib, seaborn, folium, contextily, splot, scikit-learn, xgboost, jupyter, jupytext, expdpy, geometrics) and the `dev` group what the builders, tests and image scripts need (openpyxl for the Atlas workbook, pytest, pillow). The `constraint-dependencies` (numba, quantecon, giddy) mirror the package's.
- **Versions and releases.** The package is released from its own repository (`RELEASING.md` there). This repository is tagged with the same `vX.Y.Z` at each release, so `ref="v0.7.2"` freezes the data; keep `version` in `pyproject.toml` and `CITATION.cff` equal to the package version. Data changes need no release: the package reads `main` by default.
- In a builder or a script, `geo4bolivia.scales` is the public function `geo.scales()` (a table), not the module; for the registry use `from geo4bolivia.scales import scales as registry`.
- Commit `uv.lock` after changing dependencies. Never commit `.venv/`.
- The notebooks install packages only when they are missing, so they run unchanged in Colab and locally.

## Spatial scales and geo IDs

Every unit has one **geo ID** (`geo_id`). Administrative IDs are numbered as in GADM 4.1 and nest by prefix. **Municipal maps are scales named by their number of units**: `map343` is SDSN Bolivia's municipal map of 2025 (343 municipalities and indigenous autonomies, GAIOC, the units of the SDG Atlas 2026), `map339` GeoBolivia's map of 2015 (339 municipalities, via geoBoundaries, public domain; DS4Bolivia's polygons). Both are coverage-cleaned and lightly simplified (~100 m); provinces, departments and the country are exact unions of map343, and map339's units nest in them by ID (`nesting: ids`). The two maps share geo IDs, so a geo ID alone does not say which map: each dataset records its map (`geo:scale`), and the package's spatial functions take `map=`. Source keys are kept as columns in `geo/units.csv`.

| Scale | Units | geo ID | Source keys kept | Datasets |
| --- | --- | --- | --- | --- |
| `country` | 1 | `BO` | `gid` | — |
| `department` | 9 | `BO-04` (La Paz) | `gid` (GADM), `ine_code` (`02`) | — |
| `province` | 113 | `BO-04-17` (Murillo) | `gid`, `ine_code` (`0201`) | — |
| `map343` | 343 | `BO-04-17-04` (Nuestra Señora de La Paz) | `gid` (`GID_3`), `ine_code` (`020101`), `asdf_id` (DS4Bolivia polygon; empty for the 10 changed units), `mun_id` (INE code as integer), `name_ds4bolivia`, `name_gadm` | `sdg`, `sdg01`…`sdg17` (343) |
| `map339` | 339 | `BO-04-17-04` (the same IDs as map343) | the same, `asdf_id` for all 339 | `pop`, `ntl`, `emb`, `embpw` (339) |
| `grid10k` | planned | `BO-G10K-r012c034` | — | — |

- Every unit row carries `<scale>_id` columns for each scale it lies in (`department_id`, `province_id`, ...). A municipality has one row per map, so `geo_id` is unique within a scale, not across `geo/units.csv`.
- `geo/crosswalks/map339__map343.csv` gives the share of each map339 unit's area in each map343 unit (slivers under 1% dropped), to move data between the maps.
- Department and province numbers follow GADM order and **differ from INE codes** (La Paz is `BO-04` here and `02` in INE). GADM skips province index 1 in La Paz, so La Paz provinces run `BO-04-02` to `BO-04-21`.
- **Holes.** The map leaves the salt flats of Uyuni and Coipasa and lakes Poopó and Uru Uru outside every municipality, so they are holes at every scale and `area_km2` excludes them. Lake Titicaca lies outside the country.
- Harmonized names: municipalities follow the SDG Atlas 2026 (e.g. "Nuestra Señora de La Paz"; the SDSN map's fuller name where the Atlas shortens it); departments use DS4Bolivia's spelling; provinces come from `raw/lookups/province_names.csv` (hand-checked; GADM writes names without spaces; SDSN's province names have typos). `name_ds4bolivia` and `name_gadm` keep the older spellings.
- **Municipal maps.** Since version 0.8 every municipal map is its own scale, `map<units>` (until 0.7 the one map was the scale `municipality`, the 343-unit map). The 339 units of the 2015 map (GeoBolivia, numbered as GADM) kept their geo IDs in map343; the four created since (TIOC-Raqaypampa `BO-02-12-04`, San Pedro de Macha `BO-07-04-05`, TIOC-Jatun Ayllu Yura `BO-07-02-04`, TIOC-Territorio Indígena Multiétnico `BO-03-09-01` in the new province `BO-03-09`) are numbered after them. Six municipalities lost territory to them (Colquechaca, Mizque, Porco, Tomave, San Ignacio, Santa Ana): same geo ID, two outlines. Data computed on the 2015 polygons (`pop`, `ntl`, `emb`, `embpw`) are published on map339 for all 339 units. A future map becomes another scale (`map<N>`, with `raw/lookups/municipalities<N>.csv`); see `CONTRIBUTING_DATA.md`. Merging a map339 panel with a map343 panel on `geo_id` works (the IDs are shared), but pandas drops the recorded map, so spatial calls on the result need `map="map339"` or `map="map343"`.
- **DS4Bolivia's swapped homonyms.** San Javier (Beni/Santa Cruz), El Puente (Tarija/Santa Cruz) and Santa Rosa (Beni/Pando): DS4Bolivia attaches each pair's attribute rows (names, INE codes, SDG Atlas 2020 values) to the other polygon. Polygon-based data (`pop`, `ntl`, `emb`, `embpw`) link by `asdf_id`; the SDG Atlas 2026 links by INE code. Evidence in `raw/README.md`; `swapped` flags them in the lookup.
- Municipality names repeat across departments (eight names shared by 17 units: seven pairs and San Pedro three times) and four provinces are called Cercado, so link municipal tables by code (`key="mun_id"`, `"ine_code"` or `"asdf_id"`) rather than by name. `geo.link()` refuses ambiguous names instead of guessing.

## Datasets

| Dataset | Years | Notes |
| --- | --- | --- |
| `sdg` | 2012, 2024 | Atlas de los ODS en Bolivia 2026 (Andersen & Argandoña, SDSN Bolivia): the Sustainable Development Index `index_sdg` (IDS, mean of the 15 goal indices, 0–100) and its ranking `rank_sdg`; census `population` (2012, 2024; `sum`) and `urbanization` (2024; `weighted_mean:population`) |
| `sdg01`…`sdg17` | 2012, 2024 | the Atlas's goals, one dataset per goal (15; none for SDG 12 or 14): the goal index `index_sdgN` (0–100) and its 2–11 indicators `sdg<goal>_<target>_<code>` (81 in all; `sdg1_2_mpi` is multidimensional poverty). **Two periods stored at the nominal years 2012 (~2012) and 2024 (~2024)**; each field's actual years are in `geo:reference_years` (e.g. 2008 and 2023 for the health survey). Normalisation bounds: `raw/lookups/sdg2026_thresholds.csv` (Cuadro 21) |
| `pop` | 2001–2020 | gridded population (WorldPop 1 km, via DS4Bolivia), map339 (339 units); `sum`. `pop_density` (people per km² of the unit's 2015 area); `none` |
| `ntl` | 2012–2020 | `ln_NTLpc` = ln(10⁸ × EOG VIIRS radiance / WorldPop) and its HP trend `ln_t400NTLpc`, map339 (339 units); logs, so `none` |
| `emb`, `embpw` | 2017 | 64 satellite embedding dimensions (A00–A63), area- and population-weighted, map339 (339 units); `none` |

Load one SDG indicator in both periods: `geo.load("sdg01", variables="sdg1_2_mpi")`; one period: `years=2024`; its change per unit: `geo.change(df, "sdg1_2_mpi")`. Every SDG variable but `rank_sdg` aggregates as a census-population-weighted mean (`weighted_mean:population`), and the package loads the weights from `sdg` itself (`geo:weights`): `geo.aggregate(df, to="department", dataset="sdg01")`. These approximate, but are not, the Atlas's department figures.

## Loading, building and analysing

```python
!pip install -q "geo4bolivia[all]"                  # Google Colab; plain geo4bolivia runs all but the lines marked [extra]
import geo4bolivia as geo

# --- find, load, prepare, build
geo.datasets(); geo.dictionary("sdg01")             # catalog; variables with label and description
geo.search("poverty"); geo.info("sdg03")            # find variables; a dataset's documentation
geo.reference_years("sdg03"); print(geo.cite("sdg03"))   # actual years; citation and credits
df  = geo.load("ntl")                               # panel: geo_id, year, variables
mpi = geo.load("sdg01", variables="sdg1_2_mpi", groups=["department"])   # + name, department
geo.describe(mpi); geo.change(mpi, "sdg1_2_mpi")    # labelled summary; change and ranks per unit
gdf = geo.load("ntl", years=2020, geometry=True)    # with boundaries
wide = geo.load("pop", wide="pop")                  # one column per year
geo.units("map343"); geo.boundaries("department"); geo.crosswalk("map339", "map343")   # maps: map343, map339
geo.aggregate(geo.load("pop"), to="department", dataset="pop")       # up the hierarchy (metadata rules)
panel = geo.combine(["ntl", "pop"], scale="map339", extra=[my_panel])   # datasets on one scale
geo.overlay(pop_2020, grid_gdf, extensive=["pop"], id_col="cell")    # non-nested units, area-weighted
mine = geo.link(table, scale="map343", on="mun_id", key="mun_id")   # INE codes -> geo_id
geo.zonal("raster.tif", scale="map343", stats=["sum", "mean"], name="ntl", year=2020)   # [raster]
geo.save(panel, "name", scale="map343", directory="my_data", variables={...})

# --- analyse: the first argument is a dataset id or a panel with geo_id (and year)
# every function but map returns a result with .fig (Plotly), .df, .gt (where a table helps) and .interpret()
geo.correlation("sdg01"); geo.extremes(mpi, "sdg1_2_mpi", year=2024)   # correlations; highest and lowest units
geo.distribution(mpi, "sdg1_2_mpi", by="department")                  # distribution per year or per group
geo.scatter("sdg", "urbanization", "index_sdg", year=2024)            # two variables, with a fitted line
geo.trend("ntl", "ln_NTLpc", by="department")                         # a variable over time
geo.map(mpi, "sdg1_2_mpi", year=[2012, 2024], scheme="fisher_jenks")  # a Plotly figure: both years, common classes
geo.map(mpi, "sdg1_2_mpi", change=True)                               # change between the first and last year
w = geo.weights("map343", method="knn", k=6)                    # optional: every spatial function defaults to queen
geo.connectivity("map343", w)                                   # the neighbour links on a map
geo.moran(mpi, "sdg1_2_mpi", year=2024); geo.lisa(mpi, "sdg1_2_mpi", year=2024, w=w)   # global and local clustering
geo.beta_convergence("sdg", "index_sdg")       # LEVELS (logged internally); two years suffice; model="sdm" adds space
geo.sigma_convergence("pop", "pop")            # LEVELS; needs 3+ years (pop, ntl), not the two-period SDG data
geo.convergence_clubs("ntl", "ln_NTLpc")       # used as given: pass LOGS (or log=True); needs a yearly panel
geo.transitions("ntl", "ln_NTLpc"); geo.spatial_transitions("ntl", "ln_NTLpc")    # Markov chains [dynamics]
geo.lisa_transitions("sdg", "index_sdg"); geo.rank_mobility("sdg", "index_sdg")   # who moved between two years
geo.inequality("sdg", "index_sdg")                                    # Gini and Theil in each year
geo.theil_decomposition("sdg", "index_sdg", by="department")          # between and within departments
geo.regression("sdg", "index_sdg", "urbanization")                    # OLS; fixed_effects=, cluster=
geo.panel_model(panel, "ln_NTLpc", "pop_density")                     # pooled, between, FE, RE, Hausman [panel]
geo.spatial_diagnostics("sdg", "index_sdg", "urbanization")           # is space left in the residuals? which model?
geo.spatial_model("sdg", "index_sdg", "urbanization", model="durbin") # direct, indirect and total impacts
geo.mgwr("sdg", "index_sdg", "urbanization")   # multiscale GWR [mgwr], about a minute; the package has no plain GWR

# --- companions, for specialised methods
gdf, df, df_dict = geo.for_geometrics(ntl_panel)                     # geometrics: LEVELS for beta/sigma convergence (logged internally); LOGS for convergence clubs
df, df_def = geo.for_expdpy("ntl", groups=["department"])            # for expdpy: analyses variables as given
```

- **Use the package's analysis functions first.** Write an analysis by hand with esda, spreg or statsmodels, or hand the data to expdpy or geometrics, only for a method the package does not have (e.g. plain GWR, bivariate LISA, event studies, machine learning). Arguments and results of every function are in the reference, https://quarcs-lab.github.io/geo4bolivia/reference/; check a signature with `help(geo.lisa)` before writing code.
- **Location of the data.** Outside the repo, the package reads from GitHub: `ref=` or `GEO4BOLIVIA_REF` pins a tag or commit (`ref="v0.7.2"`), and `GEO4BOLIVIA_DATA_DIR` points it to a checkout. Inside the repo it reads local files.
- **Without the package**, use the raw URLs, e.g. `https://raw.githubusercontent.com/quarcs-lab/gdo4bolivia/main/data/map339/ntl.csv`.
- **Documentation must always show both ways** of loading: with the package and with plain URLs.

## Updating the website

The landing page has three components: **Indicators & tools** (one section, `#indicators`, whose cards are filtered by type: indicators, packages, notebooks, apps; `#tools` lands there with the tools selected), **Projects** and **Insights** (plus Events once it has items). Indicator and tool pages keep their own paths, `indicators/<id>/` and `tools/<id>/`.

All content is data in the `CONTENT_REGISTRY` array in `site/src/content.js`. To add an item:

1. Add an object with these fields, copying an existing entry of the same type for the type-specific fields:
   - `id`, `type` (`indicator` | `package` | `notebook` | `app` | `project` | `insight` | `event`), `section` (`indicators` | `tools` | `projects` | `insights` | `events`); `type: 'project'` goes with `section: 'projects'`
   - `title`, `summary`, `description`, `tags`
   - `image`, `imageAlt`
   - `date`, `pinned`
2. Put images in `images/<section>/` as WebP, at most 1600 px wide. Indicator maps and cards are rendered by `uv run python scripts/indicator_map.py <dataset>`; the other cards by `uv run python scripts/site_images.py`.
3. The item automatically gets a card, a pre-rendered page at `<website><section>/<id>/` (title, description, preview image from its card, JSON-LD), a sitemap entry and a place in the search. Old `#/<section>/<id>` links redirect there.
4. Check it with `npm run --prefix site preview`; pushing to `main` deploys it.
5. Type-specific fields:
   - **New indicator:** use the **`create-indicator-website` skill** (`.claude/skills/`), which runs the whole workflow: data, metadata, approved dictionary and licenses, map, page, checks, commit. By hand: add the data (see `CONTRIBUTING_DATA.md`) with a `title` (plot label) and a construction `description` for every column, the sources' licenses and a `geo:map` (headline variable and year). Run `scripts/indicator_map.py`. Then set `dataset` (or `datasets`), `key: 'geo_id'`, `idExample`, `map` and `mapAlt` (the page's map), `image` and `imageAlt` (the card), and `code` with the tabs `python` (package) and `pandas` (plain URL). The build writes the page's `Dataset` JSON-LD (without `distribution`) and its interactive-map data.
   - **Indicator pages** (`IndicatorDetail`) show the headline map, About (with the original source), an interactive map of any variable and year, or of its change between the first and last year (`site/src/map.jsx`, five Fisher–Jenks classes, logs for very skewed positive variables; change classes split at zero), Variables (name, label, description), the code, License, Cite this dataset (APA + BibTeX of the dataset, then the sources' required credits) and References. Variables, sources, licenses, citations and references are fetched from `metadata/<dataset>.datapackage.json`, so edit the metadata, not the page. There is deliberately no download section and no link to the data folders: redistribution rights are being cleared.
   - **Package:** `scope` (the pip command), `install`, `quickstart` (code tabs), optionally `features` (`{title, fns, text}`) and `links` (kinds `colab`, `docs`, `pypi`, `github`); copy an existing entry. Keep the geo4bolivia page short: what the package does, how to install it, one example and links to its documentation site (https://quarcs-lab.github.io/geo4bolivia/), PyPI and its repository. Guides, articles and the function reference belong on the documentation site, in the package repository; do not copy them into the website.
   - **Project:** `links` (kind `external`, first one is the "Visit" button; `[]` shows "website coming soon"), optionally `team`, `status`, `citation`, and `related`. Its card image: draw the picture in ChatGPT from a prompt added to `PROMPTS` (Bolivia only, no maps, outlines or borders), save it as `gdo-<id>.png`, then `uv run python scripts/project_images.py [folder]`; describe the picture in `imageAlt`. Write the description only from the project's own website or the user's information.
   - **Insight:** add only published work whose DOI and abstract you have checked, with its full citation. The Projects, Insights and Events sections (and their nav links) appear automatically once they have at least one item.

**Every code box assumes Google Colab.**
- Each Python snippet on the website (indicator tabs, package quickstarts, the build example) starts with a runnable `!pip install -q <what it needs>`. The same goes for code blocks in README and docs.
- Install `geo4bolivia` (plus `expdpy` or `geometrics` when used). Name the extra a snippet needs: `"geo4bolivia[raster]"` for `geo.zonal()`, `[dynamics]` for `geo.transitions()` and `geo.spatial_transitions()`, `[mgwr]` for `geo.mgwr()`, `[panel]` for `geo.panel_model()`.
- Plain-URL snippets that only use pandas, geopandas or plotly need no install line, since Colab has them.
- **Every snippet shows its result as an interactive Plotly Express figure** (`import plotly.express as px`), with the simplest syntax: data, `x`/`y`/`color`, plus only `hover_name` (unit names), `labels={...}` and `title`; no custom colours or templates. Maps use `px.choropleth_map(gdf, geojson=gdf.geometry, locations=gdf.index, color=..., hover_name="name", center={"lat": -16.3, "lon": -64}, zoom=4)` with a continuous scale. Use long tables (`groupby(..., as_index=False)`, department names via `.map()`) rather than `unstack()`. Only the last expression of a Colab cell displays, so add `.show()` to any other figure. Keep lines within about 84 characters so they fit the website's code box. A snippet that runs one of the package's analyses ends with the result's own figure instead (`res.fig`, or the figure `geo.map()` returns), after `print(res.interpret())` where the reading helps: those figures are Plotly already. The geometrics and expdpy quickstarts keep their own `.fig` for the same reason.
- There are no R or Stata examples.
- Maintainer commands (`uv ...`, releasing) stay as terminal commands.
- Every Python code box links to a blank notebook, `https://colab.research.google.com/notebooks/empty.ipynb`. On the website it is an "Open in Colab" button in the box's footer bar (`CodeBlock`'s `colab` prop; `CodeTabs` sets it). In README and docs (including generated dataset docs) it is the Colab badge below each Python block. Not for BibTeX or terminal commands.

Design tokens are defined in `site/tailwind.config.cjs`, in the **Altiplano palette** (the night over the Salar de Uyuni, Laguna Verde, Laguna Colorada's flamingos): `lagoon-950…500` backgrounds, `salt-100…700` text greys, `brand-rose` (#d1405a, buttons, with white text), `brand-flamingo` (#ff8597, accent text), `brand-turquoise` (#5ad6c6, highlights and links) and `sand-200…400` (packages). Content types have their own hues: indicators teal, packages sand, notebooks violet, apps orange, projects sky, insights rose, events emerald. `scripts/site_images.py` uses the same colours: `SITE_PALETTE` is the maps' lagoon-to-flamingo ramp. The emblem (`images/logo/`) is drawn by the same script: the nine departments shaded by multidimensional poverty inside a satellite's orbit. The page background is the Altiplano's night sky, fixed behind the content: faint stars over a blue-to-teal gradient (`body::before` in `site/src/styles.css`, the same as the package documentation's dark theme); the root wrapper is transparent so it shows, and opaque sections such as the hero sit on top of it. Keep text contrast at WCAG AA or better, keep `prefers-reduced-motion` working, and give every image meaningful `alt` text.

## Preferred libraries

**geo4bolivia** first: use its functions for everything they cover (loading, maps, spatial dependence, convergence, transitions, inequality, regression, panel and spatial models, MGWR). Then pandas, geopandas and plotly for data handling and other figures; libpysal, esda, spreg, mapclassify, inequality and statsmodels (the libraries the package itself builds on) for a method it lacks; scikit-learn and xgboost for machine learning; matplotlib, seaborn and splot only where a notebook needs a static figure. **expdpy** (https://cmg777.github.io/expdpy/) is the companion for specialised panel methods (within/between variation, correlated random effects, IV, event studies) and **geometrics** (https://quarcs-lab.github.io/geometrics/) for specialised spatial methods (plain GWR, a spatial model under several weights matrices, teaching sandboxes); reach them through `geo.for_expdpy()` and `geo.for_geometrics()`.
