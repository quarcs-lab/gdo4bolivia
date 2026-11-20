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

<a href="https://colab.research.google.com/github/quarcs-lab/gdo4bolivia/blob/main/notebooks/eda.ipynb" target="_parent"><img src="https://colab.research.google.com/assets/colab-badge.svg" alt="Open In Colab"/></a>

# Exploratory data analysis of multidimensional poverty in Bolivia

Part of the [GeoDevelopment Observatory of Bolivia](https://quarcs-lab.github.io/gdo4bolivia/).

This notebook explores how multidimensional poverty varies across Bolivia's 343 municipalities and indigenous autonomies, how it changed between the 2012 and 2024 censuses, and how it relates to population and night-time lights. The data and every analysis come from the [`geo4bolivia`](https://quarcs-lab.github.io/geo4bolivia/) package.

1. **Load the data** with `geo4bolivia`
2. **Descriptive statistics**: the centre, the spread and the extremes, in both periods
3. **Regional differences**: how poverty is distributed across departments
4. **Change, 2012-2024**: where poverty fell most
5. **Population and poverty**: are the most populous municipalities less poor?
6. **Night-time lights and poverty**: can lights from space help predict poverty?

Each exploration function ([`distribution`](https://quarcs-lab.github.io/geo4bolivia/reference/distribution.html), [`extremes`](https://quarcs-lab.github.io/geo4bolivia/reference/extremes.html), [`correlation`](https://quarcs-lab.github.io/geo4bolivia/reference/correlation.html), [`scatter`](https://quarcs-lab.github.io/geo4bolivia/reference/scatter.html), [`trend`](https://quarcs-lab.github.io/geo4bolivia/reference/trend.html)) returns a **result object**. Displayed, it shows its figure and a reading of the numbers; `.fig`, `.df`, `.gt` and the named numbers (`.corr`, `.slope`, ...) give the parts one by one. Every figure is interactive: hover over a point or a municipality to see its name.

+++

## 0. Setup

In Google Colab the next cell installs the package (a few seconds). Locally, `uv sync` has installed it already.

```{code-cell} ipython3
import importlib.util

if importlib.util.find_spec("geo4bolivia") is None:
    !pip install -q geo4bolivia
```

```{code-cell} ipython3
import sys
import warnings

import pandas as pd
import plotly.express as px
import plotly.io as pio

import geo4bolivia as geo

if "google.colab" not in sys.modules:
    pio.renderers.default = "notebook_connected"   # keeps the saved notebook small
warnings.filterwarnings("ignore", module="numba")   # a notice of an optional library
```

## 1. Load the data

| Variable | Dataset | Periods | Meaning |
| --- | --- | --- | --- |
| `sdg1_2_mpi` | `sdg01` | 2012, 2024 | Multidimensional Poverty Index (0–1; **higher = poorer**), from the censuses |
| `population` | `sdg` | 2012, 2024 | Census population |
| `ln_t400NTLpc` | `ntl` | 2012–2020 | Long-run trend (HP filter) of the log of night-time lights per capita |

The poverty index comes from the [Atlas de los ODS en Bolivia 2026](https://atlasods.sdsnbolivia.org/) (Andersen & Argandoña, SDSN Bolivia), which computes it from the 2012 and 2024 Population and Housing Censuses for all 343 units. Night-time lights were computed on the older 339-unit map, so they cover **333 units**: the six municipalities that have since lost territory (Colquechaca, Mizque, Porco, Tomave, San Ignacio and Santa Ana) and the four units created after 2012 have no values.

`geo.load()` returns a panel with one row per unit and year. We join the three variables into one panel; lights enter in 2012, the one year they share with poverty.

```{code-cell} ipython3
mpi = geo.load("sdg01", variables="sdg1_2_mpi", groups=["department"])
census = geo.load("sdg", variables="population")
lights = geo.load("ntl", variables="ln_t400NTLpc")          # 2012 to 2020

df = (mpi.merge(census, on=["geo_id", "year"])
         .merge(lights, on=["geo_id", "year"], how="left"))
df.head()
```

## 2. Descriptive statistics

- What do we know about the centre and dispersion of poverty, and how did they change?

`geo.describe()` summarises each variable in each year, with its label and unit from the metadata.

```{code-cell} ipython3
geo.describe(df).drop(columns=["variable", "unit"]).round(3)
```

`geo.extremes()` ranks one year and returns the units at the two ends.

```{code-cell} ipython3
geo.extremes(df, "sdg1_2_mpi", year=2012)
```

```{code-cell} ipython3
geo.extremes(df, "sdg1_2_mpi", year=2024)
```

In 2012 the average municipality had an MPI of 0.234 (median 0.227, standard deviation 0.106), with values from 0.018 to 0.563. By 2024 the average had fallen to 0.063 (median 0.053, standard deviation 0.044), with values from 0.003 to 0.296. Population is very skewed: the median unit had about 12,300 inhabitants in 2024 (10,600 in 2012), while Santa Cruz de la Sierra had 1.61 million. The summary table also shows a gap: lights have 333 units in 2012 and none in 2024.

The poorest unit in both periods is TIOC-Raqaypampa (Cochabamba; 0.563 in 2012 and 0.296 in 2024), an indigenous autonomy created after 2012, followed by Poroma (Chuquisaca). Nuestra Señora de La Paz is the least poor in both periods (0.018 and 0.003); in 2024 Colcapirhua, Trigal (Santa Cruz), Santa Cruz de la Sierra and El Alto follow it.

+++

## 3. Regional differences in poverty

- How is poverty distributed across the 343 municipalities and 9 departments, and did the pattern change?

`geo.distribution()` draws the histogram of a variable. With two periods it overlays them on common bins.

```{code-cell} ipython3
geo.distribution(df, "sdg1_2_mpi")
```

With `by=`, it compares groups in one year. A box plot shows each department's median, its middle half and its unusual municipalities:

```{code-cell} ipython3
box_2012 = geo.distribution(df, "sdg1_2_mpi", year=2012, by="department",
                            kind="box")
box_2012
```

```{code-cell} ipython3
box_2024 = geo.distribution(df, "sdg1_2_mpi", year=2024, by="department",
                            kind="box")
box_2024
```

The table behind each figure is `.df`. Side by side, the department means and medians of the two periods:

```{code-cell} ipython3
cols = ["department", "n", "mean", "median", "sd", "min", "max"]
by_dep = box_2012.df[cols].merge(box_2024.df[cols], on=["department", "n"],
                                 suffixes=("_2012", "_2024"))
by_dep.sort_values("mean_2012", ascending=False).round(3)
```

How much of the differences between municipalities lies between departments? `geo.theil_decomposition()` splits Theil's inequality index into a part between groups and a part within them.

```{code-cell} ipython3
geo.theil_decomposition(df, "sdg1_2_mpi", by="department")
```

Departments differ, but municipalities differ much more within departments than the departments differ from one another: only 21% of the Theil index lies between departments, in 2012 and in 2024. In 2012 Cochabamba ran from 0.039 to the highest value in the country (0.563, TIOC-Raqaypampa), and Potosí from 0.051 to 0.496. Pando and Chuquisaca had the highest medians (0.336 and 0.317) and Chuquisaca the highest mean (0.323); Tarija's poorest municipality scored 0.201.

By 2024 the whole distribution has shifted towards zero and narrowed: the national median is 0.053 and the interquartile range fell from 0.153 to 0.053. What remains is a long right tail (skewness 1.44). The order of the departments is broadly the same, with Chuquisaca (mean 0.090) and Potosí (0.083) the poorest, followed by Beni (0.075), and Santa Cruz (0.032) and Tarija (0.027) the least poor. Pando's mean fell the most, from 0.315 to 0.068.

+++

## 4. Change, 2012-2024

With a list of years and a classification scheme, `geo.map()` draws the two periods side by side in the same classes (here natural breaks computed over both years), so a colour means the same on both maps.

```{code-cell} ipython3
geo.map(df, "sdg1_2_mpi", year=[2012, 2024], scheme="fisher_jenks")
```

`change=True` maps the change itself, 2024 minus 2012, in MPI points:

```{code-cell} ipython3
geo.map(df, "sdg1_2_mpi", change=True, scheme="fisher_jenks")
```

`geo.change()` gives the same numbers as a table: one row per unit with its value in each year, its change in points and in percent, and its rank in each year.

```{code-cell} ipython3
chg = geo.change(df, "sdg1_2_mpi")
summary = geo.describe(chg, ["sdg1_2_mpi_change", "sdg1_2_mpi_pct_change"], by=None)
summary.drop(columns=["variable", "unit"]).round(3)
```

Where did poverty fall most and least? The change is negative everywhere, so the "lowest" values are the largest falls.

```{code-cell} ipython3
geo.extremes(chg, "sdg1_2_mpi_change")
```

Is the poverty of 2024 related to the poverty of 2012?

```{code-cell} ipython3
geo.scatter(chg, "sdg1_2_mpi_2012", "sdg1_2_mpi_2024", color="department")
```

The correlation table (`.gt`) has Pearson's coefficient above the diagonal and Spearman's rank coefficient below it:

```{code-cell} ipython3
geo.correlation(chg, ["sdg1_2_mpi_2012", "sdg1_2_mpi_2024", "sdg1_2_mpi_change"]).gt
```

`geo.trend()` follows the mean of each department between the two periods; the thin grey lines are the municipalities.

```{code-cell} ipython3
geo.trend(df, "sdg1_2_mpi", by="department")
```

Did the gaps between municipalities narrow? `geo.inequality()` measures them in relative terms, with the Gini index and the coefficient of variation (the standard deviation over the mean).

```{code-cell} ipython3
geo.inequality(df, "sdg1_2_mpi", measures=["gini", "cv"])
```

Poverty fell in all 343 units: the change runs from -0.402 to -0.015 MPI points, with a mean of -0.171. In relative terms the falls are similar everywhere: the median unit lost 76% of its 2012 value, and half of the units lost between 70% and 81%. In the scatter, the least-squares line has a slope of 0.359, far below one: the higher the poverty of 2012, the larger the fall in points (the correlation between the 2012 level and the change is -0.95). The ordering persists (correlation 0.86, rank correlation 0.86), so the poorest places of 2012 are mostly still the poorest.

Absolute gaps narrowed (the standard deviation fell from 0.106 to 0.044, and the gap between the poorest and the least poor department mean from 0.205 to 0.063), but relative gaps widened: the coefficient of variation rose from 0.45 to 0.70 and the Gini index from 0.254 to 0.367, because the least poor municipalities are now very close to zero. The largest fall was in Sena (Pando, -0.402), followed by Tinguipaya (Potosí), Alalay (Cochabamba), Azurduy and Presto (Chuquisaca), all about -0.33. Four of the five smallest falls were in the places with the lowest poverty of 2012, which had little to lose (Nuestra Señora de La Paz, Huachacalla, Colcapirhua and Tarija); the fifth is Tolata (Cochabamba, -0.031). Among departments, Pando's mean fell the most (-0.247) and Tarija's the least (-0.091).

+++

## 5. Population and poverty

- Do the most populous municipalities tend to be less poor?

Population here is the census count of the same year. The ten most and the ten least populous units in 2024:

```{code-cell} ipython3
size = geo.extremes(df, "population", year=2024, n=10)
size.fig
```

The treemap nests municipalities within departments: the area of each tile is its 2024 population and its colour its 2024 poverty (click a department to zoom in). The package has no treemap, so this figure and the next are plain Plotly Express, with `geo.labels()` naming the columns.

```{code-cell} ipython3
d24 = df[df["year"] == 2024]
px.treemap(d24, path=[px.Constant("Bolivia"), "department", "name"],
           values="population", color="sdg1_2_mpi", labels=geo.labels(d24),
           title="Population (area) and multidimensional poverty (colour), 2024")
```

The same view for 2012, as a sunburst:

```{code-cell} ipython3
d12 = df[df["year"] == 2012]
px.sunburst(d12, path=["department", "name"], values="population",
            color="sdg1_2_mpi", labels=geo.labels(d12),
            title="Population (angle) and multidimensional poverty (colour), 2012")
```

`geo.scatter()` with `log_x=True` puts population on a logarithmic axis and fits the line on its natural logarithm:

```{code-cell} ipython3
geo.scatter(df, "population", "sdg1_2_mpi", year=2012, color="department",
            log_x=True)
```

```{code-cell} ipython3
geo.scatter(df, "population", "sdg1_2_mpi", year=2024, color="department",
            log_x=True)
```

The typical municipality is not where the typical Bolivian lives. `geo.aggregate()` computes the national poverty index as a census-population-weighted mean of the municipalities (the rule the metadata declares), to compare with the simple means of section 2. The last lines measure the weight of the ten largest municipalities.

```{code-cell} ipython3
geo.aggregate(df, to="country", dataset="sdg01", variables="sdg1_2_mpi").round(3)
```

```{code-cell} ipython3
largest = size.df.loc[size.df["end"] == "highest", "geo_id"]
top10 = d24[d24["geo_id"].isin(largest)]
share = top10["population"].sum() / d24["population"].sum()
print(f"The ten largest municipalities hold {share:.0%} of the 2024 population; "
      f"their highest MPI is {top10['sdg1_2_mpi'].max():.3f}.")
```

More populous municipalities tend to be less poor, in both periods. In 2012 the correlation with log population is -0.34, and a tenfold increase in population goes with an MPI about 0.07 lower (0.031 × ln 10). In 2024 the relation is weaker (correlation -0.23) and the same tenfold increase goes with an MPI only 0.02 lower (0.009 × ln 10), as poverty has fallen most where it was highest. The relationship is loose: population accounts for 11% of the variation of poverty in 2012 and 5% in 2024.

Population and poverty are concentrated in different places. The ten largest municipalities hold 47% of the 2024 population and none has an MPI above 0.021, while three quarters of the units have fewer than about 21,000 people. As a result the population-weighted mean MPI is about half the simple mean: 0.133 against 0.234 in 2012, and 0.033 against 0.063 in 2024. The typical Bolivian lives in a much less poor municipality than the typical municipality suggests.

+++

## 6. Night-time lights and poverty

- Can night-time lights help us predict poverty?

Lights are measured every year from 2012 to 2020. `geo.trend()` shows the mean of each department over those years, on the 333 units with lights:

```{code-cell} ipython3
geo.trend(lights, "ln_t400NTLpc", by="department")
```

We compare lights with poverty in 2012, the year both were measured. The map shows lights per capita in quintiles: a few almost unlit municipalities are extreme outliers, and natural breaks would give them a class of their own. The ten units without lights are left blank. Compare it with the 2012 poverty map of section 4.

```{code-cell} ipython3
geo.map(df, "ln_t400NTLpc", year=2012, scheme="quantiles")
```

```{code-cell} ipython3
geo.scatter(df, "ln_t400NTLpc", "sdg1_2_mpi", year=2012, color="department")
```

A few municipalities are almost unlit. Are they driving the result? `geo.extremes()` finds them; the rank (Spearman) correlation, below the diagonal of the table, and the correlation without them answer the question.

```{code-cell} ipython3
geo.extremes(df, "ln_t400NTLpc", year=2012, n=3).df
```

```{code-cell} ipython3
geo.correlation(df, ["sdg1_2_mpi", "ln_t400NTLpc", "population"], year=2012).gt
```

```{code-cell} ipython3
lit = df[df["ln_t400NTLpc"] > 7]
print(f"Correlation without the three almost unlit units: "
      f"{geo.scatter(lit, 'ln_t400NTLpc', 'sdg1_2_mpi', year=2012).corr:.2f}")
```

Do the lights of 2012 also anticipate poverty in 2024, and do the latest lights (2020) relate to it? `wide=` loads one column per year, which we join to the table of changes of section 4. `geo.labels(..., own=...)` gives the new columns a label for the table.

```{code-cell} ipython3
lights_wide = geo.load("ntl", variables="ln_t400NTLpc", wide="ln_t400NTLpc")
later = chg.merge(lights_wide[["geo_id", "ln_t400NTLpc2012", "ln_t400NTLpc2020"]],
                  on="geo_id")
geo.labels(later, own={"ln_t400NTLpc2012": "Log lights per capita (trend), 2012",
                       "ln_t400NTLpc2020": "Log lights per capita (trend), 2020"})
geo.correlation(later, ["sdg1_2_mpi_2024", "sdg1_2_mpi_change",
                        "ln_t400NTLpc2012", "ln_t400NTLpc2020"]).gt
```

Brighter municipalities were less poor. Across the 333 units with lights, the correlation between lights per capita and the MPI in 2012 is -0.54, so lights alone account for 29% of the variation in poverty. An increase of one log point in lights per capita goes with an MPI 0.033 lower.

Three municipalities are almost unlit (Mojinete in Potosí, San Lorenzo in Pando and Exaltación in Beni). They do not drive the result: without them the correlation is -0.57, and the rank correlation is -0.60.

The relation carries over to 2024 almost as strongly: the lights of 2012 correlate -0.49 with poverty in 2024, and the lights of 2020 -0.50. Brighter municipalities saw smaller falls in poverty (correlation 0.50 between the lights of 2012 and the change), largely because they had less poverty to lose. Lights themselves rose in 95% of the units between 2012 and 2020, most in Beni and least in Santa Cruz.

- How heterogeneous is the relationship between poverty and night-time lights across departments?

`geo.scatter()` draws one panel, so the small multiples are Plotly Express; the slope and the correlation of each department come from `geo.scatter()` on that department's municipalities.

```{code-cell} ipython3
px.scatter(d12, x="ln_t400NTLpc", y="sdg1_2_mpi", facet_col="department",
           facet_col_wrap=3, trendline="ols", hover_name="name", height=700,
           labels={"ln_t400NTLpc": "Log lights per capita", "sdg1_2_mpi": "MPI",
                   "department": "Department"},
           title="Night-time lights and poverty by department, 2012")
```

```{code-cell} ipython3
rows = []
for department, d in d12.groupby("department"):
    fit = geo.scatter(d, "ln_t400NTLpc", "sdg1_2_mpi")
    rows.append({"department": department, "municipalities": fit.n,
                 "slope": fit.slope, "correlation": fit.corr})
potosi = d12[(d12["department"] == "Potosí") & (d12["name"] != "Mojinete")]
fit = geo.scatter(potosi, "ln_t400NTLpc", "sdg1_2_mpi")
print(f"Potosí without Mojinete: slope {fit.slope:.3f}, correlation {fit.corr:.2f}")
pd.DataFrame(rows).sort_values("slope").round(3)
```

The relationship is negative in all nine departments, but its strength varies. It is steepest and tightest in Cochabamba (slope -0.085, correlation -0.79) and Chuquisaca (-0.068, -0.85), where lights separate the poorer rural municipalities from the rest well. It is weakest in Pando (correlation -0.321) and Santa Cruz (-0.365), and flattest in Beni, Pando and Tarija (slopes between -0.013 and -0.015); in Tarija poverty is uniformly low. Potosí's slope (-0.026) is flattened by Mojinete, its almost unlit outlier: without it the slope is -0.058 and the correlation -0.74.

+++

## Summary

- Multidimensional poverty fell in all 343 municipalities and indigenous autonomies between 2012 and 2024: the municipal mean went from 0.234 to 0.063 (median 0.227 to 0.053), and the population-weighted national mean from 0.133 to 0.033.
- In both periods poverty varies much more within departments than between them (about a fifth of the Theil index lies between departments). Chuquisaca, Pando and Potosí had the poorest municipalities in 2012; Chuquisaca, Potosí and Beni in 2024. Tarija and Santa Cruz are the least poor in both. TIOC-Raqaypampa is the poorest unit and Nuestra Señora de La Paz the least poor in both periods.
- Poorer municipalities fell most in absolute terms and the ordering persisted (correlation 0.86): absolute gaps narrowed, relative gaps widened (coefficient of variation 0.45 to 0.70).
- Larger municipalities are less poor (correlation with log population -0.34 in 2012, -0.23 in 2024). The large cities have low poverty and hold close to half the population, so the population-weighted MPI is about half the municipal average.
- Night-time lights per capita are more closely associated with poverty (correlation -0.54 in 2012, on the 333 units with lights). The association is robust to the few almost unlit municipalities, negative in every department, and still -0.50 between the lights of 2020 and poverty in 2024.
- The maps show that poverty and lights are spatially clustered. The companion notebooks [`esda`](https://colab.research.google.com/github/quarcs-lab/gdo4bolivia/blob/main/notebooks/esda.ipynb) and [`esda_dependence`](https://colab.research.google.com/github/quarcs-lab/gdo4bolivia/blob/main/notebooks/esda_dependence.ipynb) measure that clustering with spatial weights, Moran's I and LISA.
- These are associations between variables measured in the same places; none of them shows that one causes the other. The [package documentation](https://quarcs-lab.github.io/geo4bolivia/) has every function used here, with an example.
