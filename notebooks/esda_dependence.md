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

<a href="https://colab.research.google.com/github/quarcs-lab/gdo4bolivia/blob/main/notebooks/esda_dependence.ipynb" target="_parent"><img src="https://colab.research.google.com/assets/colab-badge.svg" alt="Open In Colab"/></a>

# Spatial distribution and spatial dependence of poverty in Bolivia

Part of the [GeoDevelopment Observatory of Bolivia](https://quarcs-lab.github.io/gdo4bolivia/).

How is multidimensional poverty spread across Bolivia's 343 municipalities and indigenous autonomies, how much does a municipality resemble its neighbours, and did either change between 2012 and 2024? This notebook uses the Multidimensional Poverty Index (MPI; 0–1, higher = poorer) of the *Atlas de los ODS en Bolivia 2026* (SDSN Bolivia), computed from the population censuses of 2012 and 2024, and the functions of the [`geo4bolivia`](https://quarcs-lab.github.io/geo4bolivia/) package:

1. **Load the data** (`geo.load`)
2. **Spatial distribution**: two ways of classifying a map, box-plot breaks and Fisher-Jenks natural breaks, in both periods (`geo.distribution`, `geo.map` with `bins=` and `scheme=`)
3. **Spatial dependence**: spatial weights, the spatial lag, global Moran's I, and local clusters and outliers (LISA) at two significance levels (`geo.weights`, `geo.moran`, `geo.lisa` with `alpha=`)

Two steps have no function in the package and call the underlying libraries directly: the box-plot breaks (`mapclassify`) and the spatial lag in the units of the index (`libpysal`). Both are then mapped with `geo.map`.

+++

## 0. Setup

In Google Colab the next cell installs the package (a few seconds); it brings the spatial-analysis libraries used here (libpysal, esda, mapclassify, plotly). Locally, `uv sync` has installed it already.

```{code-cell} ipython3
import importlib.util

missing = [p for p in ["geo4bolivia"] if importlib.util.find_spec(p) is None]
if missing:
    pkgs = " ".join(missing)
    !pip install -q {pkgs}
```

```{code-cell} ipython3
import warnings
warnings.filterwarnings("ignore")    # library notices; the text explains the ones that matter

import pandas as pd
import mapclassify as mc
from libpysal.weights import lag_spatial

import geo4bolivia as geo

YEARS = [2012, 2024]
MPI = "sdg1_2_mpi"                   # Multidimensional Poverty Index (0-1, higher = poorer)
```

## 1. Load the data

`geo.load()` returns a panel with one row per municipality (`geo_id`) and year. The Atlas gives the MPI for two periods, stored as the years 2012 and 2024. `groups=` adds the name of each municipality and of its department.

```{code-cell} ipython3
mpi = geo.load("sdg01", variables=MPI, groups=["department"])
print(mpi["geo_id"].nunique(), "municipalities and indigenous autonomies")
mpi.head()
```

## 2. Spatial distribution

How we cut a continuous variable into classes changes what a map shows. This section compares two classifications, each computed separately for each period, so the classes describe where poverty is relatively high or low in that period.

### Box-plot breaks

Box-plot breaks follow the box plot: the classes are the quartiles, and values beyond 1.5 times the interquartile range from the box are flagged as outliers. `geo.distribution()` draws the box plots of both periods:

```{code-cell} ipython3
geo.distribution(mpi, MPI, kind="box")
```

The package has no function for box-plot breaks, so we take them from `mapclassify`:

```{code-cell} ipython3
box = {year: mc.BoxPlot(mpi.loc[mpi["year"] == year, MPI]) for year in YEARS}
for year in YEARS:
    print(year, box[year], "\n")
```

`geo.map()` accepts explicit class limits as `bins=`. The lower fence lies below zero in both periods, so no municipality is a low outlier and we leave that limit out. The last class of each map holds the high outliers.

```{code-cell} ipython3
for year in YEARS:
    lowest = mpi.loc[mpi["year"] == year, MPI].min()
    limits = [float(b) for b in box[year].bins[:-1] if b > lowest]
    geo.map(mpi, MPI, year=year, bins=limits, title=f"Box-plot breaks, {year}").show()
```

The high outliers of each period, and how much their MPI changed since 2012 (`geo.change()` gives one row per municipality):

```{code-cell} ipython3
chg = geo.change(mpi, MPI)
fence = {year: box[year].bins[4] for year in YEARS}                 # the upper fence
for year in YEARS:
    chg[f"outlier_{year}"] = chg[f"{MPI}_{year}"] > fence[year]
print("High outliers:", {year: int(chg[f"outlier_{year}"].sum()) for year in YEARS})
print(f"Median change of the MPI, 2012-2024: {chg[f'{MPI}_pct_change'].median():.0f}%")
cols = ["name", "department", f"{MPI}_2012", f"{MPI}_2024", f"{MPI}_pct_change", "outlier_2012"]
chg[chg["outlier_2024"]].sort_values(f"{MPI}_2024", ascending=False)[cols].round(3)
```

The upper quartile of each period (the two highest classes of each map), by department:

```{code-cell} ipython3
q3 = {year: box[year].bins[3] for year in YEARS}
upper = mpi[mpi[MPI] > mpi["year"].map(q3)]
pd.crosstab(upper["department"], upper["year"], margins=True, margins_name="Total")
```

In 2012 the median MPI is 0.227, and the middle half of the municipalities lies between 0.153 and 0.306. The lower fence is below zero, so no municipality is a low outlier, while two are high outliers above 0.54: TIOC-Raqaypampa (Cochabamba, 0.563) and Poroma (Chuquisaca, 0.541).

By 2024 the whole distribution has shifted down and narrowed: the median is 0.053 and the middle half lies between 0.030 and 0.083. Again there are no low outliers, but now 12 units are high outliers above 0.16, led again by TIOC-Raqaypampa (0.296) and Poroma (0.223), followed by San Pedro (Potosí), El Choro (Oruro) and Vila Vila (Cochabamba).

The median municipality cut its MPI by 76% between the two periods, while the 12 high outliers of 2024 cut theirs by 47% to 65%. The poorest units progressed more slowly in relative terms, which is why they stand further from the rest of the distribution in 2024 than in 2012.

On both maps the upper quartile is mostly in Potosí, Chuquisaca, Cochabamba, La Paz and Oruro, which hold 71 of its 86 units in 2012 and 74 of its 84 in 2024. Pando had 9 units in the upper quartile in 2012 and has 3 in 2024; La Paz went from 13 to 19. Santa Cruz has one unit in 2012 and none in 2024, and Tarija none in either period.

### Fisher-Jenks breaks

The Fisher-Jenks algorithm chooses the breaks that make the classes as homogeneous as possible (it minimises the variance within classes). `geo.map()` computes them with `scheme="fisher_jenks"`; here, three classes per period. A classed map keeps its class limits in `fig.layout.meta["bins"]`, which we use to count the municipalities in each class.

```{code-cell} ipython3
classes = {}
for year in YEARS:
    fig = geo.map(mpi, MPI, year=year, scheme="fisher_jenks", k=3,
                  title=f"Three natural breaks, {year}")
    one = mpi[mpi["year"] == year]
    classes[year] = pd.cut(one[MPI], fig.layout.meta["bins"], include_lowest=True,
                           labels=["low", "middle", "high"])
    print(year, "class limits:", fig.layout.meta["bins"],
          "| municipalities per class:", classes[year].value_counts(sort=False).tolist())
    fig.show()
```

The high class of each period, by department:

```{code-cell} ipython3
high = mpi[pd.concat(classes.values()) == "high"]
pd.crosstab(high["department"], high["year"], margins=True, margins_name="Total")
```

In 2012 natural breaks put 112 municipalities in the low class (up to 0.18), 148 in the middle class (0.18 to 0.31) and 83 in the high class (above 0.31). In 2024 they put 166 in the low class (up to 0.05), 132 in the middle (0.05 to 0.11) and 45 in the high class (above 0.11).

Box-plot breaks give each quartile about 85 units by construction. Natural breaks let the data decide the size of the classes, and they single out the group of very poor municipalities. In 2024 that group is smaller and more concentrated: 38 of its 45 units are in Potosí (11), Chuquisaca (9), Cochabamba (9) and Oruro (9). Pando had 9 units in the high class in 2012 and has 1 in 2024; La Paz went from 12 to 4.

+++

## 3. Spatial dependence

- To what extent is the poverty of a municipality similar to that of its neighbours?
- To what extent is there an overall pattern of clustering, and did it weaken as poverty fell?
- Where are the statistically significant spatial clusters?
- Where are the statistically significant spatial outliers?

### Spatial connectivity

Each municipality is connected to its 6 nearest neighbours (by the distance between centroids), on all 343 units. `geo.weights()` builds the weights row-standardised, so each neighbour counts 1/6. With nearest neighbours no unit is left without neighbours. The same weights serve both periods. The companion notebook `esda` compares them with the package's default, queen contiguity.

```{code-cell} ipython3
w = geo.weights("municipality", method="knn", k=6)
links = geo.connectivity("municipality", w)
print(f"{links.n_units} units, {links.mean_neighbors:.0f} neighbours each;",
      f"islands: {len(links.islands)}; connected components: {links.n_components}")
```

### The spatial lag

The **spatial lag** of the MPI is the average poverty of each municipality's neighbours. The package computes it inside `geo.moran()`, in standard deviations from the mean. To have it in the units of the index we call `libpysal` directly, on the values of each year in the order of the weights, and keep it as a column of the panel:

```{code-cell} ipython3
parts = []
for year in YEARS:
    one = mpi[mpi["year"] == year].set_index("geo_id").loc[w.id_order]    # in the order of the weights
    parts.append(one.assign(mpi_lag=lag_spatial(w, one[MPI].to_numpy())).reset_index())
mpi = pd.concat(parts, ignore_index=True)
mpi[mpi["name"].isin(["Azurduy", "Sucre", "Nuestra Señora de La Paz"])].round(3)
```

Azurduy (Chuquisaca) had an MPI of 0.512 in 2012 and its six neighbours 0.377 on average; in 2024, 0.187 and 0.122. Its neighbours are poor, but less so than Azurduy itself. Sucre is the opposite case: an MPI of 0.014 in 2024 among neighbours that average 0.115.

With the lag as a column, `geo.map()` draws it like any other variable. The map of 2024 is a smoothed version of the map of poverty: each municipality is coloured by the average of its six neighbours.

```{code-cell} ipython3
geo.map(mpi, "mpi_lag", year=2024,
        title="Spatial lag of the MPI (average of the 6 nearest neighbours), 2024")
```

### Global dependence

The Moran scatterplot plots each municipality's poverty against its spatial lag, both in standard deviations from the mean of the year. **Moran's I** is the slope of the line through the cloud. Its pseudo p-value compares it with 999 random reshuffles of the values across the map.

```{code-cell} ipython3
moran = {year: geo.moran(mpi, MPI, year=year, w=w) for year in YEARS}
moran[2012]
```

```{code-cell} ipython3
moran[2024]
```

The same slope appears in the units of the index. `geo.scatter()` fits the least-squares line of the lag computed above on the MPI:

```{code-cell} ipython3
for year in YEARS:
    line, m = geo.scatter(mpi, MPI, "mpi_lag", year=year), moran[year]
    print(f"{year}: Moran's I = {m.moran_i:.3f} (pseudo p-value {m.p_sim:.3f});",
          f"slope of the lag on the MPI = {line.slope:.3f}")
```

Moran's I is 0.448 in 2012 and 0.388 in 2024, both with a pseudo p-value of 0.001, the smallest possible with 999 permutations: no random reshuffle of the values across the map produced as much clustering. With row-standardised weights, Moran's I is exactly the slope of the lag on the variable, in standard deviations or in the units of the index (0.448 and 0.388). In 2012, a municipality whose MPI is 0.1 above the mean has neighbours whose average MPI is, on average, about 0.045 above the mean. Spatial dependence weakened somewhat as poverty fell, but it is still strong in 2024.

### Local dependence

Local Moran's I (LISA) tests, municipality by municipality, whether its value and its neighbours' are more alike (clusters) or more different (outliers) than a random arrangement would give. `alpha=` sets the significance level below which a municipality is assigned to a type. Here we use 10%, looser than the default of 5%. "High" and "low" are relative to each period's mean.

```{code-cell} ipython3
lisa = {year: geo.lisa(mpi, MPI, year=year, w=w, alpha=0.10) for year in YEARS}
lisa[2012]
```

```{code-cell} ipython3
lisa[2024]
```

The Moran scatterplot of 2024 coloured by type:

```{code-cell} ipython3
lisa[2024].fig_scatter
```

How many municipalities fall in each type, at the 10% and at the stricter 5% level, in each period?

```{code-cell} ipython3
order = ["High-High", "Low-Low", "High-Low", "Low-High", "Not significant"]
counts = {}
for year in YEARS:
    strict = geo.lisa(mpi, MPI, year=year, w=w, alpha=0.05)
    counts[(year, "p < 0.10")] = lisa[year].df["cluster"].value_counts()
    counts[(year, "p < 0.05")] = strict.df["cluster"].value_counts()
pd.DataFrame(counts).reindex(order)
```

The types at the 10% level by department:

```{code-cell} ipython3
clusters = pd.concat([mpi[mpi["year"] == year].merge(lisa[year].df[["geo_id", "cluster"]])
                      for year in YEARS])
(pd.crosstab(clusters["department"], [clusters["year"], clusters["cluster"]])
   .reindex(columns=order[:4], level=1))
```

At the 10% level, 157 municipalities belong to a significant type in 2012 (30 more than at 5%) and 143 in 2024 (36 more than at 5%):

- **Poverty hot spots (High-High) fell from 52 to 36.** In 2012 they were in Chuquisaca (15), Potosí (12), Pando (8), Cochabamba (8) and La Paz (5), with 2 each in Beni and Oruro. In 2024 they are in Potosí (12), Chuquisaca (9), Cochabamba (5), Oruro (4) and Beni (3), while Pando keeps 2 and La Paz 1.
- **Clusters of low poverty (Low-Low) held steady, 83 and 85**, but shifted east: Santa Cruz went from 31 to 41 and Tarija from 8 to 9, while Cochabamba fell from 21 to 12 and La Paz from 19 to 16.
- **Outliers: 22 in 2012 and 22 in 2024**: 10, then 9, poorer municipalities with less poor neighbours (High-Low), and 12, then 13, less poor municipalities with poorer neighbours (Low-High).

A looser threshold flags more municipalities but also more false positives: with 343 tests at 10%, about 34 would be significant by chance even with no spatial pattern at all. The core clusters are the same at both levels: the hot spots in Potosí, Chuquisaca and Cochabamba, and the clusters of low poverty in Santa Cruz, Cochabamba, La Paz and Tarija.

+++

## Summary

- The MPI fell sharply between 2012 and 2024 (median 0.227 to 0.053). Box-plot breaks flag 2 high outliers in 2012 and 12 in 2024, led in both by TIOC-Raqaypampa and Poroma; three Fisher-Jenks classes isolate 83 very poor units in 2012 (above 0.31) and 45 in 2024 (above 0.11).
- Poverty is strongly spatially dependent in both periods: Moran's I = 0.448 in 2012 and 0.388 in 2024 (pseudo p-value 0.001) with 6-nearest-neighbour weights on all 343 units.
- At the 10% level, LISA finds 52 poverty hot spots in 2012 and 36 in 2024, now concentrated in Potosí, Chuquisaca and Cochabamba, and 83 and 85 clusters of low poverty, increasingly in Santa Cruz.
- These results describe where poverty is and how it is arranged in space; they are associations, not causes.

Function pages: [`distribution`](https://quarcs-lab.github.io/geo4bolivia/reference/distribution.html), [`map`](https://quarcs-lab.github.io/geo4bolivia/reference/map.html), [`weights`](https://quarcs-lab.github.io/geo4bolivia/reference/weights.html), [`moran`](https://quarcs-lab.github.io/geo4bolivia/reference/moran.html), [`lisa`](https://quarcs-lab.github.io/geo4bolivia/reference/lisa.html).

The companion notebook [`esda`](https://colab.research.google.com/github/quarcs-lab/gdo4bolivia/blob/main/notebooks/esda.ipynb) lists the clusters and outliers at the 5% level, compares the weights with queen contiguity and counts how units moved between types.
