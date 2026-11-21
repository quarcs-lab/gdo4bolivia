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

<a href="https://colab.research.google.com/github/quarcs-lab/gdo4bolivia/blob/main/notebooks/esda_inequality.ipynb" target="_parent"><img src="https://colab.research.google.com/assets/colab-badge.svg" alt="Open In Colab"/></a>

# Spatial inequality of poverty and night-time lights

Part of the [GeoDevelopment Observatory of Bolivia](https://quarcs-lab.github.io/gdo4bolivia/).

How unequal are Bolivia's municipalities, how much of that inequality is regional, and did it change as poverty fell? This notebook measures inequality in two indicators with the [`geo4bolivia`](https://quarcs-lab.github.io/geo4bolivia/) package:

- **Multidimensional poverty** (`sdg1_2_mpi`, Multidimensional Poverty Index, 0–1; **higher = poorer**) of the *Atlas de los ODS en Bolivia 2026* (SDSN Bolivia), computed from the population censuses of 2012 and 2024, for all **343 municipalities and indigenous autonomies**, in **both periods**.
- **Night-time lights per capita** (`ln_t400NTLpc`, the Hodrick–Prescott trend of log lights per person), every year from 2012 to 2020. Lights and the WorldPop population behind them were computed on the 2015 municipal map, `map339`, and cover its **339 units**: the 4 units created since have no data, and the 6 municipalities that later lost territory to them (Colquechaca, Mizque, Porco, Tomave, San Ignacio, Santa Ana) are described by their 2015 territory. Every result for lights is computed on those 339 units, on the 2015 map.

Outline:

1. **Load** the data (`geo.load`)
2. **Distributions** and maps (`geo.distribution`, `geo.map`, `geo.aggregate`)
3. **Theil index**, split between and within the 9 departments (`geo.theil_decomposition`)
4. **Gini coefficient** and the Lorenz curve (`geo.inequality`)
5. **Spatial Gini**: how much inequality lies between neighbouring municipalities (`geo.inequality` with `spatial=True`)
6. **Summary**

Each analysis returns a **result object**. Displaying it shows its main figure and a reading of the numbers; its parts are `.fig`, `.df` (the table behind the figure), `.gt` (a formatted table) and `.interpret()`.

+++

## 0. Setup

In Google Colab the next cell installs the package (a few seconds); it brings the libraries it uses (libpysal, inequality, mapclassify, plotly). Locally, `uv sync` has installed it already.

```{code-cell} ipython3
import importlib.util

missing = [p for p in ["geo4bolivia"] if importlib.util.find_spec(p) is None]
if missing:
    !pip install -q {" ".join(missing)}
```

```{code-cell} ipython3
import warnings
warnings.filterwarnings("ignore")    # library notices; the text explains the ones that matter

import pandas as pd

import geo4bolivia as geo

MPI = "sdg1_2_mpi"       # Multidimensional Poverty Index (higher = poorer), 2012 and 2024
NTL = "ln_t400NTLpc"     # log night-time lights per capita, HP trend, 2012-2020
```

## 1. Load the data

Each municipality has one `geo_id` (e.g. `BO-04-17-04`, Nuestra Señora de La Paz). `geo.load()` returns a panel with one row per municipality and year; `groups=` adds the name of each municipality and of its department. Poverty is stored at the years 2012 and 2024, lights at every year from 2012 to 2020.

```{code-cell} ipython3
mpi = geo.load("sdg01", variables=MPI, groups=["department"])      # 343 units
ntl = geo.load("ntl", variables=NTL, groups=["department"])        # 339 units (map339)

for name, panel in [("poverty", mpi), ("lights", ntl)]:
    years = sorted(panel["year"].unique().tolist())
    print(f"{name}: {panel['geo_id'].nunique()} units, years {years}")
mpi.head()
```

## 2. Distributions and maps

`geo.distribution()` overlays the histograms of the two periods and summarises each:

```{code-cell} ipython3
dist = geo.distribution(mpi, MPI)
dist
```

The table behind it, and the same summary for lights in their first and last year:

```{code-cell} ipython3
lights = geo.distribution(ntl, NTL, year=[2012, 2020])
pd.concat({"Multidimensional poverty": dist.df, "Log lights per capita": lights.df},
          names=["indicator"]).droplevel(1).round(3)
```

Where are the poorest municipalities? One map per period, each in its own quintiles (`scheme="quantiles"`), so the darkest class is the poorest fifth of that period:

```{code-cell} ipython3
for year in [2012, 2024]:
    geo.map(mpi, MPI, year=year, scheme="quantiles", title=f"MPI quintiles, {year}").show()
```

The poorest fifth of each period, by department:

```{code-cell} ipython3
quintile = mpi.groupby("year")[MPI].transform(lambda values: pd.qcut(values, 5, labels=False))
poorest = mpi[quintile == 4]
pd.crosstab(poorest["department"], poorest["year"], margins=True, margins_name="Total")
```

Poverty fell sharply: the municipal mean MPI dropped from 0.234 in 2012 (range 0.018 to 0.563) to 0.063 in 2024 (range 0.003 to 0.296). Its absolute spread narrowed too (standard deviation 0.106, then 0.044), but less than the mean, so relative to the mean it widened. In 2024 most municipalities bunch near zero with a long right tail (skewness 1.44, against 0.46 in 2012).

In both periods the poorest fifth lies mainly in Potosí, Chuquisaca, Cochabamba, La Paz and Oruro (57 of its 69 units in 2012, 60 of 68 in 2024). Pando had 8 units in the poorest fifth in 2012 and has 3 in 2024. Santa Cruz has one unit in it in 2012 and none in 2024, and Tarija none in either period.

Log lights per capita (339 units) average 13.0 in 2012, with the middle half between 12.1 and 14.3 and a few very dark units (the minimum is 0.86). By 2020 the mean is 14.0 and the standard deviation has fallen from 1.67 to 1.18.

Before decomposing, the department averages show how large the regional gaps are. The plain mean gives every municipality the same weight. `geo.aggregate()` computes the population-weighted mean: the metadata of `sdg01` say that the MPI aggregates with census population as weights, and the package loads them.

```{code-cell} ipython3
plain = mpi.pivot_table(index="department", columns="year", values=MPI).add_prefix("mean_mpi_")
weighted = geo.add_names(geo.aggregate(mpi, to="department", dataset="sdg01"))
weighted = weighted.pivot(index="name", columns="year", values=MPI).add_prefix("pop_weighted_mpi_")
dep_table = plain.join(weighted).join(mpi.groupby("department")["geo_id"].nunique().rename("units"))
dep_table.sort_values("mean_mpi_2024", ascending=False).round(3)
```

```{code-cell} ipython3
country = geo.aggregate(mpi, to="country", dataset="sdg01")
print("Bolivia, population-weighted MPI:", dict(zip(country["year"], country[MPI].round(3))))
print("Bolivia, mean across municipalities:", mpi.groupby("year")[MPI].mean().round(3).to_dict())
```

Chuquisaca has the highest mean MPI in both periods (0.323, then 0.090) and Tarija the lowest (0.118, then 0.027). Pando had the largest drop: from the second poorest department on average in 2012 (0.315) to the sixth in 2024 (0.068). In every department and in both periods the population-weighted MPI is below the plain mean: the populous municipalities, led by the capitals, are less poor than the small rural ones. For the country, the population-weighted MPI is 0.133 in 2012 and 0.033 in 2024, against means across municipalities of 0.234 and 0.063. The population-weighted figures approximate the Atlas's department values; they are not the Atlas's own figures.

Everything below treats each municipality as one observation, whatever its population: it measures inequality between municipalities, not between people.

+++

## 3. Theil index

The Theil index is 0 under perfect equality and rises with inequality. Its key property is **additive decomposability**: with the municipalities grouped into departments, total inequality splits exactly into a *between-department* part (differences in department means) and a *within-department* part (differences among municipalities of the same department). Like the Gini below, it is a relative measure: multiplying every value by the same factor leaves it unchanged.

`geo.theil_decomposition()` computes the index and its two parts in each year. `by="department"` groups the municipalities by the department they lie in. With `permutations=`, it also tests the between part against random reassignments of the municipalities to groups of the same sizes.

```{code-cell} ipython3
theil = geo.theil_decomposition(mpi, MPI, by="department", permutations=999)
theil
```

```{code-cell} ipython3
theil.df.round(4)
```

The same decomposition for lights, in every year from 2012 to 2020:

```{code-cell} ipython3
theil_ntl = geo.theil_decomposition(ntl, NTL, by="department", permutations=999)
theil_ntl.fig
```

```{code-cell} ipython3
theil_ntl.df.round(4)
```

The Theil index of poverty **more than doubled**, from 0.104 in 2012 to 0.219 in 2024. Poverty fell everywhere, but proportionally less in the poorest municipalities, so the relative gaps between municipalities widened even as the absolute gaps narrowed.

**Most inequality is within departments**: 79% in both periods. Differences between department averages account for the other 21%, a share that random groups of the same sizes did not reach in 999 trials (pseudo p-value 0.001). The split is stable: inequality rose by about the same proportion between and within departments. Bolivia's municipal disparities are therefore mostly local: each department contains both poor and less poor municipalities.

For lights, 82% to 83% of the Theil index lies within departments in 2012 and in 2020; the between share is 17% in 2012, peaks at 20% in 2016 and 2017, and is 18% in 2020. The level of the index is another matter. It is far smaller than that of poverty (0.009 in 2012) and falls every year, to 0.004 in 2020, but neither fact means what it would for a variable in levels. Lights enter in logarithms, which compresses their dispersion by construction, and the Theil and Gini of a logged variable fall mechanically when lights grow everywhere by the same proportion, because the mean of the logs rises. The standard deviation of the logs does not have that problem, and it fell from 1.67 to 1.18 (section 2): dispersion in lights did narrow. Read the indices of lights for their split between and within departments, and for neighbours in section 5, not for their level.

+++

## 4. Gini coefficient

The Gini coefficient (0 = equality, 1 = maximal inequality) is half the mean absolute difference between all pairs of municipalities, relative to the mean. `geo.inequality()` computes it in each year, with the Theil index and, on request, the coefficient of variation (`"cv"`: the standard deviation over the mean). `spatial=True` adds the spatial Gini of the next section, with 999 permutations.

```{code-cell} ipython3
ineq = geo.inequality(mpi, MPI, measures=("gini", "theil", "cv"), spatial=True, permutations=999)
ineq
```

`.gt` is the table of the measures. With two years it shows both and their change; a trend needs three or more years.

```{code-cell} ipython3
ineq.gt
```

The **Lorenz curve** shows the same inequality as a picture. Municipalities are sorted from the lowest MPI to the highest; the curve gives the share of the total (the sum of the MPI over all municipalities) held by the lowest share of them. The further the curve lies below the diagonal, the higher the Gini.

```{code-cell} ipython3
ineq.fig_lorenz
```

```{code-cell} ipython3
for year in [2012, 2024]:
    low, top = ineq.lorenz_share(year, 0.5), 1 - ineq.lorenz_share(year, 0.9)
    print(f"{year}: the half of the municipalities with the lowest MPI holds {low:.0%} of the total;",
          f"the tenth with the highest holds {top:.0%}")
```

For lights the panel has nine years, so `geo.inequality()` also fits a trend to each measure. The Lorenz curve is left out: it describes shares of a total, and a sum of logarithms is not a total of anything.

```{code-cell} ipython3
ineq_ntl = geo.inequality(ntl, NTL, spatial=True, permutations=999, lorenz=False)
ineq_ntl
```

```{code-cell} ipython3
ineq_ntl.df.round(4)
```

The Gini of poverty rose from 0.254 in 2012 to 0.367 in 2024 (by 45%): the expected gap in MPI between two randomly drawn municipalities (twice the Gini) grew from about 51% to about 73% of the mean MPI. The coefficient of variation tells the same story (0.45, then 0.70). With two periods these are two levels to compare, not a trend that can be tested.

The Lorenz curve of 2024 lies below that of 2012. The half of the municipalities with the lowest MPI holds 32% of the total in 2012 and 25% in 2024; the tenth with the highest MPI holds 19%, then 25%. Remaining poverty is more concentrated in the poorest municipalities.

The Gini of log lights falls from 0.068 in 2012 to 0.047 in 2020, about 4.5% a year. The caveat of section 3 applies: part of that fall is the rising mean of the logs. The series is also a smoothed trend, so its years are not independent observations and the significance of the fitted trend overstates the evidence.

+++

## 5. Spatial Gini

The spatial Gini (Rey and Smith, 2013) splits the Gini into the contribution of pairs of **neighbouring** municipalities and that of all other pairs. If inequality had no spatial structure, neighbours would differ as much as any random pair, and their share of the Gini would roughly equal their share of all pairs. A smaller share means neighbours are more alike than random pairs (positive spatial autocorrelation). The pseudo p-value compares the observed split with 999 random reshuffles of the values across the map.

`spatial=True` used the package's default weights, queen contiguity among the units with data: 343 for poverty (on the 2025 map) and 339 for lights (on the 2015 map they belong to), where a unit without data is nobody's neighbour. Only who is a neighbour matters here, not the size of the weights. The column `gini_spatial` is the part of the Gini owed to neighbouring pairs, and `gini_spatial_p` its pseudo p-value.

```{code-cell} ipython3
def neighbour_shares(result, w):
    """The neighbours' share of the Gini, next to their share of all pairs of units."""
    table = result.df[["year", "n_units", "gini", "gini_spatial", "gini_spatial_p"]].copy()
    table["neighbour share of Gini, %"] = 100 * table["gini_spatial"] / table["gini"]
    table["neighbour pairs, % of pairs"] = 100 * w.mean_neighbors / (w.n - 1)
    return table

print("Poverty:", ineq.w_spec)
print("Lights: ", ineq_ntl.w_spec)
shares = pd.concat({"Multidimensional poverty": neighbour_shares(ineq, geo.weights(mpi)),
                    "Log lights per capita": neighbour_shares(ineq_ntl, geo.weights(ntl))},
                   names=["indicator"])
shares[shares["year"].isin([2012, 2020, 2024])].droplevel(1).round(4)
```

The other notebooks of this series use the 6 nearest neighbours instead of contiguity. `w=` takes any weights from `geo.weights()`:

```{code-cell} ipython3
w6 = geo.weights(mpi, method="knn", k=6)
neighbour_shares(geo.inequality(mpi, MPI, w=w6, permutations=999), w6).round(4)
```

With queen contiguity on the 343 units, pairs of neighbours are 1.61% of all pairs of municipalities, and under random reshuffling they would carry about the same share of the Gini. In fact they carry 1.14% of poverty inequality in 2012 and 1.17% in 2024. For lights (339 units) neighbours are 1.63% of pairs and carry 1.16% of the Gini in 2012 and 1.18% in 2020. The difference is significant in every case (pseudo p-value 0.001, the smallest that 999 permutations allow): **inequality is spatially structured**. Neighbours resemble each other, and almost all inequality (about 98.8% of the Gini) comes from pairs of municipalities that are not neighbours.

The 6 nearest neighbours give the same reading: they are 1.75% of all pairs and carry 1.22% of the Gini of poverty in 2012 and 1.28% in 2024. With both definitions the neighbour share rose slightly between the two periods, so neighbours became a little less alike relative to other pairs, in line with the lower Moran's I of 2024 in `esda`.

+++

## 6. Summary

```{code-cell} ipython3
def summary(result, decomposition):
    table = result.df.merge(decomposition.df[["year", "between_share"]], on="year")
    table["neighbour_share"] = table["gini_spatial"] / table["gini"]
    cols = ["year", "n_units", "gini", "theil", "between_share", "neighbour_share", "gini_spatial_p"]
    return table[cols]

both = pd.concat({"Multidimensional poverty": summary(ineq, theil),
                  "Log lights per capita": summary(ineq_ntl, theil_ntl)}, names=["indicator"])
both[both["year"].isin([2012, 2020, 2024])].droplevel(1).round(4)
```

- Municipal **poverty fell sharply but became more unequal in relative terms**: the Gini rose from 0.25 to 0.37 and the Theil index from 0.10 to 0.22 between 2012 and 2024, because the poorest municipalities reduced their poverty proportionally less. The tenth of the municipalities with the highest MPI holds 25% of the total in 2024, against 19% in 2012.
- **Most inequality lies within departments**: 79% for poverty in both periods and 82% to 83% for lights. Departmental averages hide most of the disparities between municipalities.
- Inequality is **spatially structured** in both periods and for both indicators: neighbouring municipalities resemble each other, so the poor and the less poor municipalities form regional clusters that cut across department boundaries.
- Lights are measured in logs, so the level and the fall of their Gini and Theil indices are not comparable with those of poverty; their dispersion (the standard deviation of the logs) fell from 1.67 in 2012 to 1.18 in 2020.
- These are descriptions of how the indicators are distributed. They are associations, not evidence of what causes the gaps.

Function pages: [`distribution`](https://quarcs-lab.github.io/geo4bolivia/reference/distribution.html), [`map`](https://quarcs-lab.github.io/geo4bolivia/reference/map.html), [`aggregate`](https://quarcs-lab.github.io/geo4bolivia/reference/aggregate.html), [`theil_decomposition`](https://quarcs-lab.github.io/geo4bolivia/reference/theil_decomposition.html), [`inequality`](https://quarcs-lab.github.io/geo4bolivia/reference/inequality.html), [`weights`](https://quarcs-lab.github.io/geo4bolivia/reference/weights.html).

Related notebooks: `esda` and `esda_dependence` (Moran's I and LISA clusters in both periods) and `esda_heterogeneity` (GWR and MGWR of poverty on lights).
