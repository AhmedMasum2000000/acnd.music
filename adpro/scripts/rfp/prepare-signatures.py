#!/usr/bin/env python3
"""
Cuts the signatures and the company seal out of their paper.

Three images arrive by three different routes: two flat scans on white and one
photograph on grey card. A single luminance cutoff cannot serve all three. At
205 the photograph's own paper is darker than the threshold and the whole sheet
comes through as a grey block; at 120 the ends of its strokes are lost. So the
paper level is measured from each image's own border and the alpha ramps from
just under it down to the ink, which needs no per-image tuning and no masking
by hand.

The seal gets one extra step. It was scanned with CamScanner, which stamps its
own name across the foot of the sheet, and that string on a company seal in a
procurement submission reads as carelessness. The seal is purple and the
watermark is grey, so selecting the purple ink drops it without a crop that
would have to be re-measured if the scan is ever replaced.

    python3 scripts/rfp/prepare-signatures.py

Reads scripts/rfp/signatures/src/*.jpg, writes the PNGs beside them.
"""

from pathlib import Path
import sys

import numpy as np
from PIL import Image

HERE = Path(__file__).resolve().parent
SRC = HERE / "signatures" / "src"
OUT = HERE / "signatures"

# How far under the paper level ink has to fall before it counts as ink at all,
# and how far under before it is fully opaque. Both in luminance steps, applied
# relative to whatever the paper turns out to be.
FADE = 12
SOLID = 70

# Wide enough that the mark still has detail at the 24mm the seal prints at.
WIDTH = 900


def paper_level(grey: np.ndarray) -> int:
    """The luminance of the sheet, read from its border.

    The median of a frame around the edge, which is paper on all three of
    these and would still be paper on a tighter crop.
    """
    band = max(4, min(grey.shape) // 25)
    edge = np.concatenate([
        grey[:band].ravel(), grey[-band:].ravel(),
        grey[:, :band].ravel(), grey[:, -band:].ravel(),
    ])
    return int(np.median(edge))


def cut(path: Path, purple: bool) -> Image.Image:
    im = Image.open(path).convert("RGB")
    rgb = np.asarray(im).astype(np.int16)
    grey = np.asarray(im.convert("L")).astype(np.int16)

    paper = paper_level(grey)
    top = paper - FADE                      # anything above this is sheet
    floor = max(0, paper - SOLID)            # anything below this is solid ink
    alpha = np.clip((top - grey) / max(top - floor, 1), 0, 1)

    if purple:
        # The seal's ink is violet; the watermark is neutral grey. One test
        # separates them, and it keeps working if the scan is redone.
        alpha *= (rgb[:, :, 2] - rgb[:, :, 0] > 18)

    ink = alpha > 0.06
    if not ink.any():
        sys.exit(f"{path.name}: no ink found against paper at {paper}")
    ys, xs = np.nonzero(ink)
    box = (xs.min(), ys.min(), xs.max() + 1, ys.max() + 1)

    # Keep the ink's own colour, but pull the mid-tones down: a photographed
    # signature is never as dark as it looked on the page.
    colour = np.clip(rgb * 0.72, 0, 255).astype(np.uint8)
    out = Image.fromarray(
        np.dstack([colour, (alpha * 255).astype(np.uint8)]), "RGBA"
    ).crop(box)

    if out.width > WIDTH:
        h = round(out.height * WIDTH / out.width)
        out = out.resize((WIDTH, h), Image.LANCZOS)
    return out


def main() -> None:
    if not SRC.is_dir():
        sys.exit(f"missing {SRC}, put the scans there first")

    jobs = [("habib", False), ("masum", False), ("seal", True)]
    done = []
    for name, purple in jobs:
        found = [p for ext in ("jpg", "jpeg", "png") if (p := SRC / f"{name}.{ext}").exists()]
        if not found:
            print(f"   no source for {name}, skipped")
            continue
        img = cut(found[0], purple)
        dest = OUT / f"{name}.png"
        img.save(dest)
        done.append(f"{name} {img.width}x{img.height}")

    print("signatures: " + (", ".join(done) if done else "nothing prepared"))


if __name__ == "__main__":
    main()
