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

<a href="https://colab.research.google.com/github/quarcs-lab/geo4bolivia/blob/main/notebooks/geo4bolivia_quickstart.ipynb" target="_parent"><img src="https://colab.research.google.com/assets/colab-badge.svg" alt="Open In Colab"/></a>

# Find, load and understand Bolivia's subnational data with `geo4bolivia`

Part of the [GeoDevelopment Observatory of Bolivia](https://quarcs-lab.github.io/geo4bolivia/).

`geo4bolivia` is the observatory's Python package and the way into its data: the SDG Atlas of Bolivia 2026 (the Sustainable Development Index, 15 goal indices and 81 indicators near 2012 and near 2024), population, night-time lights and satellite embeddings, for Bolivia's 343 municipalities and indigenous autonomies. This notebook follows the [tutorial on the website](https://quarcs-lab.github.io/geo4bolivia/tools/geo4bolivia-package/):

1. **Discover** what is available, what each variable means and how to cite it
2. **Load** a panel, with and without the package
3. **Understand** a variable: summaries, labels and maps
4. **Compare the two periods**: change and rank mobility
5. **Move across scales**: municipalities, provinces, departments and the country
6. **Link your own table** by name or INE code
7. **Build an indicator from a raster**
8. **Interpolate to a grid** and **save** your dataset in the observatory's format

Every function is documented, with an example, in the [function reference](https://quarcs-lab.github.io/geo4bolivia/tools/geo4bolivia-reference/). The [three-packages notebook](https://colab.research.google.com/github/quarcs-lab/geo4bolivia/blob/main/notebooks/three_packages.ipynb) continues with the companion packages expdpy and geometrics.

+++

## 0. Setup

In Google Colab the next cell installs the package (a few seconds: Colab already has its dependencies, including plotly for the interactive maps). Locally, `uv sync` has installed it already.

```{code-cell} ipython3
import importlib.util

if importlib.util.find_spec("geo4bolivia") is None:
    !pip install -q "geo4bolivia[raster]" mapclassify
```

```{code-cell} ipython3
from pathlib import Path

import numpy as np
import pandas as pd
import geopandas as gpd
import matplotlib.pyplot as plt
import plotly.express as px

import geo4bolivia as geo

print("geo4bolivia", geo.__version__)
```

## 1. Discover what is available

The catalog lists every dataset with its scale, its years and the number of units with data. The SDG Atlas has two periods for all 343 units; the datasets DS4Bolivia computed on the older 2015 map (population, lights, embeddings) cover the 333 municipalities whose territory has not changed since.

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

The dictionary describes every column: readable label, definition, unit, aggregation rule and, when they differ from the stored years, the actual reference years.

```{code-cell} ipython3
geo.dictionary("sdg03")[["variable", "label", "unit", "aggregation", "reference_years"]]
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

- **`data/<scale>/<dataset>.csv`**: the indicators, as a panel with one row per unit (`geo_id`) and year
- **`geo/units.csv`**: names, parent units and the codes other sources use (INE, DS4Bolivia, GADM)
- **`geo/boundaries/<scale>.geojson`**: polygons, keyed by the same `geo_id`

```{code-cell} ipython3
BASE = "https://raw.githubusercontent.com/quarcs-lab/geo4bolivia/main/"

# Inside a clone of the repository, read the local files instead (Colab uses the URLs)
local = next((p for p in [Path.cwd(), *Path.cwd().parents] if (p / "geo" / "units.csv").is_file()), None)
if local is not None:
    BASE = local.as_posix() + "/"

sdg01 = pd.read_csv(BASE + "data/municipality/sdg01.csv")              # 343 units x 2 periods
units = pd.read_csv(BASE + "geo/units.csv", dtype={"ine_code": str})   # 466 units at 4 scales
municipalities = gpd.read_file(BASE + "geo/boundaries/municipality.geojson")
sdg01.head()
```

### With the package

`geo.load()` does the same in one line, and more: it picks variables and years, adds the unit names and the department or province each unit lies in, attaches boundaries, or reshapes to one column per year.

```{code-cell} ipython3
mpi = geo.load("sdg01", variables="sdg1_2_mpi", groups=["department"])
mpi.head()
```

```{code-cell} ipython3
ids_2024 = geo.load("sdg", years=2024, geometry=True)          # a GeoDataFrame
pop_wide = geo.load("pop", variables="pop", wide="pop")         # one column per year
print(type(ids_2024).__name__, ids_2024.shape, "|", pop_wide.shape)
```

`geo.units()` has every unit's name, parents and source codes:

```{code-cell} ipython3
geo.units("municipality")[["geo_id", "name", "ine_code", "province_id", "department_id", "area_km2"]].head()
```

The Multidimensional Poverty Index (`sdg1_2_mpi`, 0 to 1, higher = poorer) comes from the censuses themselves. With the same classes in both maps, the change is plain to see:

```{code-cell} ipython3
mpi_map = municipalities.merge(sdg01[["geo_id", "year", "sdg1_2_mpi"]], on="geo_id")
bins = {"bins": [0.05, 0.1, 0.2, 0.3, 0.6]}

fig, axes = plt.subplots(1, 2, figsize=(13, 7))
for ax, year in zip(axes, [2012, 2024]):
    mpi_map[mpi_map["year"] == year].plot(
        column="sdg1_2_mpi", cmap="YlOrRd", scheme="user_defined", classification_kwds=bins,
        legend=True, legend_kwds={"title": f"MPI, {year}", "loc": "lower left"},
        edgecolor="white", linewidth=0.1, ax=ax)
    ax.set_axis_off()
    ax.set_title(f"Multidimensional poverty, {year}")
fig.suptitle("343 municipalities of Bolivia");
```

## 3. Understand a variable

`geo.describe()` summarises variables per period, with their labels and units; `by=` summarises each group instead.

```{code-cell} ipython3
edu = geo.load("sdg04", variables=["index_sdg4", "sdg4_6_alf"], groups=["department"])
geo.describe(edu)
```

```{code-cell} ipython3
geo.describe(edu, variables="index_sdg4", by="department")
```

`geo.labels()` names any column for a plot, and `geo.map()` draws an interactive map (hover over a municipality to see its name and value):

```{code-cell} ipython3
px.box(edu, x="department", y="sdg4_6_alf", color="year", labels=geo.labels(edu),
       title="Literacy by department, ~2012 and ~2024")
```

```{code-cell} ipython3
geo.map(edu, "index_sdg4", year=2024)
```

## 4. Compare the two periods

`geo.change()` turns a panel into one row per unit: its first and last values, the absolute, percentage and annual change, and its rank in each period (1 = highest).

```{code-cell} ipython3
ids = geo.load("sdg", variables="index_sdg", groups=["department"])
chg = geo.change(ids, "index_sdg")
chg.nlargest(5, "index_sdg_change")[["name", "department", "index_sdg_2012", "index_sdg_2024", "index_sdg_change"]]
```

```{code-cell} ipython3
print(f"The IDS rose in {(chg['index_sdg_change'] > 0).sum()} of {len(chg)} units, "
      f"by {chg['index_sdg_change'].mean():.1f} points on average.")
r = np.corrcoef(chg["index_sdg_2012"], chg["index_sdg_change"])[0, 1]
print(f"Correlation between the initial level and the change: {r:.2f}")
```

The units that started lower gained more. Ranks moved too: points above the diagonal fell in the ranking, points below it climbed.

```{code-cell} ipython3
px.scatter(chg, x="index_sdg_rank_2012", y="index_sdg_rank_2024", color="department",
           hover_name="name", labels=geo.labels(chg),
           title="Rank mobility in the Sustainable Development Index (1 = highest)")
```

## 5. Move across scales

Every geo ID nests by prefix: municipality `BO-04-17-04` lies in province `BO-04-17`, in department `BO-04`, in Bolivia `BO`. `geo.aggregate()` moves a panel up with each variable's rule from the metadata. The SDG indicators average with census-population weights (the 2012 census for ~2012, the 2024 census for ~2024), which the package loads from the `sdg` dataset by itself. These are approximations, not the Atlas's own department figures. `n_units` and `coverage` tell how many municipalities each result rests on.

```{code-cell} ipython3
up = geo.aggregate(mpi, to=["department", "country"], dataset="sdg01")
up.tail(4)
```

```{code-cell} ipython3
dep = geo.add_names(up[up["scale"] == "department"])
px.line(dep, x="year", y="sdg1_2_mpi", color="name", markers=True, labels=geo.labels(dep),
        title="Multidimensional poverty by department (census-population weighted)")
```

Night-time lights cover 333 of the 343 municipalities, and the coverage shows it. Their logs have no aggregation rule, so an explicit rule is needed:

```{code-cell} ipython3
geo.aggregate(geo.load("ntl", years=2020), to="department", rules={"ln_NTLpc": "mean"},
              variables="ln_NTLpc")[["geo_id", "ln_NTLpc", "n_units", "coverage"]]
```

`geo.combine()` puts several datasets on one scale, aggregating them as needed:

```{code-cell} ipython3
goals = geo.add_names(geo.combine(["sdg03", "sdg04"], scale="department", years=2024))
px.scatter(goals, x="index_sdg3", y="index_sdg4", text="name", labels=geo.labels(goals),
           title="Health and education by department, ~2024")
```

## 6. Link your own table

Tables from reports and ministries identify units by name, spelled in many ways, or by INE code. `geo.link()` attaches the observatory's `geo_id`. It ignores accents, case, spaces and punctuation, and tries every name and code column in `geo.units()`.

The values below are **made up** for the demonstration; replace them with your own data.

```{code-cell} ipython3
mine = pd.DataFrame({
    "Departamento": ["LA PAZ", "Cochabamba", "Santa Cruz", "Potosi", "Chuquisaca", "La Paz"],
    "year":         [2024, 2024, 2024, 2024, 2024, 2025],
    "clinics":      [412, 301, 388, 266, 190, 420],          # illustrative values
})
mine = geo.link(mine, scale="department", on="Departamento")
mine
```

```{code-cell} ipython3
geo.check(mine, scale="department")        # [] = a valid panel: known ids, one row per unit and year
```

Municipal statistics from INE (and every DS4Bolivia table) carry codes. Link them by code: INE's 6-digit `ine_code`, the same code as a number (`mun_id`), or DS4Bolivia's `asdf_id`. The names follow the Atlas, so the capital is *Nuestra Señora de La Paz*:

```{code-cell} ipython3
ine = pd.DataFrame({"codigo": [20101, 20105, 70101, 30101, 10101], "teachers": [9120, 6211, 11034, 5980, 2870]})
geo.add_names(geo.link(ine, scale="municipality", on="codigo", key="mun_id"), groups=["department"])
```

Older spellings still link: by default `geo.link()` also tries `name_ds4bolivia` and `name_gadm`, so "La Paz" finds the capital. A name shared by several municipalities, or a typo, stops with an explanation instead of silently linking the wrong unit:

```{code-cell} ipython3
for value in ["San Javier", "Cochabmba"]:
    try:
        geo.link(pd.DataFrame({"m": [value]}), scale="municipality", on="m", key="name")
    except ValueError as err:
        print(err, "\n")
```

## 7. Build an indicator from a raster

`geo.zonal()` summarises any GeoTIFF (for example an export from Google Earth Engine, or a WorldPop population grid) over the units of a scale. As a self-contained example, we compute a raster of **distance to the nearest of Bolivia's three largest cities** (La Paz, Cochabamba and Santa Cruz de la Sierra, the "central axis"), a simple proxy of market access, and average it over municipalities.

```{code-cell} ipython3
import rasterio
from rasterio.transform import from_bounds

CITIES = {"La Paz": (-16.4955, -68.1336), "Cochabamba": (-17.3895, -66.1568), "Santa Cruz": (-17.7833, -63.1821)}

x0, y0, x1, y1 = geo.boundaries("country").total_bounds
nx, ny = 900, 1000                                             # about 1.5 km pixels
LON, LAT = np.meshgrid(np.linspace(x0, x1, nx), np.linspace(y1, y0, ny))

def haversine_km(lat, lon, lat0, lon0):
    lat, lon, lat0, lon0 = map(np.radians, (lat, lon, lat0, lon0))
    a = np.sin((lat - lat0) / 2) ** 2 + np.cos(lat0) * np.cos(lat) * np.sin((lon - lon0) / 2) ** 2
    return 2 * 6371 * np.arcsin(np.sqrt(a))

km = np.min([haversine_km(LAT, LON, la, lo) for la, lo in CITIES.values()], axis=0)

with rasterio.open("distance_to_main_cities.tif", "w", driver="GTiff", width=nx, height=ny, count=1,
                   dtype="float32", crs="EPSG:4326", transform=from_bounds(x0, y0, x1, y1, nx, ny)) as dst:
    dst.write(km.astype("float32"), 1)

access = geo.zonal("distance_to_main_cities.tif", scale="municipality", stats=["mean", "max"], name="dist_axis_km")
access.head()
```

Is distance to the central axis associated with poverty, and has that changed? Join the new indicator to the poverty data of both periods:

```{code-cell} ipython3
d = mpi.merge(access, on="geo_id")
for year, g in d.groupby("year"):
    print(f"{year}: correlation {g['dist_axis_km_mean'].corr(g['sdg1_2_mpi']):.2f}")
px.scatter(d, x="dist_axis_km_mean", y="sdg1_2_mpi", facet_col="year", hover_name="name",
           labels={**geo.labels(d), "dist_axis_km_mean": "Mean distance to La Paz, Cochabamba or Santa Cruz (km)"},
           title="Poverty and distance to the central axis")
```

Only weakly: municipalities far from the three cities were slightly poorer in 2012, and by 2024 the association has almost vanished.

## 8. Interpolate to a grid and save

Grids, watersheds or a different municipality map do not nest in the administrative hierarchy. `geo.overlay()` moves data onto them by area weights. Totals (`extensive`) are split by area; rates (`intensive`) are area-weighted means.

```{code-cell} ipython3
from shapely.geometry import box

crs = geo.config()["equal_area_crs"]                          # Albers equal-area fitted to Bolivia, metres
country = geo.boundaries("country").to_crs(crs)
gx0, gy0, gx1, gy1 = country.total_bounds
size = 25_000
cells = [box(x, y, x + size, y + size) for x in np.arange(gx0, gx1, size) for y in np.arange(gy0, gy1, size)]
grid = gpd.GeoDataFrame({"cell": [f"c{i}" for i in range(len(cells))]}, geometry=cells, crs=crs)
grid = grid[grid.intersects(country.geometry.iloc[0])].to_crs("EPSG:4326")

census_2024 = geo.load("sdg", variables="population", years=2024)
on_grid = geo.overlay(census_2024, grid, extensive=["population"], id_col="cell")
print(f"municipalities: {census_2024['population'].sum():,.0f}  grid: {on_grid['population'].sum():,.0f}")   # totals are kept

ax = grid.merge(on_grid.rename(columns={"geo_id": "cell"}), on="cell").plot(
    column="population", cmap="magma_r", scheme="quantiles", k=6, figsize=(7, 7))
ax.set_axis_off(); ax.set_title("Census population 2024 on a 25 km grid (assumes even spread within municipalities)");
```

Finally, save your indicator exactly like the published datasets: CSV, Parquet and a Frictionless datapackage describing every variable. It is then easy to share, reload or contribute to the observatory ([CONTRIBUTING_DATA.md](https://github.com/quarcs-lab/geo4bolivia/blob/main/CONTRIBUTING_DATA.md)).

```{code-cell} ipython3
access["year"] = 2024
geo.save(access[["geo_id", "year", "dist_axis_km_mean", "dist_axis_km_max"]], "market_access", scale="municipality",
         directory="my_data", title="Distance to the central axis",
         description="Mean and maximum straight-line distance from each municipality to the nearest of La Paz, Cochabamba and Santa Cruz de la Sierra.",
         variables={"dist_axis_km_mean": {"label": "Mean distance to the central axis (km)",
                                          "description": "Mean distance to the nearest main city", "unit": "km", "aggregation": "none"},
                    "dist_axis_km_max": {"label": "Maximum distance to the central axis (km)",
                                         "description": "Maximum distance to the nearest main city", "unit": "km", "aggregation": "max"}})
```

## Next steps

- One question through the three packages (geo4bolivia, expdpy, geometrics): [`three_packages.ipynb`](https://colab.research.google.com/github/quarcs-lab/geo4bolivia/blob/main/notebooks/three_packages.ipynb)
- Change, convergence and rank mobility of the 15 goals: [`sdg_dynamics.ipynb`](https://colab.research.google.com/github/quarcs-lab/geo4bolivia/blob/main/notebooks/sdg_dynamics.ipynb)
- Every function, with an example: the [function reference](https://quarcs-lab.github.io/geo4bolivia/tools/geo4bolivia-reference/)
- The full guide: [how the data infrastructure works](https://github.com/quarcs-lab/geo4bolivia/blob/main/docs/data-infrastructure.md)
- Every function also has help: `help(geo.change)`
