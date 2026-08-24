#!/usr/bin/env python3
"""
Fetches the Bangladesh boundary once, so the build never needs the network.

The coverage map used to be drawn from an outline typed by hand: thirty-four
points against a real coastline of several hundred. It read as Bangladesh from
across a room and was wrong everywhere it mattered, which is not good enough in
a bid scored on geographic coverage.

Natural Earth is the source because of the licence as much as the accuracy. This
document goes to a procurement team; Natural Earth is explicitly public domain
with no attribution condition, where a map lifted off a search result carries
somebody else's copyright into a commercial proposal.

The 1:10m dataset rather than 1:50m, because Cox's Bazar sits on a coastal spit
that the coarser coastline cuts straight through: at 1:50m the town plots into
the Bay of Bengal. The point is real and the boundary was the approximation.

Run it when the boundary needs refreshing, which is approximately never:

    python3 scripts/rfp/geometry.py

Writes bangladesh.json beside this script. That file is committed, and map.py
reads it offline.
"""

from datetime import date
from pathlib import Path
import json
import sys
import urllib.request

HERE = Path(__file__).resolve().parent
OUT = HERE / "bangladesh.json"

SOURCE = (
    "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/"
    "geojson/ne_10m_admin_0_countries.geojson"
)
LICENCE = "Public domain (Natural Earth). No attribution required."


def main() -> None:
    print(f"fetching {SOURCE.rsplit('/', 1)[-1]} ...")
    with urllib.request.urlopen(SOURCE, timeout=120) as r:
        world = json.load(r)

    hits = [f for f in world["features"] if f["properties"].get("ISO_A3") == "BGD"]
    if not hits:
        sys.exit("no feature with ISO_A3 = BGD in the source")
    geometry = hits[0]["geometry"]

    rings = (
        geometry["coordinates"]
        if geometry["type"] == "MultiPolygon"
        else [geometry["coordinates"]]
    )
    # Outer ring of each polygon. Bangladesh has no holes at this resolution and
    # a locator map would not show them if it did.
    outlines = [poly[0] for poly in rings]
    outlines.sort(key=len, reverse=True)

    OUT.write_text(json.dumps({
        "source": SOURCE,
        "licence": LICENCE,
        "dataset": "Natural Earth 1:10m Admin 0 Countries",
        "feature": "ISO_A3 = BGD",
        "fetched": date.today().isoformat(),
        "rings": [[[round(x, 4), round(y, 4)] for x, y in ring] for ring in outlines],
    }))

    pts = sum(len(r) for r in outlines)
    print(f"bangladesh.json — {len(outlines)} rings, {pts} points, "
          f"{OUT.stat().st_size / 1024:.1f} KB")


if __name__ == "__main__":
    main()
