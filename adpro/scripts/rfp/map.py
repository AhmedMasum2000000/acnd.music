#!/usr/bin/env python3
"""
The ten-city coverage map.

Part 6 scores geographic coverage, and a table of city names is a poor way to
answer it: the point of covering ten cities is the shape it makes on the
country. Drawn as SVG rather than a raster: it costs a few kilobytes, prints at
whatever resolution the printer has, and the dots are sized from the inventory
rather than by eye, so the map cannot drift out of step with the rate card.

The boundary is Natural Earth data, fetched once by geometry.py and committed
as bangladesh.json. This script never touches the network.

    python3 scripts/rfp/map.py

Writes map.svg beside this script.
"""

from pathlib import Path
import json
import math

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent

# Town centre coordinates for each city AD PRO operates in. Checked against
# the boundary at build time rather than trusted: two of these were a few
# kilometres out when they were first typed in.
PLACES = {
    "Dhaka": (90.4125, 23.8103),
    "Chattogram": (91.7832, 22.3569),
    "Sylhet": (91.8687, 24.8949),
    "Rajshahi": (88.6042, 24.3745),
    "Cox's Bazar": (91.9700, 21.4272),
    "Cumilla": (91.1809, 23.4607),
    "Rangpur": (89.2752, 25.7439),
    "Bogura": (89.3773, 24.8465),
    "Narayanganj": (90.4990, 23.6238),
    "Feni": (91.3976, 23.0159),
}

W, H, PAD = 560.0, 620.0, 26.0

# Narayanganj sits about twenty kilometres from Dhaka, so at this scale their
# dots almost touch and their labels collide. These push the pair apart by hand;
# everything else is placed by rule.
LABEL = {
    "Dhaka": ("end", -1, -9),
    "Narayanganj": ("end", -1, 26),
    "Bogura": ("start", 1, 0),
}


def outline() -> list[list[list[float]]]:
    """The country's rings, largest first. Written by geometry.py."""
    path = HERE / "bangladesh.json"
    if not path.exists():
        raise SystemExit(f"missing {path.name}, run: python3 scripts/rfp/geometry.py")
    return json.loads(path.read_text())["rings"]


def project(rings: list) -> tuple:
    """Fit the country to the viewBox, with longitude corrected for latitude.

    A degree of longitude is shorter than a degree of latitude everywhere but
    the equator. Scaling both by the same factor, which is what this did
    before, drew Bangladesh about nine per cent too wide.
    """
    lons = [x for r in rings for x, _ in r]
    lats = [y for r in rings for _, y in r]
    lo, hi = min(lons), max(lons)
    la, lb = min(lats), max(lats)
    squeeze = math.cos(math.radians((la + lb) / 2))

    span_x = (hi - lo) * squeeze
    span_y = lb - la
    s = min((W - 2 * PAD) / span_x, (H - 2 * PAD) / span_y)
    ox = PAD + ((W - 2 * PAD) - span_x * s) / 2
    oy = PAD + ((H - 2 * PAD) - span_y * s) / 2

    def to_xy(lon: float, lat: float) -> tuple[float, float]:
        return (ox + (lon - lo) * squeeze * s, oy + (lb - lat) * s)

    return to_xy


def inside(lon: float, lat: float, ring: list) -> bool:
    """Ray casting, to prove each city sits on the land it is plotted on."""
    hit = False
    for (x1, y1), (x2, y2) in zip(ring, ring[1:] + ring[:1]):
        if (y1 > lat) != (y2 > lat):
            if lon < x1 + (lat - y1) / (y2 - y1) * (x2 - x1):
                hit = not hit
    return hit


def main() -> None:
    boards = json.loads((ROOT / "src" / "data" / "boards.json").read_text())
    counts: dict[str, int] = {}
    for b in boards:
        counts[b["city"]] = counts.get(b["city"], 0) + 1

    rings = outline()
    to_xy = project(rings)

    # Every ring is a subpath of one path, so the islands come with the coast.
    path = " ".join(
        " ".join(
            ("M" if i == 0 else "L") + f"{x:.1f},{y:.1f}"
            for i, (x, y) in enumerate(to_xy(lon, lat) for lon, lat in ring)
        ) + " Z"
        for ring in rings
    )

    # A city plotted into the Bay of Bengal is worse than no map at all, and
    # against the outline this replaced it was a real possibility.
    astray = [
        c for c, (lon, lat) in PLACES.items()
        if not any(inside(lon, lat, ring) for ring in rings)
    ]
    if astray:
        raise SystemExit("plotted outside the country: " + ", ".join(astray))

    biggest = max(counts.get(c, 1) for c in PLACES)
    dots, labels = [], []
    for city, (lon, lat) in PLACES.items():
        n = counts.get(city, 0)
        x, y = to_xy(lon, lat)
        # area proportional to screen count, floored so one screen still reads
        r = 7 + 19 * (n / biggest) ** 0.5
        dots.append(
            f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{r:.1f}" fill="#2c6fc6" '
            f'fill-opacity="0.16" stroke="#2c6fc6" stroke-width="1.1"/>'
            f'<circle cx="{x:.1f}" cy="{y:.1f}" r="2.6" fill="#1e3a63"/>'
        )
        anchor, side, dy = LABEL.get(city, ("start", 1, 0))
        dx = side * (r + 7)
        labels.append(
            f'<text x="{x + dx:.1f}" y="{y - 1 + dy:.1f}" text-anchor="{anchor}" '
            f'font-size="15" font-weight="600" fill="#1e3a63">{city}</text>'
            f'<text x="{x + dx:.1f}" y="{y + 14 + dy:.1f}" text-anchor="{anchor}" '
            f'font-size="12.5" fill="#7a8798">{n} screen{"s" if n != 1 else ""}</text>'
        )

    svg = (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W:.0f} {H:.0f}" '
        f'role="img" aria-label="AD PRO screen coverage across ten cities in Bangladesh" '
        f'font-family="Inter, sans-serif">'
        f'<path d="{path}" fill="#f4f8fd" stroke="#c9d6e8" stroke-width="1.4" '
        f'stroke-linejoin="round"/>'
        + "".join(dots) + "".join(labels) +
        "</svg>"
    )
    (HERE / "map.svg").write_text(svg)
    print(f"map.svg: {len(PLACES)} cities all inside the boundary, "
          f"{sum(counts.get(c, 0) for c in PLACES)} screens, "
          f"{len(rings)} rings, {len(svg) / 1024:.1f} KB")


if __name__ == "__main__":
    main()
