# The CONTENT_REGISTRY entry

Copy an existing indicator entry in `site/src/content.js` (search for `type: 'indicator'`) and edit it.
Variables, sources, license and references come from the metadata; do not repeat them here.

```js
{
  id: 'municipalities339-ntl', type: 'indicator', section: 'indicators',
  title: 'Night-time lights per capita',
  scope: '339 municipalities (2015 map) · 2012–2020',             // shown above the title
  summary: 'One sentence for the card and the header.',
  description: 'The About paragraph: what, where, when, how, why, caveats.',
  geography: 'Municipality (map339, 2015 map)', units: 339, period: '2012–2020', frequency: 'Annual',
  key: 'geo_id', idExample: 'XX-01-02-03',                   // a real geo_id of the scale
  categories: ['Economy'], tags: ['night-time lights', 'VIIRS'],
  image: 'images/indicators/ntl.webp',                       // the 16:9 card (indicator_map.py)
  imageAlt: 'Map of ... in three natural-break classes: high in ..., low in ...',
  map: 'images/indicators/ntl-map.webp',                     // the page's map
  mapAlt: '<imageAlt>. Legend: High a to b (n units), Middle ..., Low ..., no data k.',
  date: '2026-10-29', pinned: false,
  dataset: 'ntl', scale: 'map339',                           // or datasets: ['a', 'b'] for one page of several
  geolibre: true,                                            // "Open in GeoLibre" (geo:map's variable); or { variable, year }
  aiPrompts: [ /* 4-6 questions to ask Colab's Gemini, naming the dataset's variables */ ],   // "Open in AI Notebook"
  notice: 'Optional warning shown under the description.',
  code: { python: `...`, pandas: `...`, ...wideTabs('ntl', 'map339', 'ln_NTLpc_2020', '<label>', '<label>, 2020') },
  examples: [                                                // optional: short recipes under the code tabs
    { title: 'Compute the index from its indicators', text: 'One sentence on what it shows.', code: `${PYTHON_SETUP}\n...` },
  ],
},
```

Do not add `files`, `folder`, `docs`, `variables`, `references`, `citation`, `related` or
download links: the page no longer uses them.

## Code snippets (rules from CLAUDE.md)

- **Two tabs.** `python` (the package) starts with `${PYTHON_SETUP}`, which holds the
  `!pip install -q <pkg>`, the import and `import plotly.express as px`. `pandas` (plain URLs)
  reads `BASE = "${RAW_URL}"` and needs no install line.
- **Runs in Colab as is.** Name the extra a snippet needs (`"<pkg>[raster]"` for `geo.zonal()`,
  `[dynamics]` for `geo.transitions()` and `geo.spatial_transitions()`, `[mgwr]` for `geo.mgwr()`,
  `[panel]` for `geo.panel_model()`); add `expdpy` or `geometrics` to the install line when used.
- **A Plotly Express figure** with the simplest syntax: data, `x`/`y`/`color`, and only
  `hover_name`, `labels={...}` and `title`. Use the variable's **label** in `labels`.
  - Maps: `px.choropleth_map(gdf, geojson=gdf.geometry, locations=gdf.index, color=..., hover_name="name", center=..., zoom=...)` with a continuous scale.
  - Use long tables (`groupby(..., as_index=False)`, names via `.map()`).
  - Add `.show()` to every figure except the last expression.
  - A snippet that runs one of the package's analyses (`geo.lisa()`, `geo.beta_convergence()`, ...)
    ends with the result's own figure instead (`res.fig`, or the figure `geo.map()` returns), after
    `print(res.interpret())` where the reading helps. Check each call with `help(geo.<function>)` or in
    the package's function reference (`geo.config()["documentation"]`, under `reference/`).
- **Self-contained.** Every box (each tab and each of `examples`) opens as its own Colab notebook
  (`notebooks/snippets/<id>/`, written by the website's build): it must run alone in a fresh
  session, with its own install line and imports, never relying on another box.
- **Lines of about 84 characters at most.**
- **Examples** (optional): 2–4 recipes of 8–20 lines that show how to use the dataset's
  variables (e.g. rebuild a composite index from its components, rank departments, relate two
  variables). Each starts with `${PYTHON_SETUP}` and ends with one Plotly Express figure.
- `CodeTabs` adds the "Open in Colab" button.

## JSON-LD

`site/build.mjs` writes the page's `Dataset` from the entry and the metadata: `name`,
`description`, `url` (the page), `license`, `temporalCoverage` (from `period`),
`spatialCoverage`, `keywords` (`tags`), `variableMeasured` (field titles) and `creator`.
**No `distribution`** (no download URLs). Check it in `_site/indicators/<id>/index.html`.

## QA checklist

The structure every item below checks is specified in
[docs/indicator-anatomy.md](../../../../docs/indicator-anatomy.md).

- [ ] `node site/indicators-check.mjs` passes: required fields, the four code tabs, 4-6 `aiPrompts`,
      images, `datapackage.json` with `geo:map`, the four downloads and the Spanish
      ([the build check](../../../../docs/indicator-anatomy.md#the-build-check)).
- [ ] The page shows, in order: map, About (with the original source), Explore the map,
      Variables (every column), code, License, Cite this dataset, References, and the
      At-a-glance sidebar ([the indicator page](../../../../docs/indicator-anatomy.md#the-indicator-page)).
- [ ] The card, the Database row and the sidebar show the seven links in order: GeoLibre, AI Notebook,
      GeoPackage, GeoJSON, CSV, Stata, GitHub ([the links](../../../../docs/indicator-anatomy.md#the-links-in-one-order)).
- [ ] The sidebar's "Dataset on GitHub" opens `data/<dataset>/`, and its CSV, Stata, GeoPackage and GeoJSON
      buttons download; the landing page's "Database architecture" row opens the page, and its GitHub chip the folder.
- [ ] Cite this dataset lists the original sources first, then the observatory, then the other sources.
- [ ] The entry has `scale` and a `gpkg` code tab (`wideCode(...)`); the sidebar's GeoPackage and GeoJSON buttons
      download `data/<dataset>/<scale>/<dataset>_wide.*` (built by `geo4bolivia build`).
- [ ] `geolibre: true` and the code tabs from `...wideTabs(dataset, scale, column, label, title)` (the `gpkg` and
      `geolibre` tabs); after the push, "Open in GeoLibre" opens the map styled on `geo:map`'s variable (first and
      last year side by side when it has several), in English and in Spanish, and the page's GeoLibre switch
      shows it embedded.
- [ ] `aiPrompts`: 4-6 questions for Colab's Gemini written for this indicator (its variables, years, caveats);
      `node site/notebooks.mjs` writes `notebooks/pages/<id>.ipynb`, and "Open in AI Notebook" (sidebar, card and
      table chips) opens it in Colab: Setup, then every code box of the page, runs cell by cell.
- [ ] The metadata loads (no "could not be loaded" notice) and the console has no errors.
- [ ] No horizontal scroll at 390 px width.
- [ ] The card image appears in the Indicators section, and the Database architecture
      table lists the dataset.
- [ ] `build`, `validate` and `pytest` pass.
