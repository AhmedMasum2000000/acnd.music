#!/usr/bin/env python3
"""
Photography for the Uber response.

The company sells the thing in these pictures. A submission that argues for a
year of outdoor media and shows three photographs of it is arguing against
itself, so every numbered part opens on a screen AD PRO owns, and every city in
the rate card is shown before it is priced.

Sites are chosen by the crop scorer already in the repository — how much of the
frame the lit screen holds — and each is used once. The cover and the closing
photograph are excluded because they are already spoken for.

    python3 scripts/rfp/photos.py

Writes photos.json beside this script.
"""

from pathlib import Path
import base64
import io
import json

from PIL import Image

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent
BOARDS = ROOT / "public" / "boards"

# Already used on the cover and the back cover.
SPOKEN_FOR = {
    "dhaka-gulshan-circle-1-upper",
    "dhaka-kamlapur-railway-station-entry-gate",
}

# One band per numbered part, chosen so the picture argues the section's point.
OPENERS = [
    ("profile", "dhaka-gulshan-circle-2-east-side-rob-super-market",
     "AD PRO's screen at Gulshan 2 Circle, Dhaka"),
    ("permissions", "dhaka-police-plaza-entry-gate-north-side",
     "Permitted indoor site at Police Plaza, Dhaka"),
    ("inventory", "dhaka-manik-mia-avenue-aarong-signal",
     "AD PRO's screen at Manik Mia Avenue, Dhaka"),
    ("execution", "dhaka-bijoy-saroni-mor",
     "AD PRO's screen at Bijoy Sarani, Dhaka"),
    ("commercial", "dhaka-sks-tower-exit-gate-mohakhali",
     "AD PRO's screen at SKS Tower, Mohakhali, Dhaka"),
]

# The screen shown beside each city's rates.
CITIES = {
    "Dhaka": "dhaka-karwan-bazar",
    "Chattogram": "chattogram-golpahar-moor",
    "Sylhet": "sylhet-sylhet-surma-point",
    "Cox's Bazar": "coxs-bazar-dolphin-moor-coxs-bazar",
    "Rajshahi": "rajshahi-rajshahi-new-market",
    "Cumilla": "cumilla-kandirpar-cumilla",
    "Rangpur": "rangpur-shapla-mor-rangpur",
    "Bogura": "bogura-police-plaza-bogura",
    "Narayanganj": "narayanganj-narayanganj",
    "Feni": "feni-feni",
}


def cover(img: Image.Image, ratio: float) -> Image.Image:
    """Centre-crop to an aspect ratio. The boards sit centre-frame already."""
    w, h = img.size
    if w / h > ratio:
        nw = int(h * ratio)
        return img.crop(((w - nw) // 2, 0, (w + nw) // 2, h))
    nh = int(w / ratio)
    return img.crop((0, (h - nh) // 2, w, (h + nh) // 2))


def encode(img: Image.Image, width: int, quality: int = 82) -> str:
    """Never upscale — these files run 700 to 1150px and asking for more than
    they hold does not add detail, it only makes the document bigger."""
    if img.width > width:
        img = img.resize((width, round(img.height * width / img.width)), Image.LANCZOS)
    buf = io.BytesIO()
    img.convert("RGB").save(buf, "WEBP", quality=quality, method=6)
    return "data:image/webp;base64," + base64.b64encode(buf.getvalue()).decode()


def band(slug: str, ratio: float, width: int) -> str | None:
    path = BOARDS / f"{slug}.jpg"
    if not path.exists():
        print(f"  missing {slug}")
        return None
    return encode(cover(Image.open(path), ratio), width)


def main() -> None:
    out = {"openers": {}, "cities": {}}
    used = set(SPOKEN_FOR)

    for key, slug, alt in OPENERS:
        uri = band(slug, 64 / 15, 1200)      # a wide band across the column
        if uri:
            out["openers"][key] = {"uri": uri, "alt": alt}
            used.add(slug)

    for city, slug in CITIES.items():
        uri = band(slug, 3 / 2, 460)         # small, beside the city's rates
        if uri:
            out["cities"][city] = uri
            used.add(slug)

    (HERE / "photos.json").write_text(json.dumps(out, ensure_ascii=False))
    total = sum(len(v["uri"]) for v in out["openers"].values())
    total += sum(len(v) for v in out["cities"].values())
    print(f"openers: {len(out['openers'])}, cities: {len(out['cities'])} "
          f"— {total / 1024 / 1024:.2f} MB")


if __name__ == "__main__":
    main()
