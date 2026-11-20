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

<a href="https://colab.research.google.com/github/quarcs-lab/gdo4bolivia/blob/main/notebooks/eda_esda.ipynb" target="_parent"><img src="https://colab.research.google.com/assets/colab-badge.svg" alt="Open In Colab"/></a>

# Multidimensional poverty in Bolivia: exploratory and spatial data analysis

Part of the [GeoDevelopment Observatory of Bolivia](https://quarcs-lab.github.io/gdo4bolivia/).

This notebook combines classical exploratory data analysis (EDA) with exploratory spatial data analysis (ESDA) for Bolivia's 343 municipalities and indigenous autonomies. The outcome is the **Multidimensional Poverty Index** (`sdg1_2_mpi`) of the Atlas de los ODS en Bolivia 2026, which runs from 0 to 1: **higher values mean more poverty**. The analysis centres on 2012, when night-time lights begin, and repeats the main steps for 2024. Night-time lights per capita, census population and a set of infrastructure and connectivity indicators are the companions.

1. **Data**: everything is loaded with the [`geo4bolivia`](https://quarcs-lab.github.io/geo4bolivia/) package
2. **EDA**: summaries, distributions, department comparisons and change since 2012, population, night-time lights and infrastructure correlates
3. **Maps**: both periods in common classes, and night-time lights
4. **Spatial dependence**: spatial weights, global and local Moran's I, how the clusters changed, bivariate Moran's I and bivariate LISA
5. **Spatial inequality**: Gini, Theil and its decomposition by department, spatial Gini
6. **Spatial heterogeneity**: a multiscale geographically weighted regression (MGWR) of poverty on night-time lights
7. **Summary**

Almost every step is one function of the package, which returns a result with its figure, its table and a reading of the numbers. The exceptions are the bivariate Moran statistics of section 4.4, which the package does not have: they use the esda library, with weights and boundaries from the package. The notebook began as a port of DS4Bolivia's *Extended EDA + Spatial Analysis* notebook. The focused notebooks `esda_dependence`, `esda_inequality` and `esda_heterogeneity` go deeper into sections 4–6.

+++

## 0. Setup

In Google Colab the next cell installs the package with its MGWR extra (it brings the mgwr library; Colab already has the rest). Locally, `uv sync` has installed everything already.

```{code-cell} ipython3
import importlib.util

if any(importlib.util.find_spec(p) is None for p in ["geo4bolivia", "mgwr"]):
    !pip install -q "geo4bolivia[mgwr]"
```

```{code-cell} ipython3
import os
import sys
import warnings

import numpy as np
import pandas as pd
import plotly.express as px
import plotly.io as pio
from esda.moran import Moran_BV, Moran_Local_BV          # section 4.4 only
from libpysal.weights import lag_spatial

import geo4bolivia as geo

warnings.filterwarnings("ignore")
os.environ["PYTHONWARNINGS"] = "ignore"     # also in the worker processes that MGWR starts
pd.set_option("display.max_columns", 30)
pd.set_option("display.width", 160)
# Plotly: Colab's own renderer there; elsewhere load plotly.js from its CDN to keep the file small
pio.renderers.default = "colab" if "google.colab" in sys.modules else "notebook_connected"
print("geo4bolivia", geo.__version__)
```

## 1. Data

Everything is at the municipality scale and keyed by `geo_id`:

| Variable | Dataset | Years | Meaning |
| --- | --- | --- | --- |
| `sdg1_2_mpi` | `sdg01` | 2012, 2024 | Multidimensional Poverty Index (0–1, higher = poorer) |
| `population` | `sdg` | 2012, 2024 | Census population |
| `ln_t400NTLpc` | `ntl` | 2012, 2020 | Hodrick–Prescott trend of the log of night-time lights per capita |
| infrastructure and connectivity | `sdg07`, `sdg08`, `sdg09`, `sdg11`, `sdg` | 2012, 2024 | see section 2.5 |

The Atlas de los ODS en Bolivia 2026 covers all **343 municipalities and indigenous autonomies** at two points in time, near the 2012 and the 2024 censuses (stored as years 2012 and 2024). Night-time lights per capita are built from gridded population on the older municipal map and cover **333 units**: the four units created since (three indigenous autonomies, TIOC, and San Pedro de Macha) and the six municipalities that ceded territory to them have no lights value. Analyses that involve lights use those 333 units; the rest use all 343.

The Atlas is published as one dataset per goal (`sdg01` to `sdg17`) plus `sdg` (the overall index, census population and urbanization). `geo.combine` puts the variables of several datasets in one panel, one row per unit and period. Two choices are made here:

- The lights of 2012 go with the poverty of 2012, and the lights of 2020 (the last year of the series) with the poverty of 2024: the lights of 2020 are stored in the rows of 2024.
- The Atlas gives the urbanization rate for 2024 only; it is used in both periods.

```{code-cell} ipython3
infra = ["urbanization", "sdg7_1_cae", "sdg9_8_tfc", "sdg9_8_ci", "sdg9_8_drb", "sdg11_2_atc",
         "sdg8_10_dsb", "sdg9_1_vpc"]
df = geo.combine({"sdg01": ["sdg1_2_mpi"], "sdg": ["population", "urbanization"],
                  "sdg07": ["sdg7_1_cae"], "sdg08": ["sdg8_10_dsb"], "sdg11": ["sdg11_2_atc"],
                  "sdg09": ["sdg9_8_tfc", "sdg9_8_ci", "sdg9_8_drb", "sdg9_1_vpc"]},
                 scale="municipality")
df["urbanization"] = df.groupby("geo_id")["urbanization"].transform("first")   # the 2024 value

ntl = geo.load("ntl", variables="ln_t400NTLpc", years=[2012, 2020])
ntl["year"] = ntl["year"].replace({2020: 2024})      # lights of 2020 next to poverty of ~2024
df = geo.add_names(df.merge(ntl, on=["geo_id", "year"], how="left"), groups=["department"])
df["ln_pop"] = np.log(df["population"])
labels = {**geo.labels(df), "ln_pop": "Log of population"}

lit = df.dropna(subset=["ln_t400NTLpc"])             # the 333 units with lights
dark = df.loc[df["ln_t400NTLpc"].isna(), "name"].unique()
print(df["geo_id"].nunique(), "units,", lit["geo_id"].nunique(), "with lights | without:",
      ", ".join(dark))
df[["geo_id", "name", "department", "year", "sdg1_2_mpi", "population", "ln_t400NTLpc"]].head()
```

## 2. Exploratory data analysis

### 2.1 Descriptive statistics

What do we know about the centre and spread of poverty, and how has it changed? `geo.describe` summarises each variable in each period, and `geo.extremes` names the units at both ends.

```{code-cell} ipython3
geo.describe(df, ["sdg1_2_mpi", "ln_t400NTLpc", "population"])
```

```{code-cell} ipython3
geo.extremes(df, "sdg1_2_mpi", year=2012, n=10)
```

```{code-cell} ipython3
ends24 = geo.extremes(df, "sdg1_2_mpi", year=2024, n=5).df
print(ends24[["name", "department", "sdg1_2_mpi", "end"]].to_string(index=False))

chg = geo.change(df, "sdg1_2_mpi")
print(f"\nMPI fell in {(chg['sdg1_2_mpi_change'] < 0).sum()} of {len(chg)} units; "
      f"mean change {chg['sdg1_2_mpi_pct_change'].mean():.1f}%")
quarter = pd.qcut(chg["sdg1_2_mpi_2012"], 4, labels=["least poor", "second", "third", "poorest"])
print("Mean change (%) by quarter of the 2012 values:",
      chg.groupby(quarter, observed=True)["sdg1_2_mpi_pct_change"].mean().round(1).to_dict())
print(f"Spearman correlation of the two periods: "
      f"{geo.rank_mobility(df, 'sdg1_2_mpi').spearman:.3f}")
dark12 = geo.extremes(df, "ln_t400NTLpc", year=2012, n=2).df
print("Darkest units in 2012:",
      dark12.loc[dark12["end"] == "lowest", ["name", "ln_t400NTLpc"]].round(2).values.tolist())
```

In 2012 the average municipality has an MPI of 0.234 (median 0.227, standard deviation 0.106), with values from 0.018 in Nuestra Señora de La Paz to 0.563 in TIOC-Raqaypampa (Cochabamba), one of the new indigenous autonomies. The poorest ten are rural municipalities of Chuquisaca (Poroma, Azurduy, Incahuasi), Potosí (San Pedro, Tacobamba, Ckochas), Cochabamba (Raqaypampa, Alalay) and Pando (Sena, San Pedro). The least poor are the large cities (La Paz, El Alto, Santa Cruz de la Sierra, Oruro, Tarija, Potosí), Colcapirhua and Punata in the Cochabamba valley, Bermejo, and Huachacalla (Oruro).

By 2024 poverty has fallen in every one of the 343 units, by about three quarters on average: the average MPI is 0.063 (median 0.053, standard deviation 0.044), from 0.003 in La Paz to 0.296, again in Raqaypampa. The ranking is persistent (Spearman correlation 0.861 between the two periods): Raqaypampa, Poroma and San Pedro (Potosí) are still the three poorest, joined by El Choro (Oruro) and Vila Vila (Cochabamba).

Poverty fell proportionally less where it was highest: by 69.7% on average in the poorest quarter of 2012, against 78.8% in the least poor quarter.

Night-time lights have one extreme value: Mojinete (Potosí) has a log of 0.86 in 2012, against 5.47 for the next darkest municipality.

How do departments compare? The table gives the simple mean over municipalities and, with `geo.aggregate`, the mean weighted by census population (the poverty of the average resident), in both periods. The weights are the rule the metadata declares for the variable.

```{code-cell} ipython3
simple = df.pivot_table(index="department", columns="year", values="sdg1_2_mpi", aggfunc="mean")
weighted = geo.add_names(geo.aggregate(df[["geo_id", "year", "sdg1_2_mpi"]], to="department",
                                       dataset="sdg01"))
weighted = weighted.pivot(index="name", columns="year", values="sdg1_2_mpi")

by_dep = pd.DataFrame({"units": df[df["year"] == 2012].groupby("department").size(),
                       "mean 2012": simple[2012], "weighted 2012": weighted[2012],
                       "mean 2024": simple[2024], "weighted 2024": weighted[2024]})
by_dep["change in weighted (%)"] = 100 * (by_dep["weighted 2024"] / by_dep["weighted 2012"] - 1)
by_dep.sort_values("mean 2012", ascending=False).round(3)
```

In 2012 Chuquisaca (simple mean 0.323), Pando (0.315) and Potosí (0.279) are the poorest departments, and Tarija (0.118) and Santa Cruz (0.169) the least poor. Weighting by population lowers every department's figure, often by about half (La Paz from 0.224 to 0.110, Oruro from 0.235 to 0.129), because the populous municipalities are the least poor. It also reorders the top: weighted, Pando (0.236), Beni (0.229), Potosí (0.224) and Chuquisaca (0.221) are almost level, since Beni's figure barely moves.

Between the periods the population-weighted MPI falls by 68% (Beni) to 82% (Santa Cruz). In 2024 Beni (0.072), Potosí (0.063) and Chuquisaca (0.058) are the poorest departments for the average resident, and Santa Cruz (0.017) and Tarija (0.018) the least poor.

+++

### 2.2 Distributions and department differences

How is poverty distributed across the 343 municipalities and the 9 departments? `geo.distribution` overlays the two periods, and with `by="department"` it compares the departments.

```{code-cell} ipython3
geo.distribution(df, "sdg1_2_mpi")
```

```{code-cell} ipython3
box12 = geo.distribution(df, "sdg1_2_mpi", year=2012, by="department", kind="box")
box12
```

```{code-cell} ipython3
box24 = geo.distribution(df, "sdg1_2_mpi", year=2024, by="department", kind="box")
columns = ["department", "min", "median", "max"]
box12.df[columns].merge(box24.df[columns], on="department", suffixes=(" 2012", " 2024")).round(3)
```

```{code-cell} ipython3
geo.distribution(df, "ln_t400NTLpc", year=2012)
```

In 2012 poverty is mildly right-skewed (mean 0.234 above the median 0.227, skewness 0.46). By 2024 the whole distribution has moved towards zero, narrowed and become more skewed (mean 0.063, median 0.053, skewness 1.44), with a thin upper tail. Log night-time lights are left-skewed (−1.65), with Mojinete and a few very dark municipalities far to the left of the bulk.

The department boxes overlap widely: the spread *within* departments is large compared with the differences *between* them. In 2012 Cochabamba alone runs from 0.039 to 0.563, the widest spread of any department. Pando and Chuquisaca have the highest medians in 2012 (0.336 and 0.317), Santa Cruz and Tarija the lowest (0.154 and 0.139). In 2024 every department is lower; Pando's median falls most, to 0.056, below those of Potosí (0.078) and Chuquisaca (0.074).

+++

### 2.3 Population and poverty

Are the most populous municipalities less poor? A treemap (Plotly Express; the package has no such figure) sizes each municipality by its population, and `geo.scatter` sets poverty against population on a logarithmic axis.

```{code-cell} ipython3
d12 = df[df["year"] == 2012].assign(country="Bolivia")

px.treemap(d12, path=["country", "department", "name"], values="population", color="sdg1_2_mpi",
           labels=geo.labels(d12),
           title="Municipalities sized by population (2012 census), coloured by poverty")
```

```{code-cell} ipython3
pop24 = geo.scatter(df, "population", "sdg1_2_mpi", year=2024, log_x=True)
print(f"2024: slope {pop24.slope:.3f} per log point, R² {pop24.r2:.3f}")
geo.scatter(df, "population", "sdg1_2_mpi", year=2012, log_x=True, color="department")
```

In the treemap (click a department to zoom in) the largest blocks, the cities of Santa Cruz de la Sierra, El Alto, La Paz and Cochabamba, have the colours of low poverty; the poorest municipalities are small blocks.

The line confirms a negative but weak association: in 2012 each additional log point of population goes with an MPI 0.031 lower, and population accounts for only 11% of the variation. In 2024 the link is weaker still (slope −0.009, R² = 0.053). Small municipalities can be very poor or not poor at all.

+++

### 2.4 Night-time lights and poverty

Do brighter municipalities have less poverty? This section uses the 333 units with lights. `geo.regression` puts two models side by side: the plain regression, and one with department fixed effects, whose slope compares municipalities of the same department.

```{code-cell} ipython3
geo.scatter(df, "ln_t400NTLpc", "sdg1_2_mpi", year=2012, color="department")
```

```{code-cell} ipython3
ols24 = geo.regression(df, "sdg1_2_mpi", "ln_t400NTLpc", year=2024)
print(f"MPI 2024 on lights 2020: slope {ols24.df.loc[0, 'estimate']:.4f} "
      f"(SE {ols24.df.loc[0, 'std_error']:.4f}), R² {ols24.summary.loc[0, 'r2']:.3f}")

ols = geo.regression(df, "sdg1_2_mpi", [["ln_t400NTLpc"], ["ln_t400NTLpc"]], year=2012,
                     fixed_effects=[None, "department"])
ols.gt
```

How different is the relationship from one department to another? The same scatter, department by department:

```{code-cell} ipython3
rows = []
for department, part in lit.groupby("department"):
    r12 = geo.scatter(part, "ln_t400NTLpc", "sdg1_2_mpi", year=2012)
    r24 = geo.scatter(part, "ln_t400NTLpc", "sdg1_2_mpi", year=2024)
    rows.append({"department": department, "units": r12.n, "slope 2012": r12.slope,
                 "correlation 2012": r12.corr, "correlation 2024 (lights 2020)": r24.corr})
print(pd.DataFrame(rows).sort_values("slope 2012").round(3).to_string(index=False))

l12 = lit[lit["year"] == 2012]
px.scatter(l12, x="ln_t400NTLpc", y="sdg1_2_mpi", facet_col="department", facet_col_wrap=3,
           trendline="ols", hover_name="name", labels=geo.labels(l12), height=700,
           title="Poverty and night-time lights by department, 2012")
```

Night-time lights tell more about poverty than population does: on the 333 units with lights, one more log point of lights per capita goes with an MPI 0.033 lower, and lights alone account for 29% of the variation in poverty (R² = 0.293). The link persists in the latest period: poverty in 2024 on lights in 2020 gives a slope of −0.018 and R² = 0.251. With department fixed effects the slope is −0.031 (and R² rises to 0.42): almost all of the association holds between municipalities of the same department.

Within every department the 2012 slope is negative, but its size varies more than sixfold. It is steepest in Cochabamba (−0.085) and Chuquisaca (−0.068), where the correlations are also strongest (−0.79 and −0.85), and flattest in Beni (−0.013), Pando (−0.014) and Tarija (−0.015). Potosí's slope (−0.026) is flattened by Mojinete, the single point at the far left of its panel. In 2024 Chuquisaca and Potosí have the strongest correlations (both −0.71), and in Tarija the correlation vanishes (−0.02). Section 6 shows that this heterogeneity is geographic.

+++

### 2.5 Infrastructure and connectivity correlates

Which infrastructure and connectivity indicators move with poverty? From the Atlas, in both periods:

| Variable | Meaning | Reference years |
| --- | --- | --- |
| `urbanization` | Urbanization rate (%) | 2024 only |
| `sdg7_1_cae` | Electricity coverage (% of population) | 2012, 2024 |
| `sdg9_8_tfc` | Fixed or mobile telephone (% of households) | 2012, 2024 |
| `sdg9_8_ci` | Internet access, fixed or mobile (% of households) | 2012, 2024 |
| `sdg9_8_drb` | Mobile base stations (per 1,000 people) | 2012, 2024 |
| `sdg11_2_atc` | Public-transport seats (per 1,000 people) | 2012, 2024 |
| `sdg8_10_dsb` | Financial access points (per 100,000 people) | 2012, 2024 |
| `sdg9_1_vpc` | Trunk roads crossing the municipality (number) | 2012, 2024 |

All are measured in the same year as the poverty index, except urbanization (2024 in both periods) and lights (2012 and 2020). `geo.correlation` uses the units with data for every variable, here the 333 with lights. The heatmap shows Spearman (rank) correlations, which are robust to the skewed indicators.

```{code-cell} ipython3
variables = ["sdg1_2_mpi", "ln_t400NTLpc", "ln_pop"] + infra
spearman12 = geo.correlation(df, variables, year=2012, method="spearman")
spearman12
```

```{code-cell} ipython3
pearson12 = geo.correlation(df, variables, year=2012)
spearman24 = geo.correlation(df, variables, year=2024, method="spearman")
with_mpi = pd.DataFrame({"pearson 2012": pearson12.df["sdg1_2_mpi"],
                         "spearman 2012": spearman12.df["sdg1_2_mpi"],
                         "spearman 2024": spearman24.df["sdg1_2_mpi"]}).drop("sdg1_2_mpi")
with_mpi.insert(0, "label", with_mpi.index.map(labels))
print("Units:", spearman12.n, "| electricity and telephone, 2012:",
      round(spearman12.df.loc["sdg7_1_cae", "sdg9_8_tfc"], 2))
with_mpi.sort_values("spearman 2012").round(2)
```

Every indicator correlates negatively with poverty in 2012: better-connected municipalities are less poor. The ranking:

- **Electricity coverage** (−0.90) and **fixed or mobile telephone** (−0.89), both from the 2012 census, are near mirror images of poverty. Part of this is mechanical, since census-based poverty measures count deprivations in household services. They are also strongly correlated with each other (0.89).
- **Internet access** (−0.71), **night-time lights** (−0.60), **urbanization** (−0.55, measured in 2024), **financial access points** (−0.51) and **public-transport seats** (−0.47) come next. For internet access and transit seats the Pearson correlations are weaker (−0.59 and −0.36): the relations are monotonic but far from linear.
- **Trunk roads** (−0.37), **population** (−0.33) and **mobile base stations** (−0.21) are the weakest.

In 2024 the picture is much the same: electricity coverage (−0.90) is still the closest correlate, while the telephone weakens (−0.69) and mobile base stations change sign (+0.22): by 2024 the poorer municipalities have more base stations per person.

To put these in context, here are the indicators of the whole Atlas most strongly associated with poverty (Spearman). Many of its indicators lack a value in some units, so each correlation uses the units that have both variables; that is plain pandas (`corrwith`), since `geo.correlation` keeps only the units with every variable. The list leaves out the goal indices and the overall index (composites that include poverty), the other poverty measure (unsatisfied basic needs, `sdg1_4_nbi`) and the indicators computed from the MPI itself (its gender, ethnic, migration and age parities and its Gini):

```{code-cell} ipython3
datasets = [d for d in geo.datasets()["dataset"] if d.startswith("sdg")]
atlas = geo.combine(datasets, scale="municipality")
derived = ["sdg1_2_mpi", "sdg1_4_nbi", "sdg5_1_pgm", "sdg10_2_pel", "sdg10_2_mre", "sdg10_2_tpm",
           "sdg10_2_gip", "population", "urbanization", "year"]
candidates = [c for c in atlas.select_dtypes("number").columns
              if c not in derived and "index_" not in c and "rank_" not in c and "mun_id" not in c]

rank = pd.DataFrame({f"spearman {y}": atlas.loc[atlas["year"] == y, candidates].corrwith(
    atlas.loc[atlas["year"] == y, "sdg1_2_mpi"], method="spearman") for y in [2012, 2024]})
rank.insert(0, "label", rank.index.map(geo.labels(atlas)))
print("Indicators compared:", len(rank))
rank.reindex(rank["spearman 2012"].abs().sort_values(ascending=False).index).head(12).round(2)
```

Household energy and services dominate in both periods: electricity coverage, telephones, clean cooking energy, adequate housing, drinking water, internet and access to the three basic services all have Spearman correlations between −0.70 and −0.90 in 2012, and all but the telephone stay close to them in 2024. Energy poverty (+0.70) and climate-change vulnerability (+0.60) rise with poverty, as does the secondary-school dropout rate of girls (+0.59). Residential electricity consumption (−0.69) and employment in tourism-related activities (−0.60) are higher in the less poor municipalities; the link with electricity consumption weakens to −0.44 in 2024.

+++

## 3. Maps

With a list of years, `geo.map` draws both periods in the same classes, so the colours are comparable. Fisher–Jenks natural breaks group similar values; the figure keeps the class limits, which gives the number of units in each class. The box-plot rule (values beyond 1.5 times the interquartile range from the quartiles) flags the outliers.

```{code-cell} ipython3
fig = geo.map(df, "sdg1_2_mpi", year=[2012, 2024], scheme="fisher_jenks")
bins = fig.layout.meta["bins"]
classes = pd.cut(df["sdg1_2_mpi"], bins, include_lowest=True)
print(pd.crosstab(classes, df["year"]))
high12 = df[(df["year"] == 2012) & (df["sdg1_2_mpi"] > bins[3])]
high24 = df[(df["year"] == 2024) & (df["sdg1_2_mpi"] > bins[2])]
print(f"2012, above {bins[3]}:", high12["department"].value_counts().to_dict())
print(f"2024, above {bins[2]}:", high24["department"].value_counts().to_dict())

q = geo.describe(df, "sdg1_2_mpi").set_index("year")
for y in [2012, 2024]:
    low = q.loc[y, "p25"] - 1.5 * (q.loc[y, "p75"] - q.loc[y, "p25"])
    high = q.loc[y, "p75"] + 1.5 * (q.loc[y, "p75"] - q.loc[y, "p25"])
    out = df[(df["year"] == y) & ((df["sdg1_2_mpi"] > high) | (df["sdg1_2_mpi"] < low))]
    print(f"{y}: box-plot fences {low:.3f} and {high:.3f}; outliers:",
          ", ".join(f"{n} ({d})" for n, d in zip(out["name"], out["department"])))
fig
```

```{code-cell} ipython3
geo.map(df, "ln_t400NTLpc", year=2012, scheme="quantiles")
```

The box-plot rule finds no low outliers (the lower fence is below zero) and two high outliers above 0.537 in 2012: TIOC-Raqaypampa (Cochabamba) and Poroma (Chuquisaca). In 2024 it finds twelve, above 0.163, seven of them in Potosí and Chuquisaca.

In the common classes, the two periods hardly overlap. In 2012 only 20 units are in the lowest class (an MPI of up to 0.084) and 113 are in the two highest (above 0.273). In 2024, 261 units are in the lowest class and one is above 0.273.

Poverty is not scattered at random. The 113 units of the two highest classes of 2012 include 21 of Chuquisaca's 29 municipalities, 11 of Pando's 15 and half of Potosí's (21 of 42), with 24 in La Paz, 14 in Cochabamba and 12 in Oruro; Santa Cruz has three and Tarija none. In 2024 only nine units are above 0.172: three in Chuquisaca, two each in Cochabamba and Potosí, and one each in Oruro and Pando. The lights map shows roughly the reverse of the 2012 poverty map (the rank correlation of the two variables is −0.60, section 2.5). The next section measures these patterns formally.

+++

## 4. Spatial dependence

- To what extent is a municipality's poverty similar to that of its neighbours?
- Is there an overall pattern of clustering?
- Where are the statistically significant clusters and spatial outliers?
- Do poor municipalities sit next to dark (or bright) ones?

### 4.1 Spatial weights

The spatial functions build queen contiguity weights by default. This notebook keeps the choice of the original: each municipality's neighbours are its **6 nearest municipalities** (by centroid). *k*-nearest neighbours give every unit the same number of neighbours and no islands; the weights are row-standardized, so the spatial lag is the neighbours' average. `geo.weights` builds them, and they are passed as `w=` to every function below. A second set, `w_lit`, is built the same way on the 333 units with lights.

```{code-cell} ipython3
w = geo.weights(df, method="knn", k=6)
w_lit = geo.weights(lit, method="knn", k=6)
print(w.n, "and", w_lit.n, "units")
print(geo.connectivity(df, w).interpret())
```

### 4.2 Global spatial autocorrelation

```{code-cell} ipython3
moran12 = geo.moran(df, "sdg1_2_mpi", year=2012, w=w)
moran12
```

```{code-cell} ipython3
tests = [("sdg1_2_mpi", 2012, df, w), ("sdg1_2_mpi", 2024, df, w), ("ln_pop", 2012, df, w),
         ("urbanization", 2024, df, w), ("sdg9_8_tfc", 2012, df, w), ("sdg7_1_cae", 2012, df, w),
         ("ln_t400NTLpc", 2012, lit, w_lit)]
rows = []
for variable, year, data, weights in tests:
    m = geo.moran(data, variable, year=year, w=weights)
    rows.append({"variable": labels[variable], "year": year, "units": len(m.df),
                 "Moran's I": m.moran_i, "z": m.z_sim, "pseudo p": m.p_sim})
pd.DataFrame(rows).round(3)
```

Poverty is strongly and significantly clustered: in 2012 Moran's I is 0.45, far above its expected value under spatial randomness (−0.003), with a pseudo p-value of 0.001 (the smallest possible with 999 permutations). It is the most clustered of the variables. In 2024 the clustering is a little weaker (0.39) but still strong. Electricity coverage (0.41), telephones (0.41), log population (0.35), night-time lights (0.32, on the 333 units) and urbanization (0.29) are also significantly clustered. In the scatterplot most municipalities fall in the High-High and Low-Low quadrants: poor municipalities have poor neighbours, and less poor ones less poor neighbours.

+++

### 4.3 Local spatial autocorrelation (LISA)

The local Moran's I splits the global statistic into one value per municipality. With 999 permutations and a 10% significance level (as in the original; the default of `geo.lisa` is 5%):

- **High-High**: poor municipalities surrounded by poor neighbours (poverty hot spots)
- **Low-Low**: less poor municipalities surrounded by less poor neighbours (cold spots)
- **High-Low** / **Low-High**: spatial outliers

```{code-cell} ipython3
lisa12 = geo.lisa(df, "sdg1_2_mpi", year=2012, w=w, alpha=0.10)
lisa12
```

```{code-cell} ipython3
local12 = geo.add_names(lisa12.df, groups=["department"]).merge(
    df.loc[df["year"] == 2012, ["geo_id", "sdg1_2_mpi"]], on="geo_id")
for c in ["High-High", "Low-Low", "High-Low", "Low-High"]:
    sel = local12[local12["cluster"] == c].sort_values(
        "sdg1_2_mpi", ascending=c in ["Low-Low", "Low-High"]).head(8)
    print(f"{c}:", ", ".join(f"{n} ({d})" for n, d in zip(sel["name"], sel["department"])))
pd.crosstab(local12["department"], local12["cluster"], margins=True)
```

How persistent are the clusters? `geo.lisa_transitions` runs the same analysis in both periods and counts the moves between types. Its map shows the types of 2024, with the units that changed type outlined.

```{code-cell} ipython3
trans = geo.lisa_transitions(df, "sdg1_2_mpi", w=w, alpha=0.10)
trans
```

```{code-cell} ipython3
trans.fig_map.show()
types = geo.add_names(trans.df, groups=["department"])
pd.crosstab(types["department"], types["cluster_2024"], margins=True)
```

Of the 343 municipalities, 157 are significant at 10% in 2012: 52 High-High, 83 Low-Low, 10 High-Low and 12 Low-High.

- **Hot spots (High-High)** form two blocks. In the south, the hot spots are rural municipalities of Chuquisaca (15), Potosí (12) and Cochabamba (8), with the poorest municipalities of the country: Raqaypampa, Poroma, Azurduy, San Pedro, Ckochas, Tinguipaya. In the north, 8 of Pando's 15 municipalities are hot spots, including Sena and San Pedro.
- **Cold spots (Low-Low)** are the lowlands of Santa Cruz (31), the Cochabamba valley (21), the La Paz–El Alto area (19) and Tarija (8).
- **Low-High outliers** are less poor towns in poor surroundings, mostly urban centres: Sucre, Guayaramerín, Porvenir, Camargo and Monteagudo.
- **High-Low outliers** are poor municipalities in less poor surroundings, for instance El Choro (Oruro), Morochata (Cochabamba), La Asunta (La Paz), Mojinete (Potosí) and San Miguel de Velasco and San Rafael (Santa Cruz).

The clusters are persistent: 259 of the 343 units (76%) are of the same type in both periods. In 2024, 143 municipalities are significant (36 High-High, 85 Low-Low, 9 High-Low, 13 Low-High); 32 of the 52 hot spots of 2012 are still hot spots and 63 of the 83 cold spots still cold spots. The hot spots retreat to the Andean core (Potosí 12, Chuquisaca 9, Cochabamba 5, Oruro 4) and Pando keeps only two, while the Santa Cruz cold spot grows from 31 to 41 municipalities. Most of the other changes are to or from "Not significant", a category that depends on a p-value threshold.

+++

### 4.4 Bivariate spatial association: poverty and neighbours' lights

The bivariate Moran's I relates a municipality's poverty to the **average night-time lights of its neighbours**. Its local version classifies each municipality by its own poverty (first word) and its neighbours' lights (second word): *High-Low* means a poor municipality in a dark neighbourhood, *Low-High* a less poor one in a bright neighbourhood.

The package has no bivariate Moran functions, so this section calls the esda library directly, on the 333 units with lights. The weights are `w_lit` from `geo.weights`; the values must be in the order of the weights (`w_lit.id_order`).

```{code-cell} ipython3
quadrant = {1: "High-High", 2: "Low-High", 3: "Low-Low", 4: "High-Low"}

def bivariate(year):
    """Bivariate Moran's I and local types of poverty against the neighbours' lights."""
    d = lit[lit["year"] == year].set_index("geo_id").loc[w_lit.id_order].reset_index()
    x, y = d["sdg1_2_mpi"].to_numpy(), d["ln_t400NTLpc"].to_numpy()
    np.random.seed(12345)
    bv = Moran_BV(x, y, w_lit, permutations=999)
    local = Moran_Local_BV(x, y, w_lit, permutations=999, seed=12345)
    d["poverty (standardized)"] = (x - x.mean()) / x.std()
    d["neighbours' lights (standardized)"] = lag_spatial(w_lit, (y - y.mean()) / y.std())
    d["cluster"] = pd.Series(local.q).map(quadrant).where(local.p_sim < 0.10, "Not significant")
    return bv, d

bv12, d12 = bivariate(2012)
bv24, d24 = bivariate(2024)
print(f"Bivariate Moran's I, poverty 2012 and neighbours' lights 2012: {bv12.I:.3f} "
      f"(pseudo p = {bv12.p_sim:.3f}); correlation with own lights: "
      f"{d12['sdg1_2_mpi'].corr(d12['ln_t400NTLpc']):.3f}")
print(f"Bivariate Moran's I, poverty 2024 and neighbours' lights 2020: {bv24.I:.3f} "
      f"(pseudo p = {bv24.p_sim:.3f})")

colors = {"High-High": "#d7191c", "Low-Low": "#2c7bb6", "Low-High": "#abd9e9",
          "High-Low": "#fdae61", "Not significant": "#d3d3d3"}       # as in the package's LISA maps
px.scatter(d12, x="poverty (standardized)", y="neighbours' lights (standardized)", color="cluster",
           color_discrete_map=colors, hover_name="name", trendline="ols", trendline_scope="overall",
           title="Bivariate Moran scatterplot: poverty and neighbours' lights, 2012")
```

```{code-cell} ipython3
gdf = geo.boundaries("municipality").merge(d12[["geo_id", "department", "cluster"]], on="geo_id")
gdf["geometry"] = gdf.simplify(0.02)                 # lighter boundaries keep the figure small

px.choropleth_map(gdf, geojson=gdf.geometry, locations=gdf.index, color="cluster",
                  color_discrete_map=colors, hover_name="name",
                  center={"lat": -16.3, "lon": -64}, zoom=4, height=600,
                  title="Bivariate LISA: own poverty and neighbours' lights, 2012").show()
pd.crosstab(d12["department"], d12["cluster"], margins=True)
```

```{code-cell} ipython3
for c in ["Low-High", "High-Low", "Low-Low", "High-High"]:
    sel = d12[d12["cluster"] == c]
    units = zip(sel["name"], sel["department"])
    print(f"{c} ({len(sel)}):", ", ".join(f"{n} ({d})" for n, d in units))

# The poverty clusters of section 4.3 (rows) against the bivariate types (columns), 333 units
both = d12[["geo_id", "cluster"]].merge(lisa12.df[["geo_id", "cluster"]], on="geo_id",
                                        suffixes=("_bivariate", "_poverty"))
pd.crosstab(both["cluster_poverty"], both["cluster_bivariate"], margins=True)
```

The bivariate Moran's I is −0.26 (pseudo p = 0.001): poor municipalities tend to have dark neighbours. The association is weaker than with a municipality's own lights (correlation −0.54), as expected, but clearly significant. It is slightly stronger between poverty in 2024 and lights in 2020 (−0.285, pseudo p = 0.001).

The bivariate LISA flags 150 of the 333 municipalities at 10%, dominated by the two "expected" combinations:

- **Low-High** (68): less poor municipalities in bright neighbourhoods, in Santa Cruz (31), the Cochabamba valley (20), Tarija (8) and around El Alto (La Paz, 5).
- **High-Low** (44): poor municipalities in dark neighbourhoods, mostly in La Paz (19, from Ixiamas and Apolo in the north to Charazani and Pelechuco), Potosí (9), Pando (5), Beni (4) and Chuquisaca (4).
- **Low-Low** (28): less poor municipalities with dark neighbours, mainly in La Paz (15; the Yungas towns of Caranavi, Chulumani and Irupana), Beni (6; Trinidad, Rurrenabaque) and Potosí (4; Tupiza, Villazón).
- **High-High** (10): poor municipalities with bright neighbours, for example Villa Tunari in the Chapare (Cochabamba), and Charagua, Cuevo and San Matías (Santa Cruz).

The cross-tabulation links the two analyses. Of the 47 poverty hot spots that have lights, 22 are poor municipalities in dark neighbourhoods; of the 83 cold spots, 56 sit in bright neighbourhoods. Most of the other hot and cold spots (25 and 23) are not significant in the bivariate map.

+++

## 5. Spatial inequality

How unequal is poverty across municipalities, and how much of it lies between departments?

`geo.inequality` gives the Gini and Theil indices in each period. With weights, it adds the spatial Gini (Rey and Smith, 2013), which splits the Gini's sum of absolute differences into neighbour pairs and all other pairs: if neighbours are more alike than random pairs, the neighbour pairs contribute less than their share of all pairs. The p-value comes from 999 random permutations of the values over the map. `geo.theil_decomposition` splits the Theil index exactly into inequality *between* department means and *within* departments.

```{code-cell} ipython3
ineq = geo.inequality(df, "sdg1_2_mpi", w=w, permutations=999)
ineq
```

```{code-cell} ipython3
def neighbour_share(result, w):
    """The Gini owed to neighbour pairs, in % of the Gini, against their share of all pairs."""
    table = result.df[["year", "gini", "theil", "gini_spatial", "gini_spatial_p"]].copy()
    table["Gini from neighbour pairs (%)"] = 100 * table["gini_spatial"] / table["gini"]
    table["neighbour pairs (% of all pairs)"] = 100 * w.mean_neighbors / (w.n - 1)
    return table.round(3)

neighbour_share(ineq, w)
```

```{code-cell} ipython3
geo.theil_decomposition(df, "sdg1_2_mpi", by="department", permutations=999)
```

The Gini and Theil indices need non-negative levels, so night-time lights enter here as **lights per capita in levels**, exp(`ln_t400NTLpc`), not in logs. The lights have a value in every year from 2012 to 2020, so here the measures have a trend, which `geo.inequality` tests.

```{code-cell} ipython3
lights = geo.load("ntl", variables="ln_t400NTLpc")
lights["ntl_pc"] = np.exp(lights["ln_t400NTLpc"])

ineq_lights = geo.inequality(lights, "ntl_pc", w=w_lit, permutations=999)
print(ineq_lights.interpret())
neighbour_share(ineq_lights, w_lit).iloc[[0, -1]]
```

```{code-cell} ipython3
geo.theil_decomposition(lights, "ntl_pc", by="department").df.iloc[[0, -1]].round(3)
```

Municipal poverty in 2012 has a Gini of 0.25 and a Theil of 0.10. Only 21% of the Theil index is inequality *between* departments; 79% is *within* them. This matches the overlapping boxes of section 2.2: departments differ, but most of the inequality lies between municipalities of the same department. The between part is still larger than random groupings of municipalities would give (pseudo p = 0.001).

As poverty fell, its *relative* inequality rose: in 2024 the Gini is 0.37 and the Theil 0.22, with the same 21/79 split. Absolute gaps narrowed (the standard deviation fell from 0.106 to 0.044), but the least poor municipalities cut poverty proportionally more than the poorest (section 2.1). On the Lorenz curve, the tenth of the units with the highest values holds 25% of the total in 2024, against 19% in 2012.

Night-time lights per capita are far more unequal (Gini 0.64 and Theil 0.77 in 2012), with a similar split in 2012 (22% between departments). Their Gini fell to 0.57 by 2020, a significant downward trend (that of the Theil index is not significant), and the part between departments fell to 11%.

The spatial Gini shows the clustering from another angle. Neighbour pairs are 1.75% of all pairs (1.81% among the 333 units with lights) but contribute only 1.22% of the Gini of poverty in 2012, 1.28% in 2024 and 1.35% of that of lights in 2012. In all three cases the permutation p-value is 0.001: neighbouring municipalities are much more alike than random pairs.

+++

## 6. Spatial heterogeneity: multiscale geographically weighted regression

The regression of section 2.4 imposes one slope on all municipalities, and section 2.4 also showed that the slope differs between departments. A geographically weighted regression fits a regression around every municipality, weighting the others by distance, so the slope becomes a surface that can be mapped. `geo.mgwr` fits the multiscale version (MGWR), which finds one **bandwidth** per term: the number of nearest municipalities that enter each local regression. A bandwidth close to the number of units means a relationship that is about the same everywhere; a small one, a relationship that changes over short distances.

The function follows the mgwr library: the variables are z-standardized, so the coefficients are in standard deviations, and the local t-tests are corrected for multiple testing. The sample is the 333 units with lights, and one fit takes about half a minute.

```{code-cell} ipython3
mg = geo.mgwr(df, "sdg1_2_mpi", "ln_t400NTLpc", year=2012)
print(mg.notes[0])
mg.gt_bw
```

```{code-cell} ipython3
mg.figs["ln_t400NTLpc"]
```

```{code-cell} ipython3
slope = "ln_t400NTLpc_coef"
local = geo.add_names(mg.df, groups=["department"])
print(f"R²: global {ols.summary.loc[0, 'r2']:.3f}, MGWR {mg.r2:.3f}")
print(f"Local slopes: {local[slope].min():.2f} to {local[slope].max():.2f}; negative: "
      f"{(local[slope] < 0).sum()} of {len(local)}; significant after correction: "
      f"{local['ln_t400NTLpc_significant'].sum()}")
print("Largest local condition number:", round(local["local_cn"].max(), 1))
local.groupby("department", as_index=False).agg(
    units=("geo_id", "size"), mean_slope=(slope, "mean"),
    significant=("ln_t400NTLpc_significant", "sum")).sort_values("mean_slope").round(2)
```

The same model for the latest period, poverty in 2024 on lights in 2020:

```{code-cell} ipython3
mg24 = geo.mgwr(df, "sdg1_2_mpi", "ln_t400NTLpc", year=2024)
print("Bandwidths:", mg24.bw, "| 95% intervals:", mg24.bw_interval)
print(f"R²: global {ols24.summary.loc[0, 'r2']:.3f}, MGWR {mg24.r2:.3f}; negative slopes: "
      f"{(mg24.df[slope] < 0).sum()} of {len(mg24.df)}; significant: "
      f"{mg24.df['ln_t400NTLpc_significant'].sum()}")
```

Letting the relationship vary over space improves the fit considerably: R² rises from 0.29 to 0.65.

- **Both terms are local.** The bandwidth of the intercept is 44 nearest municipalities (95% interval 44 to 48), the smallest the search considers, and that of the slope on lights is 64 (64 to 84), against 333 units. The level of poverty at given lights and its link with lights both change across the country.
- **One sign, many strengths.** All 333 local slopes are negative, from −1.36 to −0.17 standard deviations of poverty per standard deviation of lights (the global slope on that scale is the correlation, −0.54). After the correction for multiple testing, 250 are significant.
- The relationship is **steepest** in the central-southern Andean valleys, with department means of −1.24 in Cochabamba, −1.02 in Chuquisaca and −0.91 in Potosí, and every slope of Cochabamba and Chuquisaca significant.
- It is **flattest** in Beni (−0.26), Pando (−0.27) and La Paz (−0.41). Fewer than half of the slopes are significant in Beni (5 of 17) and Santa Cruz (21 of 56).
- The local condition numbers are small (at most 4.9, against a threshold of about 30), so the local coefficients are well identified.

The same model for 2024 keeps the intercept local (44) and finds a wider bandwidth for the slope (100, interval 100 to 111); it raises R² from 0.25 to 0.54, and again every local slope is negative (242 of them significant). A single global slope therefore understates the link in the valleys and overstates it in the Amazon and on the Altiplano. These are associations: a local slope can also reflect factors that vary over space and are not in the model. The `esda_heterogeneity` notebook reads this model in full, with the intercept, the fit against global models and the residuals.

+++

## 7. Summary

- **Level, spread and change.** In 2012 the municipal MPI averages 0.23 and ranges from 0.018 to 0.56; by 2024 it has fallen in every unit, to an average of 0.06. Chuquisaca, Pando and Potosí are the poorest departments in 2012, Tarija and Santa Cruz the least poor, and the big cities the least poor municipalities. The ranking of municipalities hardly changes (rank correlation 0.86).
- **Correlates.** Poverty falls with electricity coverage and telephones (Spearman about −0.9), internet, night-time lights (−0.60), urbanization, financial access points and transit, and only weakly with population (−0.33). Lights alone account for 29% of its variation in 2012 and 25% in 2024.
- **Clustering.** Poverty is strongly clustered (Moran's I = 0.45 in 2012, 0.39 in 2024). Hot spots lie in the Chuquisaca–Potosí–Cochabamba valleys and, in 2012, in Pando; cold spots in Santa Cruz, the Cochabamba valley, the La Paz–El Alto area and Tarija. By 2024 the hot spots have retreated to the Andean core.
- **Neighbours' lights.** Poor municipalities tend to have dark neighbours (bivariate Moran's I = −0.26). Most hot spots with a significant bivariate pattern are poor places in dark neighbourhoods, and most cold spots less poor places in bright ones.
- **Inequality.** About four fifths of the inequality in poverty lies within departments, not between them, and relative inequality rose as poverty fell (Gini 0.25 in 2012, 0.37 in 2024).
- **Heterogeneity.** The lights–poverty slope is negative everywhere but its size varies about eightfold. It is steepest in the central-southern valleys and weakest in the Amazon, and it varies over short distances (a bandwidth of 64 of 333 municipalities in 2012).

All of these are associations between measured quantities, not causal effects. The methods are explained, with examples, in the package's [articles](https://quarcs-lab.github.io/geo4bolivia/articles/) and [function reference](https://quarcs-lab.github.io/geo4bolivia/reference/).
