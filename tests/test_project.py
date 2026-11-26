"""Project-specific tests: facts about Bolivia's units and datasets.

Generic behaviour is tested in the package repository (quarcs-lab/geo4bolivia).
"""

import numpy as np
import pandas as pd
import pytest

import geo4bolivia as geo
from geo4bolivia import store


# --- scales and units -----------------------------------------------------------------

def _units_343():
    """Every unit of map343 and the coarser scales (map339 repeats map343's geo IDs)."""
    u = geo.units()
    return u[u["scale"] != "map339"].set_index("geo_id")


def test_ancestors_follow_the_hierarchy():
    assert geo.ancestors("map343") == ["province", "department", "country"]
    assert geo.ancestors("map339") == ["province", "department", "country"]
    assert geo.ancestors("province") == ["department", "country"]
    assert geo.ancestors("department") == ["country"]
    assert geo.ancestors("country") == []


def test_scale_of_recognises_every_id_pattern():
    assert geo.scale_of("BO") == "country"
    assert geo.scale_of("BO-04") == "department"
    assert geo.scale_of("BO-04-17") == "province"
    assert geo.scale_of("BO-G10K-r012c034") == "grid10k"
    with pytest.raises(ValueError, match=r"several maps \(map343, map339\)"):   # the two maps share their IDs
        geo.scale_of("BO-04-17-04")


def test_units_are_unique_and_nest_by_prefix():
    u = geo.units()
    assert not u.duplicated(["scale", "geo_id"]).any()
    assert u["scale"].value_counts().to_dict() == {"map343": 343, "map339": 339, "province": 113, "department": 9,
                                                   "country": 1}
    old = geo.units("map339")
    assert set(old["geo_id"]) < set(geo.units("map343")["geo_id"])                 # the 339 kept their IDs
    assert (old["geo_id"].str[:8] == old["parent_id"]).all() and old["asdf_id"].notna().all()
    m = geo.units("map343")
    assert (m["geo_id"].str[:8] == m["parent_id"]).all()
    assert m["ine_code"].is_unique and m["mun_id"].is_unique
    assert m["gid"].dropna().is_unique and m["gid"].isna().sum() == 4           # four units created after GADM's map
    assert m["asdf_id"].dropna().is_unique and m["asdf_id"].isna().sum() == 10  # ten units whose polygon changed


def test_units_created_since_2015():
    u = _units_343()
    new = {"BO-02-12-04": "031304", "BO-07-04-05": "050405", "BO-07-02-04": "051204", "BO-03-09-01": "080901"}
    for geo_id, ine in new.items():
        assert u.loc[geo_id, "ine_code"] == ine and pd.isna(u.loc[geo_id, "gid"])
    assert u.loc["BO-03-09", "name"] == "Territorio Indígena Multiétnico"   # its own Beni province
    assert u.loc["BO-03-09", "ine_code"] == "0809" and u.loc["BO-03-09-01", "parent_id"] == "BO-03-09"
    assert not set(new) & set(geo.units("map339")["geo_id"])


def test_lakes_are_not_units():
    names = geo.units("map343")["name_gadm"]
    assert not names.str.contains("Lago").any()


def test_boundaries_come_from_the_sdsn_map():
    m = geo.units("map343")
    lk = pd.read_csv(store.repo_root() / "raw/lookups/municipalities343.csv", dtype={"ine_code": str})
    assert dict(zip(lk["geo_id"], lk["ine_code"])) == dict(zip(m["geo_id"], m["ine_code"]))
    assert set(geo.boundaries("map343")["geo_id"]) == set(m["geo_id"])
    assert set(geo.boundaries("map339")["geo_id"]) == set(geo.units("map339")["geo_id"])
    assert not (store.repo_root() / "raw/boundaries/gadm41_BOL_3.json").exists()   # no GADM geometry


def test_salt_flats_and_lakes_are_outside_every_unit():
    area = geo.units().groupby("scale")["area_km2"].sum()
    u = _units_343()
    # the scales are exact unions of map343's municipalities, holes included
    assert np.allclose(area[["country", "department", "province"]], area["map343"], rtol=1e-6)
    assert np.isclose(area["map339"], area["map343"], rtol=1e-3)   # the 2015 map leaves the same holes
    assert 1.06e6 < area["country"] < 1.075e6       # ~13,000 km² of salt flats and lakes left out
    assert u.loc["BO-05-10-02", "area_km2"] < 400   # Coipasa: most of the Salar de Coipasa is a hole
    assert u.loc["BO-07-02-03", "area_km2"] < 9000  # Uyuni: the Salar de Uyuni (~9,500 km²) is a hole


def test_ine_codes_nest_like_the_gadm_hierarchy():
    u = _units_343()
    m = u[u["scale"] == "map343"]
    assert m["ine_code"].str.fullmatch(r"\d{6}").all()
    assert (m["ine_code"].str[:4] == m["province_id"].map(u["ine_code"])).all()
    assert (m["ine_code"].str[:2] == m["department_id"].map(u["ine_code"])).all()
    assert u.loc["BO-04", "ine_code"] == "02"            # GADM order differs from INE: La Paz


def test_known_names_and_keys():
    u = _units_343()
    assert u.loc["BO-04", "name"] == "La Paz"
    assert u.loc["BO-07-09", "name"] == "José María Linares"   # "JoséMaríaLinares" in GADM
    la_paz = u.loc["BO-04-17-04"]
    assert la_paz["name"] == "Nuestra Señora de La Paz" and la_paz["ine_code"] == "020101"   # the Atlas's spelling
    assert la_paz["name_ds4bolivia"] == "La Paz"
    assert la_paz["asdf_id"] == "176" and la_paz["mun_id"] == "20101"
    old = geo.units("map339").set_index("geo_id").loc["BO-04-17-04"]
    assert old["name"] == la_paz["name"] and old["asdf_id"] == "176"


def test_homonyms_follow_the_polygons():
    """DS4Bolivia's attribute rows are swapped for three homonym pairs; geo IDs follow the polygons."""
    for scale in ("map343", "map339"):
        m = geo.units(scale).set_index("asdf_id")
        assert m.loc["57", "department_id"] == "BO-03"       # San Javier polygon 57 lies in Beni
        assert m.loc["57", "ine_code"] == "080102"
        assert m.loc["264", "department_id"] == "BO-08"      # ... and polygon 264 in Santa Cruz
    lk = pd.read_csv(store.repo_root() / "raw/lookups/municipalities339_gadm.csv")
    assert lk["swapped"].sum() == 6


def test_polygon_data_are_on_the_2015_map():
    lk = pd.read_csv(store.repo_root() / "raw/lookups/municipalities343.csv")
    changed = set(lk.loc[lk["changed"], "geo_id"])
    assert len(changed) == 10 and "BO-07-04-01" in changed and "BO-02-12-04" in changed   # Colquechaca, Raqaypampa
    for dataset in ("pop", "ntl", "emb"):
        df = geo.load(dataset)
        assert df.attrs["geo:scale"] == "map339" and set(df["geo_id"]) == set(geo.units("map339")["geo_id"])
        assert len(set(df["geo_id"]) & changed) == 6           # the six that lost territory, as they were in 2015


def test_link_by_ds4bolivia_keys():
    table = pd.DataFrame({"asdf_id": [176, 57], "mun_id": [20101, 80102]})
    by_asdf = geo.link(table, scale="map339", on="asdf_id", key="asdf_id")
    by_ine = geo.link(table, scale="map343", on="mun_id", key="mun_id")
    assert by_asdf["geo_id"].tolist() == by_ine["geo_id"].tolist() == ["BO-04-17-04", "BO-03-01-01"]


def test_link_by_name_within_a_department():
    m = geo.units("map343")
    potosi = m[m["department_id"] == "BO-07"]
    out = geo.link(pd.DataFrame({"mun": ["Potosí", "Uyuni"]}), scale="map343", on="mun", key="name")
    assert out["geo_id"].isin(potosi["geo_id"]).all()


def test_link_refuses_names_shared_by_several_municipalities():
    table = pd.DataFrame({"mun": ["San Javier", "Uyuni"]})
    with pytest.raises(ValueError, match="BO-03-01-01, BO-08-10-04"):
        geo.link(table, scale="map343", on="mun", key="name")
    with pytest.warns(UserWarning, match="name several"):
        out = geo.link(table, scale="map343", on="mun", key="name", errors="warn")
    assert out["geo_id"].isna().tolist() == [True, False]


def test_crosswalks_are_nested():
    xw = geo.crosswalk("map343", "department")
    assert len(xw) == 343 and xw["geo_id_to"].nunique() == 9
    assert np.allclose(xw["weight_area"], 1)
    assert len(geo.crosswalk("map339", "province")) == 339


def test_the_2015_map_moves_onto_map343_by_area():
    xw = geo.crosswalk("map339", "map343")
    assert np.allclose(xw.groupby("geo_id_from")["weight_area"].sum(), 1, atol=1e-4)
    colquechaca = xw[xw["geo_id_from"] == "BO-07-04-01"].set_index("geo_id_to")["weight_area"]
    assert colquechaca["BO-07-04-05"] > 0.5                    # most of it is San Pedro de Macha since 2025


# --- datasets ---------------------------------------------------------------------------

def test_population_panel_and_aggregation():
    df = geo.load("pop")
    assert len(df) == 339 * 20 and df["year"].agg(["min", "max"]).tolist() == [2001, 2020]
    dep = geo.aggregate(df, to="department", dataset="pop")
    assert len(dep) == 9 * 20 and (dep["n_units"].groupby(dep["year"]).sum() == 339).all()
    assert np.isclose(dep.loc[dep["year"] == 2020, "pop"].sum(), df.loc[df["year"] == 2020, "pop"].sum())


def test_ntl_logs_are_not_aggregable():
    df = geo.load("ntl")
    assert df["year"].agg(["min", "max"]).tolist() == [2012, 2020]
    with pytest.raises(ValueError, match="No aggregation rule"):
        geo.aggregate(df, to="department", dataset="ntl", variables="ln_NTLpc")


SDG_GOALS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 15, 16, 17]


def test_sdg_goal_datasets_hold_index_and_indicators():
    names = set()
    for g in SDG_GOALS:
        fields = [f["name"] for f in geo.metadata.fields(f"sdg{g:02d}") if not f.get("geo:role")]
        assert fields[0] == f"index_sdg{g}"
        assert all(f.startswith(f"sdg{g}_") for f in fields[1:])
        names |= set(fields)
    assert len(names) == 81 + 15
    assert [f["name"] for f in geo.metadata.fields("sdg") if not f.get("geo:role")] == \
        ["index_sdg", "rank_sdg", "population", "urbanization"]


def test_sdg_panels_hold_both_periods():
    mpi = geo.load("sdg01", variables="sdg1_2_mpi")
    assert len(mpi) == 343 * 2 and set(mpi["year"]) == {2012, 2024}
    sucre = mpi[mpi["geo_id"] == "BO-01-06-02"].set_index("year")["sdg1_2_mpi"]   # values of the Atlas workbook
    assert sucre.to_dict() == {2012: 0.071, 2024: 0.014}
    field = {f["name"]: f for f in geo.metadata.fields("sdg02")}["sdg2_2_dcn"]
    assert field["geo:reference_years"] == {"2012": "2008", "2024": "2023"}       # EDSA survey years


def test_sdg_index_and_ranking():
    ids = geo.load("sdg").set_index(["geo_id", "year"])
    assert ids.loc[("BO-04-17-04", 2024), "rank_sdg"] == 1                       # Nuestra Señora de La Paz
    assert ids.loc[("BO-02-12-04", 2024), "rank_sdg"] == 343                     # TIOC-Raqaypampa
    assert ids.xs(2024, level="year")["rank_sdg"].sort_values().tolist() == list(range(1, 344))
    assert ids.xs(2024, level="year")["population"].sum() == 11_365_333 - 400    # census; Huarina differs by 400
    goals = pd.concat([geo.load(f"sdg{g:02d}", variables=f"index_sdg{g}").set_index(["geo_id", "year"])
                       for g in SDG_GOALS], axis=1)
    assert np.allclose(goals.mean(axis=1), ids["index_sdg"].reindex(goals.index), atol=0.1)


def test_population_weighted_sdg_by_department():
    df = geo.load("sdg01", variables="sdg1_2_mpi")
    out = geo.aggregate(df, to="department", rules={"sdg1_2_mpi": "weighted_mean:population"},
                        weights=geo.load("sdg", variables="population"))
    assert len(out) == 9 * 2 and out["sdg1_2_mpi"].between(0, 1).all()


def test_sdg_rollups_fetch_census_population_by_themselves():
    df = geo.load("sdg01", variables="sdg1_2_mpi")
    auto = geo.aggregate(df, to="department", dataset="sdg01")
    manual = geo.aggregate(df, to="department", rules={"sdg1_2_mpi": "weighted_mean:population"},
                           weights=geo.load("sdg", variables="population"))
    assert np.allclose(auto["sdg1_2_mpi"], manual["sdg1_2_mpi"]) and (auto["coverage"] == 1).all()
    both = geo.combine(["sdg01", "sdg04"], scale="department")
    assert len(both) == 9 * 2 and both["index_sdg4"].notna().all()
    ids = geo.aggregate(geo.load("sdg", variables="index_sdg"), to="country", dataset="sdg")
    assert ids["n_units"].tolist() == [343, 343]
    with pytest.warns(UserWarning, match="rank_sdg"):
        geo.aggregate(geo.load("sdg"), to="department", dataset="sdg")


def test_lights_cover_the_339_municipalities_of_2015():
    # the dataset has 339 units; the trend series is complete, the raw series lacks a few each year
    ntl = geo.load("ntl", years=2020)
    assert ntl["geo_id"].nunique() == 339 and geo.datasets().set_index("dataset").loc["ntl", "units"] == 339
    up = geo.aggregate(ntl, to="country", rules={"ln_t400NTLpc": "mean"}, variables="ln_t400NTLpc")
    assert up["n_units"].item() == 339 and up["coverage"].item() == 1
    # n_units counts the units with data: five municipalities have no raw lights value in 2020
    raw = geo.aggregate(ntl, to="country", rules={"ln_NTLpc": "mean"}, variables="ln_NTLpc")
    assert raw["n_units"].item() == ntl["ln_NTLpc"].notna().sum() == 334


def test_analyses_run_on_each_dataset_map():
    assert geo.moran("sdg01", "sdg1_2_mpi", year=2024).w_spec.endswith("(on map343)")
    assert geo.moran("ntl", "ln_t400NTLpc", year=2020).w_spec.endswith("(on map339)")
    mixed = geo.load("sdg01", variables="sdg1_2_mpi", years=2012).merge(
        geo.load("ntl", variables="ln_t400NTLpc", years=2012), on=["geo_id", "year"])
    with pytest.raises(ValueError, match="pass map="):        # 339 IDs on both maps, and pandas drops the map
        geo.moran(mixed, "ln_t400NTLpc")
    assert geo.moran(mixed, "ln_t400NTLpc", map="map339").w_spec.endswith("(on map339)")
    with pytest.raises(ValueError, match="Unknown scale or map 'municipality'"):
        geo.boundaries("municipality")


def test_sdg_change_and_reference_years():
    ch = geo.change(geo.load("sdg", variables="index_sdg", names=True), "index_sdg")
    assert len(ch) == 343 and ch["index_sdg_change"].mean() > 0                 # the IDS rose on average
    assert ch.set_index("geo_id").loc["BO-04-17-04", "index_sdg_rank_2024"] == 1
    ry = geo.reference_years("sdg03", "sdg3_2_tmi").set_index("year")["reference"]
    assert ry.to_dict() == {2012: "2008", 2024: "2023"}
    assert "sdg1_2_mpi" in geo.search("multidimensional poverty")["variable"].tolist()


def test_embeddings_in_both_weightings():
    df = geo.load("emb")
    assert len(df) == 339 and set(df["year"]) == {2017}
    area, population = df.filter(regex=r"^A\d{2}$"), df.filter(regex=r"^A\d{2}_pw$")
    assert area.shape[1] == population.shape[1] == 64 and len(geo.metadata.variables("emb")) == 128
    assert area.notna().all().all() and population.notna().all().all()
    assert not (area.to_numpy() == population.to_numpy()).all()        # two weightings, not one copied


def test_citations_put_the_original_source_first_then_the_observatory():
    atlas = geo.cite("sdg01").split("\n\n")
    assert atlas[0].startswith("Andersen, L. E., & Argandoña, F. (2026). Atlas de los ODS en Bolivia 2026")
    assert atlas[1].startswith("Mendez, C. (2026). GeoDevelopment Observatory of Bolivia")
    assert atlas[2].startswith("SDSN Bolivia (2025). Límites Municipales Bolivia 2025")
    lights = geo.cite("ntl").split("\n\n")
    assert lights[0].startswith("Elvidge") and lights[1].startswith("WorldPop") and "Observatory" in lights[2]


def test_sdsn_sources_are_cc_by():
    for dataset in ["sdg", *(d for d in geo.metadata.dataset_ids() if d.startswith("sdg") and d != "sdg")]:
        for s in geo.metadata.package(dataset)["sources"]:
            if "SDSN" in s.get("geo:creator", "") or "SDSN" in s["title"]:
                assert s["geo:license"]["name"] == "CC-BY-4.0", (dataset, s["title"][:40])
