// Site content: constants, every indicator, tool, project, insight and event, the team and the citation.
// Plain data (no JSX): the app renders it and site/build.mjs pre-renders a page for every item.
// ====================================================================
// Site constants
// ====================================================================
export const SITE_URL = 'https://quarcs-lab.github.io/gdo4bolivia/';
export const REPO_URL = 'https://github.com/quarcs-lab/gdo4bolivia';
// The geo4bolivia Python package lives in its own repository, with its own documentation site
// (get started, articles and the function reference); REPO_URL is the observatory's (data, notebooks)
export const PACKAGE_DOCS_URL = 'https://quarcs-lab.github.io/geo4bolivia/';
export const PACKAGE_REPO_URL = 'https://github.com/quarcs-lab/geo4bolivia';
export const PACKAGE_COLAB_URL = 'https://colab.research.google.com/github/quarcs-lab/geo4bolivia/blob/main/notebooks/get-started.ipynb';
export const RAW_URL = 'https://raw.githubusercontent.com/quarcs-lab/gdo4bolivia/main/';
export const COLAB_URL = 'https://colab.research.google.com/github/quarcs-lab/gdo4bolivia/blob/main/notebooks/';
export const COLAB_EMPTY = 'https://colab.research.google.com/notebooks/empty.ipynb';
export const DEFAULT_TITLE = 'GeoDevelopment Observatory of Bolivia | GDO-Bolivia';
export const SITE_NAME = 'GeoDevelopment Observatory of Bolivia';
export const SHORT_NAME = 'GDO-Bolivia';
export const SITE_DESCRIPTION = 'GDO-Bolivia is a public-access platform of subnational indicators, notebooks, web apps, research projects and insights for monitoring sustainable regional development in Bolivia with satellite data and AI.';
// Authors of the observatory's own citations (the site's, and each dataset's on its page)
export const CITE_AUTHORS = { apa: 'Mendez, C.', bibtex: 'Mendez, Carlos' };
// Center and zoom of the interactive indicator maps
export const MAP_VIEW = { center: [-16.3, -64.6], zoom: 5 };
// Retired pages ("<section>/<id>") and the page that replaced each one: another page of this site
// ("<section>/<id>") or, for a page that left the site, a full URL. Version 0.4 moved to the
// 343-unit municipal map of the SDG Atlas 2026 (page ids municipalities339-* -> municipalities343-*);
// the package's function reference moved to the package's own documentation site.
export const REDIRECTS = {
  'tools/geo4bolivia-reference': PACKAGE_DOCS_URL + 'reference/',
  'indicators/municipalities339-sdg': 'indicators/municipalities343-sdg',   // the combined SDG page of 0.2
  'indicators/municipalities339-ntl': 'indicators/municipalities343-ntl',
  'indicators/municipalities339-pop': 'indicators/municipalities343-pop',
  'indicators/municipalities339-emb': 'indicators/municipalities343-emb',
  'indicators/municipalities339-sdg01': 'indicators/municipalities343-sdg01',
  'indicators/municipalities339-sdg02': 'indicators/municipalities343-sdg02',
  'indicators/municipalities339-sdg03': 'indicators/municipalities343-sdg03',
  'indicators/municipalities339-sdg04': 'indicators/municipalities343-sdg04',
  'indicators/municipalities339-sdg05': 'indicators/municipalities343-sdg05',
  'indicators/municipalities339-sdg06': 'indicators/municipalities343-sdg06',
  'indicators/municipalities339-sdg07': 'indicators/municipalities343-sdg07',
  'indicators/municipalities339-sdg08': 'indicators/municipalities343-sdg08',
  'indicators/municipalities339-sdg09': 'indicators/municipalities343-sdg09',
  'indicators/municipalities339-sdg10': 'indicators/municipalities343-sdg10',
  'indicators/municipalities339-sdg11': 'indicators/municipalities343-sdg11',
  'indicators/municipalities339-sdg13': 'indicators/municipalities343-sdg13',
  'indicators/municipalities339-sdg15': 'indicators/municipalities343-sdg15',
  'indicators/municipalities339-sdg16': 'indicators/municipalities343-sdg16',
  'indicators/municipalities339-sdg17': 'indicators/municipalities343-sdg17',
};

// ====================================================================
// Content registry: every indicator, tool, insight and event
// ====================================================================
// Every code box runs as-is in Google Colab: the first line installs what Colab lacks.
export const PYTHON_SETUP = `!pip install -q geo4bolivia
import geo4bolivia as geo
import plotly.express as px`;

// ====================================================================
// The three Python packages: geo4bolivia for the fundamentals, two companions for specialised methods
// ====================================================================
// The cards of the packages panel (home page and every package page): where to start, where to go further
export const PACKAGE_WORKFLOW = [
  { id: 'geo4bolivia-package', name: 'geo4bolivia', role: 'Find, load, map and analyse the data', flagship: true,
    text: 'The place to start, and often all you need. Search the variables and load any indicator as a labelled panel with names and boundaries, then map it and run the fundamental analyses in one call each: spatial dependence, convergence, transitions, inequality, regression, panel and spatial models, and MGWR. Every result comes with an interactive figure and a reading in words.',
    fns: ['search', 'load', 'map', 'lisa', 'beta_convergence', 'inequality', 'spatial_model', 'mgwr'] },
  { id: 'expdpy-package', name: 'expdpy', role: 'Specialised methods for panels',
    text: 'A companion for specialised panel methods beyond geo4bolivia’s own: how much of the variation lies between or within units, correlated random effects, instrumental variables, event studies and robust inference. geo.for_expdpy() hands it any panel, labelled.',
    fns: ['explore_xtsum_table', 'analyze_cre_table', 'analyze_iv_regression', 'analyze_event_study'] },
  { id: 'geometrics-package', name: 'geometrics', role: 'Specialised methods for space',
    text: 'A companion for specialised spatial methods beyond geo4bolivia’s own: whether a spatial model’s spillovers survive a change of weights matrix, and teaching sandboxes that simulate each concept from a known truth. geo.for_geometrics() hands it any panel with its boundaries.',
    fns: ['analyze_spatial_model_by_weights', 'learn_spatial_spillovers', 'learn_omitted_spatial_lag', 'learn_spatial_weights'] },
];

// One question: did Bolivia's municipalities converge in sustainable development between ~2012 and
// ~2024? geo4bolivia answers it alone; each companion then adds one specialised step
// (notebooks/three_packages.ipynb works it through)
export const THREE_PACKAGES_EXAMPLE = `!pip install -q geo4bolivia expdpy geometrics
import geo4bolivia as geo
import expdpy as ex
import geometrics as gm

# 1. geo4bolivia answers the question on its own
ids = geo.load("sdg", variables="index_sdg",
               groups=["department"])          # 343 units, ~2012 and ~2024
geo.map(ids, "index_sdg", year=[2012, 2024],
        scheme="fisher_jenks").show()          # both periods, common classes
beta = geo.beta_convergence(ids, "index_sdg")  # did the laggards gain more?
print(beta.interpret())
beta.fig.show()
print(geo.inequality(ids, "index_sdg").interpret())   # did the gaps narrow?
lisa = geo.lisa(ids, "index_sdg", year=2024)   # where do highs and lows cluster?
print(lisa.interpret())
lisa.fig.show()                                # scatterplot and cluster map, side by side

# 2. expdpy goes further with panels: variation between and within units
df, df_def = geo.for_expdpy(ids)
df = ex.set_labels(df, df_def, set_panel=True)
xt = ex.explore_xtsum_table(df, var=["index_sdg"])
print(xt.interpret())
display(xt.gt)

# 3. geometrics goes further with space: does the answer depend on who
#    counts as a neighbour? The same spatial model under seven weights
chg = geo.change(ids, "index_sdg").assign(year=2024)   # one row per unit
cols = ["geo_id", "year", "index_sdg_2012", "index_sdg_change"]
gdf, sp, sp_dict = geo.for_geometrics(chg[cols], labels=geo.labels(chg))
sp = gm.set_labels(sp, sp_dict, set_panel=True)
rob = gm.analyze_spatial_model_by_weights(
    sp, "index_sdg_change", ["index_sdg_2012"], gdf=gdf, model="lag")
print(rob.interpret())
rob.fig`;

export const CONTENT_REGISTRY = [
  // ---------------------------------------------------------------- Indicators
  {
    id: 'municipalities343-sdg', type: 'indicator', section: 'indicators',
    title: "Sustainable Development Index (IDS)",
    scope: "343 municipalities · 81 indicators of 15 SDGs in one index · ~2012 and ~2024",
    summary: "The Sustainable Development Index (IDS) of the SDG Atlas of Bolivia 2026, which summarises 81 indicators of 15 goals, and its national ranking, for every municipality near 2012 and near 2024.",
    description: "The Sustainable Development Index (IDS, Índice de Desarrollo Sostenible) of the Atlas de los ODS en Bolivia 2026 (Andersen and Argandoña, SDSN Bolivia) for Bolivia's 343 municipalities and indigenous autonomies (GAIOC), near the 2012 census and near the 2024 census, with its national ranking. The IDS summarises 81 indicators of 15 Sustainable Development Goals (all but SDG 12 and 14): each indicator is rescaled between a worst and a best value set by the Atlas (0 = worst, 100 = target met), each goal index is the mean of its rescaled indicators, and the IDS is the simple mean of the 15 goal indices, following the global SDG Index of SDSN. Between the two periods the median IDS went from 49.6 to 59.8; it rose in 342 of the 343 units, and the units that started lowest gained the most, a process of territorial convergence. The census population of 2012 and 2024 and the 2024 urbanization rate are included as context and as weights. The goal indices and their indicators are in the fifteen goal datasets, sdg01 to sdg17.",
    geography: 'Municipality', units: 343, period: '~2012 and ~2024', frequency: 'Two periods (initial ~2012, final ~2024)', key: 'geo_id', idExample: 'BO-04-17-04',
    categories: ["Social", "Economy", "Environment", "Institutions"], tags: ["SDGs", "SDG Atlas 2026", "sustainable development", "convergence", "ranking"],
    image: 'images/indicators/sdg.webp',
    imageAlt: "Map of the Sustainable Development Index, IDS (0-100) near 2024 across Bolivia's 343 municipalities and indigenous autonomies in three natural-break classes: High 60.5 – 77.3 (151); Middle 51.7 – 60.5 (173); Low 37.2 – 51.7 (19). Highest: Nuestra Señora de La Paz, Tarija and Sucre.",
    mapAlt: "Two maps of the Sustainable Development Index, IDS (0-100) near 2012 and near 2024 across Bolivia's 343 municipalities and indigenous autonomies, in three natural-break classes shared by both periods. Legend: High 60.5 – 77.3 (21 units near 2012, 151 near 2024); Middle 51.7 – 60.5 (93 units near 2012, 173 near 2024); Low 37.2 – 51.7 (229 units near 2012, 19 near 2024). Highest near 2024: Nuestra Señora de La Paz, Tarija and Sucre.",
    map: 'images/indicators/sdg-map.webp',
    date: '2026-11-17', pinned: true, dataset: 'sdg',
    notice: "Both periods are stored at nominal years: 2012 holds the Atlas's initial values (~2012) and 2024 its final values (~2024). Each indicator's actual reference years (e.g. 2008 and 2023 for the health survey, three-year averages for volatile indicators) are listed in its description under Variables. The four indigenous autonomies and municipalities created after 2012 have values in both periods.",
    code: {
      python: `${PYTHON_SETUP}

# The Sustainable Development Index (0-100, higher is better), ~2024
gdf = geo.load("sdg", variables="index_sdg", years=2024, geometry=True)
px.choropleth_map(gdf, geojson=gdf.geometry, locations=gdf.index,
          color="index_sdg", hover_name="name",
          center={"lat": -16.3, "lon": -64}, zoom=4,
          labels={"index_sdg": "Sustainable Development Index (0-100)"},
          title="Sustainable Development Index (IDS), ~2024").show()

# Convergence: units that started lower gained more
df = geo.load("sdg", variables="index_sdg")
wide = df.pivot(index="geo_id", columns="year", values="index_sdg")
wide = wide.add_prefix("y")
wide["change"] = wide["y2024"] - wide["y2012"]
wide["name"] = geo.units("municipality").set_index("geo_id")["name"]
px.scatter(wide, x="y2012", y="change", hover_name="name",
           labels={"y2012": "IDS, ~2012", "change": "Change in the IDS (points)"},
           title="Initial IDS and its change, ~2012 to ~2024")`,
      pandas: `import pandas as pd
import geopandas as gpd
import plotly.express as px

# No geo4bolivia needed: every file is a plain URL
BASE = "${RAW_URL}"
df = pd.read_csv(BASE + "data/municipality/sdg.csv")  # geo_id, year, index_sdg, ...
municipalities = gpd.read_file(BASE + "geo/boundaries/municipality.geojson")

ids = df.loc[df["year"] == 2024, ["geo_id", "index_sdg", "rank_sdg"]]
gdf = municipalities.merge(ids, on="geo_id")
px.choropleth_map(gdf, geojson=gdf.geometry, locations=gdf.index,
          color="index_sdg", hover_name="name",
          center={"lat": -16.3, "lon": -64}, zoom=4,
          labels={"index_sdg": "Sustainable Development Index (0-100)"},
          title="Sustainable Development Index (IDS), ~2024")`,
    },
    examples: [
      {
        title: "Which goals moved",
        text: "Averages each of the 15 goal indices over the municipalities in the two periods: the goals that advanced most and the ones that went back.",
        code: `${PYTHON_SETUP}
import pandas as pd

goals = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 15, 16, 17]
rows = []
for g in goals:
    df = geo.load(f"sdg{g:02d}", variables=f"index_sdg{g}")
    for year, part in df.groupby("year"):
        rows.append({"goal": f"SDG {g}", "period": f"~{year}",
                     "index": part[f"index_sdg{g}"].mean()})
px.scatter(pd.DataFrame(rows), x="index", y="goal", color="period",
           labels={"index": "Mean goal index (0-100)", "goal": ""},
           title="The 15 goal indices, ~2012 and ~2024")`,
      },
      {
        title: "Ranking mobility",
        text: "Plots each unit's national rank in the two periods: units above the diagonal fell in the ranking, units below it climbed.",
        code: `${PYTHON_SETUP}

df = geo.load("sdg", variables="rank_sdg")
wide = df.pivot(index="geo_id", columns="year", values="rank_sdg")
wide = wide.add_prefix("y")
wide["name"] = geo.units("municipality").set_index("geo_id")["name"]
px.scatter(wide, x="y2012", y="y2024", hover_name="name",
           labels={"y2012": "Rank ~2012 (1 = best)", "y2024": "Rank ~2024"},
           title="IDS national ranking, ~2012 and ~2024")`,
      },
      {
        title: "Rank the departments",
        text: "Averages the IDS within each department, weighting municipalities by their census population, in both periods.",
        code: `${PYTHON_SETUP}

df = geo.load("sdg")
dep = geo.aggregate(df, to="department", variables=["index_sdg"],
                    rules={"index_sdg": "weighted_mean:population"})
dep["department"] = dep["geo_id"].map(
    geo.units("department").set_index("geo_id")["name"])
dep["period"] = "~" + dep["year"].astype(str)
px.scatter(dep.sort_values("index_sdg"), x="index_sdg", y="department",
           color="period",
           labels={"index_sdg": "IDS (population-weighted)"},
           title="Sustainable Development Index by department")`,
      },
      {
        title: "Where progress reached most people",
        text: "Multiplies each unit's gain in the IDS by its 2024 population, the Atlas's “massive progress” measure: big cities lead even where their gains were moderate.",
        code: `${PYTHON_SETUP}

df = geo.load("sdg")
wide = df.pivot(index="geo_id", columns="year", values=["index_sdg", "population"])
gain = wide[("index_sdg", 2024)] - wide[("index_sdg", 2012)]
out = (gain * wide[("population", 2024)]).rename("points").reset_index()
names = geo.units("municipality").set_index("geo_id")["name"]
out["name"] = out["geo_id"].map(names)
px.bar(out.nlargest(12, "points"), x="points", y="name",
       labels={"points": "Gain in the IDS × population 2024", "name": ""},
       title="Units with the largest population-weighted progress")`,
      },
    ],
  },
  {
    id: 'municipalities343-sdg01', type: 'indicator', section: 'indicators',
    title: "SDG 1: No poverty",
    scope: "343 municipalities · 4 indicators and the SDG 1 index · ~2012 and ~2024",
    summary: "The SDG 1 (No poverty) index of the SDG Atlas of Bolivia 2026 and its 4 indicators, multidimensional poverty, unsatisfied basic needs, energy poverty and access to the three basic services, for every municipality near 2012 and near 2024.",
    description: "The SDG 1 (No poverty) index of the Atlas de los ODS en Bolivia 2026 (Andersen and Argandoña, SDSN Bolivia) for Bolivia's 343 municipalities and indigenous autonomies (GAIOC), with the 4 indicators behind it: multidimensional poverty index (0-1) (2012 and 2024); energy poverty (% of dwellings) (2016 and 2024); unsatisfied basic needs (% of population) (2012 and 2024); access to the 3 basic services (% of households) (2012 and 2024). Every indicator is measured twice, near the 2012 census and near the 2024 census, and the observatory stores the two values as 2012 and 2024 so that their change can be studied. The index runs from 0 (worst situation) to 100 (targets met): each indicator is rescaled linearly between a worst and a best value set by the Atlas, capped, so that higher is always better, and the index is the simple mean of the available rescaled indicators. Between the two periods the median index went from 32.8 to 53.9, and it rose in 340 of the 343 units.",
    geography: 'Municipality', units: 343, period: '~2012 and ~2024', frequency: 'Two periods (initial ~2012, final ~2024)', key: 'geo_id', idExample: 'BO-04-17-04',
    categories: ["Social"], tags: ["SDGs", "SDG Atlas 2026", "poverty", "multidimensional poverty", "basic services"],
    image: 'images/indicators/sdg01.webp',
    imageAlt: "Map of the No poverty index (0-100) near 2024 across Bolivia's 343 municipalities and indigenous autonomies in three natural-break classes: High 55.9 – 91.7 (155); Middle 34.1 – 55.9 (152); Low 0.7 – 34.1 (36). Highest: Nuestra Señora de La Paz, Bermejo and Colcapirhua.",
    mapAlt: "Two maps of the No poverty index (0-100) near 2012 and near 2024 across Bolivia's 343 municipalities and indigenous autonomies, in three natural-break classes shared by both periods. Legend: High 55.9 – 91.7 (55 units near 2012, 155 near 2024); Middle 34.1 – 55.9 (107 units near 2012, 152 near 2024); Low 0.7 – 34.1 (181 units near 2012, 36 near 2024). Highest near 2024: Nuestra Señora de La Paz, Bermejo and Colcapirhua.",
    map: 'images/indicators/sdg01-map.webp',
    date: '2026-11-17', pinned: true, dataset: 'sdg01',
    notice: "Both periods are stored at nominal years: 2012 holds the Atlas's initial values (~2012) and 2024 its final values (~2024). Each indicator's actual reference years (e.g. 2008 and 2023 for the health survey, three-year averages for volatile indicators) are listed in its description under Variables. The four indigenous autonomies and municipalities created after 2012 have values in both periods.",
    code: {
      python: `${PYTHON_SETUP}

# The SDG 1 index (0-100, higher is better), ~2024
gdf = geo.load("sdg01", variables="index_sdg1", years=2024, geometry=True)
px.choropleth_map(gdf, geojson=gdf.geometry, locations=gdf.index,
          color="index_sdg1", hover_name="name",
          center={"lat": -16.3, "lon": -64}, zoom=4,
          labels={"index_sdg1": "No poverty index (0-100)"},
          title="SDG 1: No poverty index, ~2024").show()

# The two periods: initial (~2012) and final (~2024) values
df = geo.load("sdg01", variables="index_sdg1")
wide = df.pivot(index="geo_id", columns="year", values="index_sdg1")
wide = wide.add_prefix("y")
wide["name"] = geo.units("municipality").set_index("geo_id")["name"]
px.scatter(wide, x="y2012", y="y2024", hover_name="name",
           labels={"y2012": "Index, ~2012", "y2024": "Index, ~2024"},
           title="SDG 1: No poverty index, ~2012 and ~2024")`,
      pandas: `import pandas as pd
import geopandas as gpd
import plotly.express as px

# No geo4bolivia needed: every file is a plain URL
BASE = "${RAW_URL}"
df = pd.read_csv(BASE + "data/municipality/sdg01.csv")  # geo_id, year, mun_id, ...
municipalities = gpd.read_file(BASE + "geo/boundaries/municipality.geojson")

index = df.loc[df["year"] == 2024, ["geo_id", "index_sdg1"]]
gdf = municipalities.merge(index, on="geo_id")
px.choropleth_map(gdf, geojson=gdf.geometry, locations=gdf.index,
          color="index_sdg1", hover_name="name",
          center={"lat": -16.3, "lon": -64}, zoom=4,
          labels={"index_sdg1": "No poverty index (0-100)"},
          title="SDG 1: No poverty index, ~2024")`,
    },
    examples: [
      {
        title: "Map the change, ~2012 to ~2024",
        text: "Subtracts the initial index from the final one: positive values mark the municipalities that moved closer to the goal's targets.",
        code: `${PYTHON_SETUP}

df = geo.load("sdg01", variables="index_sdg1")
wide = df.pivot(index="geo_id", columns="year", values="index_sdg1")
wide["change"] = wide[2024] - wide[2012]
gdf = geo.boundaries("municipality").merge(wide["change"].reset_index(),
                                           on="geo_id")
px.choropleth_map(gdf, geojson=gdf.geometry, locations=gdf.index,
          color="change", hover_name="name",
          center={"lat": -16.3, "lon": -64}, zoom=4,
          labels={"change": "Change in the index (points)"},
          title="SDG 1: change in the index, ~2012 to ~2024")`,
      },
      {
        title: "Recompute the index from its indicators",
        text: "Rescales each indicator between the Atlas's worst and best values (Cuadro 21), caps it to 0-100 and averages the available ones, which reproduces the published index.",
        code: `${PYTHON_SETUP}
import pandas as pd

df = geo.load("sdg01", years=2024).set_index("geo_id")
bounds = {"sdg1_2_mpi": (0.563, 0), "sdg1_4_eep": (100, 0), "sdg1_4_nbi": (100, 0),
          "sdg1_4_ssb": (0, 100)}  # (worst, best)
scores = pd.DataFrame({v: 100 * (df[v] - w) / (b - w)
                       for v, (w, b) in bounds.items()}).clip(0, 100)
df["computed"] = scores.mean(axis=1)  # skips missing indicators
df["name"] = geo.units("municipality").set_index("geo_id")["name"]
px.scatter(df, x="computed", y="index_sdg1", hover_name="name",
           labels={"computed": "Computed from the indicators",
                   "index_sdg1": "No poverty index (0-100)"},
           title="Recomputed vs published SDG 1 index, ~2024")`,
      },
      {
        title: "Which indicators moved",
        text: "Compares the mean rescaled score (0-100) of each indicator in the two periods: the gap between the dots is the progress, and the lowest dots are where the goal is furthest away.",
        code: `${PYTHON_SETUP}
import pandas as pd

df = geo.load("sdg01")
bounds = {"sdg1_2_mpi": (0.563, 0), "sdg1_4_eep": (100, 0), "sdg1_4_nbi": (100, 0),
          "sdg1_4_ssb": (0, 100)}  # (worst, best)
labels = geo.dictionary("sdg01").set_index("variable")["label"]
rows = [{"indicator": labels[v], "period": f"~{year}",
         "score": (100 * (part[v] - w) / (b - w)).clip(0, 100).mean()}
        for year, part in df.groupby("year") for v, (w, b) in bounds.items()]
px.scatter(pd.DataFrame(rows), x="score", y="indicator", color="period",
           labels={"score": "Mean rescaled score (0-100)", "indicator": ""},
           title="SDG 1 indicators, ~2012 and ~2024")`,
      },
      {
        title: "Rank the departments",
        text: "Averages the index within each department, weighting municipalities by their census population, in both periods.",
        code: `${PYTHON_SETUP}

df = geo.load("sdg01", variables="index_sdg1")
dep = geo.aggregate(df, to="department",
                    rules={"index_sdg1": "weighted_mean:population"},
                    weights=geo.load("sdg", variables="population"))
dep["department"] = dep["geo_id"].map(
    geo.units("department").set_index("geo_id")["name"])
dep["period"] = "~" + dep["year"].astype(str)
px.scatter(dep.sort_values("index_sdg1"), x="index_sdg1", y="department",
           color="period",
           labels={"index_sdg1": "Index (population-weighted)"},
           title="SDG 1 index by department, ~2012 and ~2024")`,
      },
      {
        title: "Poverty and night-time lights",
        text: "Links multidimensional poverty near 2012 with the trend of night-time lights per capita in 2012 from the observatory's ntl dataset (333 municipalities whose territory did not change).",
        code: `${PYTHON_SETUP}

mpi = geo.load("sdg01", variables="sdg1_2_mpi", years=2012)
ntl = geo.load("ntl", variables="ln_t400NTLpc", years=2012)
df = mpi.merge(ntl, on=["geo_id", "year"])
df["name"] = df["geo_id"].map(geo.units("municipality").set_index("geo_id")["name"])
px.scatter(df, x="ln_t400NTLpc", y="sdg1_2_mpi", hover_name="name",
           labels={"ln_t400NTLpc": "Log night-time lights per capita (trend)",
                   "sdg1_2_mpi": "Multidimensional poverty index"},
           title="Poverty and night-time lights, 2012")`,
      },
    ],
  },
  {
    id: 'municipalities343-sdg02', type: 'indicator', section: 'indicators',
    title: "SDG 2: Zero hunger",
    scope: "343 municipalities · 7 indicators and the SDG 2 index · ~2012 and ~2024",
    summary: "The SDG 2 (Zero hunger) index of the SDG Atlas of Bolivia 2026 and its 7 indicators, stunting and overweight in children, obesity and anaemia in women, and agricultural production, yield and diversification, for every municipality near 2012 and near 2024.",
    description: "The SDG 2 (Zero hunger) index of the Atlas de los ODS en Bolivia 2026 (Andersen and Argandoña, SDSN Bolivia) for Bolivia's 343 municipalities and indigenous autonomies (GAIOC), with the 7 indicators behind it: obesity in women 15-49 (%) (2008 and 2023); chronic malnutrition in children under 5 (%) (2008 and 2023); overweight in children under 5 (%) (2008 and 2023); anaemia in women 15-49 (%) (2008 and 2023); agricultural production (t per person per year) (average 2013–2015 and average 2022–2024); agricultural yield (t per ha per year) (average 2013–2015 and average 2022–2024); agricultural diversification index (0-1) (average 2013–2015 and average 2022–2024). Every indicator is measured twice, near the 2012 census and near the 2024 census, and the observatory stores the two values as 2012 and 2024 so that their change can be studied. The index runs from 0 (worst situation) to 100 (targets met): each indicator is rescaled linearly between a worst and a best value set by the Atlas, capped, so that higher is always better, and the index is the simple mean of the available rescaled indicators. Between the two periods the median index went from 38.4 to 38.8, and it rose in 174 of the 343 units. Some indicators are missing for part of the units (Agricultural production (t per person per year), Agricultural yield (t per ha per year) and Agricultural diversification index (0-1)); the index averages the available ones.",
    geography: 'Municipality', units: 343, period: '~2012 and ~2024', frequency: 'Two periods (initial ~2012, final ~2024)', key: 'geo_id', idExample: 'BO-04-17-04',
    categories: ["Social", "Economy"], tags: ["SDGs", "SDG Atlas 2026", "hunger", "malnutrition", "agriculture"],
    image: 'images/indicators/sdg02.webp',
    imageAlt: "Map of the Zero hunger index (0-100) near 2024 across Bolivia's 343 municipalities and indigenous autonomies in three natural-break classes: High 43.4 – 56.8 (74); Middle 35.6 – 43.4 (190); Low 20.8 – 35.6 (79). Highest: Alto Beni, Santa Rosa and Puerto Villarroel.",
    mapAlt: "Two maps of the Zero hunger index (0-100) near 2012 and near 2024 across Bolivia's 343 municipalities and indigenous autonomies, in three natural-break classes shared by both periods. Legend: High 43.4 – 56.8 (113 units near 2012, 74 near 2024); Middle 35.6 – 43.4 (113 units near 2012, 190 near 2024); Low 20.8 – 35.6 (117 units near 2012, 79 near 2024). Highest near 2024: Alto Beni, Santa Rosa and Puerto Villarroel.",
    map: 'images/indicators/sdg02-map.webp',
    date: '2026-11-17', pinned: false, dataset: 'sdg02',
    notice: "Both periods are stored at nominal years: 2012 holds the Atlas's initial values (~2012) and 2024 its final values (~2024). Each indicator's actual reference years (e.g. 2008 and 2023 for the health survey, three-year averages for volatile indicators) are listed in its description under Variables. The four indigenous autonomies and municipalities created after 2012 have values in both periods.",
    code: {
      python: `${PYTHON_SETUP}

# The SDG 2 index (0-100, higher is better), ~2024
gdf = geo.load("sdg02", variables="index_sdg2", years=2024, geometry=True)
px.choropleth_map(gdf, geojson=gdf.geometry, locations=gdf.index,
          color="index_sdg2", hover_name="name",
          center={"lat": -16.3, "lon": -64}, zoom=4,
          labels={"index_sdg2": "Zero hunger index (0-100)"},
          title="SDG 2: Zero hunger index, ~2024").show()

# The two periods: initial (~2012) and final (~2024) values
df = geo.load("sdg02", variables="index_sdg2")
wide = df.pivot(index="geo_id", columns="year", values="index_sdg2")
wide = wide.add_prefix("y")
wide["name"] = geo.units("municipality").set_index("geo_id")["name"]
px.scatter(wide, x="y2012", y="y2024", hover_name="name",
           labels={"y2012": "Index, ~2012", "y2024": "Index, ~2024"},
           title="SDG 2: Zero hunger index, ~2012 and ~2024")`,
      pandas: `import pandas as pd
import geopandas as gpd
import plotly.express as px

# No geo4bolivia needed: every file is a plain URL
BASE = "${RAW_URL}"
df = pd.read_csv(BASE + "data/municipality/sdg02.csv")  # geo_id, year, mun_id, ...
municipalities = gpd.read_file(BASE + "geo/boundaries/municipality.geojson")

index = df.loc[df["year"] == 2024, ["geo_id", "index_sdg2"]]
gdf = municipalities.merge(index, on="geo_id")
px.choropleth_map(gdf, geojson=gdf.geometry, locations=gdf.index,
          color="index_sdg2", hover_name="name",
          center={"lat": -16.3, "lon": -64}, zoom=4,
          labels={"index_sdg2": "Zero hunger index (0-100)"},
          title="SDG 2: Zero hunger index, ~2024")`,
    },
    examples: [
      {
        title: "Map the change, ~2012 to ~2024",
        text: "Subtracts the initial index from the final one: positive values mark the municipalities that moved closer to the goal's targets.",
        code: `${PYTHON_SETUP}

df = geo.load("sdg02", variables="index_sdg2")
wide = df.pivot(index="geo_id", columns="year", values="index_sdg2")
wide["change"] = wide[2024] - wide[2012]
gdf = geo.boundaries("municipality").merge(wide["change"].reset_index(),
                                           on="geo_id")
px.choropleth_map(gdf, geojson=gdf.geometry, locations=gdf.index,
          color="change", hover_name="name",
          center={"lat": -16.3, "lon": -64}, zoom=4,
          labels={"change": "Change in the index (points)"},
          title="SDG 2: change in the index, ~2012 to ~2024")`,
      },
      {
        title: "Recompute the index from its indicators",
        text: "Rescales each indicator between the Atlas's worst and best values (Cuadro 21), caps it to 0-100 and averages the available ones, which reproduces the published index.",
        code: `${PYTHON_SETUP}
import pandas as pd

df = geo.load("sdg02", years=2024).set_index("geo_id")
bounds = {"sdg2_2_smu": (38.2, 0), "sdg2_2_dcn": (50.2, 0), "sdg2_2_osn": (11.8, 0),
          "sdg2_2_pam": (70.4, 0), "sdg2_3_pac": (0, 6.3), "sdg2_3_rpa":
          (0, 7), "sdg2_5_idp": (0, 1)}  # (worst, best)
scores = pd.DataFrame({v: 100 * (df[v] - w) / (b - w)
                       for v, (w, b) in bounds.items()}).clip(0, 100)
df["computed"] = scores.mean(axis=1)  # skips missing indicators
df["name"] = geo.units("municipality").set_index("geo_id")["name"]
px.scatter(df, x="computed", y="index_sdg2", hover_name="name",
           labels={"computed": "Computed from the indicators",
                   "index_sdg2": "Zero hunger index (0-100)"},
           title="Recomputed vs published SDG 2 index, ~2024")`,
      },
      {
        title: "Which indicators moved",
        text: "Compares the mean rescaled score (0-100) of each indicator in the two periods: the gap between the dots is the progress, and the lowest dots are where the goal is furthest away.",
        code: `${PYTHON_SETUP}
import pandas as pd

df = geo.load("sdg02")
bounds = {"sdg2_2_smu": (38.2, 0), "sdg2_2_dcn": (50.2, 0), "sdg2_2_osn": (11.8, 0),
          "sdg2_2_pam": (70.4, 0), "sdg2_3_pac": (0, 6.3), "sdg2_3_rpa":
          (0, 7), "sdg2_5_idp": (0, 1)}  # (worst, best)
labels = geo.dictionary("sdg02").set_index("variable")["label"]
rows = [{"indicator": labels[v], "period": f"~{year}",
         "score": (100 * (part[v] - w) / (b - w)).clip(0, 100).mean()}
        for year, part in df.groupby("year") for v, (w, b) in bounds.items()]
px.scatter(pd.DataFrame(rows), x="score", y="indicator", color="period",
           labels={"score": "Mean rescaled score (0-100)", "indicator": ""},
           title="SDG 2 indicators, ~2012 and ~2024")`,
      },
      {
        title: "Rank the departments",
        text: "Averages the index within each department, weighting municipalities by their census population, in both periods.",
        code: `${PYTHON_SETUP}

df = geo.load("sdg02", variables="index_sdg2")
dep = geo.aggregate(df, to="department",
                    rules={"index_sdg2": "weighted_mean:population"},
                    weights=geo.load("sdg", variables="population"))
dep["department"] = dep["geo_id"].map(
    geo.units("department").set_index("geo_id")["name"])
dep["period"] = "~" + dep["year"].astype(str)
px.scatter(dep.sort_values("index_sdg2"), x="index_sdg2", y="department",
           color="period",
           labels={"index_sdg2": "Index (population-weighted)"},
           title="SDG 2 index by department, ~2012 and ~2024")`,
      },
    ],
  },
  {
    id: 'municipalities343-sdg03', type: 'indicator', section: 'indicators',
    title: "SDG 3: Good health and well-being",
    scope: "343 municipalities · 7 indicators and the SDG 3 index · ~2012 and ~2024",
    summary: "The SDG 3 (Good health and well-being) index of the SDG Atlas of Bolivia 2026 and its 7 indicators, skilled birth attendance, infant and under-5 mortality, HIV, tuberculosis and vector-borne diseases, and adolescent fertility, for every municipality near 2012 and near 2024.",
    description: "The SDG 3 (Good health and well-being) index of the Atlas de los ODS en Bolivia 2026 (Andersen and Argandoña, SDSN Bolivia) for Bolivia's 343 municipalities and indigenous autonomies (GAIOC), with the 7 indicators behind it: births attended by skilled health personnel (%) (2012 and 2024); infant mortality (per 1,000 live births) (2008 and 2023); under-5 mortality (per 1,000 live births) (2008 and 2023); HIV incidence (per million people) (average 2011–2013 and average 2022–2024); tuberculosis incidence (per 100,000 people) (average 2011–2013 and average 2022–2024); vector-borne disease index (0-1) (average 2011–2013 and average 2022–2024); mean parity of adolescent women 15-19 (children per woman) (2012 and 2024). Every indicator is measured twice, near the 2012 census and near the 2024 census, and the observatory stores the two values as 2012 and 2024 so that their change can be studied. The index runs from 0 (worst situation) to 100 (targets met): each indicator is rescaled linearly between a worst and a best value set by the Atlas, capped, so that higher is always better, and the index is the simple mean of the available rescaled indicators. Between the two periods the median index went from 65.6 to 81.2, and it rose in 312 of the 343 units.",
    geography: 'Municipality', units: 343, period: '~2012 and ~2024', frequency: 'Two periods (initial ~2012, final ~2024)', key: 'geo_id', idExample: 'BO-04-17-04',
    categories: ["Social"], tags: ["SDGs", "SDG Atlas 2026", "health", "child mortality", "infectious diseases"],
    image: 'images/indicators/sdg03.webp',
    imageAlt: "Map of the Good health and well-being index (0-100) near 2024 across Bolivia's 343 municipalities and indigenous autonomies in three natural-break classes: High 78.3 – 98.9 (207); Middle 64.6 – 78.3 (111); Low 43.6 – 64.6 (25). Highest: Villa Gualberto Villarroel, Carangas and Postrervalle.",
    mapAlt: "Two maps of the Good health and well-being index (0-100) near 2012 and near 2024 across Bolivia's 343 municipalities and indigenous autonomies, in three natural-break classes shared by both periods. Legend: High 78.3 – 98.9 (53 units near 2012, 207 near 2024); Middle 64.6 – 78.3 (128 units near 2012, 111 near 2024); Low 43.6 – 64.6 (162 units near 2012, 25 near 2024). Highest near 2024: Villa Gualberto Villarroel, Carangas and Postrervalle.",
    map: 'images/indicators/sdg03-map.webp',
    date: '2026-11-17', pinned: false, dataset: 'sdg03',
    notice: "Both periods are stored at nominal years: 2012 holds the Atlas's initial values (~2012) and 2024 its final values (~2024). Each indicator's actual reference years (e.g. 2008 and 2023 for the health survey, three-year averages for volatile indicators) are listed in its description under Variables. The four indigenous autonomies and municipalities created after 2012 have values in both periods.",
    code: {
      python: `${PYTHON_SETUP}

# The SDG 3 index (0-100, higher is better), ~2024
gdf = geo.load("sdg03", variables="index_sdg3", years=2024, geometry=True)
px.choropleth_map(gdf, geojson=gdf.geometry, locations=gdf.index,
          color="index_sdg3", hover_name="name",
          center={"lat": -16.3, "lon": -64}, zoom=4,
          labels={"index_sdg3": "Good health and well-being index (0-100)"},
          title="SDG 3: Good health and well-being index, ~2024").show()

# The two periods: initial (~2012) and final (~2024) values
df = geo.load("sdg03", variables="index_sdg3")
wide = df.pivot(index="geo_id", columns="year", values="index_sdg3")
wide = wide.add_prefix("y")
wide["name"] = geo.units("municipality").set_index("geo_id")["name"]
px.scatter(wide, x="y2012", y="y2024", hover_name="name",
           labels={"y2012": "Index, ~2012", "y2024": "Index, ~2024"},
           title="SDG 3: Good health and well-being index, ~2012 and ~2024")`,
      pandas: `import pandas as pd
import geopandas as gpd
import plotly.express as px

# No geo4bolivia needed: every file is a plain URL
BASE = "${RAW_URL}"
df = pd.read_csv(BASE + "data/municipality/sdg03.csv")  # geo_id, year, mun_id, ...
municipalities = gpd.read_file(BASE + "geo/boundaries/municipality.geojson")

index = df.loc[df["year"] == 2024, ["geo_id", "index_sdg3"]]
gdf = municipalities.merge(index, on="geo_id")
px.choropleth_map(gdf, geojson=gdf.geometry, locations=gdf.index,
          color="index_sdg3", hover_name="name",
          center={"lat": -16.3, "lon": -64}, zoom=4,
          labels={"index_sdg3": "Good health and well-being index (0-100)"},
          title="SDG 3: Good health and well-being index, ~2024")`,
    },
    examples: [
      {
        title: "Map the change, ~2012 to ~2024",
        text: "Subtracts the initial index from the final one: positive values mark the municipalities that moved closer to the goal's targets.",
        code: `${PYTHON_SETUP}

df = geo.load("sdg03", variables="index_sdg3")
wide = df.pivot(index="geo_id", columns="year", values="index_sdg3")
wide["change"] = wide[2024] - wide[2012]
gdf = geo.boundaries("municipality").merge(wide["change"].reset_index(),
                                           on="geo_id")
px.choropleth_map(gdf, geojson=gdf.geometry, locations=gdf.index,
          color="change", hover_name="name",
          center={"lat": -16.3, "lon": -64}, zoom=4,
          labels={"change": "Change in the index (points)"},
          title="SDG 3: change in the index, ~2012 to ~2024")`,
      },
      {
        title: "Recompute the index from its indicators",
        text: "Rescales each indicator between the Atlas's worst and best values (Cuadro 21), caps it to 0-100 and averages the available ones, which reproduces the published index.",
        code: `${PYTHON_SETUP}
import pandas as pd

df = geo.load("sdg03", years=2024).set_index("geo_id")
bounds = {"sdg3_1_cpp": (0, 100), "sdg3_2_tmi": (39.7, 1.1), "sdg3_2_tmn": (130.1,
          2.6), "sdg3_3_vih": (721.5, 0), "sdg3_3_tub": (199.2, 0),
          "sdg3_3_vec": (0.68, 0), "sdg3_7_tfa": (0.71, 0)}  # (worst, best)
scores = pd.DataFrame({v: 100 * (df[v] - w) / (b - w)
                       for v, (w, b) in bounds.items()}).clip(0, 100)
df["computed"] = scores.mean(axis=1)  # skips missing indicators
df["name"] = geo.units("municipality").set_index("geo_id")["name"]
px.scatter(df, x="computed", y="index_sdg3", hover_name="name",
           labels={"computed": "Computed from the indicators",
                   "index_sdg3": "Good health and well-being index (0-100)"},
           title="Recomputed vs published SDG 3 index, ~2024")`,
      },
      {
        title: "Which indicators moved",
        text: "Compares the mean rescaled score (0-100) of each indicator in the two periods: the gap between the dots is the progress, and the lowest dots are where the goal is furthest away.",
        code: `${PYTHON_SETUP}
import pandas as pd

df = geo.load("sdg03")
bounds = {"sdg3_1_cpp": (0, 100), "sdg3_2_tmi": (39.7, 1.1), "sdg3_2_tmn": (130.1,
          2.6), "sdg3_3_vih": (721.5, 0), "sdg3_3_tub": (199.2, 0),
          "sdg3_3_vec": (0.68, 0), "sdg3_7_tfa": (0.71, 0)}  # (worst, best)
labels = geo.dictionary("sdg03").set_index("variable")["label"]
rows = [{"indicator": labels[v], "period": f"~{year}",
         "score": (100 * (part[v] - w) / (b - w)).clip(0, 100).mean()}
        for year, part in df.groupby("year") for v, (w, b) in bounds.items()]
px.scatter(pd.DataFrame(rows), x="score", y="indicator", color="period",
           labels={"score": "Mean rescaled score (0-100)", "indicator": ""},
           title="SDG 3 indicators, ~2012 and ~2024")`,
      },
      {
        title: "Rank the departments",
        text: "Averages the index within each department, weighting municipalities by their census population, in both periods.",
        code: `${PYTHON_SETUP}

df = geo.load("sdg03", variables="index_sdg3")
dep = geo.aggregate(df, to="department",
                    rules={"index_sdg3": "weighted_mean:population"},
                    weights=geo.load("sdg", variables="population"))
dep["department"] = dep["geo_id"].map(
    geo.units("department").set_index("geo_id")["name"])
dep["period"] = "~" + dep["year"].astype(str)
px.scatter(dep.sort_values("index_sdg3"), x="index_sdg3", y="department",
           color="period",
           labels={"index_sdg3": "Index (population-weighted)"},
           title="SDG 3 index by department, ~2012 and ~2024")`,
      },
    ],
  },
  {
    id: 'municipalities343-sdg04', type: 'indicator', section: 'indicators',
    title: "SDG 4: Quality education",
    scope: "343 municipalities · 11 indicators and the SDG 4 index · ~2012 and ~2024",
    summary: "The SDG 4 (Quality education) index of the SDG Atlas of Bolivia 2026 and its 11 indicators, secondary-school dropout, pre-school attendance, years of education and higher education of women and men, literacy and qualified teachers, for every municipality near 2012 and near 2024.",
    description: "The SDG 4 (Quality education) index of the Atlas de los ODS en Bolivia 2026 (Andersen and Argandoña, SDSN Bolivia) for Bolivia's 343 municipalities and indigenous autonomies (GAIOC), with the 11 indicators behind it: secondary-school dropout rate, girls (%) (average 2012–2014 and average 2022–2023); secondary-school dropout rate, boys (%) (average 2012–2014 and average 2022–2024); pre-school attendance, girls 4-5 (%) (2012 and 2024); pre-school attendance, boys 4-5 (%) (2012 and 2024); years of education, women 25-35 (2012 and 2024); years of education, men 25-35 (2012 and 2024); higher education, women 19+ (%) (2012 and 2024); higher education, men 19+ (%) (2012 and 2024); literacy rate, 15+ (%) (2012 and 2024); qualified teachers, initial level (%) (average 2012–2014 and average 2022–2024); qualified teachers, secondary level (%) (average 2012–2014 and average 2022–2024). Every indicator is measured twice, near the 2012 census and near the 2024 census, and the observatory stores the two values as 2012 and 2024 so that their change can be studied. The index runs from 0 (worst situation) to 100 (targets met): each indicator is rescaled linearly between a worst and a best value set by the Atlas, capped, so that higher is always better, and the index is the simple mean of the available rescaled indicators. Between the two periods the median index went from 47.6 to 69.5, and it rose in 343 of the 343 units. Some indicators are missing for part of the units (Secondary-school dropout rate, girls (%), Secondary-school dropout rate, boys (%), Qualified teachers, initial level (%) and Qualified teachers, secondary level (%)); the index averages the available ones.",
    geography: 'Municipality', units: 343, period: '~2012 and ~2024', frequency: 'Two periods (initial ~2012, final ~2024)', key: 'geo_id', idExample: 'BO-04-17-04',
    categories: ["Social"], tags: ["SDGs", "SDG Atlas 2026", "education", "literacy", "school dropout"],
    image: 'images/indicators/sdg04.webp',
    imageAlt: "Map of the Quality education index (0-100) near 2024 across Bolivia's 343 municipalities and indigenous autonomies in three natural-break classes: High 62.4 – 94.7 (274); Middle 45.5 – 62.4 (67); Low 18.6 – 45.5 (2). Highest: Nuestra Señora de La Paz, Colcapirhua and Oruro.",
    mapAlt: "Two maps of the Quality education index (0-100) near 2012 and near 2024 across Bolivia's 343 municipalities and indigenous autonomies, in three natural-break classes shared by both periods. Legend: High 62.4 – 94.7 (25 units near 2012, 274 near 2024); Middle 45.5 – 62.4 (182 units near 2012, 67 near 2024); Low 18.6 – 45.5 (136 units near 2012, 2 near 2024). Highest near 2024: Nuestra Señora de La Paz, Colcapirhua and Oruro.",
    map: 'images/indicators/sdg04-map.webp',
    date: '2026-11-17', pinned: false, dataset: 'sdg04',
    notice: "Both periods are stored at nominal years: 2012 holds the Atlas's initial values (~2012) and 2024 its final values (~2024). Each indicator's actual reference years (e.g. 2008 and 2023 for the health survey, three-year averages for volatile indicators) are listed in its description under Variables. The four indigenous autonomies and municipalities created after 2012 have values in both periods.",
    code: {
      python: `${PYTHON_SETUP}

# The SDG 4 index (0-100, higher is better), ~2024
gdf = geo.load("sdg04", variables="index_sdg4", years=2024, geometry=True)
px.choropleth_map(gdf, geojson=gdf.geometry, locations=gdf.index,
          color="index_sdg4", hover_name="name",
          center={"lat": -16.3, "lon": -64}, zoom=4,
          labels={"index_sdg4": "Quality education index (0-100)"},
          title="SDG 4: Quality education index, ~2024").show()

# The two periods: initial (~2012) and final (~2024) values
df = geo.load("sdg04", variables="index_sdg4")
wide = df.pivot(index="geo_id", columns="year", values="index_sdg4")
wide = wide.add_prefix("y")
wide["name"] = geo.units("municipality").set_index("geo_id")["name"]
px.scatter(wide, x="y2012", y="y2024", hover_name="name",
           labels={"y2012": "Index, ~2012", "y2024": "Index, ~2024"},
           title="SDG 4: Quality education index, ~2012 and ~2024")`,
      pandas: `import pandas as pd
import geopandas as gpd
import plotly.express as px

# No geo4bolivia needed: every file is a plain URL
BASE = "${RAW_URL}"
df = pd.read_csv(BASE + "data/municipality/sdg04.csv")  # geo_id, year, mun_id, ...
municipalities = gpd.read_file(BASE + "geo/boundaries/municipality.geojson")

index = df.loc[df["year"] == 2024, ["geo_id", "index_sdg4"]]
gdf = municipalities.merge(index, on="geo_id")
px.choropleth_map(gdf, geojson=gdf.geometry, locations=gdf.index,
          color="index_sdg4", hover_name="name",
          center={"lat": -16.3, "lon": -64}, zoom=4,
          labels={"index_sdg4": "Quality education index (0-100)"},
          title="SDG 4: Quality education index, ~2024")`,
    },
    examples: [
      {
        title: "Map the change, ~2012 to ~2024",
        text: "Subtracts the initial index from the final one: positive values mark the municipalities that moved closer to the goal's targets.",
        code: `${PYTHON_SETUP}

df = geo.load("sdg04", variables="index_sdg4")
wide = df.pivot(index="geo_id", columns="year", values="index_sdg4")
wide["change"] = wide[2024] - wide[2012]
gdf = geo.boundaries("municipality").merge(wide["change"].reset_index(),
                                           on="geo_id")
px.choropleth_map(gdf, geojson=gdf.geometry, locations=gdf.index,
          color="change", hover_name="name",
          center={"lat": -16.3, "lon": -64}, zoom=4,
          labels={"change": "Change in the index (points)"},
          title="SDG 4: change in the index, ~2012 to ~2024")`,
      },
      {
        title: "Recompute the index from its indicators",
        text: "Rescales each indicator between the Atlas's worst and best values (Cuadro 21), caps it to 0-100 and averages the available ones, which reproduces the published index.",
        code: `${PYTHON_SETUP}
import pandas as pd

df = geo.load("sdg04", years=2024).set_index("geo_id")
bounds = {"sdg4_1_asm": (26, 0), "sdg4_1_ash": (26, 0), "sdg4_2_tam": (0, 100),
          "sdg4_2_tah": (0, 100), "sdg4_3_aem": (4.8, 14.9), "sdg4_3_aeh":
          (4.8, 14.9), "sdg4_3_esm": (1.6, 49.8), "sdg4_3_esh": (1.6,
          49.8), "sdg4_6_alf": (75.6, 100), "sdg4_10_pci": (12, 100),
          "sdg4_10_pcs": (5.9, 100)}  # (worst, best)
scores = pd.DataFrame({v: 100 * (df[v] - w) / (b - w)
                       for v, (w, b) in bounds.items()}).clip(0, 100)
df["computed"] = scores.mean(axis=1)  # skips missing indicators
df["name"] = geo.units("municipality").set_index("geo_id")["name"]
px.scatter(df, x="computed", y="index_sdg4", hover_name="name",
           labels={"computed": "Computed from the indicators",
                   "index_sdg4": "Quality education index (0-100)"},
           title="Recomputed vs published SDG 4 index, ~2024")`,
      },
      {
        title: "Which indicators moved",
        text: "Compares the mean rescaled score (0-100) of each indicator in the two periods: the gap between the dots is the progress, and the lowest dots are where the goal is furthest away.",
        code: `${PYTHON_SETUP}
import pandas as pd

df = geo.load("sdg04")
bounds = {"sdg4_1_asm": (26, 0), "sdg4_1_ash": (26, 0), "sdg4_2_tam": (0, 100),
          "sdg4_2_tah": (0, 100), "sdg4_3_aem": (4.8, 14.9), "sdg4_3_aeh":
          (4.8, 14.9), "sdg4_3_esm": (1.6, 49.8), "sdg4_3_esh": (1.6,
          49.8), "sdg4_6_alf": (75.6, 100), "sdg4_10_pci": (12, 100),
          "sdg4_10_pcs": (5.9, 100)}  # (worst, best)
labels = geo.dictionary("sdg04").set_index("variable")["label"]
rows = [{"indicator": labels[v], "period": f"~{year}",
         "score": (100 * (part[v] - w) / (b - w)).clip(0, 100).mean()}
        for year, part in df.groupby("year") for v, (w, b) in bounds.items()]
px.scatter(pd.DataFrame(rows), x="score", y="indicator", color="period",
           labels={"score": "Mean rescaled score (0-100)", "indicator": ""},
           title="SDG 4 indicators, ~2012 and ~2024")`,
      },
      {
        title: "Rank the departments",
        text: "Averages the index within each department, weighting municipalities by their census population, in both periods.",
        code: `${PYTHON_SETUP}

df = geo.load("sdg04", variables="index_sdg4")
dep = geo.aggregate(df, to="department",
                    rules={"index_sdg4": "weighted_mean:population"},
                    weights=geo.load("sdg", variables="population"))
dep["department"] = dep["geo_id"].map(
    geo.units("department").set_index("geo_id")["name"])
dep["period"] = "~" + dep["year"].astype(str)
px.scatter(dep.sort_values("index_sdg4"), x="index_sdg4", y="department",
           color="period",
           labels={"index_sdg4": "Index (population-weighted)"},
           title="SDG 4 index by department, ~2012 and ~2024")`,
      },
    ],
  },
  {
    id: 'municipalities343-sdg05', type: 'indicator', section: 'indicators',
    title: "SDG 5: Gender equality",
    scope: "343 municipalities · 6 indicators and the SDG 5 index · ~2012 and ~2024",
    summary: "The SDG 5 (Gender equality) index of the SDG Atlas of Bolivia 2026 and its 6 indicators, gender parity in school dropout, poverty, education, labour participation and care work, and women among elected councillors, for every municipality near 2012 and near 2024.",
    description: "The SDG 5 (Gender equality) index of the Atlas de los ODS en Bolivia 2026 (Andersen and Argandoña, SDSN Bolivia) for Bolivia's 343 municipalities and indigenous autonomies (GAIOC), with the 6 indicators behind it: gender parity in secondary dropout (boys/girls) (average 2012–2014 and average 2022–2024); gender parity in multidimensional poverty (male/female head) (2012 and 2024); gender parity in years of education, 25-35 (women/men) (2012 and 2024); gender parity in labour-force participation (women/men) (2012 and 2024); gender parity in domestic and care work, 15-24 (men/women) (2012 and 2024); women among elected councillors (%) (2015 and 2021). Every indicator is measured twice, near the 2012 census and near the 2024 census, and the observatory stores the two values as 2012 and 2024 so that their change can be studied. The index runs from 0 (worst situation) to 100 (targets met): each indicator is rescaled linearly between a worst and a best value set by the Atlas, capped, so that higher is always better, and the index is the simple mean of the available rescaled indicators. Between the two periods the median index went from 73.5 to 81.9, and it rose in 322 of the 343 units. Some indicators are missing for part of the units (Gender parity in secondary dropout (boys/girls) and Women among elected councillors (%)); the index averages the available ones.",
    geography: 'Municipality', units: 343, period: '~2012 and ~2024', frequency: 'Two periods (initial ~2012, final ~2024)', key: 'geo_id', idExample: 'BO-04-17-04',
    categories: ["Social"], tags: ["SDGs", "SDG Atlas 2026", "gender", "gender parity", "political representation"],
    image: 'images/indicators/sdg05.webp',
    imageAlt: "Map of the Gender equality index (0-100) near 2024 across Bolivia's 343 municipalities and indigenous autonomies in three natural-break classes: High 80.3 – 95.0 (223); Middle 73.0 – 80.3 (103); Low 56.6 – 73.0 (17). Highest: Papel Pampa, Tacachi and El Choro.",
    mapAlt: "Two maps of the Gender equality index (0-100) near 2012 and near 2024 across Bolivia's 343 municipalities and indigenous autonomies, in three natural-break classes shared by both periods. Legend: High 80.3 – 95.0 (9 units near 2012, 223 near 2024); Middle 73.0 – 80.3 (174 units near 2012, 103 near 2024); Low 56.6 – 73.0 (160 units near 2012, 17 near 2024). Highest near 2024: Papel Pampa, Tacachi and El Choro.",
    map: 'images/indicators/sdg05-map.webp',
    date: '2026-11-17', pinned: false, dataset: 'sdg05',
    notice: "Both periods are stored at nominal years: 2012 holds the Atlas's initial values (~2012) and 2024 its final values (~2024). Each indicator's actual reference years (e.g. 2008 and 2023 for the health survey, three-year averages for volatile indicators) are listed in its description under Variables. The four indigenous autonomies and municipalities created after 2012 have values in both periods.",
    code: {
      python: `${PYTHON_SETUP}

# The SDG 5 index (0-100, higher is better), ~2024
gdf = geo.load("sdg05", variables="index_sdg5", years=2024, geometry=True)
px.choropleth_map(gdf, geojson=gdf.geometry, locations=gdf.index,
          color="index_sdg5", hover_name="name",
          center={"lat": -16.3, "lon": -64}, zoom=4,
          labels={"index_sdg5": "Gender equality index (0-100)"},
          title="SDG 5: Gender equality index, ~2024").show()

# The two periods: initial (~2012) and final (~2024) values
df = geo.load("sdg05", variables="index_sdg5")
wide = df.pivot(index="geo_id", columns="year", values="index_sdg5")
wide = wide.add_prefix("y")
wide["name"] = geo.units("municipality").set_index("geo_id")["name"]
px.scatter(wide, x="y2012", y="y2024", hover_name="name",
           labels={"y2012": "Index, ~2012", "y2024": "Index, ~2024"},
           title="SDG 5: Gender equality index, ~2012 and ~2024")`,
      pandas: `import pandas as pd
import geopandas as gpd
import plotly.express as px

# No geo4bolivia needed: every file is a plain URL
BASE = "${RAW_URL}"
df = pd.read_csv(BASE + "data/municipality/sdg05.csv")  # geo_id, year, mun_id, ...
municipalities = gpd.read_file(BASE + "geo/boundaries/municipality.geojson")

index = df.loc[df["year"] == 2024, ["geo_id", "index_sdg5"]]
gdf = municipalities.merge(index, on="geo_id")
px.choropleth_map(gdf, geojson=gdf.geometry, locations=gdf.index,
          color="index_sdg5", hover_name="name",
          center={"lat": -16.3, "lon": -64}, zoom=4,
          labels={"index_sdg5": "Gender equality index (0-100)"},
          title="SDG 5: Gender equality index, ~2024")`,
    },
    examples: [
      {
        title: "Map the change, ~2012 to ~2024",
        text: "Subtracts the initial index from the final one: positive values mark the municipalities that moved closer to the goal's targets.",
        code: `${PYTHON_SETUP}

df = geo.load("sdg05", variables="index_sdg5")
wide = df.pivot(index="geo_id", columns="year", values="index_sdg5")
wide["change"] = wide[2024] - wide[2012]
gdf = geo.boundaries("municipality").merge(wide["change"].reset_index(),
                                           on="geo_id")
px.choropleth_map(gdf, geojson=gdf.geometry, locations=gdf.index,
          color="change", hover_name="name",
          center={"lat": -16.3, "lon": -64}, zoom=4,
          labels={"change": "Change in the index (points)"},
          title="SDG 5: change in the index, ~2012 to ~2024")`,
      },
      {
        title: "Recompute the index from its indicators",
        text: "Rescales each indicator between the Atlas's worst and best values (Cuadro 21), caps it to 0-100 and averages the available ones, which reproduces the published index.",
        code: `${PYTHON_SETUP}
import pandas as pd

df = geo.load("sdg05", years=2024).set_index("geo_id")
bounds = {"sdg5_1_pga": (0, 1), "sdg5_1_pgm": (0, 1), "sdg5_1_pge": (0, 1),
          "sdg5_1_pgp": (0, 1), "sdg5_4_phc": (0, 1), "sdg5_5_acm": (0,
          50)}  # (worst, best)
scores = pd.DataFrame({v: 100 * (df[v] - w) / (b - w)
                       for v, (w, b) in bounds.items()}).clip(0, 100)
df["computed"] = scores.mean(axis=1)  # skips missing indicators
df["name"] = geo.units("municipality").set_index("geo_id")["name"]
px.scatter(df, x="computed", y="index_sdg5", hover_name="name",
           labels={"computed": "Computed from the indicators",
                   "index_sdg5": "Gender equality index (0-100)"},
           title="Recomputed vs published SDG 5 index, ~2024")`,
      },
      {
        title: "Which indicators moved",
        text: "Compares the mean rescaled score (0-100) of each indicator in the two periods: the gap between the dots is the progress, and the lowest dots are where the goal is furthest away.",
        code: `${PYTHON_SETUP}
import pandas as pd

df = geo.load("sdg05")
bounds = {"sdg5_1_pga": (0, 1), "sdg5_1_pgm": (0, 1), "sdg5_1_pge": (0, 1),
          "sdg5_1_pgp": (0, 1), "sdg5_4_phc": (0, 1), "sdg5_5_acm": (0,
          50)}  # (worst, best)
labels = geo.dictionary("sdg05").set_index("variable")["label"]
rows = [{"indicator": labels[v], "period": f"~{year}",
         "score": (100 * (part[v] - w) / (b - w)).clip(0, 100).mean()}
        for year, part in df.groupby("year") for v, (w, b) in bounds.items()]
px.scatter(pd.DataFrame(rows), x="score", y="indicator", color="period",
           labels={"score": "Mean rescaled score (0-100)", "indicator": ""},
           title="SDG 5 indicators, ~2012 and ~2024")`,
      },
      {
        title: "Rank the departments",
        text: "Averages the index within each department, weighting municipalities by their census population, in both periods.",
        code: `${PYTHON_SETUP}

df = geo.load("sdg05", variables="index_sdg5")
dep = geo.aggregate(df, to="department",
                    rules={"index_sdg5": "weighted_mean:population"},
                    weights=geo.load("sdg", variables="population"))
dep["department"] = dep["geo_id"].map(
    geo.units("department").set_index("geo_id")["name"])
dep["period"] = "~" + dep["year"].astype(str)
px.scatter(dep.sort_values("index_sdg5"), x="index_sdg5", y="department",
           color="period",
           labels={"index_sdg5": "Index (population-weighted)"},
           title="SDG 5 index by department, ~2012 and ~2024")`,
      },
    ],
  },
  {
    id: 'municipalities343-sdg06', type: 'indicator', section: 'indicators',
    title: "SDG 6: Clean water and sanitation",
    scope: "343 municipalities · 3 indicators and the SDG 6 index · ~2012 and ~2024",
    summary: "The SDG 6 (Clean water and sanitation) index of the SDG Atlas of Bolivia 2026 and its 3 indicators, drinking water, sanitation and wastewater treatment, for every municipality near 2012 and near 2024.",
    description: "The SDG 6 (Clean water and sanitation) index of the Atlas de los ODS en Bolivia 2026 (Andersen and Argandoña, SDSN Bolivia) for Bolivia's 343 municipalities and indigenous autonomies (GAIOC), with the 3 indicators behind it: drinking-water coverage (% of population) (2012 and 2024); sanitation coverage (% of population) (2012 and 2024); wastewater treated (%) (2013 and 2024). Every indicator is measured twice, near the 2012 census and near the 2024 census, and the observatory stores the two values as 2012 and 2024 so that their change can be studied. The index runs from 0 (worst situation) to 100 (targets met): each indicator is rescaled linearly between a worst and a best value set by the Atlas, capped, so that higher is always better, and the index is the simple mean of the available rescaled indicators. Between the two periods the median index went from 25.5 to 40.9, and it rose in 335 of the 343 units.",
    geography: 'Municipality', units: 343, period: '~2012 and ~2024', frequency: 'Two periods (initial ~2012, final ~2024)', key: 'geo_id', idExample: 'BO-04-17-04',
    categories: ["Social", "Environment"], tags: ["SDGs", "SDG Atlas 2026", "water", "sanitation", "wastewater"],
    image: 'images/indicators/sdg06.webp',
    imageAlt: "Map of the Clean water and sanitation index (0-100) near 2024 across Bolivia's 343 municipalities and indigenous autonomies in three natural-break classes: High 45.8 – 86.9 (110); Middle 26.9 – 45.8 (206); Low 0.0 – 26.9 (27). Highest: Yacuiba, Porongo and Vallegrande.",
    mapAlt: "Two maps of the Clean water and sanitation index (0-100) near 2012 and near 2024 across Bolivia's 343 municipalities and indigenous autonomies, in three natural-break classes shared by both periods. Legend: High 45.8 – 86.9 (17 units near 2012, 110 near 2024); Middle 26.9 – 45.8 (136 units near 2012, 206 near 2024); Low 0.0 – 26.9 (190 units near 2012, 27 near 2024). Highest near 2024: Yacuiba, Porongo and Vallegrande.",
    map: 'images/indicators/sdg06-map.webp',
    date: '2026-11-17', pinned: false, dataset: 'sdg06',
    notice: "Both periods are stored at nominal years: 2012 holds the Atlas's initial values (~2012) and 2024 its final values (~2024). Each indicator's actual reference years (e.g. 2008 and 2023 for the health survey, three-year averages for volatile indicators) are listed in its description under Variables. The four indigenous autonomies and municipalities created after 2012 have values in both periods.",
    code: {
      python: `${PYTHON_SETUP}

# The SDG 6 index (0-100, higher is better), ~2024
gdf = geo.load("sdg06", variables="index_sdg6", years=2024, geometry=True)
px.choropleth_map(gdf, geojson=gdf.geometry, locations=gdf.index,
          color="index_sdg6", hover_name="name",
          center={"lat": -16.3, "lon": -64}, zoom=4,
          labels={"index_sdg6": "Clean water and sanitation index (0-100)"},
          title="SDG 6: Clean water and sanitation index, ~2024").show()

# The two periods: initial (~2012) and final (~2024) values
df = geo.load("sdg06", variables="index_sdg6")
wide = df.pivot(index="geo_id", columns="year", values="index_sdg6")
wide = wide.add_prefix("y")
wide["name"] = geo.units("municipality").set_index("geo_id")["name"]
px.scatter(wide, x="y2012", y="y2024", hover_name="name",
           labels={"y2012": "Index, ~2012", "y2024": "Index, ~2024"},
           title="SDG 6: Clean water and sanitation index, ~2012 and ~2024")`,
      pandas: `import pandas as pd
import geopandas as gpd
import plotly.express as px

# No geo4bolivia needed: every file is a plain URL
BASE = "${RAW_URL}"
df = pd.read_csv(BASE + "data/municipality/sdg06.csv")  # geo_id, year, mun_id, ...
municipalities = gpd.read_file(BASE + "geo/boundaries/municipality.geojson")

index = df.loc[df["year"] == 2024, ["geo_id", "index_sdg6"]]
gdf = municipalities.merge(index, on="geo_id")
px.choropleth_map(gdf, geojson=gdf.geometry, locations=gdf.index,
          color="index_sdg6", hover_name="name",
          center={"lat": -16.3, "lon": -64}, zoom=4,
          labels={"index_sdg6": "Clean water and sanitation index (0-100)"},
          title="SDG 6: Clean water and sanitation index, ~2024")`,
    },
    examples: [
      {
        title: "Map the change, ~2012 to ~2024",
        text: "Subtracts the initial index from the final one: positive values mark the municipalities that moved closer to the goal's targets.",
        code: `${PYTHON_SETUP}

df = geo.load("sdg06", variables="index_sdg6")
wide = df.pivot(index="geo_id", columns="year", values="index_sdg6")
wide["change"] = wide[2024] - wide[2012]
gdf = geo.boundaries("municipality").merge(wide["change"].reset_index(),
                                           on="geo_id")
px.choropleth_map(gdf, geojson=gdf.geometry, locations=gdf.index,
          color="change", hover_name="name",
          center={"lat": -16.3, "lon": -64}, zoom=4,
          labels={"change": "Change in the index (points)"},
          title="SDG 6: change in the index, ~2012 to ~2024")`,
      },
      {
        title: "Recompute the index from its indicators",
        text: "Rescales each indicator between the Atlas's worst and best values (Cuadro 21), caps it to 0-100 and averages the available ones, which reproduces the published index.",
        code: `${PYTHON_SETUP}
import pandas as pd

df = geo.load("sdg06", years=2024).set_index("geo_id")
bounds = {"sdg6_1_cap": (21.4, 100), "sdg6_2_cas": (2.7, 100), "sdg6_3_tar": (0,
          100)}  # (worst, best)
scores = pd.DataFrame({v: 100 * (df[v] - w) / (b - w)
                       for v, (w, b) in bounds.items()}).clip(0, 100)
df["computed"] = scores.mean(axis=1)  # skips missing indicators
df["name"] = geo.units("municipality").set_index("geo_id")["name"]
px.scatter(df, x="computed", y="index_sdg6", hover_name="name",
           labels={"computed": "Computed from the indicators",
                   "index_sdg6": "Clean water and sanitation index (0-100)"},
           title="Recomputed vs published SDG 6 index, ~2024")`,
      },
      {
        title: "Which indicators moved",
        text: "Compares the mean rescaled score (0-100) of each indicator in the two periods: the gap between the dots is the progress, and the lowest dots are where the goal is furthest away.",
        code: `${PYTHON_SETUP}
import pandas as pd

df = geo.load("sdg06")
bounds = {"sdg6_1_cap": (21.4, 100), "sdg6_2_cas": (2.7, 100), "sdg6_3_tar": (0,
          100)}  # (worst, best)
labels = geo.dictionary("sdg06").set_index("variable")["label"]
rows = [{"indicator": labels[v], "period": f"~{year}",
         "score": (100 * (part[v] - w) / (b - w)).clip(0, 100).mean()}
        for year, part in df.groupby("year") for v, (w, b) in bounds.items()]
px.scatter(pd.DataFrame(rows), x="score", y="indicator", color="period",
           labels={"score": "Mean rescaled score (0-100)", "indicator": ""},
           title="SDG 6 indicators, ~2012 and ~2024")`,
      },
      {
        title: "Rank the departments",
        text: "Averages the index within each department, weighting municipalities by their census population, in both periods.",
        code: `${PYTHON_SETUP}

df = geo.load("sdg06", variables="index_sdg6")
dep = geo.aggregate(df, to="department",
                    rules={"index_sdg6": "weighted_mean:population"},
                    weights=geo.load("sdg", variables="population"))
dep["department"] = dep["geo_id"].map(
    geo.units("department").set_index("geo_id")["name"])
dep["period"] = "~" + dep["year"].astype(str)
px.scatter(dep.sort_values("index_sdg6"), x="index_sdg6", y="department",
           color="period",
           labels={"index_sdg6": "Index (population-weighted)"},
           title="SDG 6 index by department, ~2012 and ~2024")`,
      },
    ],
  },
  {
    id: 'municipalities343-sdg07', type: 'indicator', section: 'indicators',
    title: "SDG 7: Affordable and clean energy",
    scope: "343 municipalities · 4 indicators and the SDG 7 index · ~2012 and ~2024",
    summary: "The SDG 7 (Affordable and clean energy) index of the SDG Atlas of Bolivia 2026 and its 4 indicators, electricity coverage and use, idle electricity meters and clean cooking energy, for every municipality near 2012 and near 2024.",
    description: "The SDG 7 (Affordable and clean energy) index of the Atlas de los ODS en Bolivia 2026 (Andersen and Argandoña, SDSN Bolivia) for Bolivia's 343 municipalities and indigenous autonomies (GAIOC), with the 4 indicators behind it: residential electricity consumption (kWh per person per year) (2016 and 2024); electricity coverage (% of population) (2012 and 2024); residential meters with zero consumption for 6+ months (%) (2016 and 2024); clean cooking energy (% of population) (2012 and 2024). Every indicator is measured twice, near the 2012 census and near the 2024 census, and the observatory stores the two values as 2012 and 2024 so that their change can be studied. The index runs from 0 (worst situation) to 100 (targets met): each indicator is rescaled linearly between a worst and a best value set by the Atlas, capped, so that higher is always better, and the index is the simple mean of the available rescaled indicators. Between the two periods the median index went from 51.1 to 61.8, and it rose in 315 of the 343 units. Some indicators are missing for part of the units (Residential meters with zero consumption for 6+ months (%)); the index averages the available ones.",
    geography: 'Municipality', units: 343, period: '~2012 and ~2024', frequency: 'Two periods (initial ~2012, final ~2024)', key: 'geo_id', idExample: 'BO-04-17-04',
    categories: ["Economy", "Environment"], tags: ["SDGs", "SDG Atlas 2026", "energy", "electricity", "clean cooking"],
    image: 'images/indicators/sdg07.webp',
    imageAlt: "Map of the Affordable and clean energy index (0-100) near 2024 across Bolivia's 343 municipalities and indigenous autonomies in three natural-break classes: High 70.8 – 98.5 (99); Middle 50.3 – 70.8 (158); Low 9.4 – 50.3 (86). Highest: Trinidad, Cobija and Santa Cruz de la Sierra.",
    mapAlt: "Two maps of the Affordable and clean energy index (0-100) near 2012 and near 2024 across Bolivia's 343 municipalities and indigenous autonomies, in three natural-break classes shared by both periods. Legend: High 70.8 – 98.5 (59 units near 2012, 99 near 2024); Middle 50.3 – 70.8 (124 units near 2012, 158 near 2024); Low 9.4 – 50.3 (160 units near 2012, 86 near 2024). Highest near 2024: Trinidad, Cobija and Santa Cruz de la Sierra.",
    map: 'images/indicators/sdg07-map.webp',
    date: '2026-11-17', pinned: false, dataset: 'sdg07',
    notice: "Both periods are stored at nominal years: 2012 holds the Atlas's initial values (~2012) and 2024 its final values (~2024). Each indicator's actual reference years (e.g. 2008 and 2023 for the health survey, three-year averages for volatile indicators) are listed in its description under Variables. The four indigenous autonomies and municipalities created after 2012 have values in both periods.",
    code: {
      python: `${PYTHON_SETUP}

# The SDG 7 index (0-100, higher is better), ~2024
gdf = geo.load("sdg07", variables="index_sdg7", years=2024, geometry=True)
px.choropleth_map(gdf, geojson=gdf.geometry, locations=gdf.index,
          color="index_sdg7", hover_name="name",
          center={"lat": -16.3, "lon": -64}, zoom=4,
          labels={"index_sdg7": "Affordable and clean energy index (0-100)"},
          title="SDG 7: Affordable and clean energy index, ~2024").show()

# The two periods: initial (~2012) and final (~2024) values
df = geo.load("sdg07", variables="index_sdg7")
wide = df.pivot(index="geo_id", columns="year", values="index_sdg7")
wide = wide.add_prefix("y")
wide["name"] = geo.units("municipality").set_index("geo_id")["name"]
px.scatter(wide, x="y2012", y="y2024", hover_name="name",
           labels={"y2012": "Index, ~2012", "y2024": "Index, ~2024"},
           title="SDG 7: Affordable and clean energy index, ~2012 and ~2024")`,
      pandas: `import pandas as pd
import geopandas as gpd
import plotly.express as px

# No geo4bolivia needed: every file is a plain URL
BASE = "${RAW_URL}"
df = pd.read_csv(BASE + "data/municipality/sdg07.csv")  # geo_id, year, mun_id, ...
municipalities = gpd.read_file(BASE + "geo/boundaries/municipality.geojson")

index = df.loc[df["year"] == 2024, ["geo_id", "index_sdg7"]]
gdf = municipalities.merge(index, on="geo_id")
px.choropleth_map(gdf, geojson=gdf.geometry, locations=gdf.index,
          color="index_sdg7", hover_name="name",
          center={"lat": -16.3, "lon": -64}, zoom=4,
          labels={"index_sdg7": "Affordable and clean energy index (0-100)"},
          title="SDG 7: Affordable and clean energy index, ~2024")`,
    },
    examples: [
      {
        title: "Map the change, ~2012 to ~2024",
        text: "Subtracts the initial index from the final one: positive values mark the municipalities that moved closer to the goal's targets.",
        code: `${PYTHON_SETUP}

df = geo.load("sdg07", variables="index_sdg7")
wide = df.pivot(index="geo_id", columns="year", values="index_sdg7")
wide["change"] = wide[2024] - wide[2012]
gdf = geo.boundaries("municipality").merge(wide["change"].reset_index(),
                                           on="geo_id")
px.choropleth_map(gdf, geojson=gdf.geometry, locations=gdf.index,
          color="change", hover_name="name",
          center={"lat": -16.3, "lon": -64}, zoom=4,
          labels={"change": "Change in the index (points)"},
          title="SDG 7: change in the index, ~2012 to ~2024")`,
      },
      {
        title: "Recompute the index from its indicators",
        text: "Rescales each indicator between the Atlas's worst and best values (Cuadro 21), caps it to 0-100 and averages the available ones, which reproduces the published index.",
        code: `${PYTHON_SETUP}
import pandas as pd

df = geo.load("sdg07", years=2024).set_index("geo_id")
bounds = {"sdg7_1_cep": (0, 523), "sdg7_1_cae": (0, 100), "sdg7_1_mcc": (69, 0),
          "sdg7_1_elc": (0, 100)}  # (worst, best)
scores = pd.DataFrame({v: 100 * (df[v] - w) / (b - w)
                       for v, (w, b) in bounds.items()}).clip(0, 100)
df["computed"] = scores.mean(axis=1)  # skips missing indicators
df["name"] = geo.units("municipality").set_index("geo_id")["name"]
px.scatter(df, x="computed", y="index_sdg7", hover_name="name",
           labels={"computed": "Computed from the indicators",
                   "index_sdg7": "Affordable and clean energy index (0-100)"},
           title="Recomputed vs published SDG 7 index, ~2024")`,
      },
      {
        title: "Which indicators moved",
        text: "Compares the mean rescaled score (0-100) of each indicator in the two periods: the gap between the dots is the progress, and the lowest dots are where the goal is furthest away.",
        code: `${PYTHON_SETUP}
import pandas as pd

df = geo.load("sdg07")
bounds = {"sdg7_1_cep": (0, 523), "sdg7_1_cae": (0, 100), "sdg7_1_mcc": (69, 0),
          "sdg7_1_elc": (0, 100)}  # (worst, best)
labels = geo.dictionary("sdg07").set_index("variable")["label"]
rows = [{"indicator": labels[v], "period": f"~{year}",
         "score": (100 * (part[v] - w) / (b - w)).clip(0, 100).mean()}
        for year, part in df.groupby("year") for v, (w, b) in bounds.items()]
px.scatter(pd.DataFrame(rows), x="score", y="indicator", color="period",
           labels={"score": "Mean rescaled score (0-100)", "indicator": ""},
           title="SDG 7 indicators, ~2012 and ~2024")`,
      },
      {
        title: "Rank the departments",
        text: "Averages the index within each department, weighting municipalities by their census population, in both periods.",
        code: `${PYTHON_SETUP}

df = geo.load("sdg07", variables="index_sdg7")
dep = geo.aggregate(df, to="department",
                    rules={"index_sdg7": "weighted_mean:population"},
                    weights=geo.load("sdg", variables="population"))
dep["department"] = dep["geo_id"].map(
    geo.units("department").set_index("geo_id")["name"])
dep["period"] = "~" + dep["year"].astype(str)
px.scatter(dep.sort_values("index_sdg7"), x="index_sdg7", y="department",
           color="period",
           labels={"index_sdg7": "Index (population-weighted)"},
           title="SDG 7 index by department, ~2012 and ~2024")`,
      },
    ],
  },
  {
    id: 'municipalities343-sdg08', type: 'indicator', section: 'indicators',
    title: "SDG 8: Decent work and economic growth",
    scope: "343 municipalities · 7 indicators and the SDG 8 index · ~2012 and ~2024",
    summary: "The SDG 8 (Decent work and economic growth) index of the SDG Atlas of Bolivia 2026 and its 7 indicators, labour participation and youth outside education and work, by sex, tourism employment and GDP, and financial access points, for every municipality near 2012 and near 2024.",
    description: "The SDG 8 (Decent work and economic growth) index of the Atlas de los ODS en Bolivia 2026 (Andersen and Argandoña, SDSN Bolivia) for Bolivia's 343 municipalities and indigenous autonomies (GAIOC), with the 7 indicators behind it: labour-force participation rate, women 14+ (%) (2012 and 2024); labour-force participation rate, men 14+ (%) (2012 and 2024); young women not in education or the labour force, 15-24 (%) (2012 and 2024); young men not in education or the labour force, 15-24 (%) (2012 and 2024); employment in tourism-related activities (%) (2012 and 2024); tourism share of GDP (%) (2016 and 2025); financial access points (per 100,000 people) (2012 and 2024). Every indicator is measured twice, near the 2012 census and near the 2024 census, and the observatory stores the two values as 2012 and 2024 so that their change can be studied. The index runs from 0 (worst situation) to 100 (targets met): each indicator is rescaled linearly between a worst and a best value set by the Atlas, capped, so that higher is always better, and the index is the simple mean of the available rescaled indicators. Between the two periods the median index went from 35.2 to 52.9, and it rose in 339 of the 343 units. Some indicators are missing for part of the units (Tourism share of GDP (%)); the index averages the available ones.",
    geography: 'Municipality', units: 343, period: '~2012 and ~2024', frequency: 'Two periods (initial ~2012, final ~2024)', key: 'geo_id', idExample: 'BO-04-17-04',
    categories: ["Economy"], tags: ["SDGs", "SDG Atlas 2026", "employment", "labour participation", "financial inclusion"],
    image: 'images/indicators/sdg08.webp',
    imageAlt: "Map of the Decent work and economic growth index (0-100) near 2024 across Bolivia's 343 municipalities and indigenous autonomies in three natural-break classes: High 55.4 – 82.0 (132); Middle 39.7 – 55.4 (190); Low 7.8 – 39.7 (21). Highest: Copacabana, Samaipata and Puerto Menor de Rurrenabaque.",
    mapAlt: "Two maps of the Decent work and economic growth index (0-100) near 2012 and near 2024 across Bolivia's 343 municipalities and indigenous autonomies, in three natural-break classes shared by both periods. Legend: High 55.4 – 82.0 (5 units near 2012, 132 near 2024); Middle 39.7 – 55.4 (93 units near 2012, 190 near 2024); Low 7.8 – 39.7 (245 units near 2012, 21 near 2024). Highest near 2024: Copacabana, Samaipata and Puerto Menor de Rurrenabaque.",
    map: 'images/indicators/sdg08-map.webp',
    date: '2026-11-17', pinned: false, dataset: 'sdg08',
    notice: "Both periods are stored at nominal years: 2012 holds the Atlas's initial values (~2012) and 2024 its final values (~2024). Each indicator's actual reference years (e.g. 2008 and 2023 for the health survey, three-year averages for volatile indicators) are listed in its description under Variables. The four indigenous autonomies and municipalities created after 2012 have values in both periods.",
    code: {
      python: `${PYTHON_SETUP}

# The SDG 8 index (0-100, higher is better), ~2024
gdf = geo.load("sdg08", variables="index_sdg8", years=2024, geometry=True)
px.choropleth_map(gdf, geojson=gdf.geometry, locations=gdf.index,
          color="index_sdg8", hover_name="name",
          center={"lat": -16.3, "lon": -64}, zoom=4,
          labels={"index_sdg8": "Decent work and economic growth index (0-100)"},
          title="SDG 8: Decent work and economic growth index, ~2024").show()

# The two periods: initial (~2012) and final (~2024) values
df = geo.load("sdg08", variables="index_sdg8")
wide = df.pivot(index="geo_id", columns="year", values="index_sdg8")
wide = wide.add_prefix("y")
wide["name"] = geo.units("municipality").set_index("geo_id")["name"]
px.scatter(wide, x="y2012", y="y2024", hover_name="name",
           labels={"y2012": "Index, ~2012", "y2024": "Index, ~2024"},
           title="SDG 8: Decent work and economic growth index, ~2012 and ~2024")`,
      pandas: `import pandas as pd
import geopandas as gpd
import plotly.express as px

# No geo4bolivia needed: every file is a plain URL
BASE = "${RAW_URL}"
df = pd.read_csv(BASE + "data/municipality/sdg08.csv")  # geo_id, year, mun_id, ...
municipalities = gpd.read_file(BASE + "geo/boundaries/municipality.geojson")

index = df.loc[df["year"] == 2024, ["geo_id", "index_sdg8"]]
gdf = municipalities.merge(index, on="geo_id")
px.choropleth_map(gdf, geojson=gdf.geometry, locations=gdf.index,
          color="index_sdg8", hover_name="name",
          center={"lat": -16.3, "lon": -64}, zoom=4,
          labels={"index_sdg8": "Decent work and economic growth index (0-100)"},
          title="SDG 8: Decent work and economic growth index, ~2024")`,
    },
    examples: [
      {
        title: "Map the change, ~2012 to ~2024",
        text: "Subtracts the initial index from the final one: positive values mark the municipalities that moved closer to the goal's targets.",
        code: `${PYTHON_SETUP}

df = geo.load("sdg08", variables="index_sdg8")
wide = df.pivot(index="geo_id", columns="year", values="index_sdg8")
wide["change"] = wide[2024] - wide[2012]
gdf = geo.boundaries("municipality").merge(wide["change"].reset_index(),
                                           on="geo_id")
px.choropleth_map(gdf, geojson=gdf.geometry, locations=gdf.index,
          color="change", hover_name="name",
          center={"lat": -16.3, "lon": -64}, zoom=4,
          labels={"change": "Change in the index (points)"},
          title="SDG 8: change in the index, ~2012 to ~2024")`,
      },
      {
        title: "Recompute the index from its indicators",
        text: "Rescales each indicator between the Atlas's worst and best values (Cuadro 21), caps it to 0-100 and averages the available ones, which reproduces the published index.",
        code: `${PYTHON_SETUP}
import pandas as pd

df = geo.load("sdg08", years=2024).set_index("geo_id")
bounds = {"sdg8_5_tgm": (36.1, 89.7), "sdg8_5_tgh": (68.6, 92.9), "sdg8_6_etm":
          (45.9, 4.8), "sdg8_6_eth": (38.6, 1.9), "sdg8_9_pot": (0, 10),
          "sdg8_9_pbt": (0, 10), "sdg8_10_dsb": (0, 88.7)}  # (worst, best)
scores = pd.DataFrame({v: 100 * (df[v] - w) / (b - w)
                       for v, (w, b) in bounds.items()}).clip(0, 100)
df["computed"] = scores.mean(axis=1)  # skips missing indicators
df["name"] = geo.units("municipality").set_index("geo_id")["name"]
px.scatter(df, x="computed", y="index_sdg8", hover_name="name",
           labels={"computed": "Computed from the indicators",
                   "index_sdg8": "Decent work and economic growth index (0-100)"},
           title="Recomputed vs published SDG 8 index, ~2024")`,
      },
      {
        title: "Which indicators moved",
        text: "Compares the mean rescaled score (0-100) of each indicator in the two periods: the gap between the dots is the progress, and the lowest dots are where the goal is furthest away.",
        code: `${PYTHON_SETUP}
import pandas as pd

df = geo.load("sdg08")
bounds = {"sdg8_5_tgm": (36.1, 89.7), "sdg8_5_tgh": (68.6, 92.9), "sdg8_6_etm":
          (45.9, 4.8), "sdg8_6_eth": (38.6, 1.9), "sdg8_9_pot": (0, 10),
          "sdg8_9_pbt": (0, 10), "sdg8_10_dsb": (0, 88.7)}  # (worst, best)
labels = geo.dictionary("sdg08").set_index("variable")["label"]
rows = [{"indicator": labels[v], "period": f"~{year}",
         "score": (100 * (part[v] - w) / (b - w)).clip(0, 100).mean()}
        for year, part in df.groupby("year") for v, (w, b) in bounds.items()]
px.scatter(pd.DataFrame(rows), x="score", y="indicator", color="period",
           labels={"score": "Mean rescaled score (0-100)", "indicator": ""},
           title="SDG 8 indicators, ~2012 and ~2024")`,
      },
      {
        title: "Rank the departments",
        text: "Averages the index within each department, weighting municipalities by their census population, in both periods.",
        code: `${PYTHON_SETUP}

df = geo.load("sdg08", variables="index_sdg8")
dep = geo.aggregate(df, to="department",
                    rules={"index_sdg8": "weighted_mean:population"},
                    weights=geo.load("sdg", variables="population"))
dep["department"] = dep["geo_id"].map(
    geo.units("department").set_index("geo_id")["name"])
dep["period"] = "~" + dep["year"].astype(str)
px.scatter(dep.sort_values("index_sdg8"), x="index_sdg8", y="department",
           color="period",
           labels={"index_sdg8": "Index (population-weighted)"},
           title="SDG 8 index by department, ~2012 and ~2024")`,
      },
    ],
  },
  {
    id: 'municipalities343-sdg09', type: 'indicator', section: 'indicators',
    title: "SDG 9: Industry, innovation and infrastructure",
    scope: "343 municipalities · 4 indicators and the SDG 9 index · ~2012 and ~2024",
    summary: "The SDG 9 (Industry, innovation and infrastructure) index of the SDG Atlas of Bolivia 2026 and its 4 indicators, trunk roads, internet access, telephones and mobile base stations, for every municipality near 2012 and near 2024.",
    description: "The SDG 9 (Industry, innovation and infrastructure) index of the Atlas de los ODS en Bolivia 2026 (Andersen and Argandoña, SDSN Bolivia) for Bolivia's 343 municipalities and indigenous autonomies (GAIOC), with the 4 indicators behind it: trunk roads crossing the municipality (number) (2012 and 2024); internet access, fixed or mobile (% of households) (2012 and 2024); mobile base stations (per 1,000 people) (2012 and 2024); fixed or mobile telephone (% of households) (2012 and 2024). Every indicator is measured twice, near the 2012 census and near the 2024 census, and the observatory stores the two values as 2012 and 2024 so that their change can be studied. The index runs from 0 (worst situation) to 100 (targets met): each indicator is rescaled linearly between a worst and a best value set by the Atlas, capped, so that higher is always better, and the index is the simple mean of the available rescaled indicators. Between the two periods the median index went from 21.2 to 51.8, and it rose in 343 of the 343 units.",
    geography: 'Municipality', units: 343, period: '~2012 and ~2024', frequency: 'Two periods (initial ~2012, final ~2024)', key: 'geo_id', idExample: 'BO-04-17-04',
    categories: ["Economy"], tags: ["SDGs", "SDG Atlas 2026", "infrastructure", "internet", "telecommunications"],
    image: 'images/indicators/sdg09.webp',
    imageAlt: "Map of the Industry, innovation and infrastructure index (0-100) near 2024 across Bolivia's 343 municipalities and indigenous autonomies in three natural-break classes: High 48.4 – 78.8 (217); Middle 27.3 – 48.4 (126); Low 1.3 – 27.3 (0). Highest: Nuestra Señora de La Paz, Padcaya and Curahuara de Carangas.",
    mapAlt: "Two maps of the Industry, innovation and infrastructure index (0-100) near 2012 and near 2024 across Bolivia's 343 municipalities and indigenous autonomies, in three natural-break classes shared by both periods. Legend: High 48.4 – 78.8 (5 units near 2012, 217 near 2024); Middle 27.3 – 48.4 (92 units near 2012, 126 near 2024); Low 1.3 – 27.3 (246 units near 2012, 0 near 2024). Highest near 2024: Nuestra Señora de La Paz, Padcaya and Curahuara de Carangas.",
    map: 'images/indicators/sdg09-map.webp',
    date: '2026-11-17', pinned: false, dataset: 'sdg09',
    notice: "Both periods are stored at nominal years: 2012 holds the Atlas's initial values (~2012) and 2024 its final values (~2024). Each indicator's actual reference years (e.g. 2008 and 2023 for the health survey, three-year averages for volatile indicators) are listed in its description under Variables. The four indigenous autonomies and municipalities created after 2012 have values in both periods.",
    code: {
      python: `${PYTHON_SETUP}

# The SDG 9 index (0-100, higher is better), ~2024
gdf = geo.load("sdg09", variables="index_sdg9", years=2024, geometry=True)
px.choropleth_map(gdf, geojson=gdf.geometry, locations=gdf.index,
          color="index_sdg9", hover_name="name",
          center={"lat": -16.3, "lon": -64}, zoom=4,
          labels={"index_sdg9": "Index (0-100)"},
          title="SDG 9 index, ~2024").show()

# The two periods: initial (~2012) and final (~2024) values
df = geo.load("sdg09", variables="index_sdg9")
wide = df.pivot(index="geo_id", columns="year", values="index_sdg9")
wide = wide.add_prefix("y")
wide["name"] = geo.units("municipality").set_index("geo_id")["name"]
px.scatter(wide, x="y2012", y="y2024", hover_name="name",
           labels={"y2012": "Index, ~2012", "y2024": "Index, ~2024"},
           title="SDG 9 index, ~2012 and ~2024")`,
      pandas: `import pandas as pd
import geopandas as gpd
import plotly.express as px

# No geo4bolivia needed: every file is a plain URL
BASE = "${RAW_URL}"
df = pd.read_csv(BASE + "data/municipality/sdg09.csv")  # geo_id, year, mun_id, ...
municipalities = gpd.read_file(BASE + "geo/boundaries/municipality.geojson")

index = df.loc[df["year"] == 2024, ["geo_id", "index_sdg9"]]
gdf = municipalities.merge(index, on="geo_id")
px.choropleth_map(gdf, geojson=gdf.geometry, locations=gdf.index,
          color="index_sdg9", hover_name="name",
          center={"lat": -16.3, "lon": -64}, zoom=4,
          labels={"index_sdg9": "Index (0-100)"},
          title="SDG 9 index, ~2024")`,
    },
    examples: [
      {
        title: "Map the change, ~2012 to ~2024",
        text: "Subtracts the initial index from the final one: positive values mark the municipalities that moved closer to the goal's targets.",
        code: `${PYTHON_SETUP}

df = geo.load("sdg09", variables="index_sdg9")
wide = df.pivot(index="geo_id", columns="year", values="index_sdg9")
wide["change"] = wide[2024] - wide[2012]
gdf = geo.boundaries("municipality").merge(wide["change"].reset_index(),
                                           on="geo_id")
px.choropleth_map(gdf, geojson=gdf.geometry, locations=gdf.index,
          color="change", hover_name="name",
          center={"lat": -16.3, "lon": -64}, zoom=4,
          labels={"change": "Change in the index (points)"},
          title="SDG 9: change in the index, ~2012 to ~2024")`,
      },
      {
        title: "Recompute the index from its indicators",
        text: "Rescales each indicator between the Atlas's worst and best values (Cuadro 21), caps it to 0-100 and averages the available ones, which reproduces the published index.",
        code: `${PYTHON_SETUP}
import pandas as pd

df = geo.load("sdg09", years=2024).set_index("geo_id")
bounds = {"sdg9_1_vpc": (0, 3), "sdg9_8_ci": (0, 100), "sdg9_8_drb": (0, 3),
          "sdg9_8_tfc": (0, 100)}  # (worst, best)
scores = pd.DataFrame({v: 100 * (df[v] - w) / (b - w)
                       for v, (w, b) in bounds.items()}).clip(0, 100)
df["computed"] = scores.mean(axis=1)  # skips missing indicators
df["name"] = geo.units("municipality").set_index("geo_id")["name"]
px.scatter(df, x="computed", y="index_sdg9", hover_name="name",
           labels={"computed": "Computed from the indicators",
                   "index_sdg9": "Index (0-100)"},
           title="Recomputed vs published SDG 9 index, ~2024")`,
      },
      {
        title: "Which indicators moved",
        text: "Compares the mean rescaled score (0-100) of each indicator in the two periods: the gap between the dots is the progress, and the lowest dots are where the goal is furthest away.",
        code: `${PYTHON_SETUP}
import pandas as pd

df = geo.load("sdg09")
bounds = {"sdg9_1_vpc": (0, 3), "sdg9_8_ci": (0, 100), "sdg9_8_drb": (0, 3),
          "sdg9_8_tfc": (0, 100)}  # (worst, best)
labels = geo.dictionary("sdg09").set_index("variable")["label"]
rows = [{"indicator": labels[v], "period": f"~{year}",
         "score": (100 * (part[v] - w) / (b - w)).clip(0, 100).mean()}
        for year, part in df.groupby("year") for v, (w, b) in bounds.items()]
px.scatter(pd.DataFrame(rows), x="score", y="indicator", color="period",
           labels={"score": "Mean rescaled score (0-100)", "indicator": ""},
           title="SDG 9 indicators, ~2012 and ~2024")`,
      },
      {
        title: "Rank the departments",
        text: "Averages the index within each department, weighting municipalities by their census population, in both periods.",
        code: `${PYTHON_SETUP}

df = geo.load("sdg09", variables="index_sdg9")
dep = geo.aggregate(df, to="department",
                    rules={"index_sdg9": "weighted_mean:population"},
                    weights=geo.load("sdg", variables="population"))
dep["department"] = dep["geo_id"].map(
    geo.units("department").set_index("geo_id")["name"])
dep["period"] = "~" + dep["year"].astype(str)
px.scatter(dep.sort_values("index_sdg9"), x="index_sdg9", y="department",
           color="period",
           labels={"index_sdg9": "Index (population-weighted)"},
           title="SDG 9 index by department, ~2012 and ~2024")`,
      },
    ],
  },
  {
    id: 'municipalities343-sdg10', type: 'indicator', section: 'indicators',
    title: "SDG 10: Reduced inequalities",
    scope: "343 municipalities · 6 indicators and the SDG 10 index · ~2012 and ~2024",
    summary: "The SDG 10 (Reduced inequalities) index of the SDG Atlas of Bolivia 2026 and its 6 indicators, people who do not speak Spanish, poverty gaps by ethnicity, migration and age, and the Gini coefficients of poverty and education, for every municipality near 2012 and near 2024.",
    description: "The SDG 10 (Reduced inequalities) index of the Atlas de los ODS en Bolivia 2026 (Andersen and Argandoña, SDSN Bolivia) for Bolivia's 343 municipalities and indigenous autonomies (GAIOC), with the 6 indicators behind it: population that does not speak Spanish (%) (2012 and 2024); parity of multidimensional poverty by ethnicity and language (non-indigenous/indigenous) (2012 and 2024); parity of multidimensional poverty by migration (non-migrant/migrant) (2012 and 2024); parity of multidimensional poverty for older people (younger/older head) (2012 and 2024); gini coefficient of multidimensional poverty (0-1) (2012 and 2024); gini coefficient of years of education, 25-65 (0-1) (2012 and 2024). Every indicator is measured twice, near the 2012 census and near the 2024 census, and the observatory stores the two values as 2012 and 2024 so that their change can be studied. The index runs from 0 (worst situation) to 100 (targets met): each indicator is rescaled linearly between a worst and a best value set by the Atlas, capped, so that higher is always better, and the index is the simple mean of the available rescaled indicators. Between the two periods the median index went from 80.8 to 81.1, and it rose in 212 of the 343 units.",
    geography: 'Municipality', units: 343, period: '~2012 and ~2024', frequency: 'Two periods (initial ~2012, final ~2024)', key: 'geo_id', idExample: 'BO-04-17-04',
    categories: ["Social"], tags: ["SDGs", "SDG Atlas 2026", "inequality", "language", "poverty gaps"],
    image: 'images/indicators/sdg10.webp',
    imageAlt: "Map of the Reduced inequalities index (0-100) near 2024 across Bolivia's 343 municipalities and indigenous autonomies in three natural-break classes: High 82.6 – 95.2 (135); Middle 73.7 – 82.6 (166); Low 59.6 – 73.7 (42). Highest: Yunguyo del Litoral, Cobija and Riberalta.",
    mapAlt: "Two maps of the Reduced inequalities index (0-100) near 2012 and near 2024 across Bolivia's 343 municipalities and indigenous autonomies, in three natural-break classes shared by both periods. Legend: High 82.6 – 95.2 (143 units near 2012, 135 near 2024); Middle 73.7 – 82.6 (116 units near 2012, 166 near 2024); Low 59.6 – 73.7 (84 units near 2012, 42 near 2024). Highest near 2024: Yunguyo del Litoral, Cobija and Riberalta.",
    map: 'images/indicators/sdg10-map.webp',
    date: '2026-11-17', pinned: false, dataset: 'sdg10',
    notice: "Both periods are stored at nominal years: 2012 holds the Atlas's initial values (~2012) and 2024 its final values (~2024). Each indicator's actual reference years (e.g. 2008 and 2023 for the health survey, three-year averages for volatile indicators) are listed in its description under Variables. The four indigenous autonomies and municipalities created after 2012 have values in both periods.",
    code: {
      python: `${PYTHON_SETUP}

# The SDG 10 index (0-100, higher is better), ~2024
gdf = geo.load("sdg10", variables="index_sdg10", years=2024, geometry=True)
px.choropleth_map(gdf, geojson=gdf.geometry, locations=gdf.index,
          color="index_sdg10", hover_name="name",
          center={"lat": -16.3, "lon": -64}, zoom=4,
          labels={"index_sdg10": "Reduced inequalities index (0-100)"},
          title="SDG 10: Reduced inequalities index, ~2024").show()

# The two periods: initial (~2012) and final (~2024) values
df = geo.load("sdg10", variables="index_sdg10")
wide = df.pivot(index="geo_id", columns="year", values="index_sdg10")
wide = wide.add_prefix("y")
wide["name"] = geo.units("municipality").set_index("geo_id")["name"]
px.scatter(wide, x="y2012", y="y2024", hover_name="name",
           labels={"y2012": "Index, ~2012", "y2024": "Index, ~2024"},
           title="SDG 10: Reduced inequalities index, ~2012 and ~2024")`,
      pandas: `import pandas as pd
import geopandas as gpd
import plotly.express as px

# No geo4bolivia needed: every file is a plain URL
BASE = "${RAW_URL}"
df = pd.read_csv(BASE + "data/municipality/sdg10.csv")  # geo_id, year, mun_id, ...
municipalities = gpd.read_file(BASE + "geo/boundaries/municipality.geojson")

index = df.loc[df["year"] == 2024, ["geo_id", "index_sdg10"]]
gdf = municipalities.merge(index, on="geo_id")
px.choropleth_map(gdf, geojson=gdf.geometry, locations=gdf.index,
          color="index_sdg10", hover_name="name",
          center={"lat": -16.3, "lon": -64}, zoom=4,
          labels={"index_sdg10": "Reduced inequalities index (0-100)"},
          title="SDG 10: Reduced inequalities index, ~2024")`,
    },
    examples: [
      {
        title: "Map the change, ~2012 to ~2024",
        text: "Subtracts the initial index from the final one: positive values mark the municipalities that moved closer to the goal's targets.",
        code: `${PYTHON_SETUP}

df = geo.load("sdg10", variables="index_sdg10")
wide = df.pivot(index="geo_id", columns="year", values="index_sdg10")
wide["change"] = wide[2024] - wide[2012]
gdf = geo.boundaries("municipality").merge(wide["change"].reset_index(),
                                           on="geo_id")
px.choropleth_map(gdf, geojson=gdf.geometry, locations=gdf.index,
          color="change", hover_name="name",
          center={"lat": -16.3, "lon": -64}, zoom=4,
          labels={"change": "Change in the index (points)"},
          title="SDG 10: change in the index, ~2012 to ~2024")`,
      },
      {
        title: "Recompute the index from its indicators",
        text: "Rescales each indicator between the Atlas's worst and best values (Cuadro 21), caps it to 0-100 and averages the available ones, which reproduces the published index.",
        code: `${PYTHON_SETUP}
import pandas as pd

df = geo.load("sdg10", years=2024).set_index("geo_id")
bounds = {"sdg10_2_esp": (48.1, 1), "sdg10_2_pel": (0, 1), "sdg10_2_mre": (0, 1),
          "sdg10_2_tpm": (0, 1), "sdg10_2_gip": (1, 0), "sdg10_4_gin": (1,
          0)}  # (worst, best)
scores = pd.DataFrame({v: 100 * (df[v] - w) / (b - w)
                       for v, (w, b) in bounds.items()}).clip(0, 100)
df["computed"] = scores.mean(axis=1)  # skips missing indicators
df["name"] = geo.units("municipality").set_index("geo_id")["name"]
px.scatter(df, x="computed", y="index_sdg10", hover_name="name",
           labels={"computed": "Computed from the indicators",
                   "index_sdg10": "Reduced inequalities index (0-100)"},
           title="Recomputed vs published SDG 10 index, ~2024")`,
      },
      {
        title: "Which indicators moved",
        text: "Compares the mean rescaled score (0-100) of each indicator in the two periods: the gap between the dots is the progress, and the lowest dots are where the goal is furthest away.",
        code: `${PYTHON_SETUP}
import pandas as pd

df = geo.load("sdg10")
bounds = {"sdg10_2_esp": (48.1, 1), "sdg10_2_pel": (0, 1), "sdg10_2_mre": (0, 1),
          "sdg10_2_tpm": (0, 1), "sdg10_2_gip": (1, 0), "sdg10_4_gin": (1,
          0)}  # (worst, best)
labels = geo.dictionary("sdg10").set_index("variable")["label"]
rows = [{"indicator": labels[v], "period": f"~{year}",
         "score": (100 * (part[v] - w) / (b - w)).clip(0, 100).mean()}
        for year, part in df.groupby("year") for v, (w, b) in bounds.items()]
px.scatter(pd.DataFrame(rows), x="score", y="indicator", color="period",
           labels={"score": "Mean rescaled score (0-100)", "indicator": ""},
           title="SDG 10 indicators, ~2012 and ~2024")`,
      },
      {
        title: "Rank the departments",
        text: "Averages the index within each department, weighting municipalities by their census population, in both periods.",
        code: `${PYTHON_SETUP}

df = geo.load("sdg10", variables="index_sdg10")
dep = geo.aggregate(df, to="department",
                    rules={"index_sdg10": "weighted_mean:population"},
                    weights=geo.load("sdg", variables="population"))
dep["department"] = dep["geo_id"].map(
    geo.units("department").set_index("geo_id")["name"])
dep["period"] = "~" + dep["year"].astype(str)
px.scatter(dep.sort_values("index_sdg10"), x="index_sdg10", y="department",
           color="period",
           labels={"index_sdg10": "Index (population-weighted)"},
           title="SDG 10 index by department, ~2012 and ~2024")`,
      },
    ],
  },
  {
    id: 'municipalities343-sdg11', type: 'indicator', section: 'indicators',
    title: "SDG 11: Sustainable cities and communities",
    scope: "343 municipalities · 7 indicators and the SDG 11 index · ~2012 and ~2024",
    summary: "The SDG 11 (Sustainable cities and communities) index of the SDG Atlas of Bolivia 2026 and its 7 indicators, overcrowding, toilets, adequate housing, public transport, solid-waste spending and collection, and PM2.5 pollution, for every municipality near 2012 and near 2024.",
    description: "The SDG 11 (Sustainable cities and communities) index of the Atlas de los ODS en Bolivia 2026 (Andersen and Argandoña, SDSN Bolivia) for Bolivia's 343 municipalities and indigenous autonomies (GAIOC), with the 7 indicators behind it: overcrowded households (%) (2012 and 2024); households without a toilet (%) (2012 and 2024); adequate housing (% of dwellings) (2012 and 2024); public-transport seats (per 1,000 people) (2012 and 2024); public spending on solid waste (Bs per person per year) (average 2012–2014 and average 2022–2024); solid-waste collection (% of dwellings) (2012 and 2024); PM2.5 concentration (µg/m³) (average 2010–2012 and average 2021–2023). Every indicator is measured twice, near the 2012 census and near the 2024 census, and the observatory stores the two values as 2012 and 2024 so that their change can be studied. The index runs from 0 (worst situation) to 100 (targets met): each indicator is rescaled linearly between a worst and a best value set by the Atlas, capped, so that higher is always better, and the index is the simple mean of the available rescaled indicators. Between the two periods the median index went from 26.0 to 37.2, and it rose in 340 of the 343 units.",
    geography: 'Municipality', units: 343, period: '~2012 and ~2024', frequency: 'Two periods (initial ~2012, final ~2024)', key: 'geo_id', idExample: 'BO-04-17-04',
    categories: ["Social"], tags: ["SDGs", "SDG Atlas 2026", "cities", "housing", "air pollution"],
    image: 'images/indicators/sdg11.webp',
    imageAlt: "Map of the Sustainable cities and communities index (0-100) near 2024 across Bolivia's 343 municipalities and indigenous autonomies in three natural-break classes: High 48.9 – 88.1 (60); Middle 30.7 – 48.9 (192); Low 7.6 – 30.7 (91). Highest: Nuestra Señora de La Paz, El Alto and Tarija.",
    mapAlt: "Two maps of the Sustainable cities and communities index (0-100) near 2012 and near 2024 across Bolivia's 343 municipalities and indigenous autonomies, in three natural-break classes shared by both periods. Legend: High 48.9 – 88.1 (16 units near 2012, 60 near 2024); Middle 30.7 – 48.9 (83 units near 2012, 192 near 2024); Low 7.6 – 30.7 (244 units near 2012, 91 near 2024). Highest near 2024: Nuestra Señora de La Paz, El Alto and Tarija.",
    map: 'images/indicators/sdg11-map.webp',
    date: '2026-11-17', pinned: false, dataset: 'sdg11',
    notice: "Both periods are stored at nominal years: 2012 holds the Atlas's initial values (~2012) and 2024 its final values (~2024). Each indicator's actual reference years (e.g. 2008 and 2023 for the health survey, three-year averages for volatile indicators) are listed in its description under Variables. The four indigenous autonomies and municipalities created after 2012 have values in both periods.",
    code: {
      python: `${PYTHON_SETUP}

# The SDG 11 index (0-100, higher is better), ~2024
gdf = geo.load("sdg11", variables="index_sdg11", years=2024, geometry=True)
px.choropleth_map(gdf, geojson=gdf.geometry, locations=gdf.index,
          color="index_sdg11", hover_name="name",
          center={"lat": -16.3, "lon": -64}, zoom=4,
          labels={"index_sdg11": "Index (0-100)"},
          title="SDG 11: Sustainable cities and communities index, ~2024").show()

# The two periods: initial (~2012) and final (~2024) values
df = geo.load("sdg11", variables="index_sdg11")
wide = df.pivot(index="geo_id", columns="year", values="index_sdg11")
wide = wide.add_prefix("y")
wide["name"] = geo.units("municipality").set_index("geo_id")["name"]
px.scatter(wide, x="y2012", y="y2024", hover_name="name",
           labels={"y2012": "Index, ~2012", "y2024": "Index, ~2024"},
           title="SDG 11 index, ~2012 and ~2024")`,
      pandas: `import pandas as pd
import geopandas as gpd
import plotly.express as px

# No geo4bolivia needed: every file is a plain URL
BASE = "${RAW_URL}"
df = pd.read_csv(BASE + "data/municipality/sdg11.csv")  # geo_id, year, mun_id, ...
municipalities = gpd.read_file(BASE + "geo/boundaries/municipality.geojson")

index = df.loc[df["year"] == 2024, ["geo_id", "index_sdg11"]]
gdf = municipalities.merge(index, on="geo_id")
px.choropleth_map(gdf, geojson=gdf.geometry, locations=gdf.index,
          color="index_sdg11", hover_name="name",
          center={"lat": -16.3, "lon": -64}, zoom=4,
          labels={"index_sdg11": "Index (0-100)"},
          title="SDG 11: Sustainable cities and communities index, ~2024")`,
    },
    examples: [
      {
        title: "Map the change, ~2012 to ~2024",
        text: "Subtracts the initial index from the final one: positive values mark the municipalities that moved closer to the goal's targets.",
        code: `${PYTHON_SETUP}

df = geo.load("sdg11", variables="index_sdg11")
wide = df.pivot(index="geo_id", columns="year", values="index_sdg11")
wide["change"] = wide[2024] - wide[2012]
gdf = geo.boundaries("municipality").merge(wide["change"].reset_index(),
                                           on="geo_id")
px.choropleth_map(gdf, geojson=gdf.geometry, locations=gdf.index,
          color="change", hover_name="name",
          center={"lat": -16.3, "lon": -64}, zoom=4,
          labels={"change": "Change in the index (points)"},
          title="SDG 11: change in the index, ~2012 to ~2024")`,
      },
      {
        title: "Recompute the index from its indicators",
        text: "Rescales each indicator between the Atlas's worst and best values (Cuadro 21), caps it to 0-100 and averages the available ones, which reproduces the published index.",
        code: `${PYTHON_SETUP}
import pandas as pd

df = geo.load("sdg11", years=2024).set_index("geo_id")
bounds = {"sdg11_1_thm": (68.2, 12.6), "sdg11_1_ssb": (100, 0), "sdg11_1_ava": (0,
          100), "sdg11_2_atc": (0, 342), "sdg11_6_ipr": (0, 287.7),
          "sdg11_6_srr": (0, 100), "sdg11_6_ica": (31, 5)}  # (worst, best)
scores = pd.DataFrame({v: 100 * (df[v] - w) / (b - w)
                       for v, (w, b) in bounds.items()}).clip(0, 100)
df["computed"] = scores.mean(axis=1)  # skips missing indicators
df["name"] = geo.units("municipality").set_index("geo_id")["name"]
px.scatter(df, x="computed", y="index_sdg11", hover_name="name",
           labels={"computed": "Computed from the indicators",
                   "index_sdg11": "Index (0-100)"},
           title="Recomputed vs published SDG 11 index, ~2024")`,
      },
      {
        title: "Which indicators moved",
        text: "Compares the mean rescaled score (0-100) of each indicator in the two periods: the gap between the dots is the progress, and the lowest dots are where the goal is furthest away.",
        code: `${PYTHON_SETUP}
import pandas as pd

df = geo.load("sdg11")
bounds = {"sdg11_1_thm": (68.2, 12.6), "sdg11_1_ssb": (100, 0), "sdg11_1_ava": (0,
          100), "sdg11_2_atc": (0, 342), "sdg11_6_ipr": (0, 287.7),
          "sdg11_6_srr": (0, 100), "sdg11_6_ica": (31, 5)}  # (worst, best)
labels = geo.dictionary("sdg11").set_index("variable")["label"]
rows = [{"indicator": labels[v], "period": f"~{year}",
         "score": (100 * (part[v] - w) / (b - w)).clip(0, 100).mean()}
        for year, part in df.groupby("year") for v, (w, b) in bounds.items()]
px.scatter(pd.DataFrame(rows), x="score", y="indicator", color="period",
           labels={"score": "Mean rescaled score (0-100)", "indicator": ""},
           title="SDG 11 indicators, ~2012 and ~2024")`,
      },
      {
        title: "Rank the departments",
        text: "Averages the index within each department, weighting municipalities by their census population, in both periods.",
        code: `${PYTHON_SETUP}

df = geo.load("sdg11", variables="index_sdg11")
dep = geo.aggregate(df, to="department",
                    rules={"index_sdg11": "weighted_mean:population"},
                    weights=geo.load("sdg", variables="population"))
dep["department"] = dep["geo_id"].map(
    geo.units("department").set_index("geo_id")["name"])
dep["period"] = "~" + dep["year"].astype(str)
px.scatter(dep.sort_values("index_sdg11"), x="index_sdg11", y="department",
           color="period",
           labels={"index_sdg11": "Index (population-weighted)"},
           title="SDG 11 index by department, ~2012 and ~2024")`,
      },
    ],
  },
  {
    id: 'municipalities343-sdg13', type: 'indicator', section: 'indicators',
    title: "SDG 13: Climate action",
    scope: "343 municipalities · 5 indicators and the SDG 13 index · ~2012 and ~2024",
    summary: "The SDG 13 (Climate action) index of the SDG Atlas of Bolivia 2026 and its 5 indicators, families hit by extreme climate events, climate-change vulnerability and CO2 emissions from forest loss, transport and fires, for every municipality near 2012 and near 2024.",
    description: "The SDG 13 (Climate action) index of the Atlas de los ODS en Bolivia 2026 (Andersen and Argandoña, SDSN Bolivia) for Bolivia's 343 municipalities and indigenous autonomies (GAIOC), with the 5 indicators behind it: families affected by extreme climate events (%) (average 2011–2013 and average 2021–2023); climate-change vulnerability index (0-3) (2012 and 2024); CO2 emissions from forest loss (t per person per year) (average 2011–2013 and average 2021–2023); CO2 emissions from transport (t per person per year) (2015 and 2024); CO2 emissions from fires (t per person per year) (average 2011–2013 and average 2020–2022). Every indicator is measured twice, near the 2012 census and near the 2024 census, and the observatory stores the two values as 2012 and 2024 so that their change can be studied. The index runs from 0 (worst situation) to 100 (targets met): each indicator is rescaled linearly between a worst and a best value set by the Atlas, capped, so that higher is always better, and the index is the simple mean of the available rescaled indicators. Between the two periods the median index went from 82.6 to 72.8, and it rose in 75 of the 343 units. Some indicators are missing for part of the units (CO2 emissions from forest loss (t per person per year)); the index averages the available ones.",
    geography: 'Municipality', units: 343, period: '~2012 and ~2024', frequency: 'Two periods (initial ~2012, final ~2024)', key: 'geo_id', idExample: 'BO-04-17-04',
    categories: ["Environment"], tags: ["SDGs", "SDG Atlas 2026", "climate change", "CO₂ emissions", "extreme events"],
    image: 'images/indicators/sdg13.webp',
    imageAlt: "Map of the Climate action index (0-100) near 2024 across Bolivia's 343 municipalities and indigenous autonomies in three natural-break classes: High 78.6 – 100.0 (118); Middle 61.2 – 78.6 (149); Low 27.4 – 61.2 (76). Highest: El Alto, Villazón and Sipesipe.",
    mapAlt: "Two maps of the Climate action index (0-100) near 2012 and near 2024 across Bolivia's 343 municipalities and indigenous autonomies, in three natural-break classes shared by both periods. Legend: High 78.6 – 100.0 (243 units near 2012, 118 near 2024); Middle 61.2 – 78.6 (60 units near 2012, 149 near 2024); Low 27.4 – 61.2 (40 units near 2012, 76 near 2024). Highest near 2024: El Alto, Villazón and Sipesipe.",
    map: 'images/indicators/sdg13-map.webp',
    date: '2026-11-17', pinned: false, dataset: 'sdg13',
    notice: "Both periods are stored at nominal years: 2012 holds the Atlas's initial values (~2012) and 2024 its final values (~2024). Each indicator's actual reference years (e.g. 2008 and 2023 for the health survey, three-year averages for volatile indicators) are listed in its description under Variables. The four indigenous autonomies and municipalities created after 2012 have values in both periods.",
    code: {
      python: `${PYTHON_SETUP}

# The SDG 13 index (0-100, higher is better), ~2024
gdf = geo.load("sdg13", variables="index_sdg13", years=2024, geometry=True)
px.choropleth_map(gdf, geojson=gdf.geometry, locations=gdf.index,
          color="index_sdg13", hover_name="name",
          center={"lat": -16.3, "lon": -64}, zoom=4,
          labels={"index_sdg13": "Climate action index (0-100)"},
          title="SDG 13: Climate action index, ~2024").show()

# The two periods: initial (~2012) and final (~2024) values
df = geo.load("sdg13", variables="index_sdg13")
wide = df.pivot(index="geo_id", columns="year", values="index_sdg13")
wide = wide.add_prefix("y")
wide["name"] = geo.units("municipality").set_index("geo_id")["name"]
px.scatter(wide, x="y2012", y="y2024", hover_name="name",
           labels={"y2012": "Index, ~2012", "y2024": "Index, ~2024"},
           title="SDG 13: Climate action index, ~2012 and ~2024")`,
      pandas: `import pandas as pd
import geopandas as gpd
import plotly.express as px

# No geo4bolivia needed: every file is a plain URL
BASE = "${RAW_URL}"
df = pd.read_csv(BASE + "data/municipality/sdg13.csv")  # geo_id, year, mun_id, ...
municipalities = gpd.read_file(BASE + "geo/boundaries/municipality.geojson")

index = df.loc[df["year"] == 2024, ["geo_id", "index_sdg13"]]
gdf = municipalities.merge(index, on="geo_id")
px.choropleth_map(gdf, geojson=gdf.geometry, locations=gdf.index,
          color="index_sdg13", hover_name="name",
          center={"lat": -16.3, "lon": -64}, zoom=4,
          labels={"index_sdg13": "Climate action index (0-100)"},
          title="SDG 13: Climate action index, ~2024")`,
    },
    examples: [
      {
        title: "Map the change, ~2012 to ~2024",
        text: "Subtracts the initial index from the final one: positive values mark the municipalities that moved closer to the goal's targets.",
        code: `${PYTHON_SETUP}

df = geo.load("sdg13", variables="index_sdg13")
wide = df.pivot(index="geo_id", columns="year", values="index_sdg13")
wide["change"] = wide[2024] - wide[2012]
gdf = geo.boundaries("municipality").merge(wide["change"].reset_index(),
                                           on="geo_id")
px.choropleth_map(gdf, geojson=gdf.geometry, locations=gdf.index,
          color="change", hover_name="name",
          center={"lat": -16.3, "lon": -64}, zoom=4,
          labels={"change": "Change in the index (points)"},
          title="SDG 13: change in the index, ~2012 to ~2024")`,
      },
      {
        title: "Recompute the index from its indicators",
        text: "Rescales each indicator between the Atlas's worst and best values (Cuadro 21), caps it to 0-100 and averages the available ones, which reproduces the published index.",
        code: `${PYTHON_SETUP}
import pandas as pd

df = geo.load("sdg13", years=2024).set_index("geo_id")
bounds = {"sdg13_1_fec": (87.6, 0), "sdg13_1_icc": (3, 0), "sdg13_2_epb": (44.9, 0),
          "sdg13_2_ect": (5.9, 0), "sdg13_2_eci": (38.6, 0)}  # (worst, best)
scores = pd.DataFrame({v: 100 * (df[v] - w) / (b - w)
                       for v, (w, b) in bounds.items()}).clip(0, 100)
df["computed"] = scores.mean(axis=1)  # skips missing indicators
df["name"] = geo.units("municipality").set_index("geo_id")["name"]
px.scatter(df, x="computed", y="index_sdg13", hover_name="name",
           labels={"computed": "Computed from the indicators",
                   "index_sdg13": "Climate action index (0-100)"},
           title="Recomputed vs published SDG 13 index, ~2024")`,
      },
      {
        title: "Which indicators moved",
        text: "Compares the mean rescaled score (0-100) of each indicator in the two periods: the gap between the dots is the progress, and the lowest dots are where the goal is furthest away.",
        code: `${PYTHON_SETUP}
import pandas as pd

df = geo.load("sdg13")
bounds = {"sdg13_1_fec": (87.6, 0), "sdg13_1_icc": (3, 0), "sdg13_2_epb": (44.9, 0),
          "sdg13_2_ect": (5.9, 0), "sdg13_2_eci": (38.6, 0)}  # (worst, best)
labels = geo.dictionary("sdg13").set_index("variable")["label"]
rows = [{"indicator": labels[v], "period": f"~{year}",
         "score": (100 * (part[v] - w) / (b - w)).clip(0, 100).mean()}
        for year, part in df.groupby("year") for v, (w, b) in bounds.items()]
px.scatter(pd.DataFrame(rows), x="score", y="indicator", color="period",
           labels={"score": "Mean rescaled score (0-100)", "indicator": ""},
           title="SDG 13 indicators, ~2012 and ~2024")`,
      },
      {
        title: "Rank the departments",
        text: "Averages the index within each department, weighting municipalities by their census population, in both periods.",
        code: `${PYTHON_SETUP}

df = geo.load("sdg13", variables="index_sdg13")
dep = geo.aggregate(df, to="department",
                    rules={"index_sdg13": "weighted_mean:population"},
                    weights=geo.load("sdg", variables="population"))
dep["department"] = dep["geo_id"].map(
    geo.units("department").set_index("geo_id")["name"])
dep["period"] = "~" + dep["year"].astype(str)
px.scatter(dep.sort_values("index_sdg13"), x="index_sdg13", y="department",
           color="period",
           labels={"index_sdg13": "Index (population-weighted)"},
           title="SDG 13 index by department, ~2012 and ~2024")`,
      },
    ],
  },
  {
    id: 'municipalities343-sdg15', type: 'indicator', section: 'indicators',
    title: "SDG 15: Life on land",
    scope: "343 municipalities · 4 indicators and the SDG 15 index · ~2012 and ~2024",
    summary: "The SDG 15 (Life on land) index of the SDG Atlas of Bolivia 2026 and its 4 indicators, protected areas, forest loss and biodiversity loss from deforestation and fires, for every municipality near 2012 and near 2024.",
    description: "The SDG 15 (Life on land) index of the Atlas de los ODS en Bolivia 2026 (Andersen and Argandoña, SDSN Bolivia) for Bolivia's 343 municipalities and indigenous autonomies (GAIOC), with the 4 indicators behind it: area declared protected (%) (2012 and 2025); forest loss rate (% per year) (average 2012–2014 and average 2022–2024); biodiversity loss from deforestation (index) (2012 and 2024); biodiversity loss from fires (index) (2012 and 2024). Every indicator is measured twice, near the 2012 census and near the 2024 census, and the observatory stores the two values as 2012 and 2024 so that their change can be studied. The index runs from 0 (worst situation) to 100 (targets met): each indicator is rescaled linearly between a worst and a best value set by the Atlas, capped, so that higher is always better, and the index is the simple mean of the available rescaled indicators. Between the two periods the median index went from 55.5 to 54.2, and it rose in 103 of the 343 units. Some indicators are missing for part of the units (Forest loss rate (% per year) and Biodiversity loss from deforestation (index)); the index averages the available ones.",
    geography: 'Municipality', units: 343, period: '~2012 and ~2024', frequency: 'Two periods (initial ~2012, final ~2024)', key: 'geo_id', idExample: 'BO-04-17-04',
    categories: ["Environment"], tags: ["SDGs", "SDG Atlas 2026", "protected areas", "deforestation", "biodiversity"],
    image: 'images/indicators/sdg15.webp',
    imageAlt: "Map of the Life on land index (0-100) near 2024 across Bolivia's 343 municipalities and indigenous autonomies in three natural-break classes: High 81.0 – 100.0 (56); Middle 60.1 – 81.0 (95); Low 9.0 – 60.1 (192). Highest: Eucaliptus, Santos Mercado and Nueva Esperanza.",
    mapAlt: "Two maps of the Life on land index (0-100) near 2012 and near 2024 across Bolivia's 343 municipalities and indigenous autonomies, in three natural-break classes shared by both periods. Legend: High 81.0 – 100.0 (50 units near 2012, 56 near 2024); Middle 60.1 – 81.0 (111 units near 2012, 95 near 2024); Low 9.0 – 60.1 (182 units near 2012, 192 near 2024). Highest near 2024: Eucaliptus, Santos Mercado and Nueva Esperanza.",
    map: 'images/indicators/sdg15-map.webp',
    date: '2026-11-17', pinned: false, dataset: 'sdg15',
    notice: "Both periods are stored at nominal years: 2012 holds the Atlas's initial values (~2012) and 2024 its final values (~2024). Each indicator's actual reference years (e.g. 2008 and 2023 for the health survey, three-year averages for volatile indicators) are listed in its description under Variables. The four indigenous autonomies and municipalities created after 2012 have values in both periods.",
    code: {
      python: `${PYTHON_SETUP}

# The SDG 15 index (0-100, higher is better), ~2024
gdf = geo.load("sdg15", variables="index_sdg15", years=2024, geometry=True)
px.choropleth_map(gdf, geojson=gdf.geometry, locations=gdf.index,
          color="index_sdg15", hover_name="name",
          center={"lat": -16.3, "lon": -64}, zoom=4,
          labels={"index_sdg15": "Life on land index (0-100)"},
          title="SDG 15: Life on land index, ~2024").show()

# The two periods: initial (~2012) and final (~2024) values
df = geo.load("sdg15", variables="index_sdg15")
wide = df.pivot(index="geo_id", columns="year", values="index_sdg15")
wide = wide.add_prefix("y")
wide["name"] = geo.units("municipality").set_index("geo_id")["name"]
px.scatter(wide, x="y2012", y="y2024", hover_name="name",
           labels={"y2012": "Index, ~2012", "y2024": "Index, ~2024"},
           title="SDG 15: Life on land index, ~2012 and ~2024")`,
      pandas: `import pandas as pd
import geopandas as gpd
import plotly.express as px

# No geo4bolivia needed: every file is a plain URL
BASE = "${RAW_URL}"
df = pd.read_csv(BASE + "data/municipality/sdg15.csv")  # geo_id, year, mun_id, ...
municipalities = gpd.read_file(BASE + "geo/boundaries/municipality.geojson")

index = df.loc[df["year"] == 2024, ["geo_id", "index_sdg15"]]
gdf = municipalities.merge(index, on="geo_id")
px.choropleth_map(gdf, geojson=gdf.geometry, locations=gdf.index,
          color="index_sdg15", hover_name="name",
          center={"lat": -16.3, "lon": -64}, zoom=4,
          labels={"index_sdg15": "Life on land index (0-100)"},
          title="SDG 15: Life on land index, ~2024")`,
    },
    examples: [
      {
        title: "Map the change, ~2012 to ~2024",
        text: "Subtracts the initial index from the final one: positive values mark the municipalities that moved closer to the goal's targets.",
        code: `${PYTHON_SETUP}

df = geo.load("sdg15", variables="index_sdg15")
wide = df.pivot(index="geo_id", columns="year", values="index_sdg15")
wide["change"] = wide[2024] - wide[2012]
gdf = geo.boundaries("municipality").merge(wide["change"].reset_index(),
                                           on="geo_id")
px.choropleth_map(gdf, geojson=gdf.geometry, locations=gdf.index,
          color="change", hover_name="name",
          center={"lat": -16.3, "lon": -64}, zoom=4,
          labels={"change": "Change in the index (points)"},
          title="SDG 15: change in the index, ~2012 to ~2024")`,
      },
      {
        title: "Recompute the index from its indicators",
        text: "Rescales each indicator between the Atlas's worst and best values (Cuadro 21), caps it to 0-100 and averages the available ones, which reproduces the published index.",
        code: `${PYTHON_SETUP}
import pandas as pd

df = geo.load("sdg15", years=2024).set_index("geo_id")
bounds = {"sdg15_1_sap": (0, 60), "sdg15_2_tpb": (7.3, 0), "sdg15_5_pbd": (2, 0),
          "sdg15_5_pbi": (9.1, 0)}  # (worst, best)
scores = pd.DataFrame({v: 100 * (df[v] - w) / (b - w)
                       for v, (w, b) in bounds.items()}).clip(0, 100)
df["computed"] = scores.mean(axis=1)  # skips missing indicators
df["name"] = geo.units("municipality").set_index("geo_id")["name"]
px.scatter(df, x="computed", y="index_sdg15", hover_name="name",
           labels={"computed": "Computed from the indicators",
                   "index_sdg15": "Life on land index (0-100)"},
           title="Recomputed vs published SDG 15 index, ~2024")`,
      },
      {
        title: "Which indicators moved",
        text: "Compares the mean rescaled score (0-100) of each indicator in the two periods: the gap between the dots is the progress, and the lowest dots are where the goal is furthest away.",
        code: `${PYTHON_SETUP}
import pandas as pd

df = geo.load("sdg15")
bounds = {"sdg15_1_sap": (0, 60), "sdg15_2_tpb": (7.3, 0), "sdg15_5_pbd": (2, 0),
          "sdg15_5_pbi": (9.1, 0)}  # (worst, best)
labels = geo.dictionary("sdg15").set_index("variable")["label"]
rows = [{"indicator": labels[v], "period": f"~{year}",
         "score": (100 * (part[v] - w) / (b - w)).clip(0, 100).mean()}
        for year, part in df.groupby("year") for v, (w, b) in bounds.items()]
px.scatter(pd.DataFrame(rows), x="score", y="indicator", color="period",
           labels={"score": "Mean rescaled score (0-100)", "indicator": ""},
           title="SDG 15 indicators, ~2012 and ~2024")`,
      },
      {
        title: "Rank the departments",
        text: "Averages the index within each department, weighting municipalities by their census population, in both periods.",
        code: `${PYTHON_SETUP}

df = geo.load("sdg15", variables="index_sdg15")
dep = geo.aggregate(df, to="department",
                    rules={"index_sdg15": "weighted_mean:population"},
                    weights=geo.load("sdg", variables="population"))
dep["department"] = dep["geo_id"].map(
    geo.units("department").set_index("geo_id")["name"])
dep["period"] = "~" + dep["year"].astype(str)
px.scatter(dep.sort_values("index_sdg15"), x="index_sdg15", y="department",
           color="period",
           labels={"index_sdg15": "Index (population-weighted)"},
           title="SDG 15 index by department, ~2012 and ~2024")`,
      },
    ],
  },
  {
    id: 'municipalities343-sdg16', type: 'indicator', section: 'indicators',
    title: "SDG 16: Peace, justice and strong institutions",
    scope: "343 municipalities · 4 indicators and the SDG 16 index · ~2012 and ~2024",
    summary: "The SDG 16 (Peace, justice and strong institutions) index of the SDG Atlas of Bolivia 2026 and its 4 indicators, homicides, municipal budget execution, social conflicts and birth registration, for every municipality near 2012 and near 2024.",
    description: "The SDG 16 (Peace, justice and strong institutions) index of the Atlas de los ODS en Bolivia 2026 (Andersen and Argandoña, SDSN Bolivia) for Bolivia's 343 municipalities and indigenous autonomies (GAIOC), with the 4 indicators behind it: homicide rate (per 100,000 people) (average 2017–2019 and average 2022–2024); budget execution (%) (average 2011–2013 and average 2021–2023); social conflicts (events per year) (average 2018–2020 and average 2022–2024); children under 5 in the civil registry (%) (2012 and 2024). Every indicator is measured twice, near the 2012 census and near the 2024 census, and the observatory stores the two values as 2012 and 2024 so that their change can be studied. The index runs from 0 (worst situation) to 100 (targets met): each indicator is rescaled linearly between a worst and a best value set by the Atlas, capped, so that higher is always better, and the index is the simple mean of the available rescaled indicators. Between the two periods the median index went from 77.5 to 85.5, and it rose in 272 of the 343 units.",
    geography: 'Municipality', units: 343, period: '~2012 and ~2024', frequency: 'Two periods (initial ~2012, final ~2024)', key: 'geo_id', idExample: 'BO-04-17-04',
    categories: ["Institutions"], tags: ["SDGs", "SDG Atlas 2026", "homicides", "municipal finance", "birth registration"],
    image: 'images/indicators/sdg16.webp',
    imageAlt: "Map of the Peace, justice and strong institutions index (0-100) near 2024 across Bolivia's 343 municipalities and indigenous autonomies in three natural-break classes: High 82.1 – 96.3 (211); Middle 66.9 – 82.1 (72); Low 32.9 – 66.9 (60). Highest: San Pedro, Tomina and Porvenir.",
    mapAlt: "Two maps of the Peace, justice and strong institutions index (0-100) near 2012 and near 2024 across Bolivia's 343 municipalities and indigenous autonomies, in three natural-break classes shared by both periods. Legend: High 82.1 – 96.3 (79 units near 2012, 211 near 2024); Middle 66.9 – 82.1 (190 units near 2012, 72 near 2024); Low 32.9 – 66.9 (74 units near 2012, 60 near 2024). Highest near 2024: San Pedro, Tomina and Porvenir.",
    map: 'images/indicators/sdg16-map.webp',
    date: '2026-11-17', pinned: false, dataset: 'sdg16',
    notice: "Both periods are stored at nominal years: 2012 holds the Atlas's initial values (~2012) and 2024 its final values (~2024). Each indicator's actual reference years (e.g. 2008 and 2023 for the health survey, three-year averages for volatile indicators) are listed in its description under Variables. The four indigenous autonomies and municipalities created after 2012 have values in both periods.",
    code: {
      python: `${PYTHON_SETUP}

# The SDG 16 index (0-100, higher is better), ~2024
gdf = geo.load("sdg16", variables="index_sdg16", years=2024, geometry=True)
px.choropleth_map(gdf, geojson=gdf.geometry, locations=gdf.index,
          color="index_sdg16", hover_name="name",
          center={"lat": -16.3, "lon": -64}, zoom=4,
          labels={"index_sdg16": "Index (0-100)"},
          title="SDG 16 index, ~2024").show()

# The two periods: initial (~2012) and final (~2024) values
df = geo.load("sdg16", variables="index_sdg16")
wide = df.pivot(index="geo_id", columns="year", values="index_sdg16")
wide = wide.add_prefix("y")
wide["name"] = geo.units("municipality").set_index("geo_id")["name"]
px.scatter(wide, x="y2012", y="y2024", hover_name="name",
           labels={"y2012": "Index, ~2012", "y2024": "Index, ~2024"},
           title="SDG 16 index, ~2012 and ~2024")`,
      pandas: `import pandas as pd
import geopandas as gpd
import plotly.express as px

# No geo4bolivia needed: every file is a plain URL
BASE = "${RAW_URL}"
df = pd.read_csv(BASE + "data/municipality/sdg16.csv")  # geo_id, year, mun_id, ...
municipalities = gpd.read_file(BASE + "geo/boundaries/municipality.geojson")

index = df.loc[df["year"] == 2024, ["geo_id", "index_sdg16"]]
gdf = municipalities.merge(index, on="geo_id")
px.choropleth_map(gdf, geojson=gdf.geometry, locations=gdf.index,
          color="index_sdg16", hover_name="name",
          center={"lat": -16.3, "lon": -64}, zoom=4,
          labels={"index_sdg16": "Index (0-100)"},
          title="SDG 16 index, ~2024")`,
    },
    examples: [
      {
        title: "Map the change, ~2012 to ~2024",
        text: "Subtracts the initial index from the final one: positive values mark the municipalities that moved closer to the goal's targets.",
        code: `${PYTHON_SETUP}

df = geo.load("sdg16", variables="index_sdg16")
wide = df.pivot(index="geo_id", columns="year", values="index_sdg16")
wide["change"] = wide[2024] - wide[2012]
gdf = geo.boundaries("municipality").merge(wide["change"].reset_index(),
                                           on="geo_id")
px.choropleth_map(gdf, geojson=gdf.geometry, locations=gdf.index,
          color="change", hover_name="name",
          center={"lat": -16.3, "lon": -64}, zoom=4,
          labels={"change": "Change in the index (points)"},
          title="SDG 16: change in the index, ~2012 to ~2024")`,
      },
      {
        title: "Recompute the index from its indicators",
        text: "Rescales each indicator between the Atlas's worst and best values (Cuadro 21), caps it to 0-100 and averages the available ones, which reproduces the published index.",
        code: `${PYTHON_SETUP}
import pandas as pd

df = geo.load("sdg16", years=2024).set_index("geo_id")
bounds = {"sdg16_1_thp": (9, 0), "sdg16_6_cep": (17.7, 94.9), "sdg16_7_tcs": (16.3,
          0), "sdg16_9_nic": (66.2, 100)}  # (worst, best)
scores = pd.DataFrame({v: 100 * (df[v] - w) / (b - w)
                       for v, (w, b) in bounds.items()}).clip(0, 100)
df["computed"] = scores.mean(axis=1)  # skips missing indicators
df["name"] = geo.units("municipality").set_index("geo_id")["name"]
px.scatter(df, x="computed", y="index_sdg16", hover_name="name",
           labels={"computed": "Computed from the indicators",
                   "index_sdg16": "Index (0-100)"},
           title="Recomputed vs published SDG 16 index, ~2024")`,
      },
      {
        title: "Which indicators moved",
        text: "Compares the mean rescaled score (0-100) of each indicator in the two periods: the gap between the dots is the progress, and the lowest dots are where the goal is furthest away.",
        code: `${PYTHON_SETUP}
import pandas as pd

df = geo.load("sdg16")
bounds = {"sdg16_1_thp": (9, 0), "sdg16_6_cep": (17.7, 94.9), "sdg16_7_tcs": (16.3,
          0), "sdg16_9_nic": (66.2, 100)}  # (worst, best)
labels = geo.dictionary("sdg16").set_index("variable")["label"]
rows = [{"indicator": labels[v], "period": f"~{year}",
         "score": (100 * (part[v] - w) / (b - w)).clip(0, 100).mean()}
        for year, part in df.groupby("year") for v, (w, b) in bounds.items()]
px.scatter(pd.DataFrame(rows), x="score", y="indicator", color="period",
           labels={"score": "Mean rescaled score (0-100)", "indicator": ""},
           title="SDG 16 indicators, ~2012 and ~2024")`,
      },
      {
        title: "Rank the departments",
        text: "Averages the index within each department, weighting municipalities by their census population, in both periods.",
        code: `${PYTHON_SETUP}

df = geo.load("sdg16", variables="index_sdg16")
dep = geo.aggregate(df, to="department",
                    rules={"index_sdg16": "weighted_mean:population"},
                    weights=geo.load("sdg", variables="population"))
dep["department"] = dep["geo_id"].map(
    geo.units("department").set_index("geo_id")["name"])
dep["period"] = "~" + dep["year"].astype(str)
px.scatter(dep.sort_values("index_sdg16"), x="index_sdg16", y="department",
           color="period",
           labels={"index_sdg16": "Index (population-weighted)"},
           title="SDG 16 index by department, ~2012 and ~2024")`,
      },
    ],
  },
  {
    id: 'municipalities343-sdg17', type: 'indicator', section: 'indicators',
    title: "SDG 17: Partnerships for the goals",
    scope: "343 municipalities · 2 indicators and the SDG 17 index · ~2012 and ~2024",
    summary: "The SDG 17 (Partnerships for the goals) index of the SDG Atlas of Bolivia 2026 and its 2 indicators, municipal revenue from local sources and public investment per person, for every municipality near 2012 and near 2024.",
    description: "The SDG 17 (Partnerships for the goals) index of the Atlas de los ODS en Bolivia 2026 (Andersen and Argandoña, SDSN Bolivia) for Bolivia's 343 municipalities and indigenous autonomies (GAIOC), with the 2 indicators behind it: municipal revenue from local sources (%) (average 2011–2013 and average 2021–2023); public investment (Bs per person) (2012 and 2023). Every indicator is measured twice, near the 2012 census and near the 2024 census, and the observatory stores the two values as 2012 and 2024 so that their change can be studied. The index runs from 0 (worst situation) to 100 (targets met): each indicator is rescaled linearly between a worst and a best value set by the Atlas, capped, so that higher is always better, and the index is the simple mean of the available rescaled indicators. Between the two periods the median index went from 25.0 to 30.1, and it rose in 195 of the 343 units. Some indicators are missing for part of the units (Municipal revenue from local sources (%) and Public investment (Bs per person)); the index averages the available ones.",
    geography: 'Municipality', units: 343, period: '~2012 and ~2024', frequency: 'Two periods (initial ~2012, final ~2024)', key: 'geo_id', idExample: 'BO-04-17-04',
    categories: ["Institutions"], tags: ["SDGs", "SDG Atlas 2026", "municipal finance", "local taxes", "public investment"],
    image: 'images/indicators/sdg17.webp',
    imageAlt: "Map of the Partnerships for the goals index (0-100) near 2024 across Bolivia's 343 municipalities and indigenous autonomies in three natural-break classes: High 46.1 – 100.0 (83); Middle 24.5 – 46.1 (125); Low 0.0 – 24.5 (135). Highest: Carangas, La Rivera and Coipasa.",
    mapAlt: "Two maps of the Partnerships for the goals index (0-100) near 2012 and near 2024 across Bolivia's 343 municipalities and indigenous autonomies, in three natural-break classes shared by both periods. Legend: High 46.1 – 100.0 (51 units near 2012, 83 near 2024); Middle 24.5 – 46.1 (124 units near 2012, 125 near 2024); Low 0.0 – 24.5 (168 units near 2012, 135 near 2024). Highest near 2024: Carangas, La Rivera and Coipasa.",
    map: 'images/indicators/sdg17-map.webp',
    date: '2026-11-17', pinned: false, dataset: 'sdg17',
    notice: "Both periods are stored at nominal years: 2012 holds the Atlas's initial values (~2012) and 2024 its final values (~2024). Each indicator's actual reference years (e.g. 2008 and 2023 for the health survey, three-year averages for volatile indicators) are listed in its description under Variables. The four indigenous autonomies and municipalities created after 2012 have values in both periods.",
    code: {
      python: `${PYTHON_SETUP}

# The SDG 17 index (0-100, higher is better), ~2024
gdf = geo.load("sdg17", variables="index_sdg17", years=2024, geometry=True)
px.choropleth_map(gdf, geojson=gdf.geometry, locations=gdf.index,
          color="index_sdg17", hover_name="name",
          center={"lat": -16.3, "lon": -64}, zoom=4,
          labels={"index_sdg17": "Partnerships for the goals index (0-100)"},
          title="SDG 17: Partnerships for the goals index, ~2024").show()

# The two periods: initial (~2012) and final (~2024) values
df = geo.load("sdg17", variables="index_sdg17")
wide = df.pivot(index="geo_id", columns="year", values="index_sdg17")
wide = wide.add_prefix("y")
wide["name"] = geo.units("municipality").set_index("geo_id")["name"]
px.scatter(wide, x="y2012", y="y2024", hover_name="name",
           labels={"y2012": "Index, ~2012", "y2024": "Index, ~2024"},
           title="SDG 17: Partnerships for the goals index, ~2012 and ~2024")`,
      pandas: `import pandas as pd
import geopandas as gpd
import plotly.express as px

# No geo4bolivia needed: every file is a plain URL
BASE = "${RAW_URL}"
df = pd.read_csv(BASE + "data/municipality/sdg17.csv")  # geo_id, year, mun_id, ...
municipalities = gpd.read_file(BASE + "geo/boundaries/municipality.geojson")

index = df.loc[df["year"] == 2024, ["geo_id", "index_sdg17"]]
gdf = municipalities.merge(index, on="geo_id")
px.choropleth_map(gdf, geojson=gdf.geometry, locations=gdf.index,
          color="index_sdg17", hover_name="name",
          center={"lat": -16.3, "lon": -64}, zoom=4,
          labels={"index_sdg17": "Partnerships for the goals index (0-100)"},
          title="SDG 17: Partnerships for the goals index, ~2024")`,
    },
    examples: [
      {
        title: "Map the change, ~2012 to ~2024",
        text: "Subtracts the initial index from the final one: positive values mark the municipalities that moved closer to the goal's targets.",
        code: `${PYTHON_SETUP}

df = geo.load("sdg17", variables="index_sdg17")
wide = df.pivot(index="geo_id", columns="year", values="index_sdg17")
wide["change"] = wide[2024] - wide[2012]
gdf = geo.boundaries("municipality").merge(wide["change"].reset_index(),
                                           on="geo_id")
px.choropleth_map(gdf, geojson=gdf.geometry, locations=gdf.index,
          color="change", hover_name="name",
          center={"lat": -16.3, "lon": -64}, zoom=4,
          labels={"change": "Change in the index (points)"},
          title="SDG 17: change in the index, ~2012 to ~2024")`,
      },
      {
        title: "Recompute the index from its indicators",
        text: "Rescales each indicator between the Atlas's worst and best values (Cuadro 21), caps it to 0-100 and averages the available ones, which reproduces the published index.",
        code: `${PYTHON_SETUP}
import pandas as pd

df = geo.load("sdg17", years=2024).set_index("geo_id")
bounds = {"sdg17_1_iil": (0, 51.7), "sdg17_18_ipc": (0, 1526)}  # (worst, best)
scores = pd.DataFrame({v: 100 * (df[v] - w) / (b - w)
                       for v, (w, b) in bounds.items()}).clip(0, 100)
df["computed"] = scores.mean(axis=1)  # skips missing indicators
df["name"] = geo.units("municipality").set_index("geo_id")["name"]
px.scatter(df, x="computed", y="index_sdg17", hover_name="name",
           labels={"computed": "Computed from the indicators",
                   "index_sdg17": "Partnerships for the goals index (0-100)"},
           title="Recomputed vs published SDG 17 index, ~2024")`,
      },
      {
        title: "Which indicators moved",
        text: "Compares the mean rescaled score (0-100) of each indicator in the two periods: the gap between the dots is the progress, and the lowest dots are where the goal is furthest away.",
        code: `${PYTHON_SETUP}
import pandas as pd

df = geo.load("sdg17")
bounds = {"sdg17_1_iil": (0, 51.7), "sdg17_18_ipc": (0, 1526)}  # (worst, best)
labels = geo.dictionary("sdg17").set_index("variable")["label"]
rows = [{"indicator": labels[v], "period": f"~{year}",
         "score": (100 * (part[v] - w) / (b - w)).clip(0, 100).mean()}
        for year, part in df.groupby("year") for v, (w, b) in bounds.items()]
px.scatter(pd.DataFrame(rows), x="score", y="indicator", color="period",
           labels={"score": "Mean rescaled score (0-100)", "indicator": ""},
           title="SDG 17 indicators, ~2012 and ~2024")`,
      },
      {
        title: "Rank the departments",
        text: "Averages the index within each department, weighting municipalities by their census population, in both periods.",
        code: `${PYTHON_SETUP}

df = geo.load("sdg17", variables="index_sdg17")
dep = geo.aggregate(df, to="department",
                    rules={"index_sdg17": "weighted_mean:population"},
                    weights=geo.load("sdg", variables="population"))
dep["department"] = dep["geo_id"].map(
    geo.units("department").set_index("geo_id")["name"])
dep["period"] = "~" + dep["year"].astype(str)
px.scatter(dep.sort_values("index_sdg17"), x="index_sdg17", y="department",
           color="period",
           labels={"index_sdg17": "Index (population-weighted)"},
           title="SDG 17 index by department, ~2012 and ~2024")`,
      },
    ],
  },
  {
    id: 'municipalities343-ntl', type: 'indicator', section: 'indicators',
    title: 'Night-time lights per capita',
    scope: '333 of 343 municipalities · 2012–2020',
    summary: 'Nine years of VIIRS night-time lights per person for 333 municipalities, with a long-run trend: a satellite proxy for local economic activity.',
    description: 'Annual night-time lights per capita for 333 of Bolivia’s 343 municipalities from 2012 to 2020: the summed radiance of the Earth Observation Group’s annual VIIRS night-time lights (version 2, background masked) over each municipality, divided by its WorldPop population, in natural logs. A Hodrick–Prescott trend (λ = 400) of the same series separates the long-run path from year-to-year noise; it is complete for every municipality, while the raw log is missing where a municipality had no measurable light. Night-time lights track electrification and economic activity where official local statistics are scarce. The values were computed on DS4Bolivia’s polygons of the 2015 municipal map, so they are published for the 333 municipalities whose territory did not change; the six that lost territory to the four units created since (Colquechaca, Mizque, Porco, Tomave, San Ignacio and Santa Ana) and the four new units have no data.',
    geography: 'Municipality', units: 333, period: '2012–2020', frequency: 'Annual', key: 'geo_id', idExample: 'BO-04-17-04',
    categories: ['Economy'], tags: ['night-time lights', 'VIIRS', 'remote sensing', 'panel data'],
    image: 'images/indicators/ntl.webp',
    imageAlt: 'Map of log night-time lights per capita in 2020 across 343 Bolivian municipalities and indigenous autonomies in three natural-break classes: highest across Santa Cruz, the Chaco and the southern altiplano, lowest in northern La Paz, parts of Pando and clusters in the Potosí and Chuquisaca valleys',
    map: 'images/indicators/ntl-map.webp',
    mapAlt: 'Map of log night-time lights per capita in 2020 across 343 Bolivian municipalities and indigenous autonomies in three natural-break classes: highest across Santa Cruz, the Chaco and the southern altiplano, lowest in northern La Paz, parts of Pando and clusters in the Potosí and Chuquisaca valleys. Legend: High 14.5 to 17.9 (108 municipalities), Middle 13.0 to 14.5 (143), Low 10.5 to 13.0 (77), no data 15.',
    date: '2026-10-28', pinned: false, dataset: 'ntl',
    code: {
      python: `${PYTHON_SETUP}

df = geo.load("ntl")
df = df.merge(geo.units("municipality")[["geo_id", "department_id"]], on="geo_id")

# Long-run trend of lights per capita: mean by department
trend = df.groupby(["year", "department_id"], as_index=False)["ln_t400NTLpc"].mean()
names = geo.units("department").set_index("geo_id")["name"]
trend["department"] = trend["department_id"].map(names)
px.line(trend, x="year", y="ln_t400NTLpc", color="department",
labels={"ln_t400NTLpc": "Log lights per capita (trend)"},
title="Night-time lights by department")`,
      pandas: `import pandas as pd
import plotly.express as px

BASE = "${RAW_URL}"
df = pd.read_csv(BASE + "data/municipality/ntl.csv")
units = pd.read_csv(BASE + "geo/units.csv")
df = df.merge(units[["geo_id", "department_id"]], on="geo_id")

# Long-run trend of lights per capita: mean by department
trend = df.groupby(["year", "department_id"], as_index=False)["ln_t400NTLpc"].mean()
trend["department"] = trend["department_id"].map(units.set_index("geo_id")["name"])
px.line(trend, x="year", y="ln_t400NTLpc", color="department",
labels={"ln_t400NTLpc": "Log lights per capita (trend)"},
title="Night-time lights by department")`,
    },
  },
  {
    id: 'municipalities343-pop', type: 'indicator', section: 'indicators',
    title: 'Population',
    scope: '333 of 343 municipalities · 2001–2020',
    summary: 'Two decades of gridded population estimates and population density for 333 municipalities: the denominator for per-capita indicators and population-weighted averages.',
    description: 'Annual population estimates for 333 of Bolivia’s 343 municipalities from 2001 to 2020, computed by summing WorldPop’s 1 km gridded population over each municipality, and the population density (people per km²) of each municipality. Population sums up the hierarchy, so it gives provincial, departmental and national totals directly, and it is the weight for population-weighted averages of rates such as poverty. These are gridded estimates, not INE’s official projections; census population for 2012 and 2024, for all 343 units, is in the sdg dataset. The values were computed on DS4Bolivia’s polygons of the 2015 municipal map, so they are published for the 333 municipalities whose territory did not change; the six that lost territory to the four units created since (Colquechaca, Mizque, Porco, Tomave, San Ignacio and Santa Ana) and the four new units have no data.',
    geography: 'Municipality', units: 333, period: '2001–2020', frequency: 'Annual', key: 'geo_id', idExample: 'BO-04-17-04',
    categories: ['Social'], tags: ['population', 'WorldPop', 'demography', 'panel data'],
    image: 'images/indicators/pop.webp',
    imageAlt: 'Map of population density in 2020 across 343 Bolivian municipalities and indigenous autonomies in three natural-break classes on a log scale: densest in the La Paz–El Alto, Cochabamba, Santa Cruz, Sucre and Tarija urban areas, intermediate across the altiplano and valleys, sparsest in the northern and eastern lowlands',
    map: 'images/indicators/pop-map.webp',
    mapAlt: 'Map of population density in 2020 across 343 Bolivian municipalities and indigenous autonomies in three natural-break classes on a log scale: densest in the La Paz–El Alto, Cochabamba, Santa Cruz, Sucre and Tarija urban areas, intermediate across the altiplano and valleys, sparsest in the northern and eastern lowlands. Legend: High 42 to 2,860 people per km² (55 municipalities), Middle 4 to 42 (199), Low 0 to 4 (79), no data 10.',
    date: '2026-10-28', pinned: false, dataset: 'pop',
    code: {
      python: `${PYTHON_SETUP}

pop = geo.load("pop")

# Totals by department, 2001-2020 (population sums up the hierarchy)
dep = geo.aggregate(pop, to="department", dataset="pop")
names = geo.units("department").set_index("geo_id")["name"]
dep["department"] = dep["geo_id"].map(names)
px.line(dep, x="year", y="pop", color="department",
labels={"pop": "Population"}, title="Population by department, 2001-2020")`,
      pandas: `import pandas as pd
import plotly.express as px

BASE = "${RAW_URL}"
pop = pd.read_csv(BASE + "data/municipality/pop.csv")
units = pd.read_csv(BASE + "geo/units.csv")
pop = pop.merge(units[["geo_id", "department_id"]], on="geo_id")

# Totals by department, 2001-2020
dep = pop.groupby(["year", "department_id"], as_index=False)["pop"].sum()
dep["department"] = dep["department_id"].map(units.set_index("geo_id")["name"])
px.line(dep, x="year", y="pop", color="department",
labels={"pop": "Population"}, title="Population by department, 2001-2020")`,
    },
  },
  {
    id: 'municipalities343-emb', type: 'indicator', section: 'indicators',
    title: 'Satellite embeddings',
    scope: '333 of 343 municipalities · 64 dimensions · 2017',
    summary: 'What 333 municipalities look like from space, each compressed by a deep-learning model into 64 numbers: features for machine learning.',
    description: 'Sixty-four satellite embedding dimensions (A00–A63) for 333 of Bolivia’s 343 municipalities in 2017, averaged from the annual 10 m Google Satellite Embedding dataset (AlphaEarth Foundations). The model summarises Sentinel-2, Landsat and other imagery into abstract features that capture land cover, texture, roads and buildings. Two versions are published: `emb`, the area-weighted mean over each municipality, and `embpw`, weighted by population so that it describes where people live. The dimensions are not interpretable one by one; they are inputs to models, for example to predict poverty. The values were computed on DS4Bolivia’s polygons of the 2015 municipal map, so they are published for the 333 municipalities whose territory did not change; the six that lost territory to the four units created since (Colquechaca, Mizque, Porco, Tomave, San Ignacio and Santa Ana) and the four new units have no data.',
    geography: 'Municipality', units: 333, period: '2017', frequency: 'One year', key: 'geo_id', idExample: 'BO-04-17-04',
    categories: ['Environment', 'Economy'], tags: ['satellite embeddings', 'AlphaEarth', 'machine learning', 'remote sensing'],
    image: 'images/indicators/emb.webp',
    imageAlt: 'Map of satellite embedding dimension A00 (area-weighted) in 2017 across 343 Bolivian municipalities and indigenous autonomies in three natural-break classes: low across the altiplano and western valleys, middle across Beni and Pando, high across Santa Cruz and the Chaco',
    map: 'images/indicators/emb-map.webp',
    mapAlt: 'Map of satellite embedding dimension A00 (area-weighted) in 2017 across 343 Bolivian municipalities and indigenous autonomies in three natural-break classes: low across the altiplano and western valleys, middle across Beni and Pando, high across Santa Cruz and the Chaco. Legend: High 0.046 to 0.164 (49 municipalities), Middle −0.055 to 0.046 (94), Low −0.165 to −0.055 (190), no data 10.',
    date: '2026-10-28', pinned: false, dataset: 'emb', datasets: ['emb', 'embpw'],
    code: {
      python: `${PYTHON_SETUP}
from sklearn.decomposition import PCA

emb = geo.load("embpw")                           # or "emb", area-weighted
X = emb.filter(regex=r"^A\\d{2}$")                # 64 dimensions
emb["pc1"] = PCA(1).fit_transform(X)[:, 0]

# How the first component relates to multidimensional poverty (2012)
mpi = geo.load("sdg01", variables="sdg1_2_mpi", years=2012)
names = geo.units("municipality")[["geo_id", "name"]]
df = emb[["geo_id", "pc1"]].merge(mpi, on="geo_id").merge(names, on="geo_id")
px.scatter(df, x="pc1", y="sdg1_2_mpi", hover_name="name", trendline="ols",
   labels={"pc1": "First principal component", "sdg1_2_mpi": "MPI, 2012"},
   title="Satellite embeddings and poverty")`,
      pandas: `import pandas as pd
import plotly.express as px

BASE = "${RAW_URL}"
emb = pd.read_csv(BASE + "data/municipality/embpw.csv")   # geo_id, year, asdf_id, A00-A63

# Distribution of each of the 64 dimensions across municipalities
px.box(emb.filter(regex=r"^A\\d{2}$"),
       labels={"variable": "Dimension", "value": "Value"},
       title="Satellite embeddings, 2017")`,
    },
  },

  // ---------------------------------------------------------------- Tools: packages
  {
    id: 'geo4bolivia-package', type: 'package', section: 'tools',
    title: 'geo4bolivia: find, load, map and analyse Bolivia’s subnational data',
    scope: '!pip install -q geo4bolivia',
    summary: 'The observatory’s Python package and the place to start. Search every variable, load any indicator as a labelled panel with names and boundaries, map it, and run the fundamental analyses in one call each: spatial dependence, convergence, inequality, regression and spatial models, and MGWR.',
    description: 'geo4bolivia is how the observatory’s data are meant to be used. It finds variables across every dataset and explains them (sources, licenses, actual years, how to cite them), loads any indicator in one line as a tidy panel with unit names, parent units and boundaries, and moves it across municipalities, provinces and departments with each variable’s own rule. It then maps the data and runs the fundamental analyses itself, each in one call: exploration, Moran’s I and LISA clusters, β-, σ- and club convergence, transitions and rank mobility, Gini and Theil inequality, regression, panel and spatial models, and multiscale GWR. Every analysis returns an interactive figure, a table and a reading of the result in words, and your own tables and rasters can be linked to the same units.\n\nThe package has its own repository and its own documentation site, with a guide to get started, an article for each method worked through on Bolivia’s data, and a reference with an example for every function; this page is a short introduction. For specialised methods, geo.for_expdpy() and geo.for_geometrics() hand any panel, labelled, to the two companion packages, expdpy and geometrics.',
    tags: ['Python', 'flagship', 'spatial data science', 'multi-scale', 'Colab'],
    image: 'images/tools/geo4bolivia-package.webp',
    imageAlt: "geo4bolivia: spatial data science for Bolivia's subnational development data. Beside the title, the Sustainable Development Goals wheel and the Andes at night seen from orbit, a satellite sensing the city lights, and a panel of small charts",
    date: '2026-11-20', pinned: true, flagship: true,
    installNote: 'The first line is enough for loading, maps and the core analyses. The extras add the libraries of a few methods; install only those you need, or all of them.',
    install: `!pip install -q geo4bolivia               # loading, maps, core analyses
!pip install -q "geo4bolivia[dynamics]"   # + Markov transitions (geo.transitions)
!pip install -q "geo4bolivia[mgwr]"       # + multiscale GWR (geo.mgwr)
!pip install -q "geo4bolivia[panel]"      # + panel models (geo.panel_model)
!pip install -q "geo4bolivia[raster]"     # + zonal statistics (geo.zonal)
!pip install -q "geo4bolivia[all]"        # all of the above`,
    // Where every function is documented (PackageDetail links it under "What it does")
    referenceUrl: PACKAGE_DOCS_URL + 'reference/',
    quickstart: {
      python: `!pip install -q geo4bolivia
import geo4bolivia as geo

display(geo.search("poverty"))                # variables, datasets and years
mpi = geo.load("sdg01", variables="sdg1_2_mpi",
               groups=["department"])         # 343 units, ~2012 and ~2024
geo.map(mpi, "sdg1_2_mpi", year=[2012, 2024],
        scheme="fisher_jenks").show()         # both periods, common classes
res = geo.lisa(mpi, "sdg1_2_mpi", year=2024)  # where does poverty cluster?
print(res.interpret())                        # the result in words
res.fig                                       # scatterplot and cluster map, side by side`,
      pandas: `import pandas as pd
import plotly.express as px

# The same files without the package: plain URLs
BASE = "${RAW_URL}"
df = pd.read_csv(BASE + "data/municipality/sdg01.csv")
units = pd.read_csv(BASE + "geo/units.csv")      # names, parents, INE codes
df = df.merge(units[["geo_id", "name", "department_id"]], on="geo_id")
df["department"] = df["department_id"].map(units.set_index("geo_id")["name"])
df["period"] = df["year"].astype(str)
px.box(df, x="department", y="sdg1_2_mpi", color="period",
       labels={"sdg1_2_mpi": "Multidimensional poverty index (0-1)"},
       title="Multidimensional poverty by department, ~2012 and ~2024")`,
    },
    features: [
      { title: 'Find and load', fns: ['search', 'info', 'dictionary', 'cite', 'load', 'change', 'aggregate'], text: 'What exists and what each variable means; panels with names, parent units and boundaries, compared across periods and moved up to provinces and departments.' },
      { title: 'Explore', fns: ['describe', 'distribution', 'extremes', 'correlation', 'scatter', 'trend'], text: 'A first look at any variable: labelled summaries, distributions, the highest and lowest units, correlations, relationships and trends.' },
      { title: 'Maps and spatial dependence', fns: ['map', 'weights', 'connectivity', 'moran', 'lisa'], text: 'Interactive maps, continuous or in classes, of several years side by side or of the change; spatial weights, Moran’s I and LISA clusters.' },
      { title: 'Convergence and transitions', fns: ['beta_convergence', 'sigma_convergence', 'convergence_clubs', 'transitions', 'spatial_transitions', 'lisa_transitions', 'rank_mobility'], text: 'Whether the units that started lower catch up, and who moved: β, σ and club convergence, Markov and spatial Markov transitions, and rank mobility.' },
      { title: 'Inequality', fns: ['inequality', 'theil_decomposition'], text: 'Gini and Theil in each year with the Lorenz curve, and inequality between and within departments or provinces.' },
      { title: 'Models and MGWR', fns: ['regression', 'panel_model', 'spatial_diagnostics', 'spatial_model', 'mgwr'], text: 'Least squares, panel estimators with a Hausman test, spatial models with direct and spillover effects, and local slopes that change from place to place.' },
      { title: 'Build your own', fns: ['link', 'check', 'zonal', 'overlay', 'save'], text: 'Your tables and rasters on the observatory’s units, saved in its documented format.' },
      { title: 'Go further', fns: ['for_expdpy', 'for_geometrics'], text: 'Labelled inputs for the companion packages: expdpy for specialised panel methods and geometrics for specialised spatial methods.' },
    ],
    links: [
      { label: 'Documentation', url: PACKAGE_DOCS_URL, kind: 'docs' },
      { label: 'Get started in Colab', url: PACKAGE_COLAB_URL, kind: 'colab' },
      { label: 'Articles', url: PACKAGE_DOCS_URL + 'articles/', kind: 'docs' },
      { label: 'Function reference', url: PACKAGE_DOCS_URL + 'reference/', kind: 'docs' },
      { label: 'PyPI', url: 'https://pypi.org/project/geo4bolivia/', kind: 'pypi' },
      { label: 'Source code', url: PACKAGE_REPO_URL, kind: 'github' },
    ],
    related: ['geo4bolivia-quickstart', 'three-packages', 'expdpy-package', 'geometrics-package', 'municipalities343-sdg'],
  },
  {
    id: 'expdpy-package', type: 'package', section: 'tools',
    title: 'expdpy: explore and model panel data',
    scope: '!pip install -q geo4bolivia expdpy',
    summary: 'A companion package for specialised panel-data methods, beyond geo4bolivia’s built-in analyses: the split of variation between and within units, correlated random effects, instrumental variables, event studies and robust inference, each with a plain-language reading. geo4bolivia hands it Bolivian panels in one line.',
    description: 'geo4bolivia runs the fundamental panel analyses itself: trends, regressions, and pooled, between, fixed- and random-effects models with a Hausman test. expdpy (a Python port of ExPanDaR) is its companion for going further with panels. Its explore functions describe a panel’s structure, decompose variation into between and within components (xtsum), and chart trajectories, distributions, transitions, missing values and correlations. Its analyze functions add correlated random effects, joint tests, fixest-style regressions with fixed effects and clustered or Driscoll–Kraay standard errors, wild-bootstrap inference, instrumental variables and event studies. Its learn functions simulate each concept from a known truth. Every result has an interactive figure or table and an interpret() method. The observatory’s datasets are exactly the long panels expdpy expects: geo.for_expdpy() hands them over, labelled and with the department of each municipality, in one line. The SDG Atlas gives two periods (~2012 and ~2024) for 343 units; night-time lights give a nine-year panel (2012–2020) for 333.',
    tags: ['Python', 'panel data', 'econometrics', 'fixed effects', 'ExPanDaR'],
    image: 'images/tools/expdpy-package.webp',
    imageAlt: 'Night-time lights per capita trajectories of 333 Bolivian municipalities, 2012–2020, with department means and the between/within split of their variation',
    date: '2026-11-17', pinned: true,
    install: `!pip install -q geo4bolivia expdpy`,
    quickstart: {
      python: `!pip install -q geo4bolivia expdpy
import geo4bolivia as geo
import expdpy as ex

df, df_def = geo.for_expdpy("sdg", variables="index_sdg",
                            groups=["department"])    # 343 units, 2 periods
df = ex.set_labels(df, df_def, set_panel=True)        # geo_id x year panel
display(ex.explore_xtsum_table(df, var=["index_sdg"]).gt)   # between vs within
ex.explore_trend_plot_by_group(df, group_var="department", var="index_sdg").fig`,
    },
    tutorial: [
      { id: 'structure', title: 'A labelled panel and its structure',
        text: 'geo.for_expdpy() returns the panel and its data dictionary; ex.set_labels() declares the unit (geo_id) and time (year) and attaches the labels.',
        code: `!pip install -q geo4bolivia expdpy
import geo4bolivia as geo
import expdpy as ex

df, df_def = geo.for_expdpy("sdg01", variables=["index_sdg1", "sdg1_2_mpi"],
                            groups=["department"])
df = ex.set_labels(df, df_def, set_panel=True)
print(ex.explore_panel_structure(df).interpret())
ex.explore_panel_structure(df).fig` },
      { id: 'variation', title: 'Between and within variation, transitions',
        text: 'xtsum splits each variable’s variation into differences between municipalities and changes within them; the transition matrix shows how units moved between quintiles from ~2012 to ~2024.',
        code: `!pip install -q geo4bolivia expdpy
import geo4bolivia as geo
import expdpy as ex

df, df_def = geo.for_expdpy("sdg01", variables="sdg1_2_mpi")
df = ex.set_labels(df, df_def, set_panel=True)
display(ex.explore_xtsum_table(df, var=["sdg1_2_mpi"]).gt)
ex.explore_transition_matrix(df, "sdg1_2_mpi").fig` },
      { id: 'trajectories', title: 'A longer panel: night-time lights, 2012–2020',
        text: 'Nine years of lights per capita for 333 municipalities: one line per municipality and the mean by department.',
        code: `!pip install -q geo4bolivia expdpy
import geo4bolivia as geo
import expdpy as ex

df, df_def = geo.for_expdpy("ntl", groups=["department"])   # 333 units
df = ex.set_labels(df, df_def, set_panel=True)
ex.explore_spaghetti_plot(df, "ln_t400NTLpc").fig.show()
ex.explore_trend_plot_by_group(df, group_var="department",
                               var="ln_t400NTLpc").fig` },
      { id: 'models', title: 'Pooled, between, fixed and random effects',
        text: 'Is sustainable development associated with population growth? Combine the IDS with log census population and compare the four estimators; the Hausman test chooses between fixed and random effects. With two periods and no year effects, the fixed-effects slope also absorbs the rise common to all municipalities, so read it with care.',
        code: `!pip install -q geo4bolivia expdpy
import numpy as np
import geo4bolivia as geo
import expdpy as ex

ids = geo.load("sdg", variables=["index_sdg", "population"])
ids["ln_pop"] = np.log(ids["population"])
df, df_def = geo.for_expdpy(ids, labels={"ln_pop": "Log of census population"})
df = ex.set_labels(df, df_def, set_panel=True)
print(ex.analyze_hausman_test(df, "index_sdg", ["ln_pop"]).interpret())
ex.analyze_panel_table(df, "index_sdg", ["ln_pop"]).etable` },
    ],
    features: [
      { title: 'Explore', fns: ['explore_panel_structure', 'explore_xtsum_table', 'explore_spaghetti_plot', 'explore_transition_matrix'], text: 'Panel structure, within/between variation, trajectories, distributions and transitions.' },
      { title: 'Panel models', fns: ['analyze_panel_table', 'analyze_hausman_test', 'analyze_cre_table'], text: 'Pooled, between, fixed, random and correlated random effects, side by side.' },
      { title: 'Regressions & inference', fns: ['analyze_regression_table', 'analyze_coefficient_plot', 'analyze_robust_inference'], text: 'Fixed effects, clustered and Driscoll–Kraay errors, and wild-bootstrap inference.' },
      { title: 'Causal designs', fns: ['analyze_iv_regression', 'analyze_panel_iv_regression', 'analyze_event_study'], text: 'Instrumental variables, in cross-sections and panels, and event studies of staggered treatments.' },
      { title: 'Convergence & Kuznets', fns: ['analyze_beta_convergence', 'analyze_sigma_convergence', 'analyze_kuznets_waves'], text: 'Non-spatial β-, σ- and club convergence; inequality–development waves.' },
      { title: 'Learn', fns: ['learn_pooled_vs_fixed_effects', 'explain'], text: 'Sandboxes that simulate from a known truth, and plain-language explainers.' },
    ],
    links: [
      { label: 'Documentation', url: 'https://cmg777.github.io/expdpy/', kind: 'docs' },
      { label: 'One question, three packages in Colab', url: COLAB_URL + 'three_packages.ipynb', kind: 'colab' },
      { label: 'PyPI', url: 'https://pypi.org/project/expdpy/', kind: 'pypi' },
      { label: 'Source code', url: 'https://github.com/cmg777/expdpy', kind: 'github' },
      { label: 'No-code Analyze app', url: 'https://expdpy-analyze.streamlit.app', kind: 'launch' },
    ],
    related: ['geo4bolivia-package', 'geometrics-package', 'three-packages', 'municipalities343-sdg', 'municipalities343-ntl'],
  },
  {
    id: 'geometrics-package', type: 'package', section: 'tools',
    title: 'geometrics: regional growth, convergence and inequality',
    scope: '!pip install -q geo4bolivia geometrics',
    summary: 'A companion package for specialised spatial methods, beyond geo4bolivia’s built-in analyses: whether a spatial model’s results survive a change of weights matrix, and teaching sandboxes that simulate each concept of regional growth, convergence and inequality from a known truth. geo4bolivia hands it Bolivian data in one line.',
    description: 'geo4bolivia’s own analysis functions (maps, Moran’s I and LISA clusters, β-, σ- and club convergence, Markov transitions, Gini and Theil, spatial models and MGWR) are ported from geometrics, so the fundamentals need only geo4bolivia. geometrics is its companion for going further with space, and it works on any regional panel, not only Bolivia’s. It re-estimates a spatial model under alternative weights matrices, to check that its spillovers do not hinge on who counts as a neighbour; fits single-bandwidth geographically weighted regressions next to the multiscale ones; and teaches each concept with sandboxes that simulate it from a known truth and with plain-language explainers. Every result carries an interactive figure, a table and an interpret() method that explains it in words. geo.for_geometrics() prepares any of the observatory’s datasets for it, with boundaries and labels. The tutorial below takes the Sustainable Development Index of the SDG Atlas 2026 through its main functions: where the index clusters, whether municipalities converged between ~2012 and ~2024, and whether gaps narrowed between or within departments.',
    tags: ['Python', 'spatial econometrics', 'convergence', 'inequality', 'PySAL'],
    image: 'images/tools/geometrics-package.webp',
    imageAlt: 'A LISA cluster map of the Sustainable Development Index across Bolivia’s 343 municipalities near 2024, with high-high clusters around La Paz, the Cochabamba–Chuquisaca valleys and the Chaco, and its Moran scatterplot (Moran’s I = 0.47)',
    date: '2026-11-17', pinned: true,
    install: `!pip install -q geo4bolivia geometrics`,
    quickstart: {
      python: `!pip install -q geo4bolivia geometrics
import geo4bolivia as geo
import geometrics as gm

gdf, df, df_dict = geo.for_geometrics("sdg", variables="index_sdg")  # 343 units
df = gm.set_labels(df, df_dict, set_panel=True)
w = gm.make_weights(gdf, method="queen")

res = gm.analyze_beta_convergence(df, "index_sdg")   # ~2012 -> ~2024, levels
print(res.interpret())   # did the units that started lower gain more?
gm.explore_lisa_cluster_map(df, "index_sdg", gdf=gdf, w=w, period=2024).fig`,
    },
    tutorial: [
      { id: 'inputs', title: 'Inputs: a panel, boundaries and spatial weights',
        text: 'geo.for_geometrics() returns the boundaries, the long panel and its data dictionary; groups adds the department of each municipality for decompositions. Queen weights link municipalities that share a border (one without neighbours is attached to the nearest).',
        code: `!pip install -q geo4bolivia geometrics
import geo4bolivia as geo
import geometrics as gm

gdf, df, df_dict = geo.for_geometrics("sdg", variables="index_sdg",
                                      groups=["department"])
df = gm.set_labels(df, df_dict, set_panel=True)
w = gm.make_weights(gdf, method="queen")
gm.explore_choropleth_map(df, "index_sdg", gdf=gdf, period=2024).fig` },
      { id: 'dependence', title: 'Spatial dependence in each period',
        text: 'Moran’s I measures whether similar values cluster; LISA maps show where. Compare the two periods to see whether clustering strengthened.',
        code: `!pip install -q geo4bolivia geometrics
import geo4bolivia as geo
import geometrics as gm

gdf, df, df_dict = geo.for_geometrics("sdg", variables="index_sdg")
df = gm.set_labels(df, df_dict, set_panel=True)
w = gm.make_weights(gdf, method="queen")
for year in (2012, 2024):
    res = gm.explore_moran_plot(df, "index_sdg", gdf=gdf, w=w, period=year)
    print(year, res.interpret().split(".")[0])
gm.explore_lisa_cluster_map(df, "index_sdg", gdf=gdf, w=w, period=2012).fig` },
      { id: 'convergence', title: 'β-convergence, with and without space',
        text: 'Regress growth between the periods on the initial level. A spatial lag model (model="sar") separates a municipality’s own catch-up from its neighbours’. σ-convergence needs three or more periods; with two, compare dispersion with analyze_inequality_over_time().',
        code: `!pip install -q geo4bolivia geometrics
import geo4bolivia as geo
import geometrics as gm

gdf, df, df_dict = geo.for_geometrics("sdg", variables="index_sdg")
df = gm.set_labels(df, df_dict, set_panel=True)
w = gm.make_weights(gdf, method="queen")
ols = gm.analyze_beta_convergence(df, "index_sdg")
sar = gm.analyze_beta_convergence(df, "index_sdg", model="sar", gdf=gdf, w=w)
print(ols.interpret())
print(sar.interpret())
sar.fig` },
      { id: 'inequality', title: 'Inequality between and within departments',
        text: 'The Theil index splits inequality into a part between departments and a part within them; Gini and Theil per period show whether gaps narrowed.',
        code: `!pip install -q geo4bolivia geometrics
import geo4bolivia as geo
import geometrics as gm

gdf, df, df_dict = geo.for_geometrics("sdg", variables="index_sdg",
                                      groups=["department"])
df = gm.set_labels(df, df_dict, set_panel=True)
print(gm.analyze_inequality_over_time(df, "index_sdg").interpret())
theil = gm.analyze_theil_decomposition(df, "index_sdg", "department")
print(theil.interpret())
theil.fig` },
    ],
    features: [
      { title: 'Explore', fns: ['explore_choropleth_map', 'explore_moran_plot', 'explore_lisa_cluster_map'], text: 'Maps, spatial weights, Moran’s I and local clusters, over time.' },
      { title: 'Converge', fns: ['analyze_beta_convergence', 'analyze_sigma_convergence', 'analyze_convergence_clubs'], text: 'β-, σ- and club convergence, including spatial models.' },
      { title: 'Model', fns: ['analyze_spatial_model', 'analyze_spatial_model_by_weights', 'analyze_gwr'], text: 'SAR, SEM, SLX and SDM with impacts, their robustness across weights matrices, and local regressions.' },
      { title: 'Inequality & dynamics', fns: ['analyze_inequality_over_time', 'analyze_theil_decomposition', 'analyze_markov_transitions'], text: 'Gini and Theil (between and within groups), Markov and spatial Markov chains.' },
      { title: 'Learn', fns: ['learn_spatial_spillovers', 'learn_omitted_spatial_lag', 'learn_beta_convergence', 'explain'], text: 'Simulations from a known truth and plain-language explainers for 30 topics.' },
    ],
    links: [
      { label: 'Documentation', url: 'https://quarcs-lab.github.io/geometrics/', kind: 'docs' },
      { label: 'One question, three packages in Colab', url: COLAB_URL + 'three_packages.ipynb', kind: 'colab' },
      { label: 'PyPI', url: 'https://pypi.org/project/geometrics/', kind: 'pypi' },
      { label: 'Source code', url: 'https://github.com/quarcs-lab/geometrics', kind: 'github' },
    ],
    related: ['geo4bolivia-package', 'expdpy-package', 'three-packages', 'sdg-dynamics', 'municipalities343-sdg'],
  },

  // ---------------------------------------------------------------- Tools: notebooks
  {
    id: 'geo4bolivia-quickstart', type: 'notebook', section: 'tools',
    title: 'Find, load and understand Bolivia’s subnational data with geo4bolivia',
    summary: 'A tour of the geo4bolivia package as a Colab notebook: discover the datasets and their documentation, load panels with and without the package, describe and map a variable, compare ~2012 with ~2024, move data across scales, link your own table, build an indicator from a raster, and take a first look at the built-in analyses.',
    description: 'This Colab notebook introduces the geo4bolivia package step by step on the data of Bolivia’s 343 municipalities and indigenous autonomies. It searches the catalog, reads a dataset’s documentation, actual reference years and citation, and loads the same files as plain URLs and with the package, with names and departments. It describes education by period and by department and maps it interactively. It compares the two periods of the Sustainable Development Index: the index rose in 342 of the 343 units, by 10 points on average, and rose most where it started lowest (correlation −0.43). Aggregated with census-population weights, national multidimensional poverty fell from 0.133 to 0.033, and every department’s fell to between 18% and 32% of its 2012 value; night-time lights cover 333 of the 343 municipalities, as the coverage column shows. The notebook then links tables by department names in any spelling and by INE codes, shows how shared names and typos are reported, builds a market-access indicator from a raster with zonal statistics, spreads the 2024 census population onto a 25 km grid and saves the result in the observatory’s format. Its last part introduces the package’s built-in analyses, each in one call with an interactive figure and a reading of the result in words, and points to the package’s documentation site for the rest.',
    tags: ['geo4bolivia', 'quickstart', 'Python', 'Colab'],
    image: 'images/tools/geo4bolivia-quickstart.webp',
    imageAlt: 'Map of multidimensional poverty by Bolivian department in 2024, weighted by census population',
    date: '2026-11-17', pinned: true,
    links: [
      { label: 'Open in Colab', url: COLAB_URL + 'geo4bolivia_quickstart.ipynb', kind: 'colab' },
      { label: 'View on GitHub', url: REPO_URL + '/blob/main/notebooks/geo4bolivia_quickstart.ipynb', kind: 'github' },
      { label: 'Package documentation', url: PACKAGE_DOCS_URL, kind: 'docs' },
    ],
    related: ['geo4bolivia-package', 'three-packages', 'municipalities343-sdg01'],
  },
  {
    id: 'mpi-eda', type: 'notebook', section: 'tools',
    title: 'Exploratory data analysis of multidimensional poverty',
    summary: 'How multidimensional poverty varies across 343 municipalities and 9 departments, how it changed between the 2012 and 2024 censuses, and how it relates to population and night-time lights.',
    description: 'This Colab notebook explores the Multidimensional Poverty Index of the 2012 and 2024 censuses, from the SDG Atlas of Bolivia 2026, across Bolivia’s 343 municipalities and indigenous autonomies. Poverty fell in every unit: the municipal mean dropped from 0.234 to 0.063 and the population-weighted mean from 0.133 to 0.033. Chuquisaca and Potosí have the poorest municipalities in both periods and Tarija the least poor, but poverty varies far more within departments than between them (departments explain about a fifth of the variance). The poorest places fell most in absolute terms and the ranking persisted (correlation 0.86). On the 333 units with satellite data, brighter municipalities are less poor (correlation −0.54 in 2012), and the relation is negative in all nine departments.',
    tags: ['EDA', 'poverty', 'night-time lights', 'Python'],
    image: 'images/tools/eda.webp',
    imageAlt: 'Scatter plot of multidimensional poverty against log night-time lights per capita for 333 Bolivian municipalities in 2012, with a negative fitted line (r = −0.54)',
    date: '2026-10-28', pinned: false,
    links: [
      { label: 'Open in Colab', url: COLAB_URL + 'eda.ipynb', kind: 'colab' },
      { label: 'View on GitHub', url: REPO_URL + '/blob/main/notebooks/eda.ipynb', kind: 'github' },
    ],
    related: ['municipalities343-sdg01', 'municipalities343-ntl', 'mpi-esda'],
  },
  {
    id: 'mpi-esda', type: 'notebook', section: 'tools',
    title: 'Exploratory spatial data analysis of poverty',
    summary: 'Is a municipality as poor as its neighbours? Moran’s I and LISA clusters of multidimensional poverty across 343 municipalities, in 2012 and 2024.',
    description: 'This Colab notebook maps the Multidimensional Poverty Index of the SDG Atlas of Bolivia 2026 in 2012 and 2024 and measures its spatial dependence with six-nearest-neighbour weights. Poverty fell by 73% on average, but it stays strongly clustered: Moran’s I is 0.45 in 2012 and 0.39 in 2024 (pseudo p = 0.001). At the 5% level, poverty hot spots fell from 43 to 27 and now concentrate where Chuquisaca, Potosí and Cochabamba meet; the Pando hot spot of 2012 has disappeared. Low-poverty clusters (70, then 71) moved towards Santa Cruz and Tarija.',
    tags: ['ESDA', 'spatial autocorrelation', 'LISA', 'geo4bolivia'],
    image: 'images/tools/esda.webp',
    imageAlt: 'LISA cluster map of multidimensional poverty in 2024: 27 high-poverty clusters where Chuquisaca, Potosí and Cochabamba meet and 71 low-poverty clusters, mostly around Santa Cruz',
    date: '2026-10-28', pinned: true,
    links: [
      { label: 'Open in Colab', url: COLAB_URL + 'esda.ipynb', kind: 'colab' },
      { label: 'View on GitHub', url: REPO_URL + '/blob/main/notebooks/esda.ipynb', kind: 'github' },
    ],
    related: ['municipalities343-sdg01', 'mpi-esda-dependence', 'geo4bolivia-package'],
  },
  {
    id: 'mpi-esda-dependence', type: 'notebook', section: 'tools',
    title: 'Spatial distribution and dependence of poverty',
    summary: 'Box-plot and natural-breaks maps of multidimensional poverty, with the spatial lag, Moran’s I and LISA clusters in 2012 and 2024.',
    description: 'This Colab notebook classifies Bolivia’s 343 municipalities and indigenous autonomies by multidimensional poverty in 2012 and 2024 with box-plot and Fisher–Jenks breaks: the median index fell from 0.227 to 0.053, and the box-plot high outliers rose from 2 to 12, led by TIOC-Raqaypampa and Poroma, which cut their poverty far less than the median unit. Spatial dependence stays strong with six-nearest-neighbour weights (Moran’s I, the slope of the spatial-lag regression, is 0.45 and then 0.39). At the 10% level, LISA finds 52 poverty hot spots in 2012 and 36 in 2024, concentrated in Potosí, Chuquisaca and Cochabamba, and 83 and 85 low-poverty clusters, increasingly in Santa Cruz.',
    tags: ['ESDA', 'map classification', 'Moran’s I', 'geo4bolivia'],
    image: 'images/tools/esda-dependence.webp',
    imageAlt: 'Map of multidimensional poverty in 2024 across Bolivia’s 343 municipalities classified with box-plot breaks, with 12 high outliers',
    date: '2026-10-28', pinned: false,
    links: [
      { label: 'Open in Colab', url: COLAB_URL + 'esda_dependence.ipynb', kind: 'colab' },
      { label: 'View on GitHub', url: REPO_URL + '/blob/main/notebooks/esda_dependence.ipynb', kind: 'github' },
    ],
    related: ['mpi-esda', 'municipalities343-sdg01', 'geo4bolivia-package'],
  },
  {
    id: 'mpi-esda-inequality', type: 'notebook', section: 'tools',
    title: 'Spatial inequality of poverty and night-time lights',
    summary: 'Gini, Theil between and within departments, and the spatial Gini of multidimensional poverty in 2012 and 2024, and of night-time lights.',
    description: 'This Colab notebook measures inequality in the Multidimensional Poverty Index across Bolivia’s 343 municipalities and indigenous autonomies in 2012 and 2024, and in log night-time lights per capita in 2012 on the 333 units with data. As poverty fell, its relative inequality rose: the Gini went from 0.25 to 0.37 and the Theil index from 0.10 to 0.22, while the absolute spread narrowed. About 79% of poverty inequality lies within departments in both periods (83% for lights). Spatial Gini tests (p = 0.001) show that neighbouring municipalities are more alike than random pairs, and a department table compares simple and census-weighted poverty (0.133 nationally in 2012, 0.033 in 2024).',
    tags: ['inequality', 'Theil', 'Gini', 'spatial Gini'],
    image: 'images/tools/esda-inequality.webp',
    imageAlt: 'Quintile map of multidimensional poverty in 2024 across Bolivia’s 343 municipalities, with the borders of the nine departments used to decompose inequality',
    date: '2026-10-28', pinned: false,
    links: [
      { label: 'Open in Colab', url: COLAB_URL + 'esda_inequality.ipynb', kind: 'colab' },
      { label: 'View on GitHub', url: REPO_URL + '/blob/main/notebooks/esda_inequality.ipynb', kind: 'github' },
    ],
    related: ['municipalities343-sdg01', 'municipalities343-ntl', 'geo4bolivia-package'],
  },
  {
    id: 'mpi-esda-heterogeneity', type: 'notebook', section: 'tools',
    title: 'Where do lights predict poverty? Multiscale GWR',
    summary: 'Is night-time light linked to poverty in the same way everywhere? A national regression and a multiscale geographically weighted regression (MGWR) of municipal poverty on lights per capita, for 2012 and 2024.',
    description: 'This Colab notebook regresses the multidimensional poverty index of the SDG Atlas of Bolivia 2026 on log night-time lights per capita for the 333 municipalities with lights data, first in 2012 and then with poverty in 2024 on lights in 2020. One national slope explains 29% of the variation in 2012. A multiscale geographically weighted regression (MGWR, with geo4bolivia’s geo.mgwr), which lets the intercept and the slope vary over space, each at its own scale, with bandwidths of 44 neighbours for the intercept and 64 for the slope, raises R² to 0.65. Every local slope is negative, but the link is almost five times stronger in Cochabamba than in Beni. By 2024 the link is a little weaker (national R² 0.25) and the slope’s bandwidth widens to 100 neighbours.',
    tags: ['MGWR', 'spatial heterogeneity', 'night-time lights', 'geo4bolivia'],
    image: 'images/tools/esda-heterogeneity.webp',
    imageAlt: 'Map of the significant local slopes of a multiscale GWR of poverty on night-time lights in 2012 across 333 Bolivian municipalities (bandwidth 64), steepest in Cochabamba, Chuquisaca and Potosí',
    date: '2026-10-28', pinned: false,
    links: [
      { label: 'Open in Colab', url: COLAB_URL + 'esda_heterogeneity.ipynb', kind: 'colab' },
      { label: 'View on GitHub', url: REPO_URL + '/blob/main/notebooks/esda_heterogeneity.ipynb', kind: 'github' },
    ],
    related: ['municipalities343-ntl', 'municipalities343-sdg01', 'geo4bolivia-package'],
  },
  {
    id: 'mpi-eda-esda', type: 'notebook', section: 'tools',
    title: 'Poverty in Bolivia: an extended EDA and ESDA',
    summary: 'Exploratory and spatial analysis of multidimensional poverty in 343 municipalities, 2012 and 2024: correlates, clusters, bivariate LISA with night-time lights, inequality and a multiscale GWR.',
    description: 'This Colab notebook uses the SDG Atlas of Bolivia 2026 to explore multidimensional poverty in 343 municipalities and indigenous autonomies around the 2012 and 2024 censuses. The municipal index fell from an average of 0.234 to 0.063, in every unit, but the ranking barely changed (rank correlation 0.86). Poverty moves most closely with electricity coverage and telephones (Spearman about −0.9) and is strongly clustered (Moran’s I 0.45 in 2012, 0.39 in 2024), with hot spots in the Chuquisaca–Potosí–Cochabamba valleys. A bivariate LISA on the 333 units with lights shows that poor municipalities tend to have dark neighbours (bivariate Moran’s I −0.26). Relative inequality rose as poverty fell (Gini 0.25 to 0.37), and a multiscale geographically weighted regression (MGWR) shows that the lights–poverty link is negative everywhere but strongest in the central-southern valleys.',
    tags: ['EDA', 'ESDA', 'bivariate LISA', 'infrastructure'],
    image: 'images/tools/eda-esda.webp',
    imageAlt: 'Bivariate LISA map of 333 Bolivian municipalities relating each one’s poverty in 2012 to its neighbours’ night-time lights',
    date: '2026-10-28', pinned: false,
    links: [
      { label: 'Open in Colab', url: COLAB_URL + 'eda_esda.ipynb', kind: 'colab' },
      { label: 'View on GitHub', url: REPO_URL + '/blob/main/notebooks/eda_esda.ipynb', kind: 'github' },
    ],
    related: ['municipalities343-sdg01', 'mpi-esda', 'mpi-esda-heterogeneity', 'geo4bolivia-package'],
  },
  {
    id: 'three-packages', type: 'notebook', section: 'tools',
    title: 'One question, three packages: did Bolivia’s municipalities converge?',
    summary: 'One question, did the Sustainable Development Index of Bolivia’s 343 municipalities converge between ~2012 and ~2024?, answered with geo4bolivia alone: load, map, β-convergence, inequality and spatial clusters. Then one or two specialised steps with each companion package: expdpy for panels and geometrics for space.',
    description: 'This Colab notebook answers the question with geo4bolivia alone and then shows where its two companion packages go further. With geo4bolivia it finds and loads the Sustainable Development Index of the SDG Atlas 2026, maps both periods in common classes, tests β-convergence, compares inequality in the two periods and locates the spatial clusters, each in one call that ends with a plain-language reading of the result. It then hands the same panel to expdpy (geo.for_expdpy) for one or two specialised panel steps, such as the split of the variation into differences between municipalities and changes within them, and to geometrics (geo.for_geometrics) for one or two specialised spatial steps, such as checking that a spatial model’s results do not depend on the choice of weights matrix.',
    tags: ['geo4bolivia', 'expdpy', 'geometrics', 'convergence', 'SDGs'],
    image: 'images/tools/three-packages.webp',
    imageAlt: 'Three linked panels: a search of the catalog with geo4bolivia, the trajectories of the Sustainable Development Index by department with expdpy, and a LISA cluster map of Bolivia’s 343 municipalities with geometrics',
    date: '2026-11-17', pinned: true,
    links: [
      { label: 'Open in Colab', url: COLAB_URL + 'three_packages.ipynb', kind: 'colab' },
      { label: 'View on GitHub', url: REPO_URL + '/blob/main/notebooks/three_packages.ipynb', kind: 'github' },
    ],
    related: ['geo4bolivia-package', 'expdpy-package', 'geometrics-package', 'sdg-dynamics', 'municipalities343-sdg'],
  },
  {
    id: 'sdg-dynamics', type: 'notebook', section: 'tools',
    title: 'Dynamics of sustainable development in Bolivia, 2012–2024',
    summary: 'How the Sustainable Development Index and its 15 goals changed across Bolivia’s 343 municipalities and indigenous autonomies between the 2012 and 2024 censuses: progress, convergence, rank mobility and spatial clustering.',
    description: 'Using the SDG Atlas of Bolivia 2026 loaded with geo4bolivia, this Colab notebook compares the Sustainable Development Index (IDS), its 15 goal indices and multidimensional poverty near the 2012 and 2024 censuses. The IDS rose in 342 of the 343 units, by 10 points on average, driven by infrastructure, education, decent work and poverty reduction, while climate action retreated as more families were hit by extreme events and fires emitted more CO₂. With geo4bolivia’s own functions it estimates β-convergence (the units that started lower gained more, with a half-life of about 20 years) and compares dispersion across periods: gaps in the IDS narrowed, and poverty fell most where it was highest, although relative gaps in poverty widened. It also measures rank mobility (Spearman 0.84) and uses Moran’s I and LISA clusters to show that progress concentrated around El Alto, in the Cochabamba and Chuquisaca valleys and in the north, and lagged in eastern Santa Cruz.',
    tags: ['SDGs', 'convergence', 'spatial analysis', 'geo4bolivia'],
    image: 'images/tools/sdg-dynamics.webp',
    imageAlt: 'Scatter plot of the change in the Sustainable Development Index between ~2012 and ~2024 against its initial value for 343 Bolivian municipalities, with a falling fitted line (r = −0.43): the units that started lower gained more',
    date: '2026-11-17', pinned: true,
    links: [
      { label: 'Open in Colab', url: COLAB_URL + 'sdg_dynamics.ipynb', kind: 'colab' },
      { label: 'View on GitHub', url: REPO_URL + '/blob/main/notebooks/sdg_dynamics.ipynb', kind: 'github' },
    ],
    related: ['municipalities343-sdg', 'geo4bolivia-package', 'municipalities343-sdg01', 'mpi-esda'],
  },
  {
    id: 'embeddings-mpi-ml', type: 'notebook', section: 'tools',
    title: 'Predicting poverty from satellite embeddings',
    summary: 'Machine-learning models predict municipal multidimensional poverty in 2012 and 2024 from 2017 satellite embeddings and night-time lights, with random and spatial cross-validation.',
    description: 'This Colab notebook trains random forests and XGBoost to predict the Multidimensional Poverty Index of the SDG Atlas of Bolivia 2026 for the 2012 and 2024 censuses from the 64 dimensions of Google’s 2017 satellite embeddings, and compares them with a baseline of night-time lights and population. It uses the 333 municipalities whose territory is unchanged since the older map the features were computed on. Under random 5-fold cross-validation, population-weighted embeddings plus lights explain 62% of the variance in 2012 poverty and 49% in 2024, against at most 35% for lights and population alone. When a whole department is held out, the best R² falls to 0.32 and 0.20, and the errors cluster by department; maps of the out-of-fold residuals show where the models fail, for example in Pando in 2012.',
    tags: ['machine learning', 'satellite embeddings', 'poverty', 'spatial cross-validation'],
    image: 'images/tools/embeddings-mpi-ml.webp',
    imageAlt: 'Scatter plot of out-of-fold predicted against observed multidimensional poverty in 2012 for 333 municipalities, from XGBoost on satellite embeddings, lights and population, random 5-fold cross-validation, R² 0.62',
    date: '2026-10-28', pinned: true,
    links: [
      { label: 'Open in Colab', url: COLAB_URL + 'embeddings_mpi_ml.ipynb', kind: 'colab' },
      { label: 'View on GitHub', url: REPO_URL + '/blob/main/notebooks/embeddings_mpi_ml.ipynb', kind: 'github' },
    ],
    related: ['municipalities343-emb', 'municipalities343-sdg01', 'mpi-eda'],
  },

  // ---------------------------------------------------------------- Tools: apps
  {
    id: 'geoexplorer', type: 'app', section: 'tools',
    title: 'GeoExplorer v1.0: Bolivia from outer space',
    summary: 'Swipe between 2013 and 2019 to see how population, night-time lights, land cover and GDP changed across Bolivia’s municipalities.',
    description: 'An Earth Engine app, “Exploring regional development in Bolivia: a view from outer space”. Choose a layer (population density from WorldPop, VIIRS night-time lights, land cover, or gridded GDP), then drag the slider to compare 2013 with 2019 side by side. Click any municipality to chart its change. Cities such as Santa Cruz de la Sierra show how fast urban lights have spread. Built for DS4Bolivia by Carlos Mendez (Nagoya University).',
    tags: ['Earth Engine', 'night-time lights', 'population', 'interactive map'],
    image: 'images/tools/geoexplorer.webp',
    imageAlt: 'Earth Engine app comparing night-time lights over Santa Cruz de la Sierra in 2013 and 2019 with a swipe slider',
    date: '2026-01-15', pinned: true,
    links: [
      { label: 'Launch app', url: 'https://carlos-mendez.projects.earthengine.app/view/geoexplorer1v100bolivia', kind: 'launch' },
      { label: 'Source code', url: REPO_URL + '/blob/main/apps/geoexplorer1v100bolivia.js', kind: 'github' },
    ],
    related: ['municipalities343-ntl', 'municipalities343-pop'],
  },

  // ---------------------------------------------------------------- Projects
  // Card images: AI-generated pictures of Bolivian places (ChatGPT), prepared by scripts/project_images.py;
  // the only map is drawn from the site's official boundaries (SDSN Bolivia's 2025 municipal map)
  {
    id: 'sdg-atlas-bolivia', type: 'project', section: 'projects',
    title: 'The subnational SDG Atlas of Bolivia',
    summary: 'The Atlas of the Sustainable Development Goals in Bolivia measures how every municipality and indigenous autonomy has progressed towards the goals between the 2012 and 2024 censuses, with an index for each goal, an overall index and the indicators behind them.',
    description: 'The Atlas de los ODS en Bolivia 2026, led by SDSN Bolivia, measures the gaps and trends of sustainable development in Bolivia’s autonomous territorial entities between 2012 and 2024. It covers the 343 municipalities and indigenous autonomies (GAIOC) that exist in 2025, plus the departments and the Gran Chaco region, with 81 indicators of 15 Sustainable Development Goals drawn mainly from the 2012 and 2024 Population and Housing Censuses and from official records on health, education, finance, energy and public budgets, complemented by satellite data for climate and land. Every indicator is measured twice, near each census, and rescaled from 0 (worst situation) to 100 (target met); each goal index is the mean of its indicators and the Sustainable Development Index (IDS) the mean of the 15 goal indices, following SDSN’s global SDG Index. The Atlas finds near-universal progress, with Bolivia’s IDS rising from 57.4 to 66.0, and territorial convergence: the entities that started furthest behind advanced most. Its previous edition, the Municipal Atlas of the SDGs 2020, covered 339 municipalities at a single point in time. The observatory publishes the 2026 municipal data as sixteen datasets: the IDS (sdg) and one dataset per goal (sdg01 to sdg17), each at both periods.',
    team: 'SDSN Bolivia (Universidad Privada Boliviana): Lykke E. Andersen, Fabiana Argandoña and the SDSN Bolivia technical team',
    status: 'Atlas 2026 (2012–2024) published; its municipal data are in the observatory',
    citation: 'Andersen, L. E., & Argandoña, F. (2026). Atlas de los ODS en Bolivia 2026: Brechas y tendencias del desarrollo sostenible en las Entidades Territoriales Autónomas, 2012–2024. La Paz: Universidad Privada Boliviana, SDSN Bolivia.',
    tags: ['SDGs', 'municipalities', 'atlas', 'sustainable development'],
    image: 'images/projects/sdg-atlas-bolivia.webp',
    imageAlt: 'The 343 municipalities and indigenous autonomies of Bolivia shaded by the Sustainable Development Index near 2024, from rose (low) to turquoise (high), over an illustration of the Salar de Uyuni at night',
    date: '2026-11-17', pinned: true,
    links: [
      { label: 'Visit the Atlas', url: 'https://atlasods.sdsnbolivia.org/', kind: 'external' },
    ],
    related: ['municipalities343-sdg', 'municipalities343-sdg01', 'sdg-dynamics', 'human-capital-paper'],
  },
  {
    id: 'regional-shocks-spillovers', type: 'project', section: 'projects',
    title: 'Regional shocks and spillover effects',
    summary: 'Synthetic control methods for regional shocks whose effects leak to neighbouring regions, with scspill, an open Python package that estimates both the direct effect and the spillovers.',
    description: 'When a policy or a shock hits one region, its effects rarely stop at the border: neighbouring regions trade, migrate and invest across it. The standard synthetic control method builds a counterfactual for the treated region from untreated “donor” regions, and is biased when those donors are themselves affected. This project develops scspill, a Python package for synthetic control with spillovers, which estimates the effect on the treated region together with a spillover effect on each donor. It implements the Bayesian spatial-autoregressive model of Sakaguchi and Tagawa, with a single spillover intensity estimated by Metropolis within Gibbs, and the method of Cao and Dowd for a known exposure structure, with hypothesis tests, plots and a Monte Carlo engine. Worked case studies include California’s Proposition 99 and the 2011 secession of South Sudan.',
    team: 'Carlos Mendez, Shosei Sakaguchi and Hayato Tagawa (QuaRCS lab)',
    status: 'Ongoing; scspill 0.3.0 released',
    citation: 'Mendez, C., Sakaguchi, S., & Tagawa, H. (2026). Synthetic Control Models with Spillovers in Python (version 0.3.0).',
    tags: ['synthetic control', 'spillovers', 'causal inference', 'Python'],
    image: 'images/projects/regional-shocks-spillovers.webp',
    imageAlt: 'Illustration of La Paz and El Alto at night below Illimani, with rings of rose light spreading from the city across the Altiplano to the turquoise lights of nearby towns',
    date: '2026-11-17', pinned: true,
    links: [
      { label: 'Visit the project', url: 'https://quarcs-lab.github.io/scspill/', kind: 'external' },
    ],
    related: ['geometrics-package', 'expdpy-package', 'municipalities343-ntl'],
  },
  {
    id: 'local-pollution-dynamics', type: 'project', section: 'projects',
    title: 'Monitoring space-time dynamics of local pollution',
    summary: 'Satellite observations of air pollution, followed across Bolivia’s municipalities, to see where pollution builds up, how it spreads and how it changes over time.',
    description: 'This project monitors local air pollution across Bolivia with satellite data, following how it changes in space and over time at the municipal level: where it concentrates, how pollution in one place relates to its neighbours, and how its patterns shift over time. Its data and methods will be published in the observatory as they become available.',
    status: 'In preparation',
    tags: ['air pollution', 'remote sensing', 'space-time dynamics', 'environment'],
    image: 'images/projects/local-pollution-dynamics.webp',
    imageAlt: 'Illustration of the lowlands around Santa Cruz de la Sierra at dusk, with rose haze drifting over the city lights and a satellite scanning from above',
    date: '2026-11-17', pinned: true,
    links: [],
    related: ['municipalities343-ntl', 'municipalities343-pop', 'municipalities343-sdg13'],
  },

  // ---------------------------------------------------------------- Insights
  {
    id: 'human-capital-paper', type: 'insight', subtype: 'Paper', section: 'insights',
    title: 'Human capital constraints and the regions of Bolivia',
    summary: 'Where malnutrition, language barriers, school dropout and unequal education cluster across 339 municipalities, and how they divide Bolivia into seven or eight regions.',
    description: 'This study maps five constraints on human capital across Bolivia’s 339 municipalities: chronic malnutrition in children, the share of the population that does not speak Spanish, the secondary-school dropout rates of boys and girls, and inequality in years of education. It summarises them with principal components, finds where high and low values cluster in space (hot spots and cold spots), and groups municipalities that are both similar and contiguous into regions. It used the Municipal Atlas of the SDGs 2020; the observatory’s 2026 Atlas data have close counterparts of all five indicators, measured near 2012 and near 2024, in its goal datasets sdg02, sdg04 and sdg10.',
    citation: 'Mendez, C., & Gonzales, E. (2021). Human capital constraints, spatial dependence, and regionalization in Bolivia: A spatial clustering approach. Economía, 44(87), 115–145.',
    doi: 'https://doi.org/10.18800/economia.202101.007',
    tags: ['human capital', 'education', 'spatial clustering', 'regionalization'],
    image: 'images/insights/human-capital-paper.webp',
    imageAlt: 'Five quintile maps of Bolivia’s 343 municipalities near 2024, from the SDG Atlas 2026: chronic child malnutrition, non-Spanish speakers, secondary dropout of boys and of girls, and inequality in years of education',
    date: '2021-05-06', pinned: true,
    media: [],
    links: [
      { label: 'Read the paper', url: 'https://doi.org/10.18800/economia.202101.007', kind: 'paper' },
    ],
    summarySections: [
      { h: 'Data', p: 'Five indicators of the Municipal Atlas of the SDGs 2020 for 339 municipalities: chronic malnutrition in children, non-Spanish-speaking population, secondary dropout of males and of females, and the inequality of years of education.' },
      { h: 'Method', p: 'Principal components summarise the five constraints; measures of spatial dependence find hot spots and cold spots; a regionalization analysis groups municipalities that are similar in their constraints and close in space.' },
      { h: 'Findings', p: 'Human capital constraints are spatially clustered, and Bolivia can be divided into seven or eight geographic regions that share similar constraints.' },
      { h: 'Extend it', p: 'The paper used the 2020 edition of the Atlas. The 2026 edition has close counterparts of its five indicators at two periods, ~2012 and ~2024, for 343 municipalities: chronic malnutrition in children under 5 (sdg2_2_dcn in sdg02), the population that does not speak Spanish (sdg10_2_esp in sdg10), the secondary-school dropout rates of girls and boys (sdg4_1_asm and sdg4_1_ash in sdg04) and the Gini coefficient of years of education (sdg10_4_gin in sdg10). They allow the analysis to be updated and to ask whether the regions it found persisted. The definitions differ from the 2020 edition, so the values are not directly comparable with the paper’s.' },
    ],
    related: ['municipalities343-sdg02', 'municipalities343-sdg04', 'municipalities343-sdg10', 'mpi-esda'],
  },
];


export const PEOPLE = {
  core: [
    { name: 'Carlos Mendez', affiliation: 'Nagoya University, Japan', avatar: 'images/people/carlos-mendez.webp', website: 'https://carlos-mendez.org' },
  ],
  associates: [
    { name: 'Favio Leiva', affiliation: 'Nagoya University, Japan', avatar: 'images/people/favio-leiva.webp', website: 'https://favioleiva.github.io/' },
    { name: 'Laura Prieto', affiliation: 'Nagoya University, Japan', avatar: 'images/people/laura-prieto.webp', website: 'https://lauraprieto.my.canva.site/' },
  ],
};

export const CONTACTS = [
  { name: 'Carlos Mendez', email: 'carlos.mendez.n9 [at] f.mail.nagoya-u.ac.jp' },
];

export const CITATION_APA = 'Mendez, C. (2026). GeoDevelopment Observatory of Bolivia. https://quarcs-lab.github.io/gdo4bolivia/';
export const CITATION_BIB = `@misc{gdobolivia2026,
  author       = {Mendez, Carlos},
  title        = {{GeoDevelopment Observatory of Bolivia}},
  year         = {2026},
  howpublished = {\\url{https://quarcs-lab.github.io/gdo4bolivia/}},
  note         = {Data and code: https://github.com/quarcs-lab/gdo4bolivia}
}`;

