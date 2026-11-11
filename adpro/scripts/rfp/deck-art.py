#!/usr/bin/env python3
"""Unpacks the deck's artwork from the data the two documents already carry.

photos.json and logos.json hold every image as a data URI, because the HTML
documents are single self-contained files. pptxgenjs wants files on disk, so
this writes them out. Nothing new is sourced or cropped here: the deck shows
the same photographs as the response, which is the point of it.

    python3 scripts/rfp/deck-art.py && node scripts/rfp/deck.mjs

Writes scripts/rfp/deck-art/.
"""

from pathlib import Path
import base64
import io
import json
import re
import subprocess
import sys

from PIL import Image

HERE = Path(__file__).resolve().parent
PROFILE = HERE.parent / "profile"
OUT = HERE / "deck-art"

# The four city screens slide 5 shows, and the ten the map counts. Slugged the
# same way deck.mjs asks for them.
def slug(city: str) -> str:
    return re.sub(r"[^a-z]", "", city.lower())


def write_jpeg(uri: str, name: str, quality: int = 88) -> None:
    """Decode a data URI to a baseline JPEG. WebP is what photos.json stores;
    PowerPoint on Windows has shipped a WebP codec only since 2023, and a deck
    that fails to draw on an older install is not worth the few hundred KB."""
    payload = uri.split(",", 1)[1]
    im = Image.open(io.BytesIO(base64.b64decode(payload))).convert("RGB")
    im.save(OUT / f"{name}.jpg", quality=quality)


def write_png(uri: str, name: str) -> None:
    """Alpha matters for the logo, so that one stays PNG."""
    payload = uri.split(",", 1)[1]
    Image.open(io.BytesIO(base64.b64decode(payload))).save(OUT / f"{name}.png")


def main() -> None:
    OUT.mkdir(exist_ok=True)

    rfp_photos = HERE / "photos.json"
    profile_photos = PROFILE / "photos.json"
    for path in (rfp_photos, profile_photos):
        if not path.exists():
            sys.exit(f"missing {path.name}, run: python3 scripts/rfp/photos.py")

    rfp = json.loads(rfp_photos.read_text())
    profile = json.loads(profile_photos.read_text())

    n = 0
    for key in ("cover", "close"):
        write_jpeg(profile[key], key)
        n += 1
    for city, entry in rfp["cities"].items():
        write_jpeg(entry["uri"] if isinstance(entry, dict) else entry, f"city_{slug(city)}")
        n += 1
    for key, entry in rfp["openers"].items():
        write_jpeg(entry["uri"] if isinstance(entry, dict) else entry, f"op_{key}")
        n += 1

    # The logo lives in the profile template rather than logos.json: it is the
    # company's own mark, not one of the client marks.
    tpl = (PROFILE / "template.html").read_text(encoding="utf-8")
    m = re.search(r'<img class="cover__logo"[^>]*src="(data:image/[^"]+)"', tpl)
    if not m:
        sys.exit("no cover__logo found in scripts/profile/template.html")
    write_png(m.group(1), "logo")
    n += 1

    # The map is drawn as SVG by map.py; sharp rasterises it at print density so
    # the city labels stay crisp when the slide is projected.
    svg = HERE / "map.svg"
    if not svg.exists():
        sys.exit("missing map.svg, run: python3 scripts/rfp/map.py")
    script = (
        "const sharp=require('sharp');"
        f"sharp({json.dumps(str(svg))},{{density:300}})"
        ".resize({height:1600}).flatten({background:'#ffffff'}).png()"
        f".toFile({json.dumps(str(OUT / 'map.png'))})"
        ".then(()=>process.exit(0)).catch(e=>{console.error(e.message);process.exit(1)});"
    )
    subprocess.run(["node", "-e", script], check=True, cwd=HERE.parent.parent)
    n += 1

    total = sum(f.stat().st_size for f in OUT.iterdir())
    print(f"deck-art: {n} files, {total / 1024 / 1024:.2f} MB")


if __name__ == "__main__":
    main()
