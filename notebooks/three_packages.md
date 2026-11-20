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

<a href="https://colab.research.google.com/github/quarcs-lab/gdo4bolivia/blob/main/notebooks/three_packages.ipynb" target="_parent"><img src="https://colab.research.google.com/assets/colab-badge.svg" alt="Open In Colab"/></a>

# One question, three packages: did Bolivia's municipalities converge?

Part of the [GeoDevelopment Observatory of Bolivia](https://quarcs-lab.github.io/gdo4bolivia/).

This notebook takes one question through the observatory's three Python packages: **did the Sustainable Development Index (IDS) of Bolivia's 343 municipalities and indigenous autonomies converge between ~2012 and ~2024?** The data are the [Atlas de los ODS en Bolivia 2026](https://atlasods.sdsnbolivia.org/) (Andersen & Argandoña, SDSN Bolivia).

**geo4bolivia answers the question by itself**: it loads the data and runs the standard analyses of spatial data science on them. The other two packages are companions for specialised methods, and geo4bolivia hands its panel to each of them in one line.

| Part | Package | What it does here |
| --- | --- | --- |
| 1 | [**geo4bolivia**](https://quarcs-lab.github.io/geo4bolivia/) | Answers the question: description, change, maps, spatial dependence, β-convergence, inequality and rank mobility |
| 2 | [**expdpy**](https://cmg777.github.io/expdpy/) | Panel methods geo4bolivia does not have: the between/within split of the variation, and a correlated random effects model |
| 3 | [**geometrics**](https://quarcs-lab.github.io/geometrics/) | Spatial methods geo4bolivia does not have: the robustness of a spatial model across weights matrices, and simulation sandboxes that show what an estimator recovers |

+++

## 0. Setup

In Google Colab the next cell installs what Colab lacks (a few seconds). Locally, `uv sync` has installed everything already.

```{code-cell} ipython3
import importlib.util

packages = ["geo4bolivia", "expdpy", "geometrics"]
missing = [p for p in packages if importlib.util.find_spec(p) is None]
if missing:
    !pip install -q {" ".join(missing)}
```

```{code-cell} ipython3
import sys
import warnings

import numpy as np
import plotly.io as pio
from IPython.display import Markdown, display

import geo4bolivia as geo
import expdpy as ex
import geometrics as gm

if "google.colab" not in sys.modules:
    pio.renderers.default = "notebook_connected"   # keeps the saved notebook small
warnings.filterwarnings("ignore", category=UserWarning)   # keeps the notebook readable
print("geo4bolivia", geo.__version__, "| expdpy", ex.__version__,
      "| geometrics", gm.__version__)
```

## 1. geo4bolivia: the answer

Every analysis below is one call that returns a **result object**. Displayed, it shows its figure and a reading of the numbers; `.fig`, `.df`, `.gt` and the named numbers give the parts one by one. The [package documentation](https://quarcs-lab.github.io/geo4bolivia/) has a page per function.

### The data

We do not need to know the dataset in advance: `geo.search()` looks through every variable of every dataset.

```{code-cell} ipython3
cols = ["dataset", "variable", "label", "years", "units"]
geo.search("sustainable development index")[cols]
```

`geo.load()` returns one row per municipality and period, here with the municipality's name and its department. We also load the census population, used in part 2.

```{code-cell} ipython3
ids = geo.load("sdg", variables=["index_sdg", "population"], groups=["department"])
geo.describe(ids)
```

The mean of the index rose by ten points (from 50.1 to 60.1) and its standard deviation fell (from 5.8 to 5.3): a first hint of convergence.

### Change per municipality

`geo.change()` gives each unit's initial and final value and its change. Did the municipalities that started lower gain more?

```{code-cell} ipython3
chg = geo.change(ids, "index_sdg")
print(f"The IDS rose in {(chg['index_sdg_change'] > 0).sum()} of {len(chg)} units.")
geo.scatter(chg, "index_sdg_2012", "index_sdg_change", color="department")
```

The correlation between the 2012 level and the change is -0.43: on average, a municipality that started one point lower gained 0.22 points more.

### Two maps in the same classes

With a list of years and a classification scheme, `geo.map()` draws both periods in the same classes (natural breaks computed over both), so a colour means the same on both maps.

```{code-cell} ipython3
geo.map(ids, "index_sdg", year=[2012, 2024], scheme="fisher_jenks")
```

### Spatial clustering

The maps suggest that high and low values are not scattered at random. Global Moran's I measures that clustering in each period, with queen contiguity weights (municipalities that touch each other) that the function builds itself.

```{code-cell} ipython3
moran = geo.moran(ids, "index_sdg", year="all")
moran.df
```

Local Moran statistics (LISA) show where the clusters are:

```{code-cell} ipython3
lisa = geo.lisa(ids, "index_sdg", year=2024)
lisa
```

```{code-cell} ipython3
clusters = lisa.df.merge(chg[["geo_id", "department"]], on="geo_id")
clusters = clusters[clusters["cluster"].isin(["High-High", "Low-Low"])]
clusters.groupby(["cluster", "department"]).size().unstack(fill_value=0)
```

### β-convergence, with and without space

Growth between the two periods is regressed on the logarithm of the initial level: a negative slope means that the units that started lower grew faster.

```{code-cell} ipython3
ols = geo.beta_convergence(ids, "index_sdg")
ols
```

Neighbouring municipalities grow together, which ordinary least squares ignores. The spatial lag model (`model="sar"`) adds the neighbours' growth and separates a municipality's own catch-up (direct) from the part that runs through its neighbours (indirect). Its table sets the two estimates side by side.

```{code-cell} ipython3
sar = geo.beta_convergence(ids, "index_sdg", model="sar")
sar.gt
```

### Inequality, between and within departments

With two periods, σ-convergence (a trend in dispersion) cannot be estimated, but the Gini and Theil indices of each period can be compared.

```{code-cell} ipython3
geo.inequality(ids, "index_sdg")
```

The Theil index splits exactly into a part between departments and a part within them:

```{code-cell} ipython3
geo.theil_decomposition(ids, "index_sdg", by="department")
```

### Rank mobility

Convergence in levels says nothing about who is ahead. `geo.rank_mobility()` compares the two rankings.

```{code-cell} ipython3
mobility = geo.rank_mobility(ids, "index_sdg")
mobility
```

### The answer so far

Yes, on every measure used here. The index rose in 342 of the 343 units, and the municipalities that started lower gained more: the β-convergence slope is -0.029 (half of a gap closes in about 20 years), and -0.034 once the neighbours' growth is taken into account (about 16 years). The Gini index fell from 0.065 to 0.049 and the Theil index from 0.0066 to 0.0038. Most of the inequality lies within departments (85% of the Theil index in 2024), and the part between departments fell from 20% to 15%.

Two things did not change. The index stayed clustered in space (Moran's I of 0.43 in 2012 and 0.47 in 2024): the high-value clusters of 2024 are mostly in Santa Cruz, Cochabamba, La Paz and Tarija, and the low-value clusters in La Paz, Potosí and Oruro. And the ranking was broadly kept (rank correlation 0.84): gaps narrowed more than positions changed.

+++

## 2. expdpy: panel methods

[expdpy](https://cmg777.github.io/expdpy/) explores and models panels. `geo.for_expdpy()` hands the panel over in expdpy's format, with a data dictionary built from the metadata, and `ex.set_labels()` declares the unit (`geo_id`) and time (`year`) dimensions.

Convergence is about relative positions, so next to each variable we add its deviation from the national mean of the period, which removes the rise common to all municipalities.

```{code-cell} ipython3
ids["ln_pop"] = np.log(ids["population"])
for v in ["index_sdg", "ln_pop"]:
    ids[v + "_rel"] = ids[v] - ids.groupby("year")[v].transform("mean")

df, df_def = geo.for_expdpy(ids, labels={
    "ln_pop": "Log of census population",
    "index_sdg_rel": "IDS, relative to the mean of the period",
    "ln_pop_rel": "Log population, relative to the mean of the period"})
df = ex.set_labels(df, df_def, set_panel=True)
df_def[["var_name", "label", "type"]]
```

### Between and within variation

How much of the variation of the index is differences between municipalities, and how much is change within them over time?

```{code-cell} ipython3
xt = ex.explore_xtsum_table(df, var=["index_sdg", "index_sdg_rel"])
display(Markdown(xt.interpret()))
xt.gt
```

The index itself varies about as much within municipalities over time (standard deviation 5.19) as between them (5.35), because almost all of them rose, by ten points on average. Once that common rise is removed, the within variation is small (1.46 against 5.35): a municipality's position relative to the others is mostly a lasting difference, and convergence moved it only a little. This agrees with the rank mobility of part 1.

### Correlated random effects

Is a municipality's relative position associated with its population? Larger municipalities score higher, but that compares different places. The correlated random effects (Mundlak) model separates the two comparisons in one regression: the coefficient of the regressor is the *within* estimate (a municipality compared with itself over time), and the coefficient of its unit mean is the gap between the *between* and the within estimates. geo4bolivia has the standard panel estimators (`geo.panel_model()`); this form is expdpy's.

```{code-cell} ipython3
cre = ex.analyze_cre_table(df, "index_sdg_rel", ["ln_pop_rel"])
display(Markdown(cre.interpret()))
cre.df.round(3)
```

Within a municipality, growing faster in population than the rest of the country is not associated with gaining positions in the index: the within coefficient is -0.42 and is not statistically different from zero. The coefficient of the mean, 2.55, is the gap between the two comparisons, so between municipalities one more log point of population goes with an index about 2.1 points higher (-0.42 + 2.55). The test rejects that the two are equal (p = 0.0003): the lasting differences between municipalities are related to their size, so the cross-section says little about what happens when a municipality grows. These are associations, not causal effects.

+++

## 3. geometrics: spatial methods

[geometrics](https://quarcs-lab.github.io/geometrics/) has spatial models and teaching tools. `geo.for_geometrics()` returns the boundaries, the table and its dictionary. Here we hand over the growth cross-section behind the β-convergence regression of part 1 (`ols.df`).

```{code-cell} ipython3
growth = ols.df.assign(ln_initial=np.log(ols.df["initial"]), year=2024)
gdf, cs, cs_dict = geo.for_geometrics(
    growth[["geo_id", "year", "growth", "ln_initial"]],
    labels={"growth": "Yearly log growth of the IDS, 2012 to 2024",
            "ln_initial": "Log of the IDS in 2012"})
cs = gm.set_labels(cs, cs_dict, set_panel=True)
cs.head(3)
```

### Does the result depend on who counts as a neighbour?

The spatial model of part 1 used queen contiguity. `gm.analyze_spatial_model_by_weights()` re-estimates the same spatial lag model under seven weights matrices (the 4, 6 and 8 nearest neighbours, queen and rook contiguity, and inverse distance with powers 1 and 2) and compares the direct, indirect and total impacts of the initial level. Its table is `.gt`; `.fig` draws the same estimates with their confidence intervals.

```{code-cell} ipython3
rob = gm.analyze_spatial_model_by_weights(cs, "growth", ["ln_initial"], gdf=gdf,
                                          model="lag", baseline="queen")
display(Markdown(rob.interpret()))
rob.gt
```

The answer does not depend on the weights. The queen row has the total impact of part 1 (-0.0345). The direct impact is almost the same in the seven specifications (-0.026 to -0.027), and the total impact is negative in all of them, from -0.034 to -0.044. What changes is the size of the part that runs through neighbours: it is smallest with contiguity (-0.007 to -0.008) and largest with inverse-distance weights (-0.0175 with power 1).

### A sandbox: can a spatial model recover known spillovers?

The spatial model splits the slope into a direct part and a part that runs through neighbours. Can that split be trusted? The `learn_*` functions of geometrics simulate data with a known answer and run the real estimator on them. `gm.learn_spatial_spillovers()` plants direct and indirect impacts on a lattice, here one of about the size of our sample (19 × 19 = 361 cells) with the spatial dependence estimated in part 1 (ρ = 0.23), and compares the estimated impacts with the planted ones.

```{code-cell} ipython3
sandbox = gm.learn_spatial_spillovers(side=19, rho=0.23, gamma=0.0)
display(Markdown(sandbox.interpret()))
sandbox.fig
```

```{code-cell} ipython3
sandbox.df.round(3)
```

The three estimated impacts are within one standard error of the planted ones: direct 1.04 against 1.02, indirect 0.29 against 0.28, total 1.33 against 1.30. The spatial parameter itself is estimated less precisely (0.14 against a planted 0.23). The sandbox shows that the estimator does what it should in a sample of this size when the data follow the model; it does not show that Bolivia's data follow it.

+++

## What we learned

- **geo4bolivia** answered the question by itself: the IDS rose almost everywhere, the municipalities that started lower gained more (β-convergence, half-life of about 20 years, with a part that runs through neighbours in the spatial model), inequality fell and most of what remains lies within departments, while the spatial clusters and the ranking were broadly kept.
- **expdpy** added a panel view: a municipality's relative position is mostly a lasting difference between municipalities, and the positive association between population and the index holds between municipalities but not within them over time.
- **geometrics** added two checks: the spatial β-convergence result does not depend on the weights matrix, and in a simulated sample of the same size the spatial model recovers the direct and indirect impacts that were planted.

Next: the [geo4bolivia tutorial](https://colab.research.google.com/github/quarcs-lab/gdo4bolivia/blob/main/notebooks/geo4bolivia_quickstart.ipynb), the [dynamics of the 15 goals](https://colab.research.google.com/github/quarcs-lab/gdo4bolivia/blob/main/notebooks/sdg_dynamics.ipynb), and the documentation of [geo4bolivia](https://quarcs-lab.github.io/geo4bolivia/), [expdpy](https://cmg777.github.io/expdpy/) and [geometrics](https://quarcs-lab.github.io/geometrics/).
