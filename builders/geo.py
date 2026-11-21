"""Build ``geo/``: units with geo IDs, boundaries and crosswalks for every active scale.

Inputs (in ``raw/``):
- ``boundaries/sdsn2025/sdsn_municipal_boundaries_2025.shp``: SDSN Bolivia's municipal map
  (December 2025), the 343 municipalities and indigenous autonomies (GAIOC) of the Atlas de los
  ODS en Bolivia 2026, keyed by INE code; used with SDSN Bolivia's permission. The salt flats of
  Uyuni and Coipasa and lakes Poopó and Uru Uru lie outside every municipality, and Lake
  Titicaca outside the country
- ``lookups/municipalities343.csv``: each INE code's geo ID, names and source keys, made by
  ``scripts/match_municipalities343.py`` (339 units keep the IDs of the 2015 map; four new ones)
- ``boundaries/bolivia339geoqueryOpt.geojson``: the 2015 map's 339 municipalities (GeoBolivia,
  via geoBoundaries gbOpen BOL ADM3, public domain), as DS4Bolivia publishes them, keyed by
  ``asdf_id``: the polygons behind DS4Bolivia's data (pop, ntl, the embeddings)
- ``lookups/municipalities339_gadm.csv``: the GADM 4.1 codes and names of the 2015 map's 339
  municipalities, matched to DS4Bolivia by ``scripts/match_municipalities.py``
- ``lookups/department_names.csv`` and ``lookups/province_names.csv``: GADM codes, hand-checked
  names (GADM writes them without spaces, e.g. ``JoséMaríaLinares``) and INE codes

The geo IDs follow GADM 4.1's numbering, built from the codes alone (no GADM geometry is used),
which differs from the INE codes (La Paz is ``BO-04`` here and ``02`` in INE); the INE codes are
kept in ``ine_code`` and the GADM codes in ``gid``. The four units created after GADM's map are
numbered after the last municipality of their province, and the Territorio Indígena
Multiétnico (INE province 0809) is a new Beni province, ``BO-03-09``.

Two municipal maps are published, named by their number of units: ``map343`` (SDSN 2025) and
``map339`` (2015). The 339 units keep the same geo IDs in both. Both are simplified as a
coverage (about 100 m); provinces, departments and the country are exact unions of map343, and
map339's units nest in them by ID. ``geo/crosswalks/map339__map343.csv`` gives the share of each
map339 unit's area in the map343 units it overlaps.
"""

from __future__ import annotations

import geopandas as gpd
import pandas as pd

from geo4bolivia import store
from geo4bolivia.build.common import publish_geo
from geo4bolivia.build.gadm import gadm_units
from geo4bolivia.build.geoboundaries import from_polygons

BOUNDARIES_FILE = "raw/boundaries/sdsn2025/sdsn_municipal_boundaries_2025.shp"
BOUNDARIES_2015 = "raw/boundaries/bolivia339geoqueryOpt.geojson"
MAP, MAP_2015 = "map343", "map339"
LEVELS = {1: "department", 2: "province", 3: MAP}
TOLERANCE_M = 100
N_MUNICIPALITIES, N_2015 = 343, 339
SLIVER = 0.01    # overlaps below 1% of a map339 unit are edge noise between the two maps' outlines
# provinces that GADM 4.1 does not have: geo_id -> (INE code, name)
NEW_PROVINCES = {"BO-03-09": ("0809", "Territorio Indígena Multiétnico")}


def _check(cond: bool, message: str) -> None:
    if not cond:
        raise ValueError(f"raw lookups are inconsistent: {message}")


def _parent_code(gid: pd.Series) -> pd.Series:
    """'BOL.1.1.1_2' -> 'BOL.1.1' (the parent's GADM code, without its version suffix)."""
    return gid.str.replace(r"_\d+$", "", regex=True).str.rsplit(".", n=1).str[0]


def build() -> None:
    raw = store.repo_root() / "raw"
    lookup = pd.read_csv(raw / "lookups/municipalities343.csv", dtype={"ine_code": str})
    departments = pd.read_csv(raw / "lookups/department_names.csv", dtype={"ine_code": str})
    provinces = pd.read_csv(raw / "lookups/province_names.csv", dtype={"ine_code": str})
    _check(len(lookup) == N_MUNICIPALITIES and lookup["geo_id"].is_unique and lookup["ine_code"].is_unique,
           f"{N_MUNICIPALITIES} distinct municipalities")

    # the municipalities GADM knows: one row with the GADM codes and names of every level
    old = lookup[lookup["GID_3"].notna()]
    unversioned = lambda gid: gid.str.replace(r"_\d+$", "", regex=True)  # noqa: E731
    prov = provinces.set_index(unversioned(provinces["GID_2"]))
    dep = departments.set_index(unversioned(departments["GID_1"]))
    codes = old[["GID_3", "name_gadm"]].rename(columns={"name_gadm": "NAME_3"})
    p = _parent_code(codes["GID_3"])
    _check(p.isin(prov.index).all(), "every municipality's province is in province_names.csv")
    codes["GID_2"], codes["NAME_2"] = p.map(prov["GID_2"]), p.map(prov["name_gadm"])
    d = _parent_code(codes["GID_2"])
    _check(d.isin(dep.index).all(), "every province's department is in department_names.csv")
    codes["GID_1"], codes["NAME_1"] = d.map(dep["GID_1"]), d.map(dep["name_gadm"])
    _check(codes["GID_2"].nunique() == len(provinces) and codes["GID_1"].nunique() == len(departments),
           "every province and department has municipalities")
    units = gadm_units(codes, LEVELS)
    _check((units.loc[units["scale"] == MAP, "geo_id"].sort_values().to_numpy()
            == old["geo_id"].sort_values().to_numpy()).all(), "lookup geo_ids vs GADM codes")

    # provinces and municipalities created after GADM's map (no GADM code)
    new_prov = pd.DataFrame([{"geo_id": g, "scale": "province", "name": name, "parent_id": g[:5], "ine_code": ine}
                             for g, (ine, name) in NEW_PROVINCES.items()])
    new = lookup[lookup["GID_3"].isna()]
    new_mun = pd.DataFrame({"geo_id": new["geo_id"], "scale": MAP, "parent_id": new["geo_id"].str[:8]})
    units = pd.concat([units, new_prov, new_mun], ignore_index=True)
    provinces_known = set(units.loc[units["scale"] == "province", "geo_id"])
    _check(new_mun["parent_id"].isin(provinces_known).all(), "every new municipality lies in a known province")

    # harmonized names and source keys: municipalities by geo_id, provinces and departments by GADM code
    by_gid = pd.concat([provinces[["GID_2", "name", "ine_code"]].rename(columns={"GID_2": "gid"}),
                        departments[["GID_1", "name", "ine_code"]].rename(columns={"GID_1": "gid"})]).set_index("gid")
    has = units["gid"].isin(by_gid.index)
    units.loc[has, "name"] = units.loc[has, "gid"].map(by_gid["name"])
    units.loc[has, "ine_code"] = units.loc[has, "gid"].map(by_gid["ine_code"])
    mun = lookup.set_index("geo_id")
    is_mun = units["scale"] == MAP
    for col in ("name", "ine_code", "name_gadm"):
        units.loc[is_mun, col] = units.loc[is_mun, "geo_id"].map(mun[col])
    units["name_ds4bolivia"] = units["geo_id"].map(mun["name_ds4bolivia"])
    units["asdf_id"] = units["geo_id"].map(mun["asdf_id"]).astype("Int64")
    units["mun_id"] = units["geo_id"].map(mun["mun_id"]).astype("Int64")
    _check(units["name"].notna().all(), "every unit has a name")
    _check((units.loc[is_mun, "ine_code"].str[:4] == units.loc[is_mun, "parent_id"].map(
        units.set_index("geo_id")["ine_code"])).all(), "every municipality's INE code starts with its province's")

    shapes = gpd.read_file(store.repo_root() / BOUNDARIES_FILE)
    shapes["ine_code"] = shapes["Codigo_INE"].astype(str).str.zfill(6)
    layers = from_polygons(shapes, lookup[["ine_code", "geo_id"]], units, key="ine_code", tolerance_m=TOLERANCE_M,
                           scale=MAP)
    units = units[["geo_id", "scale", "name", "parent_id", "gid", "ine_code", "asdf_id", "mun_id",
                   "name_ds4bolivia", "name_gadm"]]

    # the 2015 map: DS4Bolivia's 339 polygons, with the geo IDs its municipalities keep in map343
    old_map = _units_2015(lookup, units)
    shapes = gpd.read_file(store.repo_root() / BOUNDARIES_2015)
    shapes["asdf_id"] = shapes["asdf_id"].astype(int)
    layers[MAP_2015] = from_polygons(shapes, old_map[["asdf_id", "geo_id"]].astype({"asdf_id": int}),
                                     pd.concat([units, old_map], ignore_index=True), key="asdf_id",
                                     tolerance_m=TOLERANCE_M, scale=MAP_2015)[MAP_2015]
    publish_geo(pd.concat([units, old_map], ignore_index=True), layers)
    _crosswalk_2015()


def _units_2015(lookup: pd.DataFrame, units: pd.DataFrame) -> pd.DataFrame:
    """The 339 units of the 2015 map: map343's names and codes where the municipality is the
    same, DS4Bolivia's polygon ``asdf_id`` for all of them."""
    raw = store.repo_root() / "raw"
    old = pd.read_csv(raw / "lookups/municipalities339_gadm.csv", dtype={"ine_code": str})
    _check(len(old) == N_2015 and old["asdf_id"].is_unique, f"{N_2015} DS4Bolivia polygons")
    geo_id = old["GID_3"].map(lookup.dropna(subset=["GID_3"]).set_index("GID_3")["geo_id"])
    _check(geo_id.notna().all(), "every 2015 municipality has a geo ID in municipalities343.csv")
    now = units[units["scale"] == MAP].set_index("geo_id")
    out = pd.DataFrame({
        "geo_id": geo_id, "scale": MAP_2015, "name": geo_id.map(now["name"]), "parent_id": geo_id.str[:8],
        "gid": old["GID_3"], "ine_code": old["ine_code"], "asdf_id": old["asdf_id"].astype("Int64"),
        "mun_id": old["mun_id"].astype("Int64"), "name_ds4bolivia": geo_id.map(lookup.set_index("geo_id")["name_ds4bolivia"]),
        "name_gadm": old["name_gadm"]})
    _check(out["parent_id"].isin(units.loc[units["scale"] == "province", "geo_id"]).all(),
           "every 2015 municipality lies in a known province")
    return out


def _crosswalk_2015() -> None:
    """geo/crosswalks/map339__map343.csv: the share of each map339 unit's area in each map343 unit."""
    from geo4bolivia.aggregate import overlay_weights

    pieces = overlay_weights(MAP_2015, MAP)
    pieces = pieces[pieces["share_of_from"] >= SLIVER]
    pieces["weight_area"] = pieces["share_of_from"] / pieces.groupby("geo_id_from")["share_of_from"].transform("sum")
    out = pieces[["geo_id_from", "geo_id_to", "weight_area"]].sort_values(["geo_id_from", "geo_id_to"])
    out["weight_area"] = out["weight_area"].round(6)
    path = store.repo_root() / f"geo/crosswalks/{MAP_2015}__{MAP}.csv"
    out.to_csv(path, index=False)
    print(f"  wrote geo/crosswalks/{MAP_2015}__{MAP}.csv  ({len(out)} rows)")


def link_ds4bolivia_polygons(df: pd.DataFrame) -> pd.DataFrame:
    """Add ``geo_id`` to data computed on DS4Bolivia's 339 polygons (keyed by ``asdf_id``).

    The values belong to the 2015 map's polygons, so they are published on ``map339``, every
    one of its 339 units with its geo ID.
    """
    from geo4bolivia.build.common import ids_from_units

    df = df.copy()
    df["geo_id"] = df["asdf_id"].astype(str).map(ids_from_units(MAP_2015, "asdf_id"))
    unlinked = sorted(set(df.loc[df["geo_id"].isna(), "asdf_id"]))
    _check(not unlinked, f"DS4Bolivia polygons without a geo_id: {unlinked}")
    return df
