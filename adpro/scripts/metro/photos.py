#!/usr/bin/env python3
"""
Crops the two site photographs of Motijheel station for the proposal.

The originals are phone shots, 720 px wide and portrait, with the camera's
date burned into the bottom-left corner. Each crop keeps the screen and the
concourse around it and drops the floor and the timestamp. A crop is not a
retouch, so nothing inside the frame is changed.

    python3 scripts/metro/photos.py

Writes scripts/metro/photos.json.
"""

from pathlib import Path
import base64
import io
import json

from PIL import Image

HERE = Path(__file__).resolve().parent
SRC = HERE / "photos"

# (left, top, right, bottom) in source pixels.
CROPS = {
    # The large wall screen with the concourse either side, for the cover.
    # Cut to the 180 x 110 mm the cover sets it at, so the page does not
    # re-crop it to the ceiling.
    "cover": ("big-led.jpg", (0, 400, 720, 840)),
    # The same screen at the 4:5 the inventory page sets both photographs at.
    "big": ("big-led.jpg", (0, 280, 720, 1180)),
    # Two of the standard screens, column-mounted, down the concourse.
    "small": ("small-led.jpg", (0, 380, 720, 1280)),
}


def uri(im: Image.Image) -> str:
    buf = io.BytesIO()
    im.convert("RGB").save(buf, "JPEG", quality=90, optimize=True)
    return "data:image/jpeg;base64," + base64.b64encode(buf.getvalue()).decode()


def main() -> None:
    out = {}
    for key, (name, box) in CROPS.items():
        im = Image.open(SRC / name).crop(box)
        out[key] = {"uri": uri(im), "width": im.width, "height": im.height}
    (HERE / "photos.json").write_text(json.dumps(out))
    print("photos.json: " + ", ".join(f"{k} {v['width']}x{v['height']}" for k, v in out.items()))


if __name__ == "__main__":
    main()
