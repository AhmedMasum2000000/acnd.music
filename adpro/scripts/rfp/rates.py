#!/usr/bin/env python3
"""
Pulls AD PRO's own quotations into one rate card for the Uber response.

Every figure in the commercial section has to be a number the company has
already quoted to somebody, not one invented to fill a table. So the rates are
read back out of the source quotations rather than retyped:

    LED_PROPOSAL   58-site digital network, cost per minute per screen
    METRO          Metro rail coach branding, 3/6/12/24 coaches
    CARAVAN        LED-covered van
    HUMAN_LED      Outdoor human LED display

Anything the company has not quoted is left out of this file entirely and
appears in the document as a blank for someone to fill in. A commercial bid is
signed; a guessed number in one is a liability, not a placeholder.

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

LED_PROPOSAL = "95380b66-LED_Billboard_Proposal_With_Updated_Picture__Price_All_Over_Bangladesh.PDF"

# Spec-block lines that are never the site's name.
FURNITURE = (
    "Time", "Schedule", "Total", "Hour", "Minimum", "Duration", "Reporting",
    "Mechanism", "Screen Detail", "Log", "Summary", "Break", "Cost/min",
    "Dimension", "Facing", "Resolution", "Supported", "Led Model", "LED Model",
    "Hours", "min/", "day", "Partners", "OOH", "THANK",
)

# Five screens whose name sits in a text box that does not come back in reading
# order, or comes back abbreviated. Keyed by page number in the source deck.
BY_PAGE = {
    5: "Gulshan Circle-1 Mid Island",
    6: "Gulshan Circle-1 Mid Island",
    21: "Manik Mia Avenue Aarong Signal",
    24: "Dhanmondi – 27, Mid Island Opposite of Rapa Plaza",
    52: "Rajshahi, Shaheb Bazar 2 Screens (Both Side)",
}


def screens() -> list[dict]:
    """The digital network, priced, matched back to the site inventory."""
    path = SRC / LED_PROPOSAL
    if not path.exists():
        sys.exit(f"missing {path} — set ADPRO_RFP_SRC")

    boards = json.loads((ROOT / "src" / "data" / "boards.json").read_text())
    by_name = {b["name"]: b for b in boards}

    out, city = [], None
    for page_no, page in enumerate(PdfReader(str(path)).pages, start=1):
        text = page.extract_text() or ""
        lines = [l.strip() for l in text.split("\n") if l.strip()]

        cost = re.search(r"Cost/min/screen\s*BDT\s*([\d,]+)", text)
        if not cost:
            # A page holding nothing but a name is a city divider.
            if len(lines) <= 2 and lines and not lines[0].startswith(("OOH", "THANK")):
                city = lines[0].replace("’", "'").removesuffix(" City")
            continue

        name = BY_PAGE.get(page_no)
        if not name:
            body = [
                l for l in lines
                if not any(l.startswith(f) for f in FURNITURE)
                and not re.fullmatch(r"[\d\s\-–:apm]+", l)
            ]
            name = body[0] if body else ""

        match = difflib.get_close_matches(name, list(by_name), n=1, cutoff=0.72)
        board = by_name[match[0]] if match else {}
        dim = re.search(r"Dimension:\s*([^\n]+)", text)

        out.append({
            "name": board.get("name", name),
            "city": board.get("city", city),
            "rate": int(cost.group(1).replace(",", "")),
            "dimension": (board.get("dimension") or (dim.group(1).strip() if dim else "")).replace("’", "'"),
            "hours": board.get("hours", ""),
            "schedule": board.get("schedule", ""),
            "minimum": board.get("minimum", ""),
            "model": board.get("ledModel", ""),
            "matched": bool(match),
        })
    return out


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
                ["Four-side pickup branding, LED basement — one-off", 100000],
                ["Pickup rent for fixing and unfixing branding — two days", 50000],
            ],
        },
        "human_led": {
            "note": "Outdoor human LED display inside Dhaka, W-11in x H-18in, "
                    "5 units, transport included.",
            "rows": [["Human LED display, per day, 5 units", 35000]],
        },
    }

    (HERE / "rates.json").write_text(json.dumps(data, ensure_ascii=False, indent=1))

    rates = [r["rate"] for r in rows]
    cities = sorted({r["city"] for r in rows if r["city"]})
    print(f"{len(rows)} priced screens, BDT {min(rates)}–{max(rates)}/min, "
          f"{len(cities)} cities: {', '.join(cities)}")
    if unmatched:
        print("  not matched to boards.json:", ", ".join(unmatched))


if __name__ == "__main__":
    main()
