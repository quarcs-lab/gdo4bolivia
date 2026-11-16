"""One-off: match SDSN Bolivia's 343-unit municipal map (2025) to the observatory's geo IDs.

Writes ``raw/lookups/municipalities343.csv``: one row per SDSN polygon (INE code), with
- ``geo_id``: the existing GADM-numbered ID for the 339 municipalities of the earlier map
  (matched by INE code), and a new ID for the four units created since 2015, numbered
  after the last municipality of their GADM province (TIOC Territorio Indígena Multiétnico,
  INE province 0809, gets a new Beni province)
- the GADM code ``GID_3`` and spelling ``name_gadm`` and DS4Bolivia's ``name_ds4bolivia``,
  ``asdf_id`` and ``mun_id`` from ``raw/lookups/municipalities339_gadm.csv``
- ``name``: the spelling of the Atlas de los ODS 2026 workbook, except where it shortens a
  name that the SDSN map gives in full (San José -> San José de Chiquitos), and
  ``name_sdsn`` and ``province``: the map's own spelling and province name
- ``changed``: True where the polygon differs from the 2015 map (area overlap < 0.95) or is
  new; DS4Bolivia's polygon-based data (pop, ntl, emb) do not apply to these units, so
  ``asdf_id`` is left empty for them
- ``overlap``: area overlap (intersection over union) with the unit's polygon in the 2015
  map (geoBoundaries ADM3, as published in geo/boundaries/ before version 0.4), and
  ``parents``: the 2015 units that cover more than 1% of a changed unit

Run it from the repository root before the switch (it reads the 339-unit
geo/boundaries/municipality.parquet and geo/units.csv); review the output by hand.
"""

from pathlib import Path

import geopandas as gpd
import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
SDSN = ROOT / "raw/boundaries/sdsn2025/sdsn_municipal_boundaries_2025.shp"
ATLAS = ROOT / "raw/sdg/atlas_ods_bolivia_2026.xlsx"
OUT = ROOT / "raw/lookups/municipalities343.csv"
CRS = "+proj=aea +lat_1=-11 +lat_2=-21 +lat_0=-16 +lon_0=-64 +datum=WGS84 +units=m"
NEW_IDS = {"031304": "BO-02-12-04", "050405": "BO-07-04-05", "051204": "BO-07-02-04", "080901": "BO-03-09-01"}


def main() -> None:
    new = gpd.read_file(SDSN).to_crs(CRS)
    new["ine_code"] = new["Codigo_INE"].astype(str).str.zfill(6)
    assert len(new) == 343 and new["ine_code"].is_unique

    units = pd.read_csv(ROOT / "geo/units.csv", dtype=str)
    old_units = units[units["scale"] == "municipality"]
    assert len(old_units) == 339, "run before geo/ is rebuilt on the 343-unit map"
    gadm = pd.read_csv(ROOT / "raw/lookups/municipalities339_gadm.csv", dtype={"ine_code": str})
    old = gpd.read_parquet(ROOT / "geo/boundaries/municipality.parquet").to_crs(CRS)
    old = old.merge(old_units[["geo_id", "ine_code"]], on="geo_id")

    lookup = new[["ine_code", "Municipio", "Provincia", "geometry"]].rename(
        columns={"Municipio": "name_sdsn", "Provincia": "province"})
    atlas = pd.read_excel(ATLAS, sheet_name="Índices municipales", header=None, skiprows=5, usecols=[0, 1], dtype=str)
    atlas = atlas.set_axis(["code", "name"], axis=1).assign(ine_code=lambda d: d["code"].str.zfill(6))
    lookup["name"] = lookup["ine_code"].map(atlas.set_index("ine_code")["name"].str.strip())
    assert lookup["name"].notna().all()
    fuller = pd.Series([s.startswith(n + " ") for s, n in zip(lookup["name_sdsn"], lookup["name"])], index=lookup.index)
    lookup.loc[fuller, "name"] = lookup.loc[fuller, "name_sdsn"]
    lookup = lookup.merge(old_units[["geo_id", "ine_code"]], on="ine_code", how="left")
    assert lookup["geo_id"].notna().sum() == 339 and set(lookup.loc[lookup["geo_id"].isna(), "ine_code"]) == set(NEW_IDS)
    lookup["geo_id"] = lookup["geo_id"].fillna(lookup["ine_code"].map(NEW_IDS))
    assert lookup["geo_id"].is_unique

    by_ine = gadm.set_index("ine_code")
    lookup["GID_3"] = lookup["ine_code"].map(by_ine["GID_3"])
    lookup["name_gadm"] = lookup["ine_code"].map(by_ine["name_gadm"])
    lookup["name_ds4bolivia"] = lookup["ine_code"].map(by_ine["name"])
    lookup["mun_id"] = lookup["ine_code"].astype(int)

    old_geom = old.set_index("ine_code").geometry
    overlap = []
    for ine, geom in zip(lookup["ine_code"], lookup.geometry):
        if ine not in old_geom.index:
            overlap.append(0.0)
            continue
        o = old_geom[ine]
        overlap.append(round(geom.intersection(o).area / geom.union(o).area, 4))
    lookup["overlap"] = overlap
    lookup["changed"] = lookup["overlap"] < 0.95
    lookup["asdf_id"] = lookup["ine_code"].map(by_ine["asdf_id"]).where(~lookup["changed"]).astype("Int64")

    parents = []
    for changed, geom in zip(lookup["changed"], lookup.geometry):
        if not changed:
            parents.append("")
            continue
        hits = old[old.intersects(geom)]
        share = hits.geometry.intersection(geom).area / geom.area
        parents.append(";".join(sorted(hits.loc[share > 0.01, "geo_id"])))
    lookup["parents"] = parents

    cols = ["geo_id", "ine_code", "name", "name_sdsn", "province", "GID_3", "name_gadm", "name_ds4bolivia", "asdf_id", "mun_id",
            "changed", "overlap", "parents"]
    lookup = lookup[cols].sort_values("geo_id")
    lookup.to_csv(OUT, index=False)
    print(f"wrote {OUT.relative_to(ROOT)}: {len(lookup)} units, {int(lookup['changed'].sum())} changed or new")
    print(lookup[lookup["changed"]].to_string(index=False))
    renamed = lookup[lookup["name"] != lookup["name_ds4bolivia"]].dropna(subset=["name_ds4bolivia"])
    print(f"\n{len(renamed)} names differ from DS4Bolivia's:")
    print(renamed[["geo_id", "name_ds4bolivia", "name"]].to_string(index=False))


if __name__ == "__main__":
    main()
