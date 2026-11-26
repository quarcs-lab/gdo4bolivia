"""Prepare the Projects section's card images from pictures drawn in ChatGPT.

    uv run python scripts/project_images.py [<folder with the PNGs>]   # default ~/Downloads

The pictures are AI-generated in ChatGPT (OpenAI image model, with the maintainer's subscription)
from the prompts in PROMPTS, then saved as gdo-<id>.png. This script crops them to the site's sizes:
images/projects/<id>.webp (1600 x 900) and images/pillar-projects.webp (1200 x 800).

Rules for the pictures: Bolivian places only; no maps, country outlines, borders, globes or other
countries; no text, logos or flags. Where a card needs a map (OVERLAY), this script draws it from
the website's boundaries (site/data/map343.geojson: SDSN Bolivia 2025)
over the picture, so every border shown is the official one used across the site.
"""

from __future__ import annotations

import io
import math
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
IMG = ROOT / "images"

RULES = (
    "Cinematic, editorial and minimal. Palette: deep teal-black (#071417, #0b1e22), glowing turquoise "
    "(#5ad6c6), flamingo pink and rose (#ff8597, #d1405a), soft salt-white. Strict rules: only Bolivian "
    "landscape; NO maps, NO country outlines, NO borders or boundary lines, NO globe, NO grids, NO other "
    "countries or continents; no text, letters, numbers, labels, logos, flags or watermarks."
)
PROMPTS = {
    "sdg-atlas-bolivia": "16:9. The Salar de Uyuni in Bolivia at night, seen from a low oblique aerial angle: "
    "the hexagonal salt crust stretches to the horizon, its polygons glowing faintly in a gradient from rose "
    "to turquoise like the cells of a data atlas, under a deep starry sky, with Andean volcanoes far away.",
    "regional-shocks-spillovers": "16:9. La Paz and El Alto in Bolivia at night, seen from a high oblique "
    "aerial angle with Illimani behind; from the city a pulse of rose light spreads outward in wide concentric "
    "ripples across the dark Altiplano, reaching the lights of neighbouring towns, which answer with a faint "
    "turquoise glow, connected by thin luminous road lines.",
    "local-pollution-dynamics": "16:9. The Bolivian lowlands near Santa Cruz de la Sierra at dusk: city lights "
    "on a vast plain of forest and fields, translucent haze drifting low in rose and amber tones, thinning into "
    "clean turquoise air towards the Andean foothills; a small satellite's faint beam sweeps the haze.",
    "pillar-projects": "3:2. Laguna Colorada in Bolivia at twilight, red-rose waters and white borax islands, "
    "flamingos lifting off, Andean volcanoes in silhouette, a starry turquoise-teal sky with three thin "
    "satellite trails.",
}
# Cards that carry an official map: dataset, variable and colour ramp (rose = low, turquoise = high)
OVERLAY = {"sdg-atlas-bolivia": ("sdg", "index_sdg")}   # the IDS in its latest year
RAMP = ["#d1405a", "#ff8597", "#e3ecea", "#5ad6c6"]


def crop_to(img: Image.Image, size: tuple[int, int]) -> Image.Image:
    """Centre-crop to the aspect ratio of `size`, then resize."""
    w, h = img.size
    target = size[0] / size[1]
    if w / h > target:
        nw = round(h * target)
        img = img.crop(((w - nw) // 2, 0, (w - nw) // 2 + nw, h))
    else:
        nh = round(w / target)
        img = img.crop((0, (h - nh) // 2, w, (h - nh) // 2 + nh))
    return img.resize(size, Image.LANCZOS)


def map_layer(dataset: str, variable: str, height: int) -> Image.Image:
    """The municipalities on the website's boundaries, shaded by a variable, on a transparent layer."""
    import geopandas as gpd
    import matplotlib
    import pandas as pd
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    from matplotlib.colors import LinearSegmentedColormap

    mun = gpd.read_file(ROOT / "site/data/map343.geojson").to_crs(4326)
    df = pd.read_csv(ROOT / f"data/{dataset}/map343/{dataset}.csv")
    mun["v"] = mun["geo_id"].map(df.dropna(subset=[variable]).groupby("geo_id")[variable].last())
    mun["v"] = mun["v"].rank(pct=True)   # shade by percentile, so the colours spread over the ramp
    fig = plt.figure(figsize=(7, 9), dpi=100)
    ax = fig.add_axes([0, 0, 1, 1])
    ax.set_axis_off()
    mun.plot(column="v", cmap=LinearSegmentedColormap.from_list("site", RAMP), ax=ax,
             edgecolor=(0.03, 0.08, 0.09, 0.9), linewidth=0.25, missing_kwds={"color": "#29545b"})
    ax.set_aspect(1 / math.cos(math.radians(16.5)))
    buf = io.BytesIO()
    fig.savefig(buf, format="png", transparent=True)
    plt.close(fig)
    layer = Image.open(buf).convert("RGBA")
    layer = layer.crop(layer.getbbox())
    layer = layer.resize((round(layer.width * height / layer.height), height), Image.LANCZOS)
    layer.putalpha(layer.split()[3].point(lambda a: int(a * 0.92)))
    return layer


def main(folder: Path) -> None:
    for pid in PROMPTS:
        src = folder / f"gdo-{pid}.png"
        if not src.exists():
            print(f"skip {pid}: {src} not found")
            continue
        if pid == "pillar-projects":
            path, size = IMG / "pillar-projects.webp", (1200, 800)
        else:
            path, size = IMG / "projects" / f"{pid}.webp", (1600, 900)
        img = crop_to(Image.open(src).convert("RGB"), size)
        if pid in OVERLAY:
            layer = map_layer(*OVERLAY[pid], height=round(size[1] * 0.89))
            img = img.convert("RGBA")
            img.alpha_composite(layer, (size[0] - layer.width - 90, (size[1] - layer.height) // 2))
            img = img.convert("RGB")
        path.parent.mkdir(parents=True, exist_ok=True)
        img.save(path, "WEBP", quality=85, method=6)
        print(f"{path.relative_to(ROOT)}  {size[0]}x{size[1]}")


if __name__ == "__main__":
    main(Path(sys.argv[1]) if len(sys.argv) > 1 else Path.home() / "Downloads")
