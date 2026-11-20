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

<a href="https://colab.research.google.com/github/quarcs-lab/gdo4bolivia/blob/main/notebooks/esda.ipynb" target="_parent"><img src="https://colab.research.google.com/assets/colab-badge.svg" alt="Open In Colab"/></a>

# Exploratory spatial data analysis of multidimensional poverty in Bolivia

Part of the [GeoDevelopment Observatory of Bolivia](https://quarcs-lab.github.io/gdo4bolivia/).

Is poverty in one municipality similar to poverty in its neighbours, and did that change as poverty fell? This notebook answers both questions for the Multidimensional Poverty Index (MPI) of Bolivia's 343 municipalities and indigenous autonomies, measured from the population censuses of 2012 and 2024 by the *Atlas de los ODS en Bolivia 2026* (SDSN Bolivia). Each step uses the functions of the [`geo4bolivia`](https://quarcs-lab.github.io/geo4bolivia/) package:

1. **Load** the data for both periods (`geo.load`, `geo.describe`, `geo.change`)
2. **Map** both periods in common classes (`geo.map`)
3. **Spatial weights**: who are the neighbours? (`geo.weights`, `geo.connectivity`)
4. **Global spatial dependence**: Moran's I in 2012 and 2024 (`geo.moran`)
5. **Local spatial dependence**: LISA clusters and outliers in both periods (`geo.lisa`)
6. **Transitions**: how the clusters moved between the two periods (`geo.lisa_transitions`)

Each analysis returns a **result object**. Displaying it shows its main figure and a reading of the numbers; its parts are `.fig`, `.df` (the table behind the figure), the numbers by name (`.moran_i`, `.p_sim`) and `.interpret()`.

+++

## 0. Setup

In Google Colab the next cell installs the package (a few seconds); it brings the spatial-analysis libraries it uses (libpysal, esda, mapclassify, plotly). Locally, `uv sync` has installed it already.

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

import geo4bolivia as geo

YEARS = [2012, 2024]
```

## 1. Load the data

`geo.load()` returns a panel: one row per municipality (`geo_id`) and year. The MPI runs from 0 to 1, and **higher values mean more poverty**. The Atlas gives it for two periods, stored as the years 2012 and 2024. `groups=` adds the name of each municipality and of its department.

```{code-cell} ipython3
mpi = geo.load("sdg01", variables="sdg1_2_mpi", groups=["department"])
print(mpi["geo_id"].nunique(), "municipalities and indigenous autonomies")
mpi.head()
```

```{code-cell} ipython3
geo.describe(mpi)
```

Did any municipality become poorer, and did the ranking change? `geo.change()` gives one row per municipality with its value in both years and its change. The table lists the five poorest of 2024.

```{code-cell} ipython3
chg = geo.change(mpi, "sdg1_2_mpi")
m12, m24 = chg["sdg1_2_mpi_2012"].mean(), chg["sdg1_2_mpi_2024"].mean()
rho = chg["sdg1_2_mpi_2012"].corr(chg["sdg1_2_mpi_2024"], method="spearman")
print(f"Mean MPI: {m12:.3f} in 2012, {m24:.3f} in 2024 ({m24 / m12 - 1:.0%})")
print(f"Median change of a municipality: {chg['sdg1_2_mpi_pct_change'].median():.0f}%;",
      "municipalities where the MPI rose:", (chg["sdg1_2_mpi_change"] > 0).sum())
print("Rank (Spearman) correlation between 2012 and 2024:", round(rho, 2))
cols = ["name", "department", "sdg1_2_mpi_2012", "sdg1_2_mpi_2024", "sdg1_2_mpi_pct_change"]
chg.nlargest(5, "sdg1_2_mpi_2024")[cols].round(3)
```

## 2. Map the data

`geo.map()` with a list of years draws one map per year. With `scheme=` the maps are drawn in classes, here five classes found by the Fisher-Jenks natural-breaks algorithm on the values of both periods together, so the colours mean the same in both maps:

```{code-cell} ipython3
fig = geo.map(mpi, "sdg1_2_mpi", year=YEARS, scheme="fisher_jenks")
fig
```

A classed map keeps its class limits in `fig.layout.meta["bins"]`. The municipalities in each class, per period:

```{code-cell} ipython3
limits = fig.layout.meta["bins"]
pd.crosstab(pd.cut(mpi["sdg1_2_mpi"], limits, include_lowest=True), mpi["year"])
```

Poverty fell everywhere. The mean MPI dropped from 0.234 in 2012 to 0.063 in 2024 (by 73%), the median from 0.227 to 0.053, and no municipality became poorer. In 2012, 113 municipalities had an MPI above 0.273 (the two highest classes); in 2024 only one does, TIOC-Raqaypampa (Cochabamba, 0.296), the poorest unit in both periods. 261 of the 343 units are now in the lowest class (up to 0.084), against 20 in 2012.

The ranking, however, barely moved: the rank correlation between the two periods is 0.86. The poorest units also progressed more slowly in relative terms: the five poorest of 2024 cut their MPI by 47% to 59%, against 76% for the median municipality.

Common classes show the fall, but they hide the geography of 2024, when almost every unit is in the two lowest classes. The local statistics of section 5 compare each municipality with the mean of its own period, and the companion notebook `esda_dependence` maps each period in its own classes.

+++

## 3. Spatial weights

**Spatial weights** say who is a neighbour of whom. `geo.weights()` builds them from the boundaries. Here each municipality's neighbours are its 6 nearest municipalities (by the distance between centroids), on all 343 units. The weights are **row-standardised**: each neighbour counts 1/6, so the weighted sum of the neighbours' values is their average. The same weights serve both periods.

`geo.connectivity()` draws the links on the map and describes the graph of neighbours:

```{code-cell} ipython3
w = geo.weights("municipality", method="knn", k=6)
geo.connectivity("municipality", w)
```

The package's default, used when no weights are given, is **queen contiguity**: two municipalities are neighbours when they share a border or a corner. How does it compare?

```{code-cell} ipython3
queen = geo.connectivity("municipality")
print(queen.interpret())
queen.fig_hist
```

`.df` has the number of neighbours of each unit. The units with the fewest and the most queen neighbours:

```{code-cell} ipython3
few_many = pd.concat([queen.df.nsmallest(4, "n_neighbors"), queen.df.nlargest(4, "n_neighbors")])
few_many.assign(island=few_many["geo_id"].isin(queen.islands))
```

With the 6 nearest neighbours every municipality has exactly six neighbours, 1.75% of all pairs of units are linked, and the graph is one connected piece.

Queen contiguity gives 5.5 neighbours on average, but unevenly: from 1 (Catacora, Copacabana, Santiago de Huata and Coipasa) to 12 (Villa Tunari and Charagua), and 1.61% of all pairs are linked. Coipasa (`BO-05-10-02`) touches no other municipality, because the Coipasa salt flat, a hole in the map, surrounds it. The package links such an island to its nearest unit, so that its spatial lag is defined.

Each choice has a price. Nearest neighbours treat every unit alike, but link some municipalities that do not touch. Contiguity follows the borders, but averages over one neighbour in some places and twelve in others. This notebook uses the 6 nearest neighbours throughout and reports the main results with queen contiguity next to them.

+++

## 4. Global spatial dependence

**Moran's I** summarises in one number whether similar values lie near each other. The Moran scatterplot behind it plots each municipality's poverty against its **spatial lag**, the average poverty of its neighbours, both in standard deviations from the mean of the year. With row-standardised weights, Moran's I is the slope of the line through that cloud. Values near 0 mean no spatial pattern; positive values mean that similar values cluster. Its pseudo p-value compares it with 999 random reshuffles of the values across the map.

```{code-cell} ipython3
moran = {year: geo.moran(mpi, "sdg1_2_mpi", year=year, w=w) for year in YEARS}
moran[2012]
```

```{code-cell} ipython3
moran[2024]
```

The table behind the scatterplot has one row per municipality: its standardised value, its spatial lag and its quadrant (HH: high among high, LL: low among low, HL and LH: unlike its neighbours).

```{code-cell} ipython3
moran[2024].df.head()
```

Moran's I in both periods, with the 6 nearest neighbours and with the default queen contiguity (`year="all"` computes it in every year):

```{code-cell} ipython3
pd.concat({"6 nearest neighbours": geo.moran(mpi, "sdg1_2_mpi", year="all", w=w).df,
           "queen contiguity": geo.moran(mpi, "sdg1_2_mpi", year="all").df},
          names=["weights"]).droplevel(1).round(3)
```

With the 6 nearest neighbours, Moran's I is 0.448 in 2012 and 0.388 in 2024, far above its expected value under spatial randomness (−0.003). In both periods none of the 999 random reshuffles produced a value as large (pseudo p-value 0.001, the smallest possible with 999 permutations). Poverty is strongly and positively spatially autocorrelated: poor municipalities tend to have poor neighbours. 245 of the 343 units (71%) in 2012 and 256 (75%) in 2024 lie in the High-High or Low-Low quadrant of the scatterplot.

In the table, Azurduy (Chuquisaca) is 2.8 standard deviations above the mean MPI of 2024 and its six neighbours are on average 1.3 above it: its neighbours are poor, but less so than Azurduy itself.

The choice of weights changes the size of the fall, not the conclusion. With queen contiguity Moran's I is 0.436 in 2012 and 0.415 in 2024: also strong and significant in both periods, but it falls by 0.021 instead of 0.060. Clustering did not strengthen as poverty fell; how much it weakened depends on who counts as a neighbour.

+++

## 5. Local spatial dependence

Moran's I is one number for the whole country. **Local Moran's I** (LISA, Local Indicators of Spatial Association) computes one statistic per municipality and tests it with permutations. Each significant municipality falls in one of four types:

| Type | The municipality is | Its neighbours are | Meaning |
| --- | --- | --- | --- |
| High-High | poor | poor | **poverty hot spot** |
| Low-Low | less poor | less poor | **cluster of low poverty** |
| High-Low | poor | less poor | poor outlier |
| Low-High | less poor | poor | less poor outlier |

"High" and "low" are relative to the national mean of each period, so a 2024 hot spot is poor by 2024 standards. `geo.lisa()` assigns the types at the 5% level (`alpha=0.05`, the default).

```{code-cell} ipython3
lisa = {year: geo.lisa(mpi, "sdg1_2_mpi", year=year, w=w) for year in YEARS}
lisa[2012]
```

```{code-cell} ipython3
lisa[2024]
```

`lisa[year].df` has one row per municipality with its type (`cluster`) and pseudo p-value. We stack both years and add the department and the MPI, to count and list the municipalities of each type:

```{code-cell} ipython3
clusters = pd.concat([mpi[mpi["year"] == year].merge(lisa[year].df[["geo_id", "cluster"]])
                      for year in YEARS])
order = ["High-High", "Low-Low", "High-Low", "Low-High", "Not significant"]
pd.crosstab(clusters["cluster"], clusters["year"]).reindex(order)
```

The types by department, in both periods:

```{code-cell} ipython3
(pd.crosstab(clusters["department"], [clusters["year"], clusters["cluster"]])
   .reindex(columns=order[:4], level=1))
```

The second figure of a LISA result is the Moran scatterplot coloured by type:

```{code-cell} ipython3
lisa[2024].fig_scatter
```

How do the default queen weights compare? The same analysis without `w=`:

```{code-cell} ipython3
counts = {}
for year in YEARS:
    counts[(year, "6 nearest")] = lisa[year].df["cluster"].value_counts()
    counts[(year, "queen")] = geo.lisa(mpi, "sdg1_2_mpi", year=year).df["cluster"].value_counts()
pd.DataFrame(counts).reindex(order)
```

With the 6 nearest neighbours and at the 5% level, 127 of the 343 units belong to a significant type in 2012 and 107 in 2024:

- **Poverty hot spots (High-High) fell from 43 to 27.** In 2012 they were in Chuquisaca (14), Potosí (11), Pando (7), Cochabamba (5), La Paz (3), Oruro (2) and Beni (1). In 2024 they are concentrated in Potosí (10), Chuquisaca (7) and Cochabamba (5), the belt where the three departments meet, plus 3 in Beni and 2 in Oruro. Pando and La Paz have none.
- **Clusters of low poverty (Low-Low) stayed at about 70** (70, then 71), but moved towards the lowlands: Santa Cruz has 37 in 2024 (27 in 2012) and Tarija 8 (6), while Cochabamba has 11 (20) and La Paz 11 (15).
- **Outliers fell from 14 to 9**: 7 High-Low and 7 Low-High in 2012, 3 and 6 in 2024.

Queen contiguity agrees on the direction and differs on the counts. It finds almost the same number of hot spots in 2012 (42) but more in 2024 (35 against 27), so a smaller fall; and fewer clusters of low poverty in both periods (46 and 51 against 70 and 71). In all it flags 98 units in 2012 and 94 in 2024. The number of clusters therefore depends on the weights; that hot spots became fewer and low-poverty clusters did not shrink holds with both.

With 343 local tests, some significant results are expected by chance alone, so treat isolated significant municipalities with care; the large contiguous clusters are the robust finding.

+++

## 6. Transitions between cluster types

Did the hot spots and the clusters of low poverty persist? `geo.lisa_transitions()` runs the LISA analysis in both years on the same units and weights, and counts how the municipalities moved between types. Rows are the type in 2012, columns the type in 2024.

```{code-cell} ipython3
moves = geo.lisa_transitions(mpi, "sdg1_2_mpi", w=w)
moves
```

`moves.fig_map` draws the types of 2024 with the municipalities that changed type outlined. `moves.df` lists every municipality with its type in both years. Where were the hot spots of 2012 that persisted and those that dissolved, and where are the new ones?

```{code-cell} ipython3
moved = moves.df.merge(chg[["geo_id", "department", "sdg1_2_mpi_2012", "sdg1_2_mpi_2024"]])
hot = moved[(moved["cluster_2012"] == "High-High") | (moved["cluster_2024"] == "High-High")]
pd.crosstab(hot["department"], hot["transition"])
```

```{code-cell} ipython3
new = moved[moved["moved"] & (moved["cluster_2024"] == "High-High")]
new[["name", "department", "transition", "sdg1_2_mpi_2012", "sdg1_2_mpi_2024"]]
```

The same count for the clusters of low poverty:

```{code-cell} ipython3
low = moved[(moved["cluster_2012"] == "Low-Low") | (moved["cluster_2024"] == "Low-Low")]
pd.crosstab(low["department"], low["transition"])
```

The spatial outliers of 2024, municipalities that differ significantly from their neighbours, with their type in 2012 (`value` and `lag` are the MPI of the municipality and the average of its neighbours, in standard deviations from the mean of 2024):

```{code-cell} ipython3
outliers = moved[moved["cluster_2024"].isin(["High-Low", "Low-High"])]
outliers = outliers.merge(lisa[2024].df[["geo_id", "value", "lag", "p_sim"]], on="geo_id")
cols = ["name", "department", "cluster_2012", "cluster_2024", "sdg1_2_mpi_2024", "value", "lag", "p_sim"]
outliers.sort_values(["cluster_2024", "sdg1_2_mpi_2024"], ascending=[True, False])[cols].round(3)
```

276 of the 343 units (80%) are of the same type in both periods, 196 of them not significant in either.

- **Hot spots.** Of the 43 hot spots of 2012, 22 are still hot spots in 2024: 9 in Potosí, 7 in Chuquisaca, 5 in Cochabamba and 1 in Oruro. 19 are no longer significant (6 each in Chuquisaca and Pando, 3 in La Paz, 2 in Potosí, 1 each in Beni and Oruro) and 2 became Low-High outliers (Alcalá in Chuquisaca and Villa Nueva in Pando), less poor than their neighbours by 2024. The Pando hot spot of 2012 dissolved: none of its 7 units remains. Five units are new hot spots: San Ignacio, Santa Ana and the new TIOC-Territorio Indígena Multiétnico in Beni, Tinguipaya in Potosí and Curahuara de Carangas in Oruro. Their poverty fell too (Tinguipaya from 0.462 to 0.134); they are hot spots because they and their neighbours are above the mean of 2024.
- **Clusters of low poverty.** 54 of the 70 of 2012 persist: 26 in Santa Cruz, 11 in Cochabamba, 10 in La Paz, 6 in Tarija and 1 in Chuquisaca. 15 are no longer significant, 8 of them in Cochabamba and 5 in La Paz. 17 units joined: 11 in Santa Cruz, 2 each in Chuquisaca and Tarija, 1 each in La Paz and Potosí.
- **Outliers in 2024.** Three poorer municipalities have less poor neighbours (High-Low): Arbieto and Morochata in Cochabamba and Tito Yupanqui in La Paz. Six less poor municipalities have poorer neighbours (Low-High), among them the capital Sucre (MPI 0.014, 1.1 standard deviations below the mean, with neighbours 1.2 above it). Sucre and Camargo are Low-High in both periods, Morochata and Tito Yupanqui High-Low in both.

Moves to and from "Not significant" can come from a pseudo p-value that crosses 0.05 by a small margin, so the persistent clusters are the firmer result.

+++

## Summary

- Multidimensional poverty fell by 73% between 2012 and 2024 (mean MPI 0.234 to 0.063) and in every one of the 343 units, but the ranking is stable (rank correlation 0.86).
- Poverty is strongly spatially clustered in both periods: Moran's I = 0.448 in 2012 and 0.388 in 2024 with 6-nearest-neighbour weights, and 0.436 and 0.415 with queen contiguity (pseudo p-value 0.001 in every case).
- Poverty hot spots fell from 43 to 27 (42 to 35 with queen contiguity) and now concentrate where Potosí, Chuquisaca and Cochabamba meet; the Pando hot spot of 2012 has dissolved. Clusters of low poverty (70, then 71) shifted towards Santa Cruz and Tarija.
- Four in five units (80%) are of the same type in both periods. 22 of the 43 hot spots of 2012 persist.
- Some capitals stand out as less poor islands among poorer neighbours (Sucre in both periods).
- These are descriptions of where poverty is and how it is arranged in space. They are associations, not evidence of what causes the clusters.

Function pages: [`map`](https://quarcs-lab.github.io/geo4bolivia/reference/map.html), [`weights`](https://quarcs-lab.github.io/geo4bolivia/reference/weights.html), [`connectivity`](https://quarcs-lab.github.io/geo4bolivia/reference/connectivity.html), [`moran`](https://quarcs-lab.github.io/geo4bolivia/reference/moran.html), [`lisa`](https://quarcs-lab.github.io/geo4bolivia/reference/lisa.html), [`lisa_transitions`](https://quarcs-lab.github.io/geo4bolivia/reference/lisa_transitions.html).

The companion notebook [`esda_dependence`](https://colab.research.google.com/github/quarcs-lab/gdo4bolivia/blob/main/notebooks/esda_dependence.ipynb) compares map classifications and repeats the analysis at the 10% level; [`esda_inequality`](https://colab.research.google.com/github/quarcs-lab/gdo4bolivia/blob/main/notebooks/esda_inequality.ipynb) measures how unequal poverty is and how that changed.
