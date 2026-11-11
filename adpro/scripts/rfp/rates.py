#!/usr/bin/env python3
"""
Pulls AD PRO's own quotations into one rate card for the Uber response.

Every figure in the commercial section has to be a number the company has
already quoted to somebody, not one invented to fill a table. So the rates are
read back out of the source quotations rather than retyped:

    LED_PROPOSAL   58-site digital network, cost per minute per screen
    FOOTBRIDGE     18 foot over bridges in Dhaka, yearly
    LIGHTBOX       134 metro rail pillar light boxes, yearly
    METRO          Metro rail coach branding, 3/6/12/24 coaches
    CARAVAN        LED-covered van
    HUMAN_LED      Outdoor human LED display
    AIRPORT        LED sign, Domestic Arrival, Dhaka airport
    INSTALL        Supply and installation of a P5 outdoor screen

Anything the company has not quoted is left out of this file entirely and
appears in the document as surveyed on request rather than as a number. A
commercial bid is signed; a guessed figure in one is a liability, not a
placeholder.

    ADPRO_RFP_SRC=/path/to/uploads python3 scripts/rfp/rates.py

Writes rates.json beside this script.
"""

from pathlib import Path
import difflib
import json
import os
import re
import sys

from pypdf import PdfReader

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent
SRC = Path(os.environ.get("ADPRO_RFP_SRC", HERE / "source"))

# The later of the two LED decks. It carries a screen the earlier one did not,
# and it replaces Hotel Radisson Blu with Police Plaza Shooting Club at the same
# dimensions and a higher rate, so building from the earlier file quotes a site
# the company no longer offers.
LED_PROPOSAL = "cb63bd9d-LED_Billboard_Proposal_With_Updated_Picture__Price_All_Over_Bangladesh_1.pdf"
FOOTBRIDGE = "73642871-Proposal_for_Foot_Over_Bridge_Branding.pdf"
LIGHTBOX = "6ec73e9b-Light_Box_Branding_Project_.pdf"

# Spec-block lines that are never the site's name.
FURNITURE = (
    "Time", "Schedule", "Total", "Hour", "Minimum", "Duration", "Reporting",
    "Mechanism", "Screen Detail", "Log", "Summary", "Break", "Cost/min",
    "Dimension", "Facing", "Resolution", "Supported", "Led Model", "LED Model",
    "Hours", "min/", "day", "Partners", "OOH", "THANK",
)

# Two screens whose name sits in a text box that never comes back in reading
# order, leaving a spec fragment as the first line instead. Named here in the
# order they appear rather than by page number, because page numbers move every
# time the deck is re-issued and silently mis-assign the ones after them.
NAMELESS = [
    "Gulshan Circle-1 Mid Island",
    "Gulshan Circle-1 Mid Island",
]

# A measurement is never a site name. "60min/" survives the FURNITURE filter
# because it starts with a digit.
MEASUREMENT = re.compile(r"^[\d\s./]*(min|hr|hour|sec|sft|ft)\b", re.I)


def norm(dim: str) -> str:
    """Compare dimensions across two sources that quote them differently."""
    return re.sub(r"[\s'\u2019\u201d\"]+", "", (dim or "").lower())


def assign(name: str, dim: str, pool: list[dict]) -> dict | None:
    """Claim the inventory entry a priced screen refers to, and consume it.

    Two things make this harder than a name lookup. The sales deck abbreviates,
    "Manik Mia Avenue" for "Manik Mia Avenue Aarong Signal", so prefixes have
    to be tried before similarity, or the threshold ends up loose enough to pair
    the wrong two sites. And some junctions carry two screens under one name:
    Gulshan Circle-2 East Side is both the Rob Super Market screen and the
    Amanullah Trade Center screen. Name alone pairs both deck entries with the
    first inventory row and leaves the second looking unpriced, so where a name
    is ambiguous the dimension decides, and every entry is consumed once.
    """
    def take(candidates: list[int], strict: bool = False) -> dict | None:
        if not candidates:
            return None
        if strict:
            # A similarity score is not evidence. Where the name only nearly
            # matches, the dimension has to agree before anything is claimed.
            candidates = [
                i for i in candidates if norm(pool[i]["dimension"]) == norm(dim)
            ]
            if not candidates:
                return None
        if len(candidates) > 1:
            # A short name like "Gulshan" is a prefix of half the Dhaka
            # inventory. Where the name cannot separate them the dimension has
            # to, and where neither can, nothing is claimed: a wrong pairing
            # here prices one site at another site's rate.
            exact = [i for i in candidates if norm(pool[i]["dimension"]) == norm(dim)]
            if not exact:
                return None
            candidates = exact
        return pool.pop(candidates[0])

    # An exact name is evidence on its own. A prefix is not: "Gulshan" is the
    # start of half the Dhaka inventory, and left unguarded it claims whichever
    # Gulshan site happens to be left in the pool.
    for test, strict in (
        (lambda b: b["name"] == name, False),
        (lambda b: b["name"].startswith(name), True),
        (lambda b: name.startswith(b["name"]), True),
    ):
        hit = take([i for i, b in enumerate(pool) if test(b)], strict=strict)
        if hit:
            return hit

    close = difflib.get_close_matches(name, [b["name"] for b in pool], n=1, cutoff=0.72)
    if close:
        return take([i for i, b in enumerate(pool) if b["name"] == close[0]], strict=True)
    return None


def screens() -> list[dict]:
    """The digital network, priced, matched back to the site inventory."""
    path = SRC / LED_PROPOSAL
    if not path.exists():
        sys.exit(f"missing {path}, set ADPRO_RFP_SRC")

    pool = json.loads((ROOT / "src" / "data" / "boards.json").read_text())

    out, city = [], None
    unnamed = list(NAMELESS)
    for page_no, page in enumerate(PdfReader(str(path)).pages, start=1):
        text = page.extract_text() or ""
        lines = [l.strip() for l in text.split("\n") if l.strip()]

        cost = re.search(r"Cost/min/screen\s*BDT\s*([\d,]+)", text)
        if not cost:
            # A page holding nothing but a name is a city divider.
            if len(lines) <= 2 and lines and not lines[0].startswith(("OOH", "THANK")):
                city = lines[0].replace("’", "'").removesuffix(" City")
            continue

        body = [
            l for l in lines
            if not any(l.startswith(f) for f in FURNITURE)
            and not re.fullmatch(r"[\d\s\-–:apm]+", l)
            and not MEASUREMENT.match(l)
        ]
        name = body[0] if body else (unnamed.pop(0) if unnamed else "")
        # Several sites carry the landmark on a second line: "Gulshan Circle-2
        # (East Side)" then "Rob Super Market". Without it two screens at the
        # same junction share one name.
        if len(body) > 1 and re.match(r"^[(A-Z]", body[1]) and len(body[1]) < 34:
            name = f"{name} {body[1]}"

        dim = re.search(r"Dimension:\s*([^\n]+)", text)
        deck_dim = dim.group(1).strip() if dim else ""
        board = assign(name, deck_dim, pool) or {}

        out.append({
            "name": board.get("name", name),
            "city": board.get("city", city),
            "rate": int(cost.group(1).replace(",", "")),
            "dimension": (board.get("dimension") or deck_dim).replace("\u2019", "'"),
            "hours": board.get("hours", ""),
            "schedule": board.get("schedule", ""),
            "minimum": board.get("minimum", ""),
            "model": board.get("ledModel", ""),
            "matched": bool(board),
        })
    return out


def footbridges() -> list[dict]:
    """The foot over bridges, one to a page.

    Each page is five lines and nothing else, which is why this is read rather
    than retyped: eighteen sites and eighteen prices copied by hand is eighteen
    chances to transpose a digit into a signed commercial proposal.
    """
    path = SRC / FOOTBRIDGE
    if not path.exists():
        print(f"  missing {FOOTBRIDGE}")
        return []

    out = []
    for page in PdfReader(str(path)).pages:
        text = page.extract_text() or ""
        price = re.search(r"Price:\s*([\d,]+)", text)
        size = re.search(r"Size\s*([^\n]+)", text)
        sft = re.search(r"Sft\s*([\d,]+)", text)
        if not (price and size and sft):
            continue
        name = [l.strip() for l in text.split("\n") if l.strip()][0]
        # A second line in brackets belongs to the name, not the specification.
        second = [l.strip() for l in text.split("\n") if l.strip()][1:2]
        if second and second[0].startswith("("):
            name = f"{name} {second[0]}"
        out.append({
            "name": name.replace("’", "'"),
            "size": size.group(1).strip().replace("’", "'"),
            "sft": int(sft.group(1).replace(",", "")),
            "price": int(price.group(1).replace(",", "")),
        })
    return out


def lightboxes() -> dict:
    """The metro rail pillar light boxes: one route, one rate, one total."""
    path = SRC / LIGHTBOX
    if not path.exists():
        print(f"  missing {LIGHTBOX}")
        return {}

    detail = budget = ""
    for page in PdfReader(str(path)).pages:
        text = re.sub(r"\s+", " ", page.extract_text() or "")
        if "Light Box Details" in text:
            detail = text
        if "Yearly Budget" in text:
            budget = text

    money = [int(m.replace(",", "")) for m in re.findall(r"[\d,]{7,}", budget)]
    route = re.search(r"Location:\s*(.+?)\s*Metro Rail Pillar", detail)
    pillars = re.search(r"Metro Rail Pillar:\s*(\d+)\s*Unit\s*\(([\d\-]+)\)", detail)
    qty = re.search(r"Light Box Quantity:.*?=\s*(\d+)", detail)

    return {
        "route": route.group(1).strip() if route else "",
        "pillars": int(pillars.group(1)) if pillars else 0,
        "span": pillars.group(2) if pillars else "",
        "units": int(qty.group(1)) if qty else 0,
        "size": "5' x 12'",
        "each": money[0] if money else 0,
        "subtotal": money[1] if len(money) > 1 else 0,
        "vat": money[2] if len(money) > 2 else 0,
        "total": money[3] if len(money) > 3 else 0,
    }


def main() -> None:
    rows = screens()
    unmatched = [r["name"] for r in rows if not r["matched"]]

    data = {
        "screens": rows,
        # Read off the three other quotations. Kept as literals because each is
        # a single small table and parsing them would be more code than truth.
        "metro": {
            "note": "Sticker branding inside Metro Rail coaches. ~180 sq ft of "
                    "printable area per coach; all artwork subject to DMTCL approval.",
            "columns": ["3 months", "6 months", "12 months"],
            "rows": [
                ["3 coaches in 3 different trains", 3700000, 7080000, 12420000],
                ["6 coaches in 6 different trains", 7280000, 12864000, 22536000],
                ["12 coaches in 12 different trains", 11568000, 21062400, 36777600],
                ["24 coaches in 24 different trains", 19088800, 34659840, 59084160],
            ],
        },
        "caravan": {
            "note": "One-ton pickup, P5 outdoor LED module H-6ft x W-8ft with sound "
                    "box, 8 hours on air per day, 60km coverage per day.",
            "rows": [
                ["LED-covered van, per day (outside Dhaka)", 100000],
                ["Four-side pickup branding, LED basement, one-off", 100000],
                ["Pickup rent for fixing and unfixing branding, two days", 50000],
            ],
        },
        "human_led": {
            "note": "Outdoor human LED display inside Dhaka, W-11in x H-18in, "
                    "5 units, transport included.",
            "rows": [["Human LED display, per day, 5 units", 35000]],
        },
        "footbridges": footbridges(),
        "lightbox": lightboxes(),
        "airport": {
            "site": "Hazrat Shahjalal International Airport, Domestic Arrival",
            "position": "Luggage belt area, on the wall inside the arrival hall",
            "size": "W-7' x H-5'",
            "hours": "7am to 11pm",
            "yearly": 2200000,
        },
        "install": {
            "note": "Supply and installation of a P5 outdoor screen on the "
                    "client's own premises. King Light LED, assembled in "
                    "Bangladesh, 1920x1080, brightness 6000cd/m2 or better, "
                    "IP65, rated life 100,000 hours, one year warranty. "
                    "Completion 30 days from work order. Excludes electrical "
                    "cabling and any permission cost.",
            "example": "8ft x 12ft, 96 sq ft",
            "rows": [
                ["P5 outdoor LED screen, fitting and fixing with transport", "per sq ft", 10500],
                ["Installation charge", "per screen", 100000],
                ["Pillar and foundation", "per screen", 100000],
            ],
            "worked": 1208000,
        },
    }

    (HERE / "rates.json").write_text(json.dumps(data, ensure_ascii=False, indent=1))

    rates = [r["rate"] for r in rows]
    cities = sorted({r["city"] for r in rows if r["city"]})
    fob = data["footbridges"]
    lb = data["lightbox"]
    print(f"{len(rows)} priced screens, BDT {min(rates)}-{max(rates)}/min, "
          f"{len(cities)} cities: {', '.join(cities)}")
    if fob:
        print(f"{len(fob)} foot over bridges, BDT {min(f['price'] for f in fob):,}"
              f"-{max(f['price'] for f in fob):,} per year")
    if lb:
        print(f"{lb['units']} light boxes on {lb['pillars']} metro pillars "
              f"({lb['span']}), BDT {lb['each']:,} each, {lb['total']:,} with VAT")
    if unmatched:
        print("  not matched to boards.json:", ", ".join(unmatched))


if __name__ == "__main__":
    main()
