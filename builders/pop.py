"""Municipal population: raw/pop -> data/pop/map339/pop."""

import numpy as np
import pandas as pd

from geo4bolivia import store
from geo4bolivia.build.common import publish, write_docs
from .geo import link_ds4bolivia_polygons

DATASET, SCALE = "pop", "map339"
RAW = "raw/pop/pop.csv"


def build() -> None:
    wide = pd.read_csv(store.repo_root() / RAW)
    df = wide.melt(id_vars="asdf_id", var_name="year", value_name="pop")
    df["year"] = df["year"].str.removeprefix("pop").astype(int)
    df = link_ds4bolivia_polygons(df)   # DS4Bolivia polygons: the 339 units of the 2015 map
    # density over the unit's area in the equal-area projection (geo/units.area_km2)
    units = pd.read_parquet(store.repo_root() / "geo/units.parquet")
    area = units.loc[units["scale"] == SCALE].set_index("geo_id")["area_km2"].astype(float)
    df["pop_density"] = df["pop"] / df["geo_id"].map(area)
    # its natural log, for maps and models of a variable this skewed (0.08 to 2,850 people per km²)
    df["ln_pop_density"] = np.log(df["pop_density"])
    publish(DATASET, SCALE, df)
    write_docs(DATASET)
