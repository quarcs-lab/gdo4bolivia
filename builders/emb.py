"""Municipal satellite embeddings 2017: raw/emb and raw/embpw -> data/map339/emb, embpw."""

import pandas as pd

from geo4bolivia import store
from geo4bolivia.build.common import publish, write_docs
from .geo import link_ds4bolivia_polygons

SCALE, YEAR = "map339", 2017
RAW = {"emb": "raw/emb/satelliteEmbeddings2017.csv",
       "embpw": "raw/embpw/satelliteEmbeddings2017popWeighted.csv"}   # its pop_sum (the weights) is left out


def _build(dataset: str) -> None:
    df = pd.read_csv(store.repo_root() / RAW[dataset]).assign(year=YEAR)
    df = link_ds4bolivia_polygons(df)   # DS4Bolivia polygons: the 339 units of the 2015 map
    publish(dataset, SCALE, df)
    write_docs(dataset)


def build() -> None:
    _build("emb")


def build_pw() -> None:
    _build("embpw")
