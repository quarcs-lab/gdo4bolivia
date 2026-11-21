# Using this repository as a template

## The two-repository layout (version 0.6)

Since version 0.6 (2026-11-20) GDO-Bolivia is two repositories instead of one:

| Repository | Holds |
| --- | --- |
| The package, [quarcs-lab/geo4bolivia](https://github.com/quarcs-lab/geo4bolivia) | `src/geo4bolivia/`: all the generic Python code (the data layer, the build helpers and entry point, the validator, the command line, the analyses). Also its own `project.yaml` (bundled into the wheel), the generic tests, the documentation site with its notebooks, and the release workflow |
| The data repository, this one, [quarcs-lab/gdo4bolivia](https://github.com/quarcs-lab/gdo4bolivia) | `raw/`, `builders/` (project-specific), `geo/`, `data/`, `metadata/`, the generated dataset docs, `project.yaml` (the same identity, plus the website's `site:` settings), the notebooks, `scripts/`, the website (`site/`) and the tests of the data (`tests/test_data.py`, `tests/test_project.py`) |

How they fit together:

- **The package reads the data repository** named in its `project.yaml` (`repository`, `default_ref`): from GitHub by default, or from a local checkout, found from the working directory or through `GEO4BOLIVIA_DATA_DIR`. A checkout is recognised by a `project.yaml` whose `package` is the package's name, next to a `geo/scales.yaml`; its `project.yaml` is read on top of the package's own.
- **The data repository depends on the package.** Its `pyproject.toml` is a project that is not published (`package = false`) with one dependency, `geo4bolivia[all]`, and it runs the package's commands: `uv run geo4bolivia build [geo|<dataset>]` and `uv run geo4bolivia validate`. While a version is in development, `[tool.uv.sources]` installs the package from a checkout next to this repository.
- **The builders' contract.** `builders/__init__.py` defines `build_geo` (a function that writes `geo/`) and `DATASETS` (`{dataset id: function}`). `geo4bolivia build` imports that folder from the checkout and runs the geo builder, then each dataset builder, then rewrites the catalog. Builders import the generic helpers from the package (`geo4bolivia.build.common`, `.gadm`, `.geoboundaries`); the starting points for new builders are `geo4bolivia.build._template` and `geo4bolivia.build._geo_template`.
- **Versions.** The data repository is tagged with the package's version at each release, so `ref="vX.Y.Z"` freezes the data.

**Where the generic code and its porting list are.** The generic Python code is in the package repository, and that repository's [`TEMPLATE.md`](https://github.com/quarcs-lab/geo4bolivia/blob/main/TEMPLATE.md) says what is generic there, states the contract above and lists what to port to geo4cambodia. In this repository nothing in `builders/` is generic except its contract; the generic pieces are `scripts/indicator_map.py`, `scripts/doc_notebooks.py`, the `create-indicator-website` skill, the website's components and build (`site/src/app.jsx`, `site/src/map.jsx`, `site/src/i18n.js`, `site/src/overlay.js`, `site/src/snippets.js`, `site/build.mjs`, `site/i18n/strings.mjs`), `tests/test_data.py`, and the guides (`CONTRIBUTING_DATA.md`, `docs/data-infrastructure.md`) apart from their examples.

**Not adapted yet.** `scripts/new_project.py` (with `scripts/template/*.tpl`) and [geo4cambodia](https://github.com/quarcs-lab/geo4cambodia) still use the one-repository layout of version 0.5. The script copies files that have left this repository (`src/<package>/`, `tests/test_core.py`, `docs/publishing.md`, `.github/workflows/release.yml`), so it cannot be run from here as it stands. Both are to be adapted later. Until then, the rest of this page describes the one-repository layout, as in geo4cambodia: its paths (`src/<package>/`, `build/geo.py`, `docs/python-package.md`, `docs/publishing.md`, `tests/test_core.py`) are those of geo4cambodia, not of this repository.

## History: what GDO-Bolivia adapted, and what to port

> **geo4bolivia** was created from [geo4cambodia](https://github.com/quarcs-lab/geo4cambodia), the reference implementation, with `scripts/new_project.py`. This page is kept as in geo4cambodia, so "this repository" in the steps below means geo4cambodia. What geo4bolivia adapted:
>
> - three admin levels from one GADM level-3 file (`--levels department,province,municipality`), with the 5 Lake Titicaca polygons dropped before `from_gadm()`
> - municipal maps as scales named by their number of units (version 0.8: `map343`, SDSN Bolivia's map of 2025, and `map339`, the 2015 map that DS4Bolivia's data were computed on; units on both keep one geo ID, new ones are numbered after them, see [`CONTRIBUTING_DATA.md`](CONTRIBUTING_DATA.md#add-a-municipal-map))
> - a country-fitted equal-area projection in `project.yaml`
> - values stored at nominal years with their actual reference years (`geo:reference_years`, see `metadata/sdg01.datapackage.json`)
>
> Small generic fixes made here and still to be copied back to geo4cambodia: `dissolve()` fills the sliver gaps between source polygons that used to remain as holes in every dissolved scale (thousands of them in Bolivia's departments); `link()` no longer links a name shared by several units to one of them at random (it reports them instead); `from_gadm()` also accepts a GeoDataFrame; `validate` compares source keys as text (an integer `asdf_id` equals the `"57"` stored in `geo/units`); `aggregate()` leaves numeric source keys and `*_id` columns out of the variables it aggregates by default (it warned about `asdf_id`); `zonal()` has no default `scale` (it was `"district"`, which not every project has); and `scripts/new_project.py` renames the package inside `TEMPLATE.md` too, which makes the new project call itself the reference implementation. Indicator pages: every field has a `title` (plot label) and a construction `description`, sources carry `geo:role`, `geo:creator`, `geo:homepage`, `geo:license` and `geo:attribution`, and packages a `geo:map` headline map and `geo:updated`, all checked by `validate` (the `geo:map` check is new); `dictionary()` returns a `label` column, `save()` writes field titles (`label` in `variables`), and the catalog CSV gains a `description` column; `scripts/indicator_map.py` draws the headline maps (Fisher–Jenks, keyless Esri basemap, `site:` block in `project.yaml`); the `create-indicator-website` skill (`.claude/skills/`); `IndicatorDetail` in `index.html` reads the metadata at runtime and has no download section; and `LICENSE-DATA` (CC BY 4.0 for data, with exceptions). Website audit (2026-10-29), in `index.html`: on phones (`isSmallScreen()`) the hero shows the still image with the city and zoom controls, and loads the globe only when one is tapped (`withGlobe` runs the tapped action once it is ready); the `Wordmark` and `ColabButton` accessible names start with their visible text (WCAG 2.5.3; no `aria-label`, an `sr-only` suffix instead); a detail route with the wrong section is titled "Not found" like the page it shows; the unused `CitationBox` is gone and the Cite section no longer promises per-dataset citations; and the static fallback links the dataset docs on GitHub, because Pages (with `.nojekyll`) serves `.md` files as raw text. GitHub Discussions must be enabled on the repository, since the Community section links to it.
>
> **A notebook per code box** (2026-11-21), to port: each code box's Open in Colab button opens a notebook with exactly its code (`site/src/snippets.js`, `ColabButton` in `app.jsx`, `SHARED_SNIPPETS` in `content.js`); `site/build.mjs` writes them into `notebooks/snippets/` (committed, since Colab opens them from GitHub) and the Pages workflow regenerates and commits them (`--notebooks-only`; `--check-notebooks` on pull requests). Change the GitHub path in `COLAB_URL`. Likewise `scripts/doc_notebooks.py` (generic, standard library) gives every Python block of the Markdown docs a notebook in `notebooks/docs/` and points its Colab badge there; `builders/__init__.py` defines `after_build`, which `<package> build` (0.8.1 and later) runs last, to call it; the Pages workflow regenerates both sets of notebooks on every push to `main` and commits them back.
>
> **A bilingual website** (2026-11-21), to port as a whole: English is the source and every other language lives in `site/i18n/<lang>/` (`ui.json`, the interface strings keyed by their English text; `content.json`, the constants, package cards and registry items' prose; `metadata/<dataset>.json`, the variables' labels and descriptions). `site/src/i18n.js` picks the language (`?lang=`, then the visitor's saved choice, then the country from the browser's time zone, then the browser's language), loads a translation as a separate chunk and provides `t()`; `app.jsx` shows an EN | ES switch at the top right; `site/build.mjs` writes `assets/search.<lang>.json` and `assets/i18n/<lang>/<dataset>.json`; `node site/i18n/strings.mjs` lists what is translated and checks that nothing is missing. For geo4cambodia, swap `es` for `km` (Khmer) and the time zones for `Asia/Phnom_Penh`.
>
> **The website now has a build step** (2026-10-29), to port as a whole: `index.html` became `site/` (`src/content.js` holds the constants and `CONTENT_REGISTRY`; `src/app.jsx` the components; `src/map.jsx` the interactive map; `template.html`, `tailwind.config.cjs`, `package.json`), built by `site/build.mjs` (esbuild, Tailwind CLI, sharp) into `_site/` and deployed by `.github/workflows/pages.yml` (Pages source: GitHub Actions). New: path URLs (`<section>/<id>/`, pre-rendered with their own title, description, preview image and JSON-LD; old `#/` links redirect), a generated `sitemap.xml` and `404.html`, site search (`/` or Ctrl/Cmd+K) over items and every dataset variable, an interactive Leaflet map of any variable and year on indicator pages, and a "Cite this dataset" box (APA + BibTeX, then the sources' required credits). All maps draw public-domain web boundaries (`site/data/*.geojson`) from geoBoundaries, matched to the geo IDs by `scripts/web_boundaries.py` (check each country's geoBoundaries license: Bolivia's is public domain); `scripts/indicator_map.py` uses them when present. `project.yaml` `site.colors.ramp` holds the interactive maps' five classes. Root `index.html`, `404.html` and `sitemap.xml` are gone.
>
> **Boundaries from geoBoundaries** (version 0.2, 2026-10-29), to port: `build/gadm.py` splits into `gadm_ids()` and `gadm_units()` (IDs and units from GADM codes alone, no geometry) and `from_gadm()` (unchanged API); the new generic `build/geoboundaries.py` (`from_geoboundaries()`: a geoBoundaries file plus a `shapeID -> geo_id` lookup, coverage-simplified, coarser scales as exact unions so they nest and keep the source's holes); `scripts/match_geoboundaries.py` (the one-off area match, with an ADM1 nesting check) and a simpler `scripts/web_boundaries.py` (the website's boundaries simplified from `geo/boundaries/`); `scripts/new_project.py` copies `geoboundaries.py`. geo4bolivia no longer distributes GADM geometry: the IDs keep GADM's numbering and `units` gains `gb_id`.

> **SDG Atlas 2026 and the 343-unit map** (version 0.4, 2026-11-17), generic pieces to port: `build/geoboundaries.py` gains `from_polygons()` (any polygon file plus a `key -> geo_id` lookup; `from_geoboundaries()` now calls it) and cleans the coverage with `shapely.coverage_clean` (shapely >= 2.2) before simplifying; `build/common.py` prints non-consecutive periods (`years_text`) and a field's `geo:reference_years` in the generated docs; `validate` checks `geo:reference_years` and the `panels` of `geo:map`; `scripts/indicator_map.py` draws two-panel page maps (`geo:map` `"panels": [first, last]`, classes pooled over both years) and takes its boundary credit from `project.yaml` `site.boundary_credit`; `scripts/project_images.py` shades its overlay by percentile; `site/src/map.jsx` adds a "Change first→last" view (classes split at zero) and loads the boundaries of the dataset's scale; `site/build.mjs` injects `__UNIT_COUNTS__` (units per scale) and `__YEAR_SPAN__` (first and last year of every `geo:period`) for `app.jsx`, whose About stats (spatial scales, years covered) now come from them, and writes each indicator's JSON-LD `temporalCoverage` as an ISO interval from its resources' `geo:period`.

> **A package to understand the data, and three packages as one workflow** (version 0.5, 2026-11-17), generic pieces to port: new modules `discover.py` (`search`, `info`, `reference_years`, `cite`, `labels`, `describe`), `panel.py` (`change`) and `plot.py` (`map`, plotly through a new `[plot]` extra; its default view comes from `project.yaml` `map: {center, zoom}`); `io.py` gains `add_names()` and `load(names=, groups=)`, a richer `datasets()` (`years`, `units`, `license`, `categories`), `dictionary()` a `reference_years` column, and `load()` errors on years without rows; `aggregate()` takes a list of targets and returns `coverage`, and both it and `combine()` fetch `weighted_mean` weights from the dataset a new package property `geo:weights` names (`{"population": "sdg"}`); `ref=` reaches the scale registry and the metadata; `build/common.publish()` writes each resource's `geo:period`, `geo:years` and `geo:units` from the data, and `validate` checks them and the `geo:weights` pointers; the CLI gains `search` and `info`; docstrings are project-neutral. Website: `scripts/api_reference.py` writes `site/data/api.json` from the docstrings (a test fails when it is stale or a function lacks an `API_EXAMPLES` entry in `content.js`); a `reference` item type renders it (`ReferenceDetail`, lazy-loaded, JSON-LD `TechArticle`); `PackageWorkflow` (`PACKAGE_WORKFLOW` in `content.js`) shows the three packages on the home page and on each package page; `PackageDetail` gains `tutorial` steps with a table of contents, the shared `THREE_PACKAGES_EXAMPLE` and a `reference` link; section 2 opens on the Packages filter.

> **Two repositories, and a package that analyses** (version 0.6, 2026-11-20). The generic code of 0.6 (the analysis modules and their engine, the new dependencies and extras, the documentation site) is listed in the package repository's `TEMPLATE.md`. Generic pieces that changed in this repository, to port: the Python package left (`src/` is gone; `pyproject.toml` is a project that is not published and depends on `<package>[all]`, with `[tool.uv.sources]` during development and the dependency groups `analysis` and `dev`); the project's builders moved from `src/<package>/build/` to `builders/` at the root, under the contract above (`build_geo` and `DATASETS` in `builders/__init__.py`, helpers imported from `<package>.build`), and the package's `build` command loads them from the checkout; `tests/test_core.py` moved to the package and `tests/test_data.py` here checks that everything validates and that every dataset has a builder; `docs/python-package.md`, `docs/publishing.md` and `.github/workflows/release.yml` moved to the package repository (as its `README.md`, `RELEASING.md` and release workflow); `scripts/api_reference.py`, `site/data/api.json` and the website's function reference page (the `reference` item type) were removed, since the reference is now generated on the package's documentation site; the website's page of the project's package became a short page (what it does, install, one example) that links to that site; and the guides, `CLAUDE.md` and the `create-indicator-website` skill name the new paths. Each release tags both repositories with the same version.

## The one-repository template (geo4cambodia)

geo4cambodia is the reference implementation of a family of **geo4<country>** repositories. Each one has a Python package, a database of subnational indicators and (optionally) a website. They all share one design, so code, notebooks and skills transfer from one country to another:

- **geo IDs:** `<ISO2>`, `<ISO2>-NN`, `<ISO2>-NN-NN`, ... from GADM
- **datasets:** long panels keyed by `geo_id` and `year`, as CSV and Parquet
- **metadata:** Frictionless datapackages with `geo:` properties
- **the same package API:** `load`, `link`, `zonal`, `aggregate`, `overlay`, `combine`, `save`, `for_expdpy`, `for_geometrics`

How the database works is explained in [`docs/data-infrastructure.md`](docs/data-infrastructure.md). This page explains how to start a new project. The examples in `docs/data-infrastructure.md` and `docs/publishing.md` use geo4cambodia's own datasets (`gdppc`, `env`, `hdi`) and IDs; adapt them once your project has data.

## What is generic and what is project-specific

| Generic (shared by every project, copied as is) | Project-specific (rewritten for each project) |
| --- | --- |
| `src/<package>/`: `project.py`, `store.py`, `scales.py`, `metadata.py`, `io.py`, `discover.py`, `panel.py`, `plot.py`, `create.py`, `bridge.py`, `aggregate.py`, `validate.py`, `cli.py` | `project.yaml`: name, package, repository, country codes, projection |
| `src/<package>/build/`: `common.py` (writing data, docs and geo/), `gadm.py` (geography from GADM), `_template.py`, `_geo_template.py` | `src/<package>/build/geo.py` and one builder per dataset; `DATASETS` in `build/__init__.py` |
| `tests/test_core.py` | `tests/test_project.py` |
| `docs/data-infrastructure.md`, `docs/publishing.md`, `CONTRIBUTING_DATA.md`, `TEMPLATE.md`, `scripts/`, `.claude/skills/` | `geo/scales.yaml`, `raw/`, `metadata/`, `docs/python-package.md`, `README.md`, `CLAUDE.md` |
| | Generated: `geo/units.*`, `geo/boundaries/`, `geo/crosswalks/`, `data/`, `docs/datasets/`, the catalog CSV |
| | Website (`site/`, `images/`, `media/`, `.github/workflows/pages.yml`) and notebooks: optional |

Generic code never names a country, a repository or a package. It reads them from `project.yaml` and from the folder name of the package. The environment variables take the package name as prefix (`GEO4LAOS_REF`, ...).

## Start a new project in 6 steps

**1. Create the skeleton** (Python standard library only):

```bash
python scripts/new_project.py ../geo4laos --package geo4laos --country Laos \
    --iso2 LA --iso3 LAO --repo my-org/geo4laos --levels province,district
```

The script:
- copies the generic files, renaming `geo4cambodia` to `geo4laos` everywhere (package folder, imports, CLI, environment variables, URLs)
- writes `project.yaml`, `geo/scales.yaml` (country, then one admin scale per `--levels` entry, plus a planned sub-level and a 10 km grid), `pyproject.toml`, `README.md`, `CLAUDE.md`, `docs/python-package.md`, `raw/README.md` and a stub `tests/test_project.py`
- creates an empty `metadata/index.json` and installs the GADM geography builder as `build/geo.py`

Options: `--name`, `--short-name` and `--website` (defaults: "GeoDevelopment Observatory of <country>", "GDO-<country>", and the repository's GitHub Pages URL). Run `python scripts/new_project.py --help` for the full list.

**2. Add the boundaries.** Download the country from [GADM 4.1](https://gadm.org/download_country.html) at the finest level in `--levels` (e.g. level 2, GeoJSON). Save it unedited as `raw/boundaries/gadm41_<ISO3>_<n>.json` (the file name `build/geo.py` expects; change `GADM_FILE` there if needed).

**3. Build and check the geography:**

```bash
cd ../geo4laos
git init && uv sync
uv run geo4laos build && uv run geo4laos validate && uv run pytest
```

This creates `geo/units.csv`, `geo/boundaries/{country,province,district}.*` and the crosswalks. With no dataset yet, the dataset tests are skipped.

**4. Add datasets**, one at a time, following [`CONTRIBUTING_DATA.md`](CONTRIBUTING_DATA.md): `raw/<dataset>/`, then `metadata/<dataset>.datapackage.json`, a builder, `build`, `validate`.

**5. Publish:**
- Push the repository to GitHub. The package reads data from the `repository` in `project.yaml`, so remote loading works after the first push.
- Release the package on PyPI with `docs/publishing.md` (in GDO-Bolivia this guide is now `RELEASING.md` in the package repository).

**6. Optional: a website.** Copy `site/` (without `node_modules/` and `data/`), `.github/workflows/pages.yml`, `robots.txt` and `site.webmanifest`. Replace the constants and `CONTENT_REGISTRY` entries in `site/src/content.js`, the texts and images and the hero settings, run `uv run python scripts/web_boundaries.py` for the maps' boundaries, set Pages' source to GitHub Actions, and preview with `npm ci --prefix site && npm run --prefix site preview`. The landing page has three components, Indicators & tools (one filtered section), Projects (`type: 'project'`, cards prepared by `scripts/project_images.py` from ChatGPT pictures) and Insights; Projects, Insights and Events appear only once they have items.

## Adapting the design

| You want | Do this |
| --- | --- |
| Different scale names (e.g. `region`, `municipality`) | `--levels region,municipality`. Names are free; `<scale>_id` columns follow them |
| Three or more admin levels | `--levels province,district,commune` with a GADM level-3 file |
| More than 99 units under one parent | `digits: 3` for that scale in `geo/scales.yaml` (and `\d{3}` in its `id_pattern`) |
| Groupings (statistical regions, GDL regions) | A scale with `kind: grouping`, `children: <scale>`. Add its units and `<grouping>_id` on the child units in `build/geo.py`; see geo4cambodia's `build/geo.py` |
| GADM IDs with another polygon map (geoBoundaries, a statistics office's or an observatory's map) | Keep GADM's numbering from its codes (`gadm_units`), match the map's polygons to the IDs once (by an official code, e.g. INE, or by area overlap) into a `key -> geo_id` lookup, and build every layer with `from_polygons` (`from_geoboundaries` for geoBoundaries' `shapeID`). See geo4bolivia's `build/geo.py` and `scripts/match_municipalities343.py` (SDSN Bolivia's map by INE code, version 0.4), and `git show v0.3.0:scripts/match_geoboundaries.py` for geoBoundaries. Check the map's license first |
| Non-GADM boundaries (national statistics office) | Write `build/geo.py` yourself. Build `units` (`geo_id`, `scale`, `name`, `parent_id`, source keys) and `layers` (`{scale: GeoDataFrame}`), then call `publish_geo(units, layers)` |
| Grids or custom zones | Register them (`kind: grid` / `custom`, no parent) and publish their boundaries. Data move to and from them with `overlay()` |
| A country-fitted projection | Set `equal_area_crs` in `project.yaml` (default `EPSG:6933`, exact areas everywhere) |

## Keeping projects in sync

Improvements to the generic files should be made in geo4cambodia first, then copied to the other projects. Copy the files listed in the "Generic" column and replace `geo4cambodia` with the project's package name. Because generic code reads everything from `project.yaml`, it can be copied without other edits. `tests/test_core.py` checks that it still works with each project's data.
