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

<a href="https://colab.research.google.com/github/quarcs-lab/geo4bolivia/blob/main/notebooks/three_packages.ipynb" target="_parent"><img src="https://colab.research.google.com/assets/colab-badge.svg" alt="Open In Colab"/></a>

# One question, three packages: did Bolivia's municipalities converge?

Part of the [GeoDevelopment Observatory of Bolivia](https://quarcs-lab.github.io/geo4bolivia/).

The observatory has three Python packages that work as one workflow:

| Step | Package | Role |
| --- | --- | --- |
| 1 | [**geo4bolivia**](https://quarcs-lab.github.io/geo4bolivia/tools/geo4bolivia-package/) | Find, load, understand and prepare the data |
| 2 | [**expdpy**](https://quarcs-lab.github.io/geo4bolivia/tools/expdpy-package/) | Explore and model it as a panel |
| 3 | [**geometrics**](https://quarcs-lab.github.io/geo4bolivia/tools/geometrics-package/) | Analyse its geography: clusters, convergence, inequality |

This notebook takes one question through all three: **did the Sustainable Development Index (IDS) of Bolivia's 343 municipalities and indigenous autonomies converge between ~2012 and ~2024?** The data are the [Atlas de los ODS en Bolivia 2026](https://atlasods.sdsnbolivia.org/) (Andersen & Argandoña, SDSN Bolivia).

+++

## 0. Setup

In Google Colab the next cell installs what Colab lacks (a few seconds). Locally, `uv sync` has installed everything already.

```{code-cell} ipython3
import importlib.util

missing = [p for p in ["geo4bolivia", "expdpy", "geometrics"] if importlib.util.find_spec(p) is None]
if missing:
    !pip install -q {" ".join(missing)}
```

```{code-cell} ipython3
import warnings

import numpy as np
import plotly.express as px

import geo4bolivia as geo
import expdpy as ex
import geometrics as gm

warnings.filterwarnings("ignore", category=UserWarning)   # keep the notebook readable
print("geo4bolivia", geo.__version__, "| expdpy", ex.__version__, "| geometrics", gm.__version__)
```

## 1. geo4bolivia: find, load and understand the data

### Find the variable

We do not need to know the dataset in advance: `geo.search()` looks through every variable of every dataset.

```{code-cell} ipython3
geo.search("sustainable development index")[["dataset", "variable", "label", "years", "units"]]
```

`geo.info()` tells what the `sdg` dataset is, where it comes from, its license and how to cite it:

```{code-cell} ipython3
geo.info("sdg")
```

### Load and describe it

`geo.load()` returns one row per municipality and period, here with the municipality's name and its department. We also load the census population, used later as a weight and a regressor.

```{code-cell} ipython3
ids = geo.load("sdg", variables=["index_sdg", "population"], groups=["department"])
ids.head()
```

```{code-cell} ipython3
geo.describe(ids)
```

The mean rose and the spread fell: a first hint of convergence.

### Change per municipality

`geo.change()` gives each unit's initial and final value, its change and its rank in each period:

```{code-cell} ipython3
chg = geo.change(ids, "index_sdg")
print(f"The IDS rose in {(chg['index_sdg_change'] > 0).sum()} of {len(chg)} units; "
      f"correlation of the change with the initial level: "
      f"{np.corrcoef(chg['index_sdg_2012'], chg['index_sdg_change'])[0, 1]:.2f}")
px.scatter(chg, x="index_sdg_2012", y="index_sdg_change", color="department", hover_name="name",
           labels=geo.labels(chg), title="Did the municipalities that started lower gain more?")
```

### Departments

The SDG indicators aggregate as census-population-weighted means; the package fetches the population itself. These are approximations, not the Atlas's own department figures.

```{code-cell} ipython3
dep = geo.add_names(geo.aggregate(ids[["geo_id", "year", "index_sdg"]], to="department", dataset="sdg"))
px.bar(dep, x="name", y="index_sdg", color=dep["year"].astype(str), barmode="group",
       labels={**geo.labels(dep), "color": "Period"},
       title="Sustainable Development Index by department (census-population weighted)")
```

## 2. expdpy: explore and model the panel

`geo.for_expdpy()` hands the panel over in expdpy's format, with a data dictionary built from the metadata; `ex.set_labels()` declares the unit (`geo_id`) and time (`year`) dimensions. We add the log of the census population.

```{code-cell} ipython3
ids["ln_pop"] = np.log(ids["population"])
df, df_def = geo.for_expdpy(ids, labels={"ln_pop": "Log of census population"})
df = ex.set_labels(df, df_def, set_panel=True)
df_def
```

### Between and within variation

How much of the IDS's variation is differences between municipalities, and how much is change within them over time?

```{code-cell} ipython3
xt = ex.explore_xtsum_table(df, var=["index_sdg"])
print(xt.interpret())
xt.gt
```

```{code-cell} ipython3
ex.explore_trend_plot_by_group(df, group_var="department", var="index_sdg").fig
```

### Panel models

Is the IDS associated with population size? Pooled OLS and the between estimator compare municipalities with each other; fixed effects compare each municipality with itself over time (with two periods, its change against its population growth); random effects mix both. The Hausman test asks whether random effects are consistent.

```{code-cell} ipython3
ex.analyze_panel_table(df, "index_sdg", ["ln_pop"]).etable
```

```{code-cell} ipython3
print(ex.analyze_hausman_test(df, "index_sdg", ["ln_pop"]).interpret())
```

Across municipalities, larger ones score higher: about 2.4 IDS points for each log point of population (pooled and between). The fixed-effects slope is far larger, but read it with care: with two periods and no year effects, it also absorbs the rise common to all municipalities, since both the IDS and population grew almost everywhere. The Hausman test rejects random effects. These are associations, not causal effects.

## 3. geometrics: clusters, convergence and inequality

`geo.for_geometrics()` returns the boundaries, the panel and its dictionary. Queen weights link municipalities that share a border; the one without neighbours is attached to its nearest.

```{code-cell} ipython3
gdf, sp, sp_dict = geo.for_geometrics("sdg", variables="index_sdg", groups=["department"])
sp = gm.set_labels(sp, sp_dict, set_panel=True)
w = gm.make_weights(gdf, method="queen")
```

### Spatial clustering in each period

```{code-cell} ipython3
for year in (2012, 2024):
    res = gm.explore_moran_plot(sp, "index_sdg", gdf=gdf, w=w, period=year)
    print(year, res.interpret().split("\n")[0], "\n")
```

```{code-cell} ipython3
gm.explore_lisa_cluster_map(sp, "index_sdg", gdf=gdf, w=w, period=2024).fig
```

High values cluster with high values (around La Paz, in the Cochabamba and Chuquisaca valleys and in the south, around Tarija and the Chaco), and low with low, in both periods; the clustering grew slightly stronger.

### β-convergence, with and without space

Growth between the periods regressed on the initial level: a negative slope means that the units that started lower grew faster. The spatial lag model separates a municipality's own catch-up from its neighbours'.

```{code-cell} ipython3
ols = gm.analyze_beta_convergence(sp, "index_sdg")
print(ols.interpret())
```

```{code-cell} ipython3
sar = gm.analyze_beta_convergence(sp, "index_sdg", model="sar", gdf=gdf, w=w)
print(sar.interpret())
```

### Inequality between and within departments

With two periods, σ-convergence (a trend in dispersion) cannot be estimated, but the Gini and Theil indices of each period can be compared, and the Theil index splits into a part between departments and a part within them.

```{code-cell} ipython3
print(gm.analyze_inequality_over_time(sp, "index_sdg").interpret())
```

```{code-cell} ipython3
theil = gm.analyze_theil_decomposition(sp, "index_sdg", "department")
print(theil.interpret())
theil.fig
```

## What we learned

- **geo4bolivia** found the variable, documented it, and prepared the panel, its change, its department aggregates and its boundaries in a few lines.
- **expdpy** split the IDS's variation almost evenly between differences across municipalities and change within them, and showed that cross-sectional and within-unit estimates of its association with population differ.
- **geometrics** showed that development clusters in space, that the municipalities that started lower gained more (β-convergence, half-life of about 20 years, with spillovers through neighbours in the spatial model), and that inequality fell; most of what remains lies within departments rather than between them.

Next: the [dynamics of the 15 goals](https://colab.research.google.com/github/quarcs-lab/geo4bolivia/blob/main/notebooks/sdg_dynamics.ipynb), the [geo4bolivia tutorial](https://quarcs-lab.github.io/geo4bolivia/tools/geo4bolivia-package/) and its [function reference](https://quarcs-lab.github.io/geo4bolivia/tools/geo4bolivia-reference/).
