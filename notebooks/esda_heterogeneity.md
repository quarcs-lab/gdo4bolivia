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

<a href="https://colab.research.google.com/github/quarcs-lab/gdo4bolivia/blob/main/notebooks/esda_heterogeneity.ipynb" target="_parent"><img src="https://colab.research.google.com/assets/colab-badge.svg" alt="Open In Colab"/></a>

# Spatial heterogeneity: a multiscale GWR (MGWR) of poverty on night-time lights

Part of the [GeoDevelopment Observatory of Bolivia](https://quarcs-lab.github.io/gdo4bolivia/).

Night-time lights are a common proxy for economic activity. Is their link with poverty the same everywhere in Bolivia? This notebook relates **multidimensional poverty** (`sdg1_2_mpi`, 0–1; **higher = poorer**) from the Atlas de los ODS en Bolivia 2026 to **log night-time lights per capita** (`ln_t400NTLpc`) and lets the relationship vary over space with a multiscale geographically weighted regression (MGWR). It does so twice: poverty around the 2012 census on lights in 2012, and poverty around the 2024 census on lights in 2020, the last year of the lights series.

Every step is one function of the [`geo4bolivia`](https://quarcs-lab.github.io/geo4bolivia/) package:

1. **Load** the two datasets and pair their years
2. **A global benchmark**: one slope for the whole country ([`geo.regression`](https://quarcs-lab.github.io/geo4bolivia/reference/regression.html)), and a test of what it leaves in its residuals ([`geo.spatial_diagnostics`](https://quarcs-lab.github.io/geo4bolivia/reference/spatial_diagnostics.html))
3. **MGWR in 2012** ([`geo.mgwr`](https://quarcs-lab.github.io/geo4bolivia/reference/mgwr.html)): bandwidths and their intervals, coefficient maps, significance, local collinearity, and fit against global models
4. **MGWR in 2024**, and what changed
5. **Summary**

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

import pandas as pd
import plotly.express as px
import plotly.io as pio

import geo4bolivia as geo

warnings.filterwarnings("ignore")
os.environ["PYTHONWARNINGS"] = "ignore"     # also in the worker processes that MGWR starts
# Plotly: Colab's own renderer there; elsewhere load plotly.js from its CDN to keep the file small
pio.renderers.default = "colab" if "google.colab" in sys.modules else "notebook_connected"
print("geo4bolivia", geo.__version__)
```

## 1. Load the data

Poverty comes from the SDG Atlas, which gives each of the 343 municipalities and indigenous autonomies two values: one near the 2012 census and one near the 2024 census, stored as the years 2012 and 2024. Night-time lights per capita (`ntl`, 2012–2020) are built from gridded population on the older municipal map, so they cover **333 units**: the four units created since (three indigenous autonomies, TIOC, and San Pedro de Macha) and the six municipalities that ceded territory to them have no lights value.

`ln_t400NTLpc` is the Hodrick–Prescott trend of the log of lights per capita, which removes year-to-year noise. The lights of 2012 go with the poverty of 2012, and the lights of 2020 with the poverty of 2024: the lights of 2020 are stored below in the rows of 2024, so that each period is one "year" of the panel.

```{code-cell} ipython3
mpi = geo.load("sdg01", variables="sdg1_2_mpi", groups=["department"])
ntl = geo.load("ntl", variables="ln_t400NTLpc", years=[2012, 2020])
ntl["year"] = ntl["year"].replace({2020: 2024})     # lights of 2020 next to poverty of ~2024

df = mpi.merge(ntl, on=["geo_id", "year"])          # inner join: the 333 units with lights
no_lights = mpi.loc[~mpi["geo_id"].isin(ntl["geo_id"]), "name"].unique()
print(df["geo_id"].nunique(), "units | without lights:", ", ".join(no_lights))
df.head()
```

```{code-cell} ipython3
geo.describe(df)
```

Between the two periods poverty fell sharply and its spread narrowed, while lights per capita rose and their spread (in logs) narrowed too. The darkest unit in 2012 is far from the rest: a log of 0.86, against a first quartile of 12.0.

+++

## 2. A global benchmark

### One slope for the whole country

`geo.scatter` plots the two variables with the least-squares line, and `geo.regression` gives the same line as a regression table with robust standard errors.

```{code-cell} ipython3
geo.scatter(df, "ln_t400NTLpc", "sdg1_2_mpi", year=2012, color="department")
```

```{code-cell} ipython3
ols = geo.regression(df, "sdg1_2_mpi", "ln_t400NTLpc", year=2012)
ols.gt
```

Across the country, brighter municipalities are less poor. The slope is −0.033: one more log point of lights per capita (about 2.7 times more light per person) goes with an MPI 0.033 lower, about a third of the standard deviation of poverty across these units (0.104). Lights alone account for 29% of the variation in poverty (R² = 0.293). The cloud of points is wide, which suggests that one line may not fit every region.

### What the global model leaves out

If one line described every part of the country, its residuals would be scattered over the map at random. `geo.spatial_diagnostics` tests that: Moran's I of the residuals, and the Lagrange multiplier tests for the two standard spatial models.

```{code-cell} ipython3
diag = geo.spatial_diagnostics(df, "sdg1_2_mpi", "ln_t400NTLpc", year=2012)
diag
```

The residuals are clearly clustered: their Moran's I is 0.351, and every test rejects the absence of spatial dependence. Neighbouring municipalities are poorer, or less poor, than their lights predict *together*. The tests point to a spatial lag model, which would keep one slope and add the neighbours' poverty. This notebook asks a different question: whether the slope itself changes from place to place.

+++

## 3. MGWR in 2012

A geographically weighted regression fits a regression at every municipality, giving more weight to the municipalities near it. Each coefficient becomes a surface that can be mapped. The **bandwidth** is the number of nearest municipalities that enter each local regression: a small bandwidth means a relationship that changes over short distances, and a bandwidth close to the number of units (333) one that is about the same everywhere.

The multiscale version (MGWR) finds **one bandwidth per term**, here one for the intercept and one for the slope on lights. `geo.mgwr` follows the workflow of the [mgwr library](https://github.com/pysal/mgwr): the variables are z-standardized, so the coefficients are in standard deviations; the kernel is an adaptive bisquare; the bandwidths minimise the AICc; and the local t-tests of each term are corrected for multiple testing. One fit takes about half a minute.

```{code-cell} ipython3
mg = geo.mgwr(df, "sdg1_2_mpi", "ln_t400NTLpc", year=2012)
print(mg.interpret())
```

### Bandwidths and their intervals

```{code-cell} ipython3
mg.gt_bw
```

```{code-cell} ipython3
print("Bandwidths:", mg.bw)
print("95% intervals:", mg.bw_interval)
```

MGWR selects **44 nearest municipalities for the intercept** (95% interval 44 to 48) and **64 for the slope on lights** (64 to 84). Both are far below 333, so both the level of poverty at given lights and its link with lights are local processes. The slope varies over a somewhat larger scale than the intercept, and the two intervals do not overlap: a single bandwidth for both terms would have hidden that difference.

One limit to know: the search of the mgwr library does not try very small bandwidths. With two terms the smallest it considers is 44, so read the bandwidth of the intercept as "as local as the search goes": the true scale may be smaller.

### The coefficient maps

`mg.figs` holds one map per term. Municipalities whose coefficient is not significant after the correction are grey.

```{code-cell} ipython3
mg.figs["ln_t400NTLpc"]
```

```{code-cell} ipython3
mg.figs["const"]
```

```{code-cell} ipython3
geo.distribution(mg.df, "ln_t400NTLpc_coef", by="department", kind="box",
                 title="Local slope on lights by department, 2012").fig
```

```{code-cell} ipython3
local = geo.add_names(mg.df, groups=["department"])
by_dep = local.groupby("department", as_index=False).agg(
    units=("geo_id", "size"),
    mean_slope=("ln_t400NTLpc_coef", "mean"), sd_slope=("ln_t400NTLpc_coef", "std"),
    significant_slopes=("ln_t400NTLpc_significant", "sum"),
    mean_intercept=("const_coef", "mean"))
by_dep.sort_values("mean_slope").round(2)
```

```{code-cell} ipython3
def names(table, column, n=5):
    return ", ".join(f"{a} ({b}, {c:.2f})" for a, b, c in
                     zip(table["name"].head(n), table["department"], table[column]))

print("Steepest slopes:", names(local.nsmallest(5, "ln_t400NTLpc_coef"), "ln_t400NTLpc_coef"))
print("Flattest slopes:", names(local.nlargest(5, "ln_t400NTLpc_coef"), "ln_t400NTLpc_coef"))
print("Highest intercepts:", names(local.nlargest(5, "const_coef"), "const_coef"))
print("Lowest intercepts:", names(local.nsmallest(5, "const_coef"), "const_coef"))
```

- **The sign never changes.** Every one of the 333 local slopes is negative, from −1.36 to −0.17 standard deviations of poverty per standard deviation of lights. The global slope on the same scale is the correlation of section 2, −0.54. More light goes with less poverty everywhere; what varies is the strength, about eightfold.
- **The slope is steepest in the Andean valleys.** The department averages are −1.24 in Cochabamba, −1.02 in Chuquisaca and −0.91 in Potosí, and the steepest slopes of all are around the city of Cochabamba (Colomi, Sacaba, Cochabamba, Colcapirhua, San Benito: about −1.35).
- **It is flattest in the Amazonian north.** Beni averages −0.26 and Pando −0.27, with Baures, Magdalena and Huacaraje in Beni the flattest (−0.17 to −0.19). The slopes of La Paz (−0.41) and Santa Cruz (−0.48) are also weaker than the global one.
- **Potosí and Oruro are split.** Their slopes spread more than those of any other department (standard deviations 0.45 and 0.28). On the map they are steep next to the valleys and flat in the south-west of Potosí and the west of Oruro.
- **The intercept map** shows the level of poverty at average lights, in standard deviations. On average it is positive (poorer than the lights suggest) in Pando (0.47), Chuquisaca (0.43) and Cochabamba (0.39), and negative in La Paz (−0.25) and Santa Cruz (−0.29). The highest intercepts are in the south-east of Chuquisaca and the neighbouring Chaco of Santa Cruz, and the lowest in the city of La Paz and the Yungas north of it.

### Significance and local collinearity

Each term has its own critical value, because a term with a smaller bandwidth runs more independent local tests. `local_cn` is the condition number of each local regression: above about 30, the local coefficients cannot be told apart from each other.

```{code-cell} ipython3
print("Critical |t| after correction:", {k: round(v, 2) for k, v in mg.critical_t.items()})
print("Significant slopes:", mg.df["ln_t400NTLpc_significant"].sum(), "of", len(mg.df),
      "| significant intercepts:", mg.df["const_significant"].sum())
print("Slopes with |t| > 1.96:", (mg.df["ln_t400NTLpc_t"].abs() > 1.96).sum())
print("Negative slopes:", (mg.df["ln_t400NTLpc_coef"] < 0).sum())
print("Local condition number: median", round(mg.df["local_cn"].median(), 2),
      "| maximum", round(mg.df["local_cn"].max(), 2))
```

After the correction (critical |t| of 2.92 for the slope, against the usual 1.96), **250 of the 333 slopes are significant**; without it, 324 would be. The table above gives them by department: all the slopes of Chuquisaca, Cochabamba and Tarija are significant, and most of those of Potosí (32 of 37) and La Paz (72 of 87). Fewer than half are in Santa Cruz (21 of 56) and Beni (5 of 17), where the slopes are also flat.

The local condition numbers are small (median 1.4, maximum 4.9, far below 30): with one regressor, the intercept and the slope are well identified everywhere.

### Fit against global models

Is the local model worth its complexity? R² does not depend on the units of the variables, but the AICc does, and the AICc of MGWR refers to the z-standardized variables. So the comparison fits the global regression on the same standardized variables, and computes its AICc from the fitted statsmodels object (`.models`) with the formula the mgwr library uses. The package has no function for that number.

The tests of section 2 pointed to a spatial lag model, which keeps one slope and adds the neighbours' poverty. `geo.spatial_model` fits it on the same variables, as a second global benchmark.

```{code-cell} ipython3
def standardized(data, columns):
    z = data.copy()
    z[columns] = (z[columns] - z[columns].mean()) / z[columns].std(ddof=0)
    return z

def aicc(fit):                        # AICc of a least-squares fit, as in the mgwr library
    n, k = int(fit.nobs), len(fit.params)
    return -2 * fit.llf + 2 * n * (k + 1) / (n - k - 2)

def compare(year, mg):
    """Global models on the z-standardized variables of one period, against MGWR."""
    z = standardized(df[df["year"] == year], ["sdg1_2_mpi", "ln_t400NTLpc"])
    ols_z = geo.regression(z, "sdg1_2_mpi", "ln_t400NTLpc")
    lag = geo.spatial_model(z, "sdg1_2_mpi", "ln_t400NTLpc", model="lag")
    print(f"Global standardized slope: {ols_z.df['estimate'][0]:.2f} | "
          f"spatial lag model: AIC {lag.aic:.1f}, rho {lag.rho:.2f}")
    table = pd.DataFrame(
        {"least squares": [ols_z.summary["r2"][0], ols_z.summary["r2_adj"][0],
                           aicc(ols_z.models[0]), len(ols_z.models[0].params)],
         "MGWR": [mg.r2, mg.model_obj.adj_R2, mg.aicc, mg.model_obj.ENP]},
        index=["R²", "adjusted R²", "AICc", "effective parameters"])
    return table.round(3)

compare(2012, mg)
```

```{code-cell} ipython3
resid = geo.moran(mg.df, "residual")
print(f"Moran's I of the residuals: least squares {diag.moran_i_resid:.3f}, "
      f"MGWR {resid.moran_i:.3f} (pseudo p = {resid.p_sim:.3f})")
```

- **Against least squares.** Letting the intercept and the slope vary raises R² from 0.293 to 0.645 (adjusted: 0.291 to 0.605) and lowers the AICc from 835.6 to 678.1. The AICc penalises the extra flexibility: MGWR uses the equivalent of 33.9 parameters, against 2.
- **Against the spatial lag model.** A single slope with a spatial lag has an AIC of 740.8: better than least squares, and well above the 678.1 of MGWR. The two criteria count parameters slightly differently, so the comparison is approximate, but the gap is wide. In 2012, coefficients that vary over space describe these data better than one slope with spatial dependence.
- **Residuals.** MGWR absorbs most of the spatial pattern that least squares left in its residuals: their Moran's I falls from 0.351 to 0.091, small but still distinguishable from zero (pseudo p = 0.006). `mg.fig` maps them.

+++

## 4. MGWR in 2024

The Atlas measures poverty again around the 2024 census; the lights series ends in 2020. The same steps, on the same 333 units, show whether the link has changed. Because MGWR standardizes the variables within each period, the slopes of the two periods are comparable even though poverty fell a lot.

```{code-cell} ipython3
ols24 = geo.regression(df, "sdg1_2_mpi", "ln_t400NTLpc", year=2024)
diag24 = geo.spatial_diagnostics(df, "sdg1_2_mpi", "ln_t400NTLpc", year=2024)
slope24 = ols24.df.set_index("term").loc["ln_t400NTLpc"]
corr24 = geo.scatter(df, "ln_t400NTLpc", "sdg1_2_mpi", year=2024).corr
print(f"Global slope {slope24['estimate']:.4f} (SE {slope24['std_error']:.4f}), "
      f"R² {ols24.summary.loc[0, 'r2']:.3f}, correlation {corr24:.2f}")
print(f"Moran's I of its residuals {diag24.moran_i_resid:.3f}; the tests point to: {diag24.recommendation}")
```

```{code-cell} ipython3
mg24 = geo.mgwr(df, "sdg1_2_mpi", "ln_t400NTLpc", year=2024)
mg24.gt_bw
```

```{code-cell} ipython3
mg24.figs["ln_t400NTLpc"]
```

```{code-cell} ipython3
resid24 = geo.moran(mg24.df, "residual")
print("Bandwidths:", mg24.bw, "| 95% intervals:", mg24.bw_interval)
print("Significant slopes:", mg24.df["ln_t400NTLpc_significant"].sum(), "of", len(mg24.df),
      "| negative slopes:", (mg24.df["ln_t400NTLpc_coef"] < 0).sum(),
      "| range:", mg24.df["ln_t400NTLpc_coef"].min().round(2), "to",
      mg24.df["ln_t400NTLpc_coef"].max().round(2))
print("Local condition number: maximum", round(mg24.df["local_cn"].max(), 2))
print(f"Moran's I of the residuals: least squares {diag24.moran_i_resid:.3f}, "
      f"MGWR {resid24.moran_i:.3f} (pseudo p = {resid24.p_sim:.3f})")
compare(2024, mg24)
```

### The local slopes in both periods

```{code-cell} ipython3
both = mg.df.merge(mg24.df, on=["geo_id", "name"], suffixes=("_2012", "_2024"))
both = geo.add_names(both, groups=["department"])
r = both["ln_t400NTLpc_coef_2012"].corr(both["ln_t400NTLpc_coef_2024"])
print(f"Correlation of the local slopes of the two periods: {r:.2f}")

px.scatter(both, x="ln_t400NTLpc_coef_2012", y="ln_t400NTLpc_coef_2024", color="department",
           hover_name="name", title="Local slopes on lights in both periods",
           labels={"ln_t400NTLpc_coef_2012": "Local slope, poverty 2012 on lights 2012",
                   "ln_t400NTLpc_coef_2024": "Local slope, poverty 2024 on lights 2020"})
```

```{code-cell} ipython3
means = both.groupby("department", as_index=False)[
    ["ln_t400NTLpc_coef_2012", "ln_t400NTLpc_coef_2024"]].mean()
means = means.rename(columns={"ln_t400NTLpc_coef_2012": "2012", "ln_t400NTLpc_coef_2024": "2024"})
long = means.melt(id_vars="department", var_name="period", value_name="mean local slope")

px.bar(long, x="department", y="mean local slope", color="period", barmode="group",
       title="Mean local slope on lights by department").show()
means.sort_values("2012").round(2)
```

- **The global link persists and is a little weaker.** In 2024 the slope is −0.018 in MPI units, about half the slope of 2012, but poverty itself is far lower. On the standardized scale the association falls only from −0.54 to −0.50, and R² from 0.293 to 0.251. The residuals of the global model are as clustered as before (Moran's I 0.340).
- **It is still local.** MGWR keeps the intercept bandwidth at 44 (interval 44 to 48) and raises R² to 0.536 (adjusted 0.492), with an AICc of 755.9 against 854.8 for least squares. The Moran's I of the residuals falls to 0.084. The spatial lag model comes closer than in 2012: its AIC is 771.8.
- **The slope varies over a broader scale.** Its bandwidth rises from 64 to 100 nearest municipalities (interval 100 to 111, which does not overlap the 64 to 84 of 2012), and the range of the local slopes narrows: −0.94 to −0.17, against −1.36 to −0.17 in 2012. All 333 are again negative, 242 are significant after the correction, and no local condition number exceeds 3.2.
- **The map is much the same.** The two sets of local slopes correlate at 0.84. The steep slopes of the valleys moved towards the rest: Cochabamba's average goes from −1.24 to −0.77 and Chuquisaca's from −1.02 to −0.77, while Tarija's strengthens (−0.57 to −0.74). Potosí (−0.83) now has the steepest average slope, and La Paz (−0.23) the flattest.

Lights in 2020 precede poverty in 2024 by four years, so this is a comparison of patterns, not a test of how lights predict later poverty.

+++

## Summary

- **One sign, many strengths.** In both periods, every one of the 333 local slopes is negative: brighter municipalities are less poor everywhere. The strength of the link varies about eightfold in 2012 (−1.36 to −0.17) and less in 2024 (−0.94 to −0.17).
- **The global model misses a spatial pattern.** One slope for the country accounts for 29% of the variation in poverty in 2012 and leaves clustered residuals (Moran's I = 0.351). MGWR accounts for 65%, has a much lower AICc than least squares and than a spatial lag model, and leaves residuals that are only weakly clustered (0.091).
- **Two local processes, at different scales.** The intercept has a bandwidth of 44 nearest municipalities in both periods, the smallest the search considers. The slope on lights has one of 64 in 2012 and 100 in 2024: the link became more alike across the country.
- **Where lights are informative.** As a proxy for poverty, night-time lights carry most information in the Andean valleys of Cochabamba, Chuquisaca and Potosí, and least in the Amazonian north (Beni, Pando), where the local slopes are flattest, and in Santa Cruz, where most are not significant. The companion notebook `embeddings_mpi_ml` tests whether satellite embeddings do better.
- **Caveats.** These are associations from a model with one explanatory variable, not causal effects. MGWR shows where an association differs, not why: local coefficients absorb omitted factors that vary over space (altitude, remoteness, access to markets). Each local regression rests on few units, and the 2024 fit pairs poverty with lights of four years earlier.

Related notebooks: `esda_dependence` (spatial autocorrelation of poverty and lights) and `esda_inequality` (Theil and Gini decompositions). The package's article [Spatial heterogeneity: MGWR](https://quarcs-lab.github.io/geo4bolivia/articles/heterogeneity.html) explains the method step by step, and the [function reference](https://quarcs-lab.github.io/geo4bolivia/reference/mgwr.html) documents every option of `geo.mgwr`.
