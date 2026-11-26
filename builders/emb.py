"""Municipal satellite embeddings 2017: raw/emb (area-weighted) and raw/embpw (population-weighted)
-> data/emb/map339/emb, one panel with A00…A63 and A00_pw…A63_pw."""

import pandas as pd

from geo4bolivia import store
from geo4bolivia.build.common import publish, write_docs
from .geo import link_ds4bolivia_polygons

DATASET, SCALE, YEAR = "emb", "map339", 2017
AREA = "raw/emb/satelliteEmbeddings2017.csv"
POPULATION = "raw/embpw/satelliteEmbeddings2017popWeighted.csv"   # its pop_sum (the weights) is left out


def build() -> None:
    root = store.repo_root()
    area = pd.read_csv(root / AREA)
    pop = pd.read_csv(root / POPULATION)
    dims = [c for c in area.columns if c.startswith("A") and c[1:].isdigit()]
    pop = pop[["asdf_id", *dims]].rename(columns={c: f"{c}_pw" for c in dims})
    df = area.merge(pop, on="asdf_id", how="outer", validate="one_to_one").assign(year=YEAR)
    df = link_ds4bolivia_polygons(df)   # DS4Bolivia polygons: the 339 units of the 2015 map
    publish(DATASET, SCALE, df)
    write_docs(DATASET)
