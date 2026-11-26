---
jupytext:
  formats: ipynb,md:myst
  text_representation:
    extension: .md
    format_name: myst
    format_version: 0.13
    jupytext_version: 1.19.6
kernelspec:
  display_name: Python 3
  name: python3
---

<a href="https://colab.research.google.com/github/quarcs-lab/gdo4bolivia/blob/main/notebooks/geo4bolivia_quickstart.ipynb" target="_parent"><img src="https://colab.research.google.com/assets/colab-badge.svg" alt="Open In Colab"/></a>

# Find, load, understand and analyse Bolivia's subnational data with `geo4bolivia`

Part of the [GeoDevelopment Observatory of Bolivia](https://quarcs-lab.github.io/gdo4bolivia/).

[`geo4bolivia`](https://quarcs-lab.github.io/geo4bolivia/) is the observatory's Python package. It is the way into the observatory's data: the SDG Atlas of Bolivia 2026 (the Sustainable Development Index, 15 goal indices and 81 indicators near 2012 and near 2024), population, night-time lights and satellite embeddings, for Bolivia's 343 municipalities and indigenous autonomies. It also runs the standard analyses of spatial data science on them. This notebook goes through the package in nine steps:

1. **Discover** what is available, what each variable means and how to cite it
2. **Load** a panel, with and without the package
3. **Understand** a variable: summaries and labels
4. **Compare the two periods**: the change of each unit
5. **Move across scales**: municipalities, provinces, departments and the country
6. **Link your own table** by name or INE code
7. **Build an indicator from a raster**
8. **Interpolate to a grid** and **save** your dataset in the observatory's format
9. **Analyse**: maps, spatial dependence, convergence, inequality and regression, one call each

Every function is documented, with an example, in the [package documentation](https://quarcs-lab.github.io/geo4bolivia/reference/).

+++

## 0. Setup

In Google Colab the next cell installs the package (a few seconds: Colab already has most of its dependencies). The `[raster]` extra adds rasterio, which step 7 needs. Locally, `uv sync` has installed everything already.

```{code-cell} ipython3
import importlib.util

if importlib.util.find_spec("geo4bolivia") is None:
    !pip install -q "geo4bolivia[raster]"
```

```{code-cell} ipython3
import sys
import warnings
from pathlib import Path

import numpy as np
import pandas as pd
import geopandas as gpd
import plotly.express as px
import plotly.io as pio

import geo4bolivia as geo

if "google.colab" not in sys.modules:
    pio.renderers.default = "notebook_connected"   # keeps the saved notebook small
warnings.filterwarnings("ignore", module="numba")   # a notice of an optional library
print("geo4bolivia", geo.__version__)
```

## 1. Discover what is available

The catalog lists every dataset with its scale, its years and the number of units with data. The SDG Atlas has two periods for all 343 units; the datasets DS4Bolivia computed on the older 2015 map (population, lights, embeddings) are published on that map, `map339`, for its 339 municipalities, which kept their geo IDs in the 2025 map (`map343`).

```{code-cell} ipython3
geo.datasets()[["dataset", "title", "years", "units", "variables"]]
```

`geo.search()` finds variables by words in their name, label or description, ignoring accents and case:

```{code-cell} ipython3
geo.search("poverty")[["dataset", "variable", "label", "years"]]
```

`geo.info()` gathers a dataset's documentation: what it is, its coverage, the actual years behind its periods, its license, its sources and their licenses, the recommended citation and notes.

```{code-cell} ipython3
geo.info("sdg03")
```

`geo.dictionary()` describes every column: readable label, definition, unit, aggregation rule and, when they differ from the stored years, the actual reference years.

```{code-cell} ipython3
cols = ["variable", "label", "unit", "aggregation", "reference_years"]
geo.dictionary("sdg03")[cols]
```

The Atlas stores its initial values at **2012** and its final values at **2024**, the years of the last two censuses, but some indicators come from other years: infant mortality, for example, from the health surveys of 2008 and 2023.

```{code-cell} ipython3
geo.reference_years("sdg03", "sdg3_2_tmi")
```

If you use the data, cite the dataset and its original sources:

```{code-cell} ipython3
print(geo.cite("sdg03"))
```

## 2. Load a panel, with and without the package

### Without the package

Every published file is a plain URL, so pandas, geopandas, R, Stata or Excel can read it directly:

- **`data/<dataset>/<scale>/<dataset>.csv`**: the indicators, one folder per dataset (with its `README.md` and `datapackage.json`), as a panel with one row per unit (`geo_id`) and year; the municipal scales are named after their map: `map343` (SDSN Bolivia 2025, the SDG Atlas) and `map339` (2015, population, lights and embeddings)
- **`geo/units.csv`**: names, parent units and the codes other sources use (INE, DS4Bolivia, GADM)
- **`geo/boundaries/<scale>.geojson`**: polygons, keyed by the same `geo_id`

```{code-cell} ipython3
BASE = "https://raw.githubusercontent.com/quarcs-lab/gdo4bolivia/main/"

# Inside a clone of the repository, read the local files instead (Colab uses URLs)
here = [Path.cwd(), *Path.cwd().parents]
local = next((p for p in here if (p / "geo" / "units.csv").is_file()), None)
if local is not None:
    BASE = local.as_posix() + "/"

sdg01 = pd.read_csv(BASE + "data/sdg01/map343/sdg01.csv")       # 343 units x 2 periods
units = pd.read_csv(BASE + "geo/units.csv", dtype={"ine_code": str})    # every scale and map
municipalities = gpd.read_file(BASE + "geo/boundaries/map343.geojson")
print(sdg01.shape, units.shape, municipalities.shape)
sdg01.head()
```

### With the package

`geo.load()` does the same in one line, and more: it picks variables and years, adds the unit names and the department or province each unit lies in, attaches boundaries, or reshapes to one column per year. Here is the Multidimensional Poverty Index (`sdg1_2_mpi`, 0 to 1, higher = poorer), which the Atlas computes from the censuses themselves:

```{code-cell} ipython3
mpi = geo.load("sdg01", variables="sdg1_2_mpi", groups=["department"])
mpi.head()
```

```{code-cell} ipython3
ids_2024 = geo.load("sdg", years=2024, geometry=True)       # a GeoDataFrame
pop_wide = geo.load("pop", variables="pop", wide="pop")      # one column per year
print(type(ids_2024).__name__, ids_2024.shape, "|", pop_wide.shape)
```

`geo.units()` has every unit's name, parents and source codes, and `geo.boundaries()` its polygons:

```{code-cell} ipython3
cols = ["geo_id", "name", "ine_code", "province_id", "department_id", "area_km2"]
geo.units("map343")[cols].head()
```

## 3. Understand a variable

`geo.describe()` summarises variables per period, with their labels and units; `by=` summarises each group instead.

```{code-cell} ipython3
edu = geo.load("sdg04", variables=["index_sdg4", "sdg4_6_alf"],
               groups=["department"])
geo.describe(edu)
```

```{code-cell} ipython3
geo.describe(edu[edu["year"] == 2024], variables="index_sdg4", by="department")
```

`geo.labels()` returns the label of every column, ready for the `labels=` argument of a Plotly Express figure of your own:

```{code-cell} ipython3
px.box(edu, x="department", y="sdg4_6_alf", color="year", labels=geo.labels(edu),
       title="Literacy by department, ~2012 and ~2024")
```

## 4. Compare the two periods

`geo.change()` turns a panel into one row per unit: its first and last values, the absolute, percentage and annual change, and its rank in each period (1 = highest).

```{code-cell} ipython3
ids = geo.load("sdg", variables="index_sdg", groups=["department"])
chg = geo.change(ids, "index_sdg")
cols = ["name", "department", "index_sdg_2012", "index_sdg_2024",
        "index_sdg_change", "index_sdg_rank_2012", "index_sdg_rank_2024"]
chg.nlargest(5, "index_sdg_change")[cols]
```

```{code-cell} ipython3
print(f"The IDS rose in {(chg['index_sdg_change'] > 0).sum()} of {len(chg)} units, "
      f"by {chg['index_sdg_change'].mean():.1f} points on average.")
```

The five largest gains are in municipalities that started near the bottom of the ranking (ranks 290 to 318 of 343). Whether the units that started lower gained more in general is a question for step 9.

## 5. Move across scales

Every geo ID nests by prefix: municipality `BO-04-17-04` lies in province `BO-04-17`, in department `BO-04`, in Bolivia `BO`. `geo.aggregate()` moves a panel up with each variable's rule from the metadata. The SDG indicators average with census-population weights (the 2012 census for ~2012, the 2024 census for ~2024), which the package loads from the `sdg` dataset by itself. These are approximations, not the Atlas's own department figures. `n_units` and `coverage` tell how many municipalities each result rests on.

```{code-cell} ipython3
up = geo.aggregate(mpi, to=["department", "country"], dataset="sdg01")
up.tail(4)
```

```{code-cell} ipython3
dep = geo.add_names(up[up["scale"] == "department"])
px.line(dep, x="year", y="sdg1_2_mpi", color="name", markers=True,
        labels=geo.labels(dep),
        title="Multidimensional poverty by department (census-population weighted)")
```

Night-time lights cover the 339 municipalities of the 2015 map (`map339`), but the raw series has no value for a few of them in 2020, and the coverage shows it. Their logs have no aggregation rule, so an explicit rule is needed:

```{code-cell} ipython3
ntl_dep = geo.aggregate(geo.load("ntl", years=2020), to="department",
                        rules={"ln_NTLpc": "mean"}, variables="ln_NTLpc")
ntl_dep[["geo_id", "ln_NTLpc", "n_units", "coverage"]]
```

`geo.combine()` puts several datasets on one scale, aggregating them as needed:

```{code-cell} ipython3
goals = geo.combine(["sdg03", "sdg04"], scale="department", years=2024)
goals = geo.add_names(goals)
px.scatter(goals, x="index_sdg3", y="index_sdg4", text="name",
           labels=geo.labels(goals), title="Health and education by department, ~2024")
```

## 6. Link your own table

Tables from reports and ministries identify units by name, spelled in many ways, or by INE code. `geo.link()` attaches the observatory's `geo_id`. It ignores accents, case, spaces and punctuation, and tries every name and code column in `geo.units()`.

The values below are **made up** for the demonstration; replace them with your own data.

```{code-cell} ipython3
mine = pd.DataFrame({
    "Departamento": ["LA PAZ", "Cochabamba", "Santa Cruz", "Potosi", "Chuquisaca",
                     "La Paz"],
    "year":         [2024, 2024, 2024, 2024, 2024, 2025],
    "clinics":      [412, 301, 388, 266, 190, 420],          # illustrative values
})
mine = geo.link(mine, scale="department", on="Departamento")
print(geo.check(mine, scale="department"))   # [] = a valid panel
mine
```

Municipal statistics from INE (and every DS4Bolivia table) carry codes. Link them by code: INE's 6-digit `ine_code`, the same code as a number (`mun_id`), or DS4Bolivia's `asdf_id`. The names follow the Atlas, so the capital is *Nuestra Señora de La Paz*:

```{code-cell} ipython3
ine = pd.DataFrame({"codigo": [20101, 20105, 70101, 30101, 10101],
                    "teachers": [9120, 6211, 11034, 5980, 2870]})   # illustrative
linked = geo.link(ine, scale="map343", on="codigo", key="mun_id")
geo.add_names(linked, groups=["department"])
```

Older spellings still link: by default `geo.link()` also tries `name_ds4bolivia` and `name_gadm`, so "La Paz" finds the capital. A name shared by several municipalities, or a typo, stops with an explanation instead of silently linking the wrong unit:

```{code-cell} ipython3
for value in ["San Javier", "Cochabmba"]:
    table = pd.DataFrame({"m": [value]})
    try:
        geo.link(table, scale="map343", on="m", key="name")
    except ValueError as err:
        print(err, "\n")
```

## 7. Build an indicator from a raster

`geo.zonal()` summarises any GeoTIFF (for example an export from Google Earth Engine, or a WorldPop population grid) over the units of a scale. As a self-contained example, we compute a raster of **distance to the nearest of Bolivia's three largest cities** (La Paz, Cochabamba and Santa Cruz de la Sierra, the "central axis"), a simple proxy of market access, and average it over municipalities.

```{code-cell} ipython3
import rasterio
from rasterio.transform import from_bounds

CITIES = {"La Paz": (-16.4955, -68.1336), "Cochabamba": (-17.3895, -66.1568),
          "Santa Cruz": (-17.7833, -63.1821)}

x0, y0, x1, y1 = geo.boundaries("country").total_bounds
nx, ny = 900, 1000                                             # about 1.5 km pixels
LON, LAT = np.meshgrid(np.linspace(x0, x1, nx), np.linspace(y1, y0, ny))

def haversine_km(lat, lon, lat0, lon0):
    lat, lon, lat0, lon0 = map(np.radians, (lat, lon, lat0, lon0))
    a = (np.sin((lat - lat0) / 2) ** 2
         + np.cos(lat0) * np.cos(lat) * np.sin((lon - lon0) / 2) ** 2)
    return 2 * 6371 * np.arcsin(np.sqrt(a))

km = np.min([haversine_km(LAT, LON, la, lo) for la, lo in CITIES.values()], axis=0)

with rasterio.open("distance_to_main_cities.tif", "w", driver="GTiff", width=nx,
                   height=ny, count=1, dtype="float32", crs="EPSG:4326",
                   transform=from_bounds(x0, y0, x1, y1, nx, ny)) as dst:
    dst.write(km.astype("float32"), 1)

access = geo.zonal("distance_to_main_cities.tif", scale="map343",
                   stats=["mean", "max"], name="dist_axis_km")
access.head()
```

The result has one row per municipality and a `geo_id`, so it joins any dataset of the observatory. Step 9 uses it in a regression.

## 8. Interpolate to a grid and save

Grids, watersheds or a different municipality map do not nest in the administrative hierarchy. `geo.overlay()` moves data onto them by area weights. Totals (`extensive`) are split by area; rates (`intensive`) are area-weighted means. Here the census population of 2024 goes onto a 50 km grid, assuming that people are spread evenly within each municipality, and `geo.map()` draws it: it maps any table with a `geo_id` column and a geometry.

```{code-cell} ipython3
from shapely.geometry import box

crs = geo.config()["equal_area_crs"]          # Albers equal-area for Bolivia, metres
country = geo.boundaries("country").to_crs(crs)
gx0, gy0, gx1, gy1 = country.total_bounds
size = 50_000
cells = [box(x, y, x + size, y + size)
         for x in np.arange(gx0, gx1, size) for y in np.arange(gy0, gy1, size)]
grid = gpd.GeoDataFrame({"geo_id": [f"c{i}" for i in range(len(cells))]},
                        geometry=cells, crs=crs)
grid = grid[grid.intersects(country.geometry.iloc[0])].to_crs("EPSG:4326")

census_2024 = geo.load("sdg", variables="population", years=2024)
on_grid = geo.overlay(census_2024, grid, extensive=["population"], id_col="geo_id")
print(f"municipalities: {census_2024['population'].sum():,.0f}  "
      f"grid: {on_grid['population'].sum():,.0f}")              # the total is kept

geo.map(grid.merge(on_grid, on="geo_id"), "population", scheme="quantiles",
        title="Census population 2024 on a 50 km grid")
```

Finally, save your indicator exactly like the published datasets: CSV, Parquet and a Frictionless datapackage describing every variable. It is then easy to share, reload or contribute to the observatory ([CONTRIBUTING_DATA.md](https://github.com/quarcs-lab/gdo4bolivia/blob/main/CONTRIBUTING_DATA.md)).

```{code-cell} ipython3
access["year"] = 2024
variables = {
    "dist_axis_km_mean": {"label": "Mean distance to the central axis (km)",
                          "description": "Mean distance to the nearest main city",
                          "unit": "km", "aggregation": "none"},
    "dist_axis_km_max": {"label": "Maximum distance to the central axis (km)",
                         "description": "Maximum distance to the nearest main city",
                         "unit": "km", "aggregation": "max"},
}
datapackage = geo.save(
    access, "market_access", scale="map343", directory="my_data",
    title="Distance to the central axis", variables=variables,
    description="Mean and maximum straight-line distance from each municipality to "
                "the nearest of La Paz, Cochabamba and Santa Cruz de la Sierra.")
```

## 9. Analyse

The package also runs the standard analyses of spatial data science. Each one is a single call that takes a panel (or just a dataset id), finds the boundaries and builds the spatial weights by itself. This step shows one call per family on one indicator, the Sustainable Development Index (IDS, 0 to 100) of the dataset `sdg`, joined with the distance indicator of step 7. The observatory's variables take their labels from the metadata; `geo.labels(..., own=...)` gives a label to a column of your own, which the figures, tables and readings then use.

```{code-cell} ipython3
panel = geo.load("sdg", groups=["department"]).merge(
    access[["geo_id", "dist_axis_km_mean"]], on="geo_id")
geo.labels(panel, own={"dist_axis_km_mean": "Mean distance to the central axis (km)"})
panel.head(4)
```

### Maps

`geo.map()` draws any variable. With a classification scheme and a list of years, it puts the periods side by side in the same classes (here natural breaks computed over both years), so a colour means the same on both maps. `change=True` maps the change instead.

```{code-cell} ipython3
geo.map(panel, "index_sdg", year=[2012, 2024], scheme="fisher_jenks")
```

### Spatial dependence, and the result object

Is sustainable development clustered in space? Global Moran's I answers for the whole country.

```{code-cell} ipython3
res = geo.moran(panel, "index_sdg", year=2024)
res
```

Every analysis returns a **result object**. Displayed, as above, it shows its main figure and a reading of the numbers. Its parts are there to use one by one:

| Attribute | What it holds |
| --- | --- |
| `res.fig` | the main figure (Plotly, interactive); some results have more, e.g. `fig_map` |
| `res.df` | the table behind it, one row per unit or year, with `geo_id` and `name` |
| `res.gt` | a formatted table, where one helps (regressions, summaries) |
| `res.moran_i`, `res.p_sim`, ... | the numbers, by name |
| `res.interpret()` | the reading in words; it describes associations, never causes |
| `res.notes` | what the function decided for you (units left out, years used) |

```{code-cell} ipython3
print(round(res.moran_i, 3), res.p_sim, "|", res.w_spec)
res.df.head(3)
```

*Where* are the clusters? Local Moran statistics (LISA) put them on the map:

```{code-cell} ipython3
geo.lisa(panel, "index_sdg", year=2024)
```

### Convergence

Did the municipalities that started lower catch up? β-convergence regresses each unit's yearly growth between the two periods on the logarithm of its initial level; a negative slope means that the lower a unit started, the faster it grew.

```{code-cell} ipython3
geo.beta_convergence(panel, "index_sdg")
```

### Inequality

Did the gaps between municipalities narrow? `geo.inequality()` computes the Gini and Theil indices in each year; `.fig_lorenz` has the Lorenz curves.

```{code-cell} ipython3
geo.inequality(panel, "index_sdg")
```

### Regression

What goes with a high index? `geo.regression()` estimates several specifications side by side. Here the first has the urbanization rate alone; the second adds the distance to the central axis built in step 7 and compares municipalities within the same department (`fixed_effects`). `.gt` is the regression table.

```{code-cell} ipython3
reg = geo.regression(panel, "index_sdg",
                     [["urbanization"], ["urbanization", "dist_axis_km_mean"]],
                     fixed_effects=[None, "department"])
reg.gt
```

```{code-cell} ipython3
reg
```

Together, the five results say this. Sustainable development is clustered in space (Moran's I of 0.47 in 2024): the LISA map finds 60 municipalities in high-value clusters and 45 in low-value clusters. The municipalities that started lower grew faster (a slope of -0.029, which closes half of a gap in about 20 years), and the Gini index fell from 0.065 to 0.049. In 2024, ten more percentage points of urban population go with an index about one point higher, also among municipalities of the same department, while the distance to the central axis shows no association with the index once urbanization and the department are taken into account (-0.002 points per km, not statistically significant). These are associations, not causal effects.

### The rest of the package

The same pattern, a call that returns a result object, covers the other analyses:

| Family | Functions |
| --- | --- |
| Explore | `correlation`, `extremes`, `distribution`, `scatter`, `trend` |
| Maps and spatial dependence | `map`, `weights`, `connectivity`, `moran`, `lisa` |
| Convergence | `beta_convergence`, `sigma_convergence`, `convergence_clubs` |
| Transitions and mobility | `transitions`, `spatial_transitions`, `lisa_transitions`, `rank_mobility` |
| Inequality | `inequality`, `theil_decomposition` |
| Models | `regression`, `panel_model`, `spatial_model`, `spatial_diagnostics` |
| Spatial heterogeneity | `mgwr` |

A few of them need an extra library, installed with the package when you ask for it: `"geo4bolivia[dynamics]"` (`transitions`, `spatial_transitions`), `"geo4bolivia[panel]"` (`panel_model`), `"geo4bolivia[mgwr]"` (`mgwr`), or `"geo4bolivia[all]"`. Your own choices replace the defaults: `geo.weights()` builds other spatial weights to pass as `w=`, and `gdf=` supplies boundaries for units the package does not know.

## Next steps

- The [package documentation](https://quarcs-lab.github.io/geo4bolivia/): [Get started](https://quarcs-lab.github.io/geo4bolivia/get-started.html), [Explore](https://quarcs-lab.github.io/geo4bolivia/explore.html), [Analyze](https://quarcs-lab.github.io/geo4bolivia/analyze.html) and the [function reference](https://quarcs-lab.github.io/geo4bolivia/reference/), with an example per function
- One question, did Bolivia's municipalities converge, answered with geo4bolivia and its companion packages expdpy and geometrics: [`three_packages.ipynb`](https://colab.research.google.com/github/quarcs-lab/gdo4bolivia/blob/main/notebooks/three_packages.ipynb)
- Exploring multidimensional poverty with the exploration functions: [`eda.ipynb`](https://colab.research.google.com/github/quarcs-lab/gdo4bolivia/blob/main/notebooks/eda.ipynb)
- Change, convergence and rank mobility of the 15 goals: [`sdg_dynamics.ipynb`](https://colab.research.google.com/github/quarcs-lab/gdo4bolivia/blob/main/notebooks/sdg_dynamics.ipynb)
- How the data are organised: [the data infrastructure](https://github.com/quarcs-lab/gdo4bolivia/blob/main/docs/data-infrastructure.md)
- Every function also has help: `help(geo.change)`
