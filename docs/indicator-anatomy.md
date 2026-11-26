# The anatomy of an indicator

Every indicator of the observatory appears in four places with one structure:

- its **card** on the landing page;
- its **page**, `indicators/<id>/`;
- its **row** in the landing page's Database architecture table;
- its **AI Notebook** in Colab.

All four are drawn from the same two inputs, so a new dataset gets the same card, page, row and notebook as the others. This document says what each element is, in what order it appears, and where it comes from. **`node site/indicators-check.mjs`** (run first by every site build) enforces it: the build stops when an indicator misses a piece ([The build check](#the-build-check)).

The structure is generic, like the website's components; the examples are Bolivian.

## What an indicator is

An indicator is **one `CONTENT_REGISTRY` entry** (`site/src/content.js`, `type: 'indicator'`) **plus its dataset's folder**, `data/<dataset>/`.

The folder holds:
- `datapackage.json`, the metadata;
- the panel (`<scale>/<dataset>.csv/.parquet/.dta`);
- the wide files (`<scale>/<dataset>_wide.gpkg/.geojson`);
- `README.md`.

From these two the build (`npm run --prefix site build`) makes:

| Output | Where | Made by |
| --- | --- | --- |
| The card | the landing page, Indicators & tools (filter Indicators) | `ItemCard` in `site/src/app.jsx` |
| The page | `indicators/<id>/index.html`, pre-rendered with its title, description, preview image and `Dataset` JSON-LD | `IndicatorDetail` in `app.jsx`; `site/build.mjs` |
| The Database row | the landing page, Database architecture | `FolderRow` in `app.jsx` |
| The AI Notebook | `notebooks/pages/<id>.ipynb`, opened in Colab | `pageNotebook()` in `site/src/snippets.js`; `site/notebooks.mjs` |
| A Colab notebook per code box | `notebooks/snippets/<id>/<slot>.ipynb` | `snippetNotebook()`; `site/notebooks.mjs` |
| The GeoLibre projects | `_site/geolibre/<dataset>.geolibre.json` and `.es.geolibre.json` | `site/geolibre.mjs` |
| The interactive map's data | `_site/assets/data/<dataset>.json` | `site/build.mjs` |
| Search, sitemap | `assets/search.json` (`search.es.json`), `sitemap.xml` | `site/build.mjs` |

Variables, sources, licenses, citations and references are **not** in the entry. The page reads them from `datapackage.json` at run time, so fix them in the metadata.

## Inputs

### Registry fields

Copy an existing entry (e.g. `municipalities343-sdg01`) and change every field. **Required** fields are checked by the build. **ES** means a Spanish translation is needed in `site/i18n/es/content.json` under `items.<id>` (see [Spanish](#spanish)).

| Field | Required | ES | What it drives |
| --- | --- | --- | --- |
| `id` | yes | | `<map>-<dataset>`, e.g. `municipalities343-sdg01`: the page path, the notebook paths |
| `type`, `section` | yes | | `'indicator'`, `'indicators'` |
| `title` | yes | yes | Card title, page `<h1>`, notebook heading, search, JSON-LD |
| `scope` | yes | yes | The mono line above the title (card and page): units · contents · period |
| `summary` | yes | yes | Card text, page lead, notebook intro, meta description |
| `description` | yes | yes | Page, About the dataset |
| `geography`, `units`, `period`, `frequency` | yes | `units` no, others yes | Page sidebar, At a glance; `units` also the map's sentence |
| `key`, `idExample` | yes | | At a glance (join key); the Database row's Unit ID |
| `categories` | yes | yes | At a glance |
| `tags` | yes | yes | Card (first 4), search |
| `image`, `imageAlt` | yes | `imageAlt` yes | Card picture, the page header's blurred backdrop, preview image ([Images](#images)) |
| `map`, `mapAlt` | yes | `mapAlt` yes | Page headline map ([Images](#images)) |
| `date` | yes | | Card order (newest first after pinned ones), JSON-LD |
| `pinned` | yes (`true`/`false`) | | The card's Featured label and its place first |
| `dataset` (or `datasets`) | yes | | The data the page loads; every link and download |
| `scale` | yes | | The map folder of the files, `data/<dataset>/<scale>/` ([Downloads](#downloads)) |
| `geolibre` | yes | | `true` (the `geo:map` variable), or `{ variable, year }` ([GeoLibre](#geolibre)) |
| `code` | yes | | The four code tabs ([Code](#code)) |
| `aiPrompts` | yes, 4–6 | no | The AI Notebook's questions for Gemini ([AI Notebook](#ai-notebook)) |
| `examples` | optional | `title`, `text` | More examples under the code tabs: `{ title, text, code }` |
| `notice` | optional | yes | An amber caveat under About (e.g. nominal years) |

### Code

`code` has four tabs, in this order on the page (`PAGE_TABS` in `snippets.js`, `CODE_TABS` in `app.jsx`):

| Tab | Shown as | How to write it |
| --- | --- | --- |
| `python` | Python · package | `${PYTHON_SETUP}` (install, import geo4bolivia and plotly), then `geo.load(...)` and a Plotly figure |
| `pandas` | Python · URL | Plain `pd.read_csv` / `gpd.read_file` from the raw GitHub URLs; no install line |
| `gpkg` | Python · GeoPackage | `...wideTabs(dataset, scale, column, label, title)` writes this tab and the next |
| `geolibre` | Python · GeoLibre | GeoLibre's own map widget (`m`) on the wide GeoJSON, same column unless `wideTabs` gets another |

The rules of every code box (`CLAUDE.md`, "Every code box assumes Google Colab") apply:
- it runs on its own in a fresh Colab;
- it ends with a Plotly Express figure;
- its lines are about 84 characters at most;
- there are no R or Stata examples.

### GeoLibre

`geolibre: true` styles the GeoLibre project on `geo:map`'s variable; `geolibre: { variable, year }` styles it on another one. For example, population uses `ln_pop_density`, since its own maps classify on the log scale.

`site/geolibre.mjs` writes the projects at every build. A variable with several years opens as its first and last year side by side, with a swipe. The build fails if the `geolibre` code tab maps another column than the project does.

### Images

`uv run python scripts/indicator_map.py <dataset>` draws both images from `geo:map` (the headline variable and year) and `site/data/` boundaries:
- `images/indicators/<dataset>.webp`, the **card** (`image`);
- `images/indicators/<dataset>-map.webp`, the page's **headline map** (`map`).

Both are three Fisher–Jenks classes on a keyless dark basemap. With `geo:map.panels` the page map shows each period side by side, in pooled classes. Describe each one in `imageAlt` and `mapAlt`: classes, counts, highest units. The build makes the smaller copies the cards load.

### Metadata

`data/<dataset>/datapackage.json` must have `geo:map` (`variable`, `year`). Every field needs:
- a `title`, the plot label and the Stata label;
- a `description`: how the variable was built;
- `geo:unit`.

The package also needs its `sources`, with `geo:role` and `geo:license`, and its `licenses`. The page's Variables, License, Cite and References, and the AI Notebook's variables and citations, all come from here.

### Downloads

`uv run geo4bolivia build <dataset>` writes the files the buttons download, in `data/<dataset>/<scale>/`:
- `<dataset>.csv` and `<dataset>.dta` (the panel, one row per unit and year);
- `<dataset>_wide.gpkg` and `<dataset>_wide.geojson` (wide, one row per unit, with boundaries).

The buttons point at the site's own copy, so the browser saves them.

## The links, in one order

The card, the Database row and the page sidebar offer the same ways into the data, **always in this order**. The order is set in one place, `datasetLinks(item)` in `app.jsx`; the card and the row draw each link as a `DataChip`.

| # | Label | Opens | From |
| --- | --- | --- | --- |
| 1 | GeoLibre | GeoLibre with the dataset's project (new tab) | `geolibre` |
| 2 | AI Notebook | the AI Notebook in Colab (new tab) | `aiPrompts`, `code`, `examples` |
| 3 | GeoPackage | download `<dataset>_wide.gpkg` | `scale` |
| 4 | GeoJSON | download `<dataset>_wide.geojson` | `scale` |
| 5 | CSV | download `<dataset>.csv` | `scale` |
| 6 | Stata | download `<dataset>.dta` | `scale` |
| 7 | GitHub | `data/<dataset>/` on GitHub (new tab) | `dataset` |

Geospatial files come before the non-spatial ones, and GitHub comes last. Add a new way into the data to `datasetLinks()`, never to one place alone.

## The landing-page card

`ItemCard`, filtered under Indicators & tools → Indicators. Cards are ordered pinned first, then newest `date`.

```
┌──────────────────────────────────────────┐
│ [INDICATOR]                  [FEATURED]  │  ← type badge; Featured if `pinned`
│                                          │
│      picture: `image` (`imageAlt`)        │  ← images/indicators/<dataset>.webp
│                                          │
├──────────────────────────────────────────┤
│ 343 municipalities · 4 indicators · …    │  ← `scope` (mono, turquoise)
│ SDG 1: No poverty                        │  ← `title`; the whole card links to the page
│ The SDG 1 (No poverty) index of …        │  ← `summary`
│ (SDGs) (SDG Atlas 2026) (poverty) (…)    │  ← first 4 `tags`
│ View details →                           │
│ (GeoLibre↗) (AI Notebook↗)               │  ← the seven links, in order,
│ (⤓GeoPackage) (⤓GeoJSON) (⤓CSV)          │    each its own target (relative z-10)
│ (⤓Stata) (GitHub↗)                       │    above the card's stretched link
└──────────────────────────────────────────┘
```

## The indicator page

`IndicatorDetail` inside `DetailShell`, at `indicators/<id>/`.

**Header**, over a blurred copy of `image`:
- the breadcrumb (Home / Indicators & tools / title);
- the type badge and `scope`;
- the `title` (h1);
- the `summary`.

**Lead:** the headline map (`map`, `mapAlt`), which opens full size.

**Body**, in this order (each a `Block` with its anchor):

| Block | Anchor | Content | From |
| --- | --- | --- | --- |
| About the dataset | `#d-about` | `description`, the `notice` (if any), Original source (sources with `geo:role: original`) | entry, metadata |
| Explore the map | `#d-map` | The Our map \| GeoLibre switch; the interactive map (any variable and year, or the change between first and last year; five Fisher–Jenks classes) or GeoLibre's viewer, embedded | metadata, `geolibre` |
| Variables | `#d-variables` | Name, label, description of every column | metadata |
| Use it in your code | `#d-code` | The four code tabs, each with Copy and Open in Colab; then More examples | `code`, `examples` |
| License | `#d-license` | The data's license and each source's | metadata |
| Cite this dataset | `#d-cite` | APA citations with copy buttons: original sources, the observatory, other sources | metadata, `CITATION_APA` |
| References | `#d-refs` | Every source with its link | metadata |

**Sidebar**, the At a glance card, from top to bottom:

```
┌──────────────────────────────┐
│ AT A GLANCE                  │
│ Geography   Municipality     │  ← `geography`
│ Units       343              │  ← `units`
│ Period      ~2012 and ~2024  │  ← `period`
│ Frequency   Two periods …    │  ← `frequency`
│ Join key    geo_id e.g. …    │  ← `key`, `idExample`
│ Dataset id  sdg01            │  ← `dataset`
│ Categories  Social           │  ← `categories`
│ License     CC BY 4.0        │  ← metadata
│ ┌──────────────────────────┐ │
│ │ ▣ Open in GeoLibre ↗     │ │  1  rose button + one line
│ └──────────────────────────┘ │
│ ┌──────────────────────────┐ │
│ │ ∞ Open in AI Notebook ↗  │ │  2  rose button (Colab icon) + one line
│ └──────────────────────────┘ │
│ Download, wide and ready     │
│ [⤓ GeoPackage] [⤓ GeoJSON]   │  3, 4  + what the wide files are
│ Download the panel           │
│ [⤓ CSV]        [⤓ Stata]     │  5, 6  + what the Stata file holds
│ [⌥ Dataset on GitHub data/…] │  7  + one line
└──────────────────────────────┘
```

## The Database table row

`FolderRow`, one per indicator, in the landing page's Database architecture table. The table's last row, `geo`, is the exception: it has no page and opens `geo/` on GitHub.

| Column | Shows | From |
| --- | --- | --- |
| Dataset | the dataset id (the row's link, stretched over the whole row: it opens the indicator's page in the same tab) and `title` | `dataset`, `title` |
| Scale | `units` · `geography` | entry |
| Period | `period` | entry |
| Unit ID | `idExample` | entry |
| Files | the seven links, in order, as small chips, each its own target | `datasetLinks()` |

## AI Notebook

"Open in AI Notebook" (sidebar, card, row) opens `notebooks/pages/<id>.ipynb` in Colab from GitHub. `site/notebooks.mjs` writes it with `pageNotebook()` (`site/src/snippets.js`), and the Pages workflow regenerates and commits it on every push to `main`; never edit it by hand. It is in English on both sites. Its sections, in order:

| # | Section | From |
| --- | --- | --- |
| 1 | `# title`, the `summary`, a link to the page | entry |
| 2 | **Ask Gemini, Colab's AI**: how to open Gemini, then the questions as a list | `aiPrompts` |
| 3 | **Variables**: name, label, unit of every column | metadata |
| 4 | **Setup**: one code cell, `!pip install -q` with every package the boxes install (extras merged), then every import, once | the boxes' own `!pip` and `import` lines |
| 5 | One section per code box, in page order: the four tabs (`Load the data with the package`, `… without the package (plain URLs)`, `… from the wide GeoPackage …`, `… in GeoLibre …`), then each example under its `title`; each box without its `!pip` and import lines | `code`, `examples` |
| 6 | **License and how to cite**: the licenses, then the citations in the page's order | metadata, `CITATION_APA` |

**Writing `aiPrompts`.** Write 4–6 questions that a user would ask about *this* dataset:
- name its variables by their column names (`sdg1_2_mpi`) and its years;
- mix a map, a ranking, a relationship between two variables, a spatial question (`geo.moran`, `geo.lisa`) and a caveat of the data (e.g. actual reference years);
- prefer the package's functions, so Gemini's code matches the page's.

They are not translated.

## Spanish

The website is bilingual; the indicator is not complete until its Spanish is:

- **`site/i18n/es/content.json`** `items.<id>`: every prose field of the entry, i.e. `title`, `scope`, `summary`, `description`, `geography`, `period`, `frequency`, `categories`, `tags`, `imageAlt`, `mapAlt`, `notice`, and each example's `title` and `text`.
- **`site/i18n/es/metadata/<dataset>.json`**: the dataset's title and each variable's label and description.
- Interface strings belong to the components, not the indicator: a new `t('…')` in `app.jsx` or `map.jsx` needs its Spanish in `ui.json`.
- Never translated:
  - code;
  - variable names, IDs and URLs;
  - citations and source titles;
  - `aiPrompts` and the notebooks.

The Spanish site opens GeoLibre's Spanish project (`<dataset>.es.geolibre.json`, labels from the metadata translation).

## The build check

`node site/indicators-check.mjs` (run first by `site/build.mjs`, so by every preview, build and Pages run) checks every indicator for:

1. **The registry fields** marked required above, with the four code tabs and 4–6 `aiPrompts`.
2. **The files:**
   - `image` and `map`;
   - `data/<dataset>/datapackage.json` with `geo:map`;
   - the four downloads, `data/<dataset>/<scale>/<dataset>.csv`, `.dta`, `_wide.gpkg` and `_wide.geojson`.
3. **The Spanish:** `items.<id>` in `content.json` and `metadata/<dataset>.json` match the English source.

Each problem names the indicator, what is missing and the section of this document, e.g.:

```
municipalities343-sdg01: no aiPrompts (docs/indicator-anatomy.md#ai-notebook)
municipalities339-pop: data/pop/map339/pop.dta is missing (uv run geo4bolivia build pop) (docs/indicator-anatomy.md#downloads)
```

The rest of the site's translations (`node site/i18n/strings.mjs`) only warn.

## Adding an indicator

The `create-indicator-website` skill (`.claude/skills/`) runs the whole workflow; by hand:

1. Add the data: raw files, builder, `datapackage.json` with a `title`, `description` and `geo:unit` for every column, sources and licenses, `geo:map` ([CONTRIBUTING_DATA.md](../CONTRIBUTING_DATA.md)). Then `uv run geo4bolivia build <dataset>`, `validate`, `pytest`.
2. Draw the images: `uv run python scripts/indicator_map.py <dataset>`.
3. Add the `CONTENT_REGISTRY` entry with every required field (copy one), the four code tabs and the `aiPrompts`.
4. Translate: `items.<id>` in `content.json`, `metadata/<dataset>.json`.
5. `node site/indicators-check.mjs`, then `npm run --prefix site preview`. On the card, the page and the Database row, check the seven links in order, and open the AI Notebook.
6. Commit, including the generated notebooks (`node site/notebooks.mjs`; on `main` the Pages workflow does it too), and push.
