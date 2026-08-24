#!/usr/bin/env python3
"""
The ten-city coverage map.

Part 6 scores geographic coverage, and a table of city names is a poor way to
answer it — the point of covering ten cities is the shape it makes on the
country. Drawn as SVG rather than a raster: it costs a few kilobytes, prints at
whatever resolution the printer has, and the dots are sized from the inventory
rather than by eye, so the map cannot drift out of step with the rate card.

    python3 scripts/rfp/map.py

Writes map.svg beside this script.
"""

from pathlib import Path
import json

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent

# Approximate longitude/latitude of each city AD PRO operates in.
PLACES = {
    "Dhaka": (90.41, 23.81),
    "Chattogram": (91.83, 22.36),
    "Sylhet": (91.87, 24.90),
    "Rajshahi": (88.60, 24.37),
    "Cox's Bazar": (92.01, 21.44),
    "Cumilla": (91.18, 23.46),
    "Rangpur": (89.25, 25.75),
    "Bogura": (89.37, 24.85),
    "Narayanganj": (90.50, 23.62),
    "Feni": (91.40, 23.02),
}

# A simplified outline of Bangladesh in the same lon/lat space. Deliberately
# coarse: this is a locator, not a survey, and a coarse outline prints cleanly
# at the size it is used.
OUTLINE = [
    (88.05, 25.30), (88.45, 26.05), (88.95, 26.25), (89.55, 26.05), (89.85, 26.05),
    (90.15, 25.95), (90.60, 26.15), (91.10, 25.20), (91.65, 25.20), (92.15, 25.15),
    (92.45, 24.90), (92.35, 24.35), (91.75, 24.15), (91.40, 23.65), (91.30, 23.05),
    (91.65, 22.75), (92.20, 22.35), (92.55, 21.95), (92.65, 21.35), (92.30, 20.80),
    (91.90, 21.55), (91.55, 22.20), (90.95, 22.15), (90.55, 21.85), (90.20, 21.90),
    (89.85, 22.05), (89.35, 21.75), (89.05, 22.15), (88.75, 22.35), (88.55, 22.95),
    (88.15, 23.35), (88.65, 23.85), (88.30, 24.35), (88.05, 24.65),
]

W, H, PAD = 560.0, 620.0, 26.0

# Narayanganj sits about twenty kilometres from Dhaka, so at this scale their
# dots almost touch and their labels collide. These push the pair apart by hand;
# everything else is placed by rule.
LABEL = {
    "Dhaka": ("end", -1, -9),
    "Narayanganj": ("end", -1, 26),
    "Bogura": ("start", 1, 0),
}


def project() -> tuple:
    lons = [p[0] for p in OUTLINE]
    lats = [p[1] for p in OUTLINE]
    lo, hi = min(lons), max(lons)
    la, lb = min(lats), max(lats)
    sx = (W - 2 * PAD) / (hi - lo)
    sy = (H - 2 * PAD) / (lb - la)
    s = min(sx, sy)
    ox = PAD + ((W - 2 * PAD) - (hi - lo) * s) / 2
    oy = PAD + ((H - 2 * PAD) - (lb - la) * s) / 2

    def to_xy(lon: float, lat: float) -> tuple[float, float]:
        return (ox + (lon - lo) * s, oy + (lb - lat) * s)

    return to_xy


def main() -> None:
    boards = json.loads((ROOT / "src" / "data" / "boards.json").read_text())
    counts: dict[str, int] = {}
    for b in boards:
        counts[b["city"]] = counts.get(b["city"], 0) + 1

    to_xy = project()
    path = " ".join(
        ("M" if i == 0 else "L") + f"{x:.1f},{y:.1f}"
        for i, (x, y) in enumerate(to_xy(lon, lat) for lon, lat in OUTLINE)
    ) + " Z"

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
    print(f"map.svg — {len(PLACES)} cities, {sum(counts.get(c, 0) for c in PLACES)} "
          f"screens, {len(svg) / 1024:.1f} KB")


if __name__ == "__main__":
    main()
