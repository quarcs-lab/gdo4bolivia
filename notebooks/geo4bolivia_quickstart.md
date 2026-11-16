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

# Load, link and build Bolivian indicators with `geo4bolivia`

Part of the [GeoDevelopment Observatory of Bolivia](https://quarcs-lab.github.io/geo4bolivia/).

This notebook is a hands-on tour of the observatory's data for Bolivia's 343 municipalities and indigenous autonomies:

1. **Load data without the package**: every file is a plain URL
2. **Load data with the package** `geo4bolivia`
3. **Move data across scales**: municipalities, provinces, departments and the country
4. **Link your own table** to the observatory's units, by name or by INE code
5. **Build a new indicator from a raster**
6. **Interpolate to a grid**, then **save** your dataset in the observatory's format

The companion notebooks ([list](https://github.com/quarcs-lab/geo4bolivia/tree/main/notebooks)) analyse the same data: exploratory spatial analysis, inequality, geographically weighted regression, and poverty prediction from satellite embeddings.

+++

## 0. Setup

In Google Colab the next cell installs the package (a few seconds: Colab already has its dependencies). Locally, `uv sync` has installed it already.

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
```

## 1. Load data without the package

Every published file is a plain URL, so pandas, geopandas, R, Stata or Excel can read it directly. Three kinds of files matter:

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

The SDG data come from the [Atlas de los ODS en Bolivia 2026](https://atlasods.sdsnbolivia.org/) (Andersen & Argandoña, SDSN Bolivia). Each indicator has two values, an initial one stored at **2012** and a final one stored at **2024**, the years of the last two censuses. The Multidimensional Poverty Index (`sdg1_2_mpi`, 0 to 1, higher = poorer) comes from the censuses themselves, so its values refer exactly to 2012 and 2024. With the same classes in both maps, the change is plain to see:

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
fig.suptitle("343 municipalities of Bolivia (no package needed)");
```

## 2. Load data with the package

The package does the same in one line, and more: it lists the datasets, describes their variables, filters years and variables, reshapes, and attaches boundaries.

```{code-cell} ipython3
import geo4bolivia as geo

geo.datasets()
```

```{code-cell} ipython3
geo.dictionary("sdg01")     # every variable: label, description, unit, aggregation rule, source
```

The Atlas is published as one dataset per goal (`sdg01` to `sdg17`; it has no index for goals 12 and 14), each with the goal's index (`index_sdgN`, 0–100, higher = better) and its indicators, and a dataset `sdg` with the overall **Sustainable Development Index** (IDS, `index_sdg`), its ranking and the census population. Not every indicator was measured in a census year: the description of each variable gives its actual reference years (energy poverty, for example, refers to 2016 and 2024).

`geometry=True` returns a GeoDataFrame, ready to map; `wide=` gives one column per period, convenient for changes:

```{code-cell} ipython3
ids = geo.load("sdg", variables="index_sdg", wide="index_sdg")
ids["change"] = ids["index_sdg2024"] - ids["index_sdg2012"]

gdf = geo.boundaries("municipality").merge(ids, on="geo_id")
ax = gdf.plot(column="change", cmap="viridis", scheme="quantiles", k=5, legend=True,
              legend_kwds={"title": "IDS points", "loc": "lower left"}, edgecolor="white", linewidth=0.1,
              figsize=(8, 8))
ax.set_axis_off()
ax.set_title("Change in the Sustainable Development Index, 2012-2024")
ids.describe().round(1)
```

The average municipality's IDS rose from 50.1 to 60.1 points (median change 9.9). Only San José de Chiquitos (Santa Cruz, -2.7) went backwards; Cruz de Machacamarca and Carangas (Oruro) gained about 20 points.

```{code-cell} ipython3
# The package can attach the boundaries itself; here the IDS of 2024, best and worst
best = geo.load("sdg", variables=["index_sdg", "rank_sdg"], years=2024, geometry=True)
pd.concat([best.nsmallest(3, "rank_sdg"), best.nlargest(3, "rank_sdg")])[["geo_id", "name", "index_sdg", "rank_sdg"]]
```

In 2024 the capitals Nuestra Señora de La Paz, Tarija and Sucre rank first; the last places go to TIOC-Raqaypampa, one of the four units created after 2012, and to Tinguipaya and Ocurí in Potosí.

```{code-cell} ipython3
# A window of years and a variable from another dataset
lights = geo.load("ntl", years=(2012, 2016), variables=["ln_NTLpc"])
lights.head(3)
```

```{code-cell} ipython3
# names, parents, and the codes each source uses: GADM (gid), INE (ine_code, mun_id), DS4Bolivia (asdf_id)
geo.units("municipality").head(3)
```

## 3. Move data across scales

Each scale nests in the coarser ones, and each variable's metadata says how it may be aggregated: `sum` for totals such as population, `none` for logs, rates and indices that need weights.

```{code-cell} ipython3
geo.scales()          # the registry of scales
```

The census population is in the `sdg` dataset, in both census years:

```{code-cell} ipython3
census = geo.load("sdg", variables="population")
by_department = geo.aggregate(census, to="department", dataset="sdg")    # 343 municipalities -> 9 departments
by_department = by_department.pivot(index="geo_id", columns="year", values="population").reset_index()
by_department["growth_%"] = (100 * (by_department[2024] / by_department[2012] - 1)).round(1)
by_department.merge(geo.units("department")[["geo_id", "name"]], on="geo_id").sort_values(2024, ascending=False)
```

Santa Cruz overtook La Paz as the most populous department; Pando grew fastest (22%), Potosí and Chuquisaca slowest (4%).

Poverty is a rate, so its departmental value is a **population-weighted** mean. `weights=` brings the census population of the same period:

```{code-cell} ipython3
mpi = geo.load("sdg01", variables="sdg1_2_mpi")
mpi_dep = geo.aggregate(mpi, to="department", rules={"sdg1_2_mpi": "weighted_mean:population"}, weights=census)
mpi_dep = geo.boundaries("department").merge(mpi_dep, on="geo_id")

fig, axes = plt.subplots(1, 2, figsize=(13, 7))
for ax, year in zip(axes, [2012, 2024]):
    d = mpi_dep[mpi_dep["year"] == year]
    d.plot(column="sdg1_2_mpi", cmap="YlOrRd", vmin=0, vmax=mpi_dep["sdg1_2_mpi"].max(), legend=True,
           edgecolor="white", ax=ax, legend_kwds={"label": "MPI, population-weighted", "shrink": 0.6})
    for _, row in d.iterrows():
        p = row.geometry.representative_point()
        ax.annotate(f"{row['name']}\n{row['sdg1_2_mpi']:.3f}", (p.x, p.y), ha="center", fontsize=7)
    ax.set_axis_off()
    ax.set_title(f"Multidimensional poverty by department, {year}")
plt.tight_layout()
```

```{code-cell} ipython3
national = geo.aggregate(mpi, to="country", rules={"sdg1_2_mpi": "weighted_mean:population"}, weights=census)
national
```

Multidimensional poverty fell sharply. The population-weighted national MPI dropped from 0.133 in 2012 to 0.033 in 2024, and each department's to between 18% and 32% of its 2012 value. In 2012 Pando (0.236), Beni, Potosí and Chuquisaca were the poorest departments and Tarija (0.079) the least poor; in 2024 Beni (0.072) and Potosí are the poorest and Santa Cruz (0.017) and Tarija the least poor.

`geo.combine()` loads several datasets at one scale, aggregating finer ones on the way. Here night-time lights and WorldPop population meet poverty in 2012. Lights and WorldPop cover **333 of the 343 units**: they were computed on the older 339-unit map, so the six municipalities that have since lost territory and the four new units have no values. The inner merge keeps the 333. The relation is a classic one: brighter municipalities are less poor.

```{code-cell} ipython3
panel = geo.combine(["ntl", "pop"], scale="municipality", years=2012).merge(mpi, on=["geo_id", "year"])
print(f"units with lights, population and poverty: {len(panel)}")

ax = panel.plot.scatter(x="ln_t400NTLpc", y="sdg1_2_mpi", s=np.sqrt(panel["pop"]) / 4, alpha=0.5, figsize=(6, 4))
ax.set_xlabel("Log night-time lights per capita (trend), 2012"); ax.set_ylabel("Multidimensional Poverty Index, 2012")
print(f"correlation: {panel['ln_t400NTLpc'].corr(panel['sdg1_2_mpi']):.2f}")
```

The correlation is -0.54 across the 333 units.

## 4. Link your own table

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
geo.link(ine, scale="municipality", on="codigo", key="mun_id").merge(
    geo.units("municipality")[["geo_id", "name"]], on="geo_id")
```

Older spellings still link: by default `geo.link()` also tries `name_ds4bolivia` and `name_gadm`, so "La Paz" finds the capital.

```{code-cell} ipython3
geo.link(pd.DataFrame({"m": ["La Paz", "Potosi"]}), scale="municipality", on="m")
```

A name shared by several municipalities, or a typo, stops with an explanation instead of silently linking the wrong unit:

```{code-cell} ipython3
for value in ["San Javier", "Cochabmba"]:
    try:
        geo.link(pd.DataFrame({"m": [value]}), scale="municipality", on="m", key="name")
    except ValueError as err:
        print(err, "\n")
```

## 5. Build a new indicator from a raster

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
ax = d.plot.scatter(x="dist_axis_km_mean", y="sdg1_2_mpi", c=d["year"].map({2012: "tab:orange", 2024: "tab:blue"}),
                    alpha=0.5, figsize=(6, 4))
ax.set_xlabel("Mean distance to La Paz, Cochabamba or Santa Cruz (km)")
ax.set_ylabel("Multidimensional Poverty Index")
ax.set_title("Orange: 2012, blue: 2024")
for year, g in d.groupby("year"):
    print(f"{year}: correlation {g['dist_axis_km_mean'].corr(g['sdg1_2_mpi']):.2f}")
```

Only weakly: municipalities far from the three cities were slightly poorer in 2012 (correlation 0.14), and by 2024 the association has almost vanished (0.04).

## 6. Interpolate to a grid and save

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

census_2024 = census[census["year"] == 2024]
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
         variables={"dist_axis_km_mean": {"description": "Mean distance to the nearest main city", "unit": "km", "aggregation": "none"},
                    "dist_axis_km_max": {"description": "Maximum distance to the nearest main city", "unit": "km", "aggregation": "max"}})
```

## Next steps

- Explore poverty and lights spatially: [`esda.ipynb`](https://colab.research.google.com/github/quarcs-lab/geo4bolivia/blob/main/notebooks/esda.ipynb)
- Predict poverty from satellite embeddings: [`embeddings_mpi_ml.ipynb`](https://colab.research.google.com/github/quarcs-lab/geo4bolivia/blob/main/notebooks/embeddings_mpi_ml.ipynb)
- The full guide: [how the data infrastructure works](https://github.com/quarcs-lab/geo4bolivia/blob/main/docs/data-infrastructure.md)
- Every function has help: `help(geo.link)`
