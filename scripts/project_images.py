"""Draw the Projects section's card images with OpenAI's image model (gpt-image-1).

    OPENAI_API_KEY=... uv run python scripts/project_images.py [<id> ... | pillar]

With no argument it draws every project card and the Projects pillar of the landing page:
images/projects/<id>.webp (1600 x 900) and images/pillar-projects.webp (1200 x 800). The images
are AI-generated illustrations; the prompts below keep them in the site's Altiplano palette and
free of text, logos and any organisation's branding. The key is read from the environment and
never written anywhere. Each run draws new images: keep the ones you like and commit them.
"""

from __future__ import annotations

import base64
import io
import os
import sys
from pathlib import Path

import requests
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
IMG = ROOT / "images"
API = "https://api.openai.com/v1/images/generations"
MODEL = "gpt-image-1"

STYLE = (
    "Wide cinematic digital illustration, editorial and minimal, seen from high above at night. "
    "Palette: deep teal-black background (#071417, #0b1e22), glowing turquoise (#5ad6c6), "
    "flamingo pink and rose (#ff8597, #d1405a), soft salt-white and warm sand accents. "
    "Subtle satellite-imagery texture, fine cartographic contour lines, soft glow, lots of dark negative space. "
    "Absolutely no text, letters, numbers, labels, logos, flags or watermarks."
)

PROMPTS = {
    "sdg-atlas-bolivia": (
        "The outline of Bolivia seen from space, divided into hundreds of small municipal polygons, "
        "each softly shaded from rose (lagging) to turquoise (advanced) like a choropleth atlas; "
        "seventeen small glowing abstract tiles hover in an arc above the map, suggesting the "
        "Sustainable Development Goals as a measured dashboard. "
    ),
    "regional-shocks-spillovers": (
        "A dark relief map of South American regions, one region glowing intensely rose at the centre "
        "as if struck by a shock, with concentric ripples of light spreading across borders into the "
        "neighbouring regions, which glow faintly turquoise; thin flowing lines connect regions like "
        "trade and migration links. Conveys cause, effect and spillover. "
    ),
    "local-pollution-dynamics": (
        "A small satellite orbiting above the Bolivian lowlands and Andes at night, its sensor scanning "
        "the land; translucent plumes of haze drift over the landscape in rose and amber tones, "
        "fading into clean turquoise air elsewhere, with faint grid cells and time-trail streaks "
        "suggesting monitoring over space and time. "
    ),
    "pillar": (
        "Three abstract research projects as three glowing layered panels floating above a dark map of "
        "Bolivia: a choropleth atlas of municipalities, ripples spreading between regions, and drifting "
        "haze observed by a satellite, joined by fine luminous lines into one programme. "
    ),
}


def draw(prompt: str, key: str) -> Image.Image:
    r = requests.post(
        API,
        headers={"Authorization": f"Bearer {key}"},
        json={"model": MODEL, "prompt": prompt + STYLE, "size": "1536x1024", "quality": "high", "n": 1},
        timeout=300,
    )
    if r.status_code != 200:
        sys.exit(f"OpenAI API error {r.status_code}: {r.text[:500]}")
    return Image.open(io.BytesIO(base64.b64decode(r.json()["data"][0]["b64_json"]))).convert("RGB")


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


def main(ids: list[str]) -> None:
    key = os.environ.get("OPENAI_API_KEY")
    if not key:
        sys.exit("Set OPENAI_API_KEY in the environment first.")
    for pid in ids or list(PROMPTS):
        if pid not in PROMPTS:
            sys.exit(f"Unknown id {pid!r}; choose from {', '.join(PROMPTS)}")
        img = draw(PROMPTS[pid], key)
        if pid == "pillar":
            path, size = IMG / "pillar-projects.webp", (1200, 800)
        else:
            path, size = IMG / "projects" / f"{pid}.webp", (1600, 900)
        path.parent.mkdir(parents=True, exist_ok=True)
        crop_to(img, size).save(path, "WEBP", quality=85, method=6)
        print(f"{path.relative_to(ROOT)}  {size[0]}x{size[1]}")


if __name__ == "__main__":
    main(sys.argv[1:])
