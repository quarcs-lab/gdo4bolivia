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

<a href="https://colab.research.google.com/github/quarcs-lab/geo4bolivia/blob/main/notebooks/esda.ipynb" target="_parent"><img src="https://colab.research.google.com/assets/colab-badge.svg" alt="Open In Colab"/></a>

# Exploratory spatial data analysis of multidimensional poverty in Bolivia

Part of the [GeoDevelopment Observatory of Bolivia](https://quarcs-lab.github.io/geo4bolivia/).

Is poverty in one municipality similar to poverty in its neighbours, and did that change as poverty fell? This notebook answers both questions for the Multidimensional Poverty Index (MPI) of Bolivia's 343 municipalities and indigenous autonomies, measured from the population censuses of 2012 and 2024 by the *Atlas de los ODS en Bolivia 2026* (SDSN Bolivia). Step by step:

1. **Load and map** the data for both periods with `geo4bolivia`
2. **Spatial weights and spatial lags**: who are the neighbours, and how poor are they?
3. **Global spatial dependence**: Moran's I in 2012 and 2024
4. **Local spatial dependence**: LISA clusters and outliers in both periods, and how they moved
5. **Combined figure**: the Moran scatterplot next to the cluster map, for 2024

+++

## 0. Setup

In Google Colab the next cell installs the package and the spatial-analysis libraries (a few seconds). Locally, `uv sync` has installed them already.

```{code-cell} ipython3
import importlib.util

missing = [p for p in ["geo4bolivia", "mapclassify", "libpysal", "esda", "splot"] if importlib.util.find_spec(p) is None]
if missing:
    pkgs = " ".join(missing)
    !pip install -q {pkgs}
```

```{code-cell} ipython3
import warnings

import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
import mapclassify as mc

from libpysal import weights
from esda.moran import Moran, Moran_Local
from splot.esda import lisa_cluster
from splot.libpysal import plot_spatial_weights

import geo4bolivia as geo

warnings.filterwarnings("ignore", message="Numba not installed")   # mapclassify works without it
sns.set_theme(style="whitegrid")
SEED = 12345
```

## 1. Load the data

`geo.load(..., geometry=True)` returns the poverty index with the municipal boundaries and names. The MPI runs from 0 to 1, and **higher values mean more poverty**. The Atlas gives it for two periods, stored as the years 2012 and 2024; `wide=` puts them side by side, one column per year. We add the department of each municipality and a poverty rank for 2024 (1 = poorest), and project the map to the observatory's equal-area projection, so that distances and areas are in metres.

```{code-cell} ipython3
YEARS = [2012, 2024]
MPI = {year: f"mpi_{year}" for year in YEARS}          # column names

gdf = geo.load("sdg01", variables="sdg1_2_mpi", years=2024, geometry=True)[["geo_id", "name", "geometry"]]
wide = geo.load("sdg01", variables="sdg1_2_mpi", wide="sdg1_2_mpi")
gdf = gdf.merge(wide.rename(columns={f"sdg1_2_mpi{y}": MPI[y] for y in YEARS}), on="geo_id")

units = geo.units("municipality")[["geo_id", "department_id"]]
dep_names = geo.units("department").set_index("geo_id")["name"]
gdf = gdf.merge(units, on="geo_id")
gdf["department"] = gdf["department_id"].map(dep_names)
gdf["rank_2024"] = gdf[MPI[2024]].rank(ascending=False, method="min").astype(int)

gdf = gdf[["geo_id", "name", "department", *MPI.values(), "rank_2024", "geometry"]].to_crs(geo.config()["equal_area_crs"])
print(len(gdf), "municipalities and indigenous autonomies")
gdf.head()
```

```{code-cell} ipython3
gdf[list(MPI.values())].describe().round(3)
```

Did any municipality become poorer, and did the ranking change?

```{code-cell} ipython3
change = gdf[MPI[2024]] - gdf[MPI[2012]]
print(f"Mean MPI fell by {1 - gdf[MPI[2024]].mean() / gdf[MPI[2012]].mean():.0%}; "
      f"municipalities where it rose: {(change > 0).sum()}")
print(f"Rank (Spearman) correlation between 2012 and 2024: "
      f"{gdf[MPI[2012]].corr(gdf[MPI[2024]], method='spearman'):.2f}")
```

Department boundaries, with a label point inside each, for the maps:

```{code-cell} ipython3
departments = geo.boundaries("department").to_crs(gdf.crs)
departments["label_point"] = departments.representative_point()
```

## 2. Map the data

First both periods on one continuous colour scale, which shows how much poverty fell; then three classes per period found by the Fisher-Jenks natural-breaks algorithm, which show where poverty is relatively high in each period.

```{code-cell} ipython3
def add_departments(ax, labels=True):
    departments.boundary.plot(ax=ax, color="black", linewidth=0.8)
    if labels:
        for _, row in departments.iterrows():
            ax.annotate(row["name"], xy=(row["label_point"].x, row["label_point"].y), ha="center", fontsize=8,
                        bbox={"facecolor": "white", "alpha": 0.8, "pad": 1.5, "edgecolor": "none"})
    ax.set_axis_off()

vmax = gdf[MPI[2012]].max()
fig, axes = plt.subplots(1, 2, figsize=(14, 7))
for ax, year in zip(axes, YEARS):
    gdf.plot(column=MPI[year], cmap="RdBu_r", vmin=0, vmax=vmax, edgecolor="grey", linewidth=0.2, legend=True,
             legend_kwds={"label": "Multidimensional poverty index", "shrink": 0.6}, ax=ax)
    ax.set_title(f"({'ab'[YEARS.index(year)]}) {year}, common scale")
    add_departments(ax, labels=False)
plt.tight_layout()
plt.show()
```

```{code-cell} ipython3
for year in YEARS:
    fj = mc.FisherJenks(gdf[MPI[year]], k=3)
    print(year, "upper bounds:", fj.bins.round(3), "| municipalities per class:", fj.counts)
```

```{code-cell} ipython3
fig, axes = plt.subplots(1, 2, figsize=(14, 7))
for ax, year in zip(axes, YEARS):
    gdf.plot(column=MPI[year], scheme="FisherJenks", k=3, cmap="coolwarm", edgecolor="grey", linewidth=0.2,
             legend=True, legend_kwds={"title": f"MPI {year}", "loc": "lower left"}, ax=ax)
    ax.set_title(f"({'ab'[YEARS.index(year)]}) {year}, three natural breaks (Fisher-Jenks)")
    add_departments(ax, labels=False)
plt.tight_layout()
plt.show()
```

Poverty fell everywhere. The mean MPI dropped from 0.234 in 2012 to 0.063 in 2024 (by 73%), the median from 0.227 to 0.053, and no municipality became poorer. The ranking, however, barely moved: the rank correlation between the two periods is 0.86, and the poorest unit in both is TIOC-Raqaypampa (Cochabamba; 0.563, then 0.296).

The natural breaks show where poverty stays relatively high. In 2012 the top class (MPI above 0.31, 83 units) covers the belt where Chuquisaca, Potosí and Cochabamba meet, most of Pando and much of the Oruro and La Paz highlands. In 2024 the top class (above 0.11) is smaller, 45 units, and concentrated in that belt (11 in Potosí and 9 each in Chuquisaca and Cochabamba) and in Oruro (9); Pando, which had 9 units in the top class in 2012, keeps only San Pedro. The least poor class holds the main cities, Santa Cruz (48 of its 56 units in 2024) and Tarija (all 11).

+++

## 3. Spatial weights and spatial lags

A **spatial weights matrix** $W$ says who is a neighbour of whom. Here each municipality's neighbours are its 6 nearest municipalities (by the distance between centroids), built on all 343 units. With k-nearest neighbours every unit has neighbours, so there are no islands to handle. The matrix is **row-standardised**, so each row sums to one and the neighbours have equal weight. The same matrix serves both periods.

```{code-cell} ipython3
W = weights.KNN.from_dataframe(gdf, k=6)
W.transform = "r"
print(f"{W.n} municipalities, {W.mean_neighbors:.0f} neighbours each, {W.s0:.0f} = sum of the weights")
print(f"islands: {len(W.islands)}; connected components: {W.n_components}")
```

```{code-cell} ipython3
fig, ax = plt.subplots(figsize=(10, 10))
plot_spatial_weights(W, gdf, ax=ax)
departments.boundary.plot(ax=ax, color="black", linewidth=0.6)
ax.set_title("Each municipality linked to its 6 nearest neighbours")
plt.show()
```

The **spatial lag** $Wy$ of the MPI is the average poverty of each municipality's neighbours:

```{code-cell} ipython3
LAG = {year: f"W_mpi_{year}" for year in YEARS}
for year in YEARS:
    gdf[LAG[year]] = weights.lag_spatial(W, gdf[MPI[year]])
gdf[["name", "department", MPI[2012], LAG[2012], MPI[2024], LAG[2024]]].round(3).head(10)
```

For Azurduy (Chuquisaca), one of the poorest municipalities, the MPI fell from 0.512 to 0.187, and the average of its 6 neighbours from 0.377 to 0.122: in both periods its neighbours are poor, but less so than Azurduy itself.

+++

## 4. Global spatial dependence

Plotting each municipality's poverty against the poverty of its neighbours shows whether poor municipalities tend to have poor neighbours:

```{code-cell} ipython3
fig, axes = plt.subplots(1, 2, figsize=(12, 5.5))
for ax, year in zip(axes, YEARS):
    sns.regplot(data=gdf, x=MPI[year], y=LAG[year], scatter_kws={"s": 15, "alpha": 0.7},
                line_kws={"color": "black"}, ax=ax)
    ax.set(xlabel=f"Multidimensional poverty index ({year})", ylabel="Poverty in neighbouring municipalities",
           title=str(year))
plt.tight_layout()
plt.show()
```

**Moran's I** summarises this relationship in one number: with row-standardised weights it is the slope of the regression of the standardised spatial lag on the standardised variable. Values near 0 mean no spatial pattern; positive values mean that similar values cluster. Its pseudo p-value compares it with 999 random reshuffles of the values across the map.

```{code-cell} ipython3
np.random.seed(SEED)
globalMoran = {year: Moran(gdf[MPI[year]], W, permutations=999) for year in YEARS}

pd.DataFrame({year: {"Moran's I": m.I, "expected I": m.EI, "pseudo p-value": m.p_sim, "z": m.z_sim}
              for year, m in globalMoran.items()}).round(3)
```

Moran's I is 0.45 in 2012 and 0.39 in 2024, far above its expected value of about 0 under spatial randomness. In both periods none of the 999 random reshuffles produced a value as large (pseudo p-value 0.001, the smallest possible with 999 permutations). Poverty is strongly and positively spatially autocorrelated in both periods: poor municipalities tend to have poor neighbours. Clustering weakened somewhat as poverty fell, but it remains strong.

+++

## 5. Local spatial dependence

Moran's I is one number for the whole country. **Local Moran's I** (LISA, Local Indicators of Spatial Association) computes one statistic per municipality and tests it with permutations. Each significant municipality falls in one of four groups:

| Group | The municipality is | Its neighbours are | Meaning |
| --- | --- | --- | --- |
| High-high | poor | poor | **poverty hotspot** |
| Low-low | less poor | less poor | **cluster of low poverty** |
| High-low | poor | less poor | poor outlier |
| Low-high | less poor | poor | less poor outlier |

"High" and "low" are relative to the national mean of each period, so a 2024 hotspot is poor by 2024 standards.

```{code-cell} ipython3
moranLocal = {year: Moran_Local(gdf[MPI[year]], W, permutations=999, seed=SEED) for year in YEARS}
```

```{code-cell} ipython3
fig, axes = plt.subplots(1, 2, figsize=(14, 7))
for ax, year in zip(axes, YEARS):
    lisa_cluster(moranLocal[year], gdf, p=0.05, legend_kwds={"loc": "lower left"}, ax=ax)
    add_departments(ax, labels=False)
    ax.set_title(f"Spatial clusters and outliers of poverty, {year} (p < 0.05)")
plt.tight_layout()
plt.show()
```

The same classification as columns, to count and list the municipalities in each group:

```{code-cell} ipython3
quadrants = {1: "High-high", 2: "Low-high", 3: "Low-low", 4: "High-low"}
CLUSTER = {year: f"cluster_{year}" for year in YEARS}
for year in YEARS:
    lm = moranLocal[year]
    gdf[f"lisa_p_{year}"] = lm.p_sim
    gdf[CLUSTER[year]] = np.where(lm.p_sim < 0.05, pd.Series(lm.q).map(quadrants), "Not significant")

order = ["High-high", "Low-low", "High-low", "Low-high", "Not significant"]
pd.DataFrame({year: gdf[CLUSTER[year]].value_counts() for year in YEARS}).reindex(order)
```

How did municipalities move between groups? Rows are the 2012 group, columns the 2024 group:

```{code-cell} ipython3
pd.crosstab(gdf[CLUSTER[2012]], gdf[CLUSTER[2024]], margins=True, margins_name="Total")
```

The groups by department in 2024:

```{code-cell} ipython3
pd.crosstab(gdf["department"], gdf[CLUSTER[2024]], margins=True, margins_name="Total")
```

The spatial outliers in 2024, municipalities that differ significantly from their neighbours:

```{code-cell} ipython3
outliers = gdf[CLUSTER[2024]].isin(["High-low", "Low-high"])
(gdf[outliers].sort_values([CLUSTER[2024], MPI[2024]], ascending=[True, False])
    [["name", "department", CLUSTER[2024], MPI[2024], LAG[2024], "rank_2024", "lisa_p_2024", CLUSTER[2012]]].round(3))
```

At the 5% level, 127 of the 343 units belong to a significant group in 2012 and 107 in 2024:

- **Poverty hotspots (High-high) fell from 43 to 27.** In 2012 they were in Chuquisaca (14), Potosí (11), Pando (7), Cochabamba (5), La Paz (3), Oruro (2) and Beni (1). In 2024 they are concentrated in the belt where Chuquisaca, Potosí and Cochabamba meet (10 in Potosí, 7 in Chuquisaca, 5 in Cochabamba, among them TIOC-Raqaypampa and San Pedro de Macha), plus Choquecota and Curahuara de Carangas in Oruro and three units in Beni (San Ignacio, Santa Ana and the new TIOC-Territorio Indígena Multiétnico). The Pando hotspot has disappeared: none of Pando's units is a hotspot in 2024. Of the 43 hotspots of 2012, 22 are still hotspots and 19 are no longer significant.
- **Low-poverty clusters (Low-low) stayed at about 70** (70 in 2012, 71 in 2024), but moved towards the lowlands: Santa Cruz has 37 in 2024 (27 in 2012), while Cochabamba has 11 (20) and La Paz 11 (15). Tarija has 8 of its 11 municipalities. 54 units are Low-low in both periods.
- **Outliers fell from 14 to 9.** In 2024, three poorer municipalities have less poor neighbours (High-low: Arbieto and Morochata in Cochabamba, Tito Yupanqui in La Paz), and six less poor municipalities have poorer neighbours (Low-high), among them the capital Sucre (MPI 0.014, neighbours 0.115), Camargo and Alcalá in Chuquisaca, and Villa Nueva in Pando.

With 343 local tests, some significant results are expected by chance alone, so treat isolated significant municipalities with care; the large contiguous clusters are the robust finding.

+++

## 6. Combined figure

The 2024 Moran scatterplot coloured by LISA group, next to the cluster map. The dashed lines are the means of the MPI and of its spatial lag, which split the plot into the four quadrants.

```{code-cell} ipython3
colors = {"High-high": "#d7191c", "High-low": "#fdae61", "Low-high": "#abd9e9", "Low-low": "#2c7bb6",
          "Not significant": "#d3d3d3"}
x, y, cluster = MPI[2024], LAG[2024], CLUSTER[2024]

fig, axes = plt.subplots(1, 2, figsize=(15, 7), gridspec_kw={"width_ratios": [1, 1.1]})

# (a) Moran scatterplot
ax = axes[0]
sns.regplot(data=gdf, x=x, y=y, scatter=False, ci=None, line_kws={"color": "black", "lw": 2}, ax=ax)
for group in ["Not significant", "Low-high", "High-low", "Low-low", "High-high"]:
    d = gdf[gdf[cluster] == group]
    ax.scatter(d[x], d[y], s=40, color=colors[group], label=f"{group} ({len(d)})",
               edgecolor="white", linewidth=0.3)
ax.axvline(gdf[x].mean(), color="black", alpha=0.5, linestyle="--")
ax.axhline(gdf[y].mean(), color="black", alpha=0.5, linestyle="--")
box = dict(boxstyle="round,pad=0.4", fc="white", ec="black", lw=1)
for text, (tx, ty) in {"HH": (0.97, 0.97), "LH": (0.03, 0.97), "LL": (0.03, 0.03), "HL": (0.97, 0.03)}.items():
    ax.text(tx, ty, text, transform=ax.transAxes, ha="right" if tx > 0.5 else "left",
            va="top" if ty > 0.5 else "bottom", bbox=box)
ax.set(xlabel="Multidimensional poverty index (2024)", ylabel="Poverty in neighbouring municipalities",
       title=f"(a) Moran scatterplot (Moran's I = {globalMoran[2024].I:.2f})")
ax.legend(loc="center right", fontsize=9)

# (b) cluster map
ax = axes[1]
gdf.plot(color=gdf[cluster].map(colors), edgecolor="white", linewidth=0.2, ax=ax)
add_departments(ax)
ax.set_title("(b) Spatial clusters and outliers, 2024 (p < 0.05)")

plt.tight_layout()
plt.show()
```

## Summary

- Multidimensional poverty fell by 73% between 2012 and 2024 (mean MPI 0.234 to 0.063) and in every one of the 343 units, but the ranking is stable (rank correlation 0.86).
- Poverty is strongly spatially clustered in both periods: Moran's I = 0.45 in 2012 and 0.39 in 2024 (pseudo p-value 0.001) with 6-nearest-neighbour weights.
- Poverty hotspots fell from 43 to 27 and now concentrate where Chuquisaca, Potosí and Cochabamba meet; the Pando hotspot of 2012 has disappeared. Low-poverty clusters (70, then 71) shifted towards Santa Cruz and Tarija.
- Some capitals stand out as less poor islands among poorer neighbours (Sucre in both periods).
- The companion notebook [`esda_dependence`](https://colab.research.google.com/github/quarcs-lab/geo4bolivia/blob/main/notebooks/esda_dependence.ipynb) compares map classifications and repeats the analysis at the 10% level; [`esda_inequality`](https://colab.research.google.com/github/quarcs-lab/geo4bolivia/blob/main/notebooks/esda_inequality.ipynb) measures how unequal poverty is and how that changed.
