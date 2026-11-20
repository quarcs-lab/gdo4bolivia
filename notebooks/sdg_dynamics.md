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

<a href="https://colab.research.google.com/github/quarcs-lab/gdo4bolivia/blob/main/notebooks/sdg_dynamics.ipynb" target="_parent"><img src="https://colab.research.google.com/assets/colab-badge.svg" alt="Open In Colab"/></a>

# Dynamics of sustainable development in Bolivia, 2012–2024

Part of the [GeoDevelopment Observatory of Bolivia](https://quarcs-lab.github.io/gdo4bolivia/).

The *Atlas de los ODS en Bolivia 2026* (Andersen & Argandoña, SDSN Bolivia) measures the Sustainable Development Goals (SDGs) in Bolivia's 343 municipalities and indigenous autonomies at two points in time, near the 2012 and the 2024 population censuses. This notebook asks how sustainable development changed between the two:

1. **Load** the Sustainable Development Index (IDS), the 15 goal indices and multidimensional poverty
2. **Change, 2012–2024**: distributions, maps, the largest gains, and progress weighted by population
3. **Which goals moved**: the goals that advanced and those that retreated
4. **Convergence**: did lagging municipalities catch up (β-convergence), and did the gaps between municipalities narrow?
5. **Rank mobility**: how much the ordering of municipalities changed
6. **Spatial dynamics**: spatial clustering in each period, where progress clustered, and whether the clusters persisted
7. **Takeaways**

Every analysis is one function of the [`geo4bolivia`](https://quarcs-lab.github.io/geo4bolivia/) package. Each returns a result that shows its figure and a reading of its numbers; the text below adds what the numbers mean for Bolivia.

+++

## 0. Setup

In Google Colab the next cell installs the package (a few seconds: Colab already has most of its dependencies). Locally, `uv sync` has installed it already.

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

warnings.filterwarnings("ignore")
pd.set_option("display.width", 120)
# Plotly: Colab's own renderer there; elsewhere load plotly.js from its CDN to keep the file small
pio.renderers.default = "colab" if "google.colab" in sys.modules else "notebook_connected"
print("geo4bolivia", geo.__version__)
```

## 1. Load the data

| Variable | Dataset | Meaning |
| --- | --- | --- |
| `index_sdg` | `sdg` | Sustainable Development Index (IDS, 0–100): the mean of the 15 goal indices |
| `population` | `sdg` | Census population, 2012 and 2024 |
| `index_sdg1` … `index_sdg17` | `sdg01` … `sdg17` | Goal indices (0–100); the Atlas has none for SDG 12 or 14 |
| `sdg1_2_mpi` | `sdg01` | Multidimensional Poverty Index (0–1; **higher = poorer**), from the censuses |

Every index is on a 0–100 scale where 100 means the goal's targets are met: each of the 81 indicators is rescaled between a worst and a best value, a goal index is the mean of its rescaled indicators, and the IDS is the mean of the 15 goal indices.

`geo.load` returns a panel with one row per unit and period; `geo.combine` puts the 15 goal indices, one from each dataset, in one panel.

```{code-cell} ipython3
GOALS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 15, 16, 17]

ids = geo.load("sdg", variables=["index_sdg", "population"], groups=["department"])
mpi = geo.load("sdg01", variables="sdg1_2_mpi", groups=["department"])
goals = geo.combine({f"sdg{g:02d}": [f"index_sdg{g}"] for g in GOALS}, scale="municipality")

print("Units:", ids["geo_id"].nunique(), "| periods:", sorted(ids["year"].unique().tolist()),
      "| goal indices:", goals.shape[1] - 2)
ids.head()
```

**Two nominal periods.** The Atlas reports an *initial* value near the 2012 census and a *final* value near the 2024 census, stored here as the years 2012 and 2024. Each indicator has its own reference years, which `geo.reference_years` reads from the metadata: census indicators refer exactly to 2012 and 2024, while indicators from administrative records or surveys are single years or multi-year averages close to them. The tally over the 81 indicators:

```{code-cell} ipython3
ref = pd.concat([geo.reference_years(f"sdg{g:02d}") for g in GOALS])
ref = ref[ref["variable"].str.startswith("sdg")]             # the indicators, without the goal indices
ref = ref.pivot(index="variable", columns="year", values="reference")
ref.columns = ["initial", "final"]
print("Indicators:", len(ref))
ref.value_counts().rename("indicators").reset_index()
```

So "2012" and "2024" are best read as "around the 2012 census" and "around the 2024 census", about twelve years apart: 45 of the 81 indicators refer exactly to 2012 and 2024.

+++

## 2. Change in the IDS, 2012–2024

### The national picture

`geo.describe` summarises the index across the 343 units in each period, and `geo.trend` follows its mean, with each unit's own path behind it.

```{code-cell} ipython3
geo.describe(ids, "index_sdg")
```

```{code-cell} ipython3
geo.trend(ids, "index_sdg")
```

The Atlas reports Bolivia's IDS as 57.4 in 2012 and 66.0 in 2024. Municipal averages give every unit the same weight; `geo.aggregate` weights them by census population, the rule the metadata declares for the index:

```{code-cell} ipython3
geo.aggregate(ids, to="country", dataset="sdg")
```

`geo.change` gives one row per unit, with its value in both periods and the change between them:

```{code-cell} ipython3
chg = geo.change(ids, "index_sdg")
gain = chg["index_sdg_change"]
print(f"Units whose IDS rose: {(gain > 0).sum()} of {len(chg)}; fell: {(gain < 0).sum()}")
geo.distribution(chg, "index_sdg_change", title="Change in the IDS, 2012 to 2024 (points)")
```

- **Almost every unit improved.** The IDS rose in 342 of the 343 units and fell in one. The mean gain was 10.0 points (median 9.9, standard deviation 2.9), from −2.7 to +20.5.
- **The whole distribution shifted.** The mean across units went from 50.1 to 60.1 and the median from 49.6 to 59.8. The minimum rose by 10.1 points (37.2 to 47.3) and the maximum by 6.8 (70.5 to 77.3).
- **Weighted by population**, the IDS went from 57.8 to 66.8 (+9.0). These are close to the Atlas's national values without being identical, so the Atlas's national figures are not simply this weighted average. The weighted mean lies above the unweighted one because the populous cities score higher. The gap between the two shrank from 7.7 to 6.7 points, because the many small units gained a little more than the cities.

### Maps

With a list of years, `geo.map` draws both periods in the same classes (here quantiles of the two periods together), so the colours are comparable. The figure keeps the class limits, which gives the number of units in each class. With `change=True` the function maps the change, in classes that split at zero.

```{code-cell} ipython3
fig = geo.map(ids, "index_sdg", year=[2012, 2024], scheme="quantiles")
classes = pd.cut(ids["index_sdg"], fig.layout.meta["bins"], include_lowest=True)
print(pd.crosstab(classes, ids["year"]))             # units per class in each period
fig
```

```{code-cell} ipython3
geo.map(ids, "index_sdg", change=True, scheme="fisher_jenks")
```

```{code-cell} ipython3
geo.trend(ids, "index_sdg", by="department", units=False).df.pivot(
    index="department", columns="year", values="mean").assign(
    change=lambda t: t[2024] - t[2012]).sort_values("change", ascending=False).round(1)
```

In 2012, 139 units were in the lowest class (an IDS of up to 48.0) and 11 in the highest (above 61.7). In 2024 one unit is left in the lowest class and 124 are in the highest. The department means show the geography. In 2012 the average unit scored lowest in Potosí (47.7), Beni (48.3), Pando (48.5), La Paz (48.7) and Oruro (48.9), and highest in Tarija (59.6) and Santa Cruz (53.9). The gains were largest where the index was low, in Pando (+11.5), Cochabamba (+10.9), Chuquisaca (+10.8) and La Paz (+10.6), and smallest in the two departments that started highest, Santa Cruz (+7.8) and Tarija (+8.1). On the change map, the only class of falls holds a single unit, in eastern Santa Cruz, and the lowest gains surround it.

### Largest gains and the units that fell

```{code-cell} ipython3
geo.extremes(chg, "index_sdg_change", n=10)
```

```{code-cell} ipython3
top = chg.nlargest(10, "index_sdg_change")
print(f"IDS in 2012 of the ten largest gainers: {top['index_sdg_2012'].min()} to "
      f"{top['index_sdg_2012'].max()}")

dep = geo.add_names(geo.aggregate(ids, to="department", dataset="sdg"))
dep = geo.change(dep, "index_sdg")[["name", "index_sdg_2012", "index_sdg_2024", "index_sdg_change"]]
dep.sort_values("index_sdg_change", ascending=False).round(1)
```

- **The largest gains** were in units that started low (IDS of 41.7 to 51.5 in 2012): Cruz de Machacamarca (+20.5) and Carangas (+19.4) on the Oruro altiplano, the two largest gains in the country, followed by Sicaya (+17.6), Villa Gualberto Villarroel (+16.9) and Santiváñez (+16.5) in Cochabamba, Todos Santos in Oruro (+16.8), San Pedro, Santa Rosa and Bolpebra in Pando (+15.5 to +16.2) and Mecapaca in La Paz (+16.1).
- **The smallest changes** are concentrated in Santa Cruz: San José de Chiquitos (−2.7, the only fall), Roboré (+1.2), Puerto Suárez (+2.3) and Ascención de Guarayos (+2.6), with Atocha (Potosí, +2.5).
- **Weighted by population** (the table above), Chuquisaca gained most (+11.1) and Tarija least (+7.5). Tarija has the highest population-weighted IDS in both periods (62.6 and 70.1); Potosí in 2012 (50.9) and Beni in 2024 (60.3) the lowest.

### Progress weighted by population

A gain of 20 points in a municipality of 3,000 people and one of 5 points in a city of a million mean very different things for the number of people affected. The Atlas calls the second kind *avances masivos*, "massive advances". A simple measure is the gain in points times the 2024 population ("person-points"). It is plain arithmetic on the table of changes:

```{code-cell} ipython3
pp = geo.change(ids, ["index_sdg", "population"])
pp["person_points"] = pp["index_sdg_change"] * pp["population_2024"] / 1e6     # millions
total, people = pp["person_points"].sum(), pp["population_2024"].sum()
top = pp.nlargest(10, "person_points")
print(f"Total: {total:.1f} million person-points; average gain per person: "
      f"{1e6 * total / people:.2f} points")
print(f"Top 10 units: {100 * top['person_points'].sum() / total:.1f}% of the person-points, "
      f"{100 * top['population_2024'].sum() / people:.1f}% of the 2024 population")
columns = ["name", "population_2024", "index_sdg_change", "person_points", "share"]
print(top.assign(share=100 * top["person_points"] / total)[columns].round(1).to_string(index=False))

px.bar(top, x="person_points", y="name", color="department", hover_name="name",
       labels={"person_points": "Person-points (millions)", "name": "", "department": "Department"},
       title="The ten largest contributions to progress, 2012 to 2024")
```

The gains add up to 103.9 million person-points, an average of 9.1 points per person living in Bolivia in 2024. The ten largest contributions all come from cities, and together they account for 46.4% of the total, about their share of the population (46.7%): progress in the big cities was roughly proportional to their size. **Santa Cruz de la Sierra** contributes most (13.5%, a gain of 8.7 points for 1.6 million people). **El Alto** is the clearest "massive advance": it gained 12.3 points, more than the national average, for 886,000 people, 10.5% of the total. Nuestra Señora de La Paz gained only 6.8 points.

+++

## 3. Which goals moved

For each goal index, `geo.trend` gives its mean across the 343 units in both periods, the change, and the share of units that ended higher. `geo.aggregate` adds the means weighted by each period's census population.

```{code-cell} ipython3
labels = geo.labels(goals)
weighted = geo.aggregate(goals, to="country", weights=geo.load("sdg", variables="population"),
                         rules={f"index_sdg{g}": "weighted_mean:population" for g in GOALS})
weighted = weighted.set_index("year")

rows = []
for g in GOALS:
    v = f"index_sdg{g}"
    t = geo.trend(goals, v)
    rows.append({"goal": f"SDG {g}", "name": labels[v].replace(" index (0-100)", ""),
                 "mean 2012": t.value_first, "mean 2024": t.value_last, "change": t.change,
                 "units that rose (%)": 100 * t.share_rising,
                 "weighted 2012": weighted.loc[2012, v], "weighted 2024": weighted.loc[2024, v]})
by_goal = pd.DataFrame(rows)
by_goal["weighted change"] = by_goal["weighted 2024"] - by_goal["weighted 2012"]
by_goal.sort_values("change", ascending=False).round(1)
```

```{code-cell} ipython3
long = by_goal.melt(id_vars=["goal", "name"], value_vars=["mean 2012", "mean 2024"],
                    var_name="period", value_name="mean")
long["goal"] = long["goal"] + ": " + long["name"]

px.scatter(long.sort_values("mean"), x="mean", y="goal", color="period", range_x=[0, 100],
           labels={"mean": "Mean goal index across the 343 units (0-100)", "goal": ""},
           title="Goal indices, 2012 and 2024")
```

What lies behind the three goals that did not advance? The mean of their indicators (in their original units) across the units with data, from `geo.describe`:

```{code-cell} ipython3
behind = pd.concat([geo.describe(geo.load(f"sdg{g:02d}")).assign(goal=f"SDG {g}") for g in [13, 2, 15]])
behind = behind[behind["variable"].str.startswith("sdg")]
behind.pivot(index=["goal", "label"], columns="year", values="mean").round(2)
```

- **Twelve of the 15 goals advanced** on average. The largest gains were in **SDG 9** (industry, innovation and infrastructure: 21.9 to 52.3, +30.4) and **SDG 4** (quality education, +21.5), both of which rose in every unit, followed by SDG 8 (decent work, +18.8), SDG 1 (no poverty, +17.8) and SDG 6 (clean water and sanitation, +15.5).
- **Three goals did not advance**: SDG 2 (zero hunger, −0.3) and SDG 15 (life on land, −0.3) were flat, and **SDG 13 (climate action) retreated** by 7.8 points; it rose in only 22% of the units.
  - In SDG 13 the average share of families affected by extreme climate events rose from 9.4% to 40.0% and CO₂ emissions from fires from 14.1 to 34.6 t per person per year.
  - In SDG 2, chronic malnutrition among children under 5 halved (37.2% to 18.9%), but obesity (14.8% to 26.8%) and anaemia (41.9% to 57.6%) among women of 15–49 rose. Weighted by population, SDG 2 fell by 6.2 points.
  - In SDG 15 more land was declared protected (12.1% to 17.4%), but the index of biodiversity loss from fires tripled (0.78 to 2.36).
- **Weighting by population** changes levels more than the direction of change. The cities score higher on most goals, but lower on SDG 16 (peace, justice and strong institutions: 56.6 weighted against 74.2 unweighted in 2012). The largest weighted gains are again SDG 9 (+25.5), SDG 8 (+24.5) and SDG 4 (+18.2).
- In 2024 the lowest goals are SDG 17 (partnerships, 32.3), SDG 11 (sustainable cities, 39.1), SDG 2 (39.4) and SDG 6 (41.8).

+++

## 4. Convergence

Two questions, in the language of the growth literature:

- **β-convergence**: did municipalities that started lower improve faster, so that laggards catch up?
- **σ-convergence**: did the dispersion across municipalities narrow?

### β-convergence of the IDS

`geo.beta_convergence` regresses each unit's average yearly log growth of the IDS on its initial log level. With the periods stored as 2012 and 2024, the horizon is 12 years. A negative slope β means convergence; it implies a speed of −ln(1 + 12β)/12 a year and a half-life, the years it would take to close half of a gap at that pace.

```{code-cell} ipython3
beta = geo.beta_convergence(ids, "index_sdg")
beta
```

Growth may also be spatially dependent: neighbours share shocks. A spatial error model (`model="sem"`) allows for that. Its table sets it next to the least-squares estimate:

```{code-cell} ipython3
sem = geo.beta_convergence(ids, "index_sdg", model="sem")
sem.gt
```

The same question in points rather than logs: `geo.scatter` sets the change in the IDS against its level in 2012.

```{code-cell} ipython3
points = geo.scatter(chg, "index_sdg_2012", "index_sdg_change", color="department")
print(f"Correlation of the IDS of 2012 with the IDS of 2024: "
      f"{chg['index_sdg_2012'].corr(chg['index_sdg_2024']):.2f}")
points
```

- **The IDS converged.** The slope of yearly log growth on the initial log level is −0.0287 (standard error 0.0017, R² 0.44): units that started lower grew faster. The implied speed is 3.5% a year and the half-life about **19.7 years**.
- **The spatial error model** gives a slightly faster convergence (−0.0321, half-life 17.1 years), with a strong spatial error parameter (λ = 0.467): what the initial level does not account for in growth is shared by neighbours. Its AIC is lower (−2910 against −2865). With one regressor its R² is the same as that of least squares by construction, so the AIC is the measure to compare.
- **In points**, each extra point of IDS in 2012 goes with 0.22 fewer points of gain (R² 0.19). The correlation of the 2012 IDS with its change is **−0.43**, while the ordering persists: the IDS of 2012 and 2024 correlate at **0.87**.
- With two periods, part of a negative β can be regression to the mean (measurement noise in 2012 that does not repeat), so the speed is best read as an upper bound.

### β-convergence of multidimensional poverty

For poverty, a *bad*, convergence means that poverty fell more where it was higher. In levels, the change in the MPI is set against its 2012 level: a slope below zero means larger absolute reductions in poorer units, and a slope of −1 would mean that poverty disappeared everywhere.

```{code-cell} ipython3
mpi_chg = geo.change(mpi, "sdg1_2_mpi")
print(f"Units where the MPI fell: {(mpi_chg['sdg1_2_mpi_change'] < 0).sum()} of {len(mpi_chg)}; "
      f"median change: {mpi_chg['sdg1_2_mpi_pct_change'].median():.0f}%")
geo.scatter(mpi_chg, "sdg1_2_mpi_2012", "sdg1_2_mpi_change", color="department")
```

In proportional terms, the question is the one `geo.beta_convergence` asks: the yearly log growth of the MPI against its initial log level.

```{code-cell} ipython3
beta_mpi = geo.beta_convergence(mpi, "sdg1_2_mpi")
beta_mpi
```

- **In absolute terms, poverty converged strongly.** The MPI fell in all 343 units. The slope of the change on the 2012 level is **−0.641** (R² 0.90): every 0.1 of MPI in 2012 goes with a reduction 0.064 larger. Poorer units cut poverty far more in points: about two thirds of any initial difference in poverty was closed.
- **In relative terms, it diverged.** The slope of yearly log growth on the initial log level is **+0.020** (standard error 0.003): proportional reductions were larger where poverty was already low. The median unit cut its MPI by 76%, but the poorest units kept a larger share of theirs. Absolute gaps narrowed while relative gaps widened, as the measures of inequality confirm.

### Did the gaps narrow? Dispersion in each period

σ-convergence proper is a trend: `geo.sigma_convergence` estimates how the dispersion moves over time, and needs **three or more years** to do so. With the two periods of the Atlas the dispersion can only be compared, which is what `geo.inequality` does: the Gini index, the Theil index and the coefficient of variation in each period, all of them measures of relative gaps. The standard deviation (absolute gaps) is in `geo.describe`.

```{code-cell} ipython3
ineq = geo.inequality(ids, "index_sdg", measures=("gini", "theil", "cv"))
ineq.fig_lorenz.show()
ineq.gt
```

Theil's index splits into inequality *between* the nine departments and inequality *within* them (`geo.theil_decomposition`):

```{code-cell} ipython3
geo.theil_decomposition(ids, "index_sdg", by="department")
```

The same measures for multidimensional poverty:

```{code-cell} ipython3
ineq_mpi = geo.inequality(mpi, "sdg1_2_mpi", measures=("gini", "theil", "cv"))
print(ineq_mpi.interpret())
geo.describe(mpi, "sdg1_2_mpi")[["label", "year", "mean", "std"]]
```

And the coefficient of variation of each goal index:

```{code-cell} ipython3
cv = pd.concat([geo.inequality(goals, f"index_sdg{g}", measures=("cv",), lorenz=False).summary
                .assign(goal=f"SDG {g}") for g in GOALS])
cv = cv[["goal", "first", "last", "change"]].rename(columns={"first": "CV 2012", "last": "CV 2024"})
print(f"Goals whose coefficient of variation fell: {(cv['change'] < 0).sum()} of {len(cv)}")
cv.sort_values("change").round(3)
```

- **The gaps in the IDS narrowed** on every measure: the standard deviation fell from 5.82 to 5.26 points, the coefficient of variation from 0.116 to 0.088, the Gini from 0.065 to 0.049 and the Theil from 0.0066 to 0.0038. The Lorenz curves of both periods lie close to the line of equality: the index differs little between units in relative terms.
- **Departments ended closer together too.** The part of the Theil index that lies between departments fell from 20% to 15%: most of the differences are between municipalities of the same department, and more so in 2024.
- **Poverty narrowed in absolute terms but widened in relative terms**: the standard deviation of the MPI fell from 0.106 to 0.044, but its coefficient of variation rose from 0.450 to 0.696 and its Gini from 0.254 to 0.367. As poverty approaches zero in most units, what remains is increasingly concentrated in a few: the tenth of the units with the highest values holds 25% of the total in 2024, against 19% in 2012.
- **Eleven of the 15 goal indices became less dispersed** (relative to their means), most of all SDG 9 (0.496 to 0.196) and SDG 1 (0.493 to 0.285). Dispersion rose slightly in SDG 13, 15, 16 and 17.

+++

## 5. Rank mobility

`geo.rank_mobility` ranks the 343 units by their IDS in each period (1 = highest) and compares the two rankings. Units with the same value share a rank, so these ranks can differ by a few places from the Atlas's own ranking (`rank_sdg`).

```{code-cell} ipython3
rank = geo.rank_mobility(ids, "index_sdg")
rank
```

```{code-cell} ipython3
moves = rank.df["rank_change"].abs()
print(f"{(moves > 50).sum()} units moved more than 50 places, {(moves <= 10).sum()} at most 10")
for label, table in [("climbers", rank.climbers), ("fallers", rank.fallers)]:
    counts = geo.add_names(table, groups=["department"])["department"].value_counts()
    print(f"Ten largest {label} by department:", counts.to_dict())
rank.gt
```

The quintile transition matrix: rows are the IDS quintile in 2012 (Q1 = lowest), columns the quintile in 2024, and each cell the share of the row's units.

```{code-cell} ipython3
rank.fig_matrix.show()
rank.matrix.round(2)
```

- **The ordering is persistent but far from fixed.** The Spearman correlation of the two rankings is 0.84. The median unit moved 29 places (mean 40); 93 units moved more than 50 places and 81 at most 10.
- **Climbers** are the large gainers of section 2, which started near the bottom: Cruz de Machacamarca rose from 315th to 90th (+225 places), Carangas from 304th to 100th, Sicaya from 318th to 153rd; four of the ten largest climbers are in Oruro and two each in Cochabamba and Pando.
- **Fallers** are mostly in Santa Cruz (seven of the ten largest falls): San José de Chiquitos fell from 42nd to 283rd (−241), and Puerto Suárez and Roboré, both in the top 52 in 2012, fell more than 130 places. A small gain is a large fall in rank when nearly everyone else gained about ten points.
- **Quintiles.** 56% of the units are in the same IDS quintile in both periods. Persistence is highest at the extremes: 67% of the bottom quintile and 77% of the top quintile stay there, against 37% to 51% in the middle quintiles.

+++

## 6. Spatial dynamics

### Global spatial autocorrelation

`geo.moran` computes Moran's I with queen contiguity weights, which it builds from the boundaries (Coipasa, which touches no other unit, is joined to its nearest neighbour). With `year="all"` it gives the statistic in every period of the panel:

```{code-cell} ipython3
geo.moran(ids, "index_sdg", year="all").df
```

For the change, it takes the table of changes:

```{code-cell} ipython3
geo.moran(chg, "index_sdg_change")
```

### Where progress clustered: LISA of the change

Local Moran statistics (`geo.lisa`: 999 permutations, 5% level) classify each unit: **High-High** units gained much and are surrounded by units that gained much; **Low-Low** units gained little among neighbours that gained little; High-Low and Low-High are outliers.

```{code-cell} ipython3
lisa = geo.lisa(chg, "index_sdg_change")
lisa
```

```{code-cell} ipython3
clusters = lisa.df[["geo_id", "cluster"]].merge(chg, on="geo_id")
print(clusters.groupby("cluster")[["index_sdg_2012", "index_sdg_change"]].mean().round(1))

main = clusters[clusters["cluster"].isin(["High-High", "Low-Low"])]
main.groupby(["cluster", "department"], as_index=False).agg(
    units=("geo_id", "size"), mean_change=("index_sdg_change", "mean"),
    mean_ids_2012=("index_sdg_2012", "mean")).round(1)
```

```{code-cell} ipython3
for cl in ["High-High", "Low-Low"]:
    part = main[main["cluster"] == cl].sort_values("index_sdg_change", ascending=cl == "Low-Low")
    units = zip(part["name"], part["department"], part["index_sdg_change"])
    print(f"{cl}: " + ", ".join(f"{n} ({d}, {c:+.1f})" for n, d, c in units), "\n")
```

### Did the clusters of the level persist?

`geo.lisa_transitions` runs the local statistics on the IDS itself in both periods and counts how the units moved between the cluster types.

```{code-cell} ipython3
trans = geo.lisa_transitions(ids, "index_sdg")
trans
```

```{code-cell} ipython3
trans.fig_map
```

```{code-cell} ipython3
types = geo.add_names(trans.df, groups=["department"])
pd.concat({y: types[types[f"cluster_{y}"].isin(["High-High", "Low-Low"])]
           .groupby(["department", f"cluster_{y}"]).size().unstack(fill_value=0)
           for y in [2012, 2024]}, axis=1).fillna(0).astype(int)
```

- **Levels are clustered, and slightly more so in 2024**: Moran's I is 0.432 in 2012 and 0.468 in 2024 (both with a pseudo p-value of 0.001). The narrowing of the gaps did not weaken the spatial pattern.
- **Progress itself is clustered** (I = 0.223, pseudo p = 0.001), though less than the levels: neighbours tended to advance at similar speeds.
- **Hot spots of progress** (21 High-High units) form a few groups: the La Paz altiplano around El Alto (El Alto, Viacha, Laja, Achocalla, Tiahuanacu, Huatajata, Jesús de Machaka, Sapahaqui, Achacachi), the valleys of Cochabamba and Chuquisaca (Totora, Aiquile, Omereque, Pocona, Presto, Sucre), the far north (Sena, Puerto Rico and Ingavi in Pando; Guayaramerín and Magdalena in Beni) and Sabaya on the Oruro altiplano. They gained 10.1 to 14.8 points.
- **Cold spots** (27 Low-Low units) are almost all in **Santa Cruz** (22): the Chiquitania and the border with Brazil (San José de Chiquitos, Roboré, Puerto Suárez, Puerto Quijarro, San Matías, San Ignacio de Velasco, Concepción), the city of Santa Cruz de la Sierra and the Santa Cruz valleys (Samaipata, Pampagrande, Quirusillas, Trigal, Postrervalle), and Charagua and Cuevo in the Chaco. Two are in Tarija, two in Potosí (Llallagua and Chayanta) and one in Beni (San Borja).
- The cold spots started *above* the hot spots (mean IDS in 2012: 54.2 against 50.3) and gained about half as much (6.4 against 12.2 points): the spatial pattern of progress is, in large part, convergence seen on the map.
- **The clusters of the level persisted, and the high ones grew.** 275 of the 343 units (80%) are of the same type in both periods. Of the 46 High-High units of 2012, 39 are still High-High in 2024, and 17 units that were not significant joined them, for a total of 60. Santa Cruz has fewer of them (23 to 17), while La Paz (2 to 12) and Cochabamba (10 to 14) have more. Of the 44 Low-Low units of 2012, 30 are still Low-Low in 2024; they stay concentrated in Potosí, La Paz and Oruro.

+++

## 7. Takeaways

- **Broad progress.** Between about 2012 and 2024 the Sustainable Development Index rose in 342 of Bolivia's 343 municipalities and indigenous autonomies, by 10.0 points on average (population-weighted, 57.8 to 66.8). Only San José de Chiquitos fell.
- **Driven by infrastructure, education, work and poverty.** SDG 9 (+30.4), SDG 4 (+21.5), SDG 8 (+18.8) and SDG 1 (+17.8) advanced most. Climate action retreated (−7.8), with more families affected by extreme events and more emissions from fires, and zero hunger and life on land stood still.
- **Convergence.** Units that started lower gained more (correlation of the initial IDS with its change −0.43; β = −0.029, half-life about 20 years), and the gaps in the IDS narrowed (Gini 0.065 to 0.049). Multidimensional poverty fell everywhere and fell most, in points, where it was highest, but relative gaps in poverty widened (Gini 0.254 to 0.367).
- **Persistent ordering, with mobility.** Ranks correlate at 0.84 and 56% of the units stay in their quintile; the Oruro altiplano climbed most and the Chiquitania of Santa Cruz fell most.
- **Geography of progress.** Levels and changes are spatially clustered (Moran's I 0.47 for the 2024 IDS, 0.22 for the change). Progress concentrated around El Alto, in the Cochabamba–Chuquisaca valleys and in the north, and lagged in eastern Santa Cruz.
- **Caveats.** Two nominal periods, each mixing indicators of different reference years; indices rescaled between fixed bounds, so a goal's change depends on those bounds; associations, not causal effects.

Related notebooks: [`eda`](https://colab.research.google.com/github/quarcs-lab/gdo4bolivia/blob/main/notebooks/eda.ipynb) (multidimensional poverty in both censuses), [`esda`](https://colab.research.google.com/github/quarcs-lab/gdo4bolivia/blob/main/notebooks/esda.ipynb) (spatial clustering) and [`embeddings_mpi_ml`](https://colab.research.google.com/github/quarcs-lab/gdo4bolivia/blob/main/notebooks/embeddings_mpi_ml.ipynb) (predicting poverty from satellite embeddings). The methods are documented, with examples, in the package's [function reference](https://quarcs-lab.github.io/geo4bolivia/reference/).
