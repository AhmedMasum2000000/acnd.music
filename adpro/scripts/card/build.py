#!/usr/bin/env python3
"""
Builds AD PRO's visiting card: print-ready PDF plus PNG previews.

One card per entry in PEOPLE. The company half of the card comes from COMPANY,
so a new joiner is one dictionary, and a change of address is one line for the
whole office. The typeface is the Inter the company profile already embeds,
lifted from scripts/profile/template.html, so the card and the documents it
gets handed over with are set in the same face.

The QR code is a vCard. Scanned, it offers to save the person as a contact,
with name, title, company, numbers, email, address and website filled in, which
is the one thing a card's QR code is for. It is drawn as SVG, so it prints as
sharp as the type.

    python3 scripts/card/build.py            # every card
    python3 scripts/card/build.py masum      # one

Writes, at the project root, for each person:
    visiting-card-<slug>.html   the source
    visiting-card-<slug>.pdf    two pages, front and back, 3 mm bleed
    visiting-card-<slug>-front.png, -back.png   previews at trim, 600 dpi
and copies the PDF into deliverables/ under a name that says what it is.
"""

from pathlib import Path
import base64
import html
import re
import shutil
import subprocess
import sys

import segno
from segno import helpers

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent
PROFILE = HERE.parent / "profile" / "template.html"

COMPANY = {
    "name": "AD PRO Communications Ltd.",
    "street": "House 99 (1st floor), Road 10/2, Block D",
    "area": "Niketon, Gulshan 1, Dhaka 1212, Bangladesh",
    "city": "Dhaka",
    "zip": "1212",
    "country": "Bangladesh",
    "phones": ["+880 2 4108 1139", "+880 1316 743 003"],
    "emails": ["info@adprobd.com", "mkt.adpro@gmail.com"],
    "web": "www.adpro.com.bd",
    "also": "oohbd.com",
    # The business lines the old card showed as six separate sub-brand marks.
    # Named once, in the card's own type, they read as one company.
    "lines": ["LED", "Billboard", "Digital", "Transit", "Events"],
}

PEOPLE = {
    "masum": {
        "name": "A H Al Masum",
        # As the card sets it. In Inter, a lowercase l is the same stroke as a
        # capital I, so "Al" prints as "AI"; the old card capitalised it, and
        # so does this one. The contact the QR saves keeps the plain spelling.
        "printed": "A H AL Masum",
        # vCard wants family name and given names apart.
        "family": "Al Masum",
        "given": "A H",
        "title": "Executive, Business Lead",
        "cell": "+880 1763 924 619",
        "email": "masum@adprobd.com",
    },
}

TRIM_MM = (88.9, 50.8)
BLEED_MM = 3

# Line icons, drawn on a 24-unit grid and coloured by the stylesheet.
ICONS = {
    "pin": '<path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
    "phone": '<path d="M5 3.5h3.5l1.8 4.5-2.3 1.4a11 11 0 0 0 6.6 6.6l1.4-2.3 4.5 1.8V19a1.5 1.5 0 0 1-1.6 1.5A16.5 16.5 0 0 1 3.5 5.1 1.5 1.5 0 0 1 5 3.5z"/>',
    "mail": '<rect x="3" y="5.5" width="18" height="13" rx="1.5"/><path d="M3.5 6.5 12 13l8.5-6.5"/>',
    "web": '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.6 2.6 3.8 5.6 3.8 9s-1.2 6.4-3.8 9c-2.6-2.6-3.8-5.6-3.8-9S9.4 5.6 12 3z"/>',
}


def icon(name: str) -> str:
    return (
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" '
        f'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">{ICONS[name]}</svg>'
    )


def data_uri(path: Path) -> str:
    return "data:image/png;base64," + base64.b64encode(path.read_bytes()).decode()


def qr_svg(p: dict) -> tuple[str, int]:
    # Only what a phone needs to call or write back. Every field adds modules,
    # and at 17 mm across a code much past version 10 has squares too small
    # for a phone camera to resolve in an office light. The address is
    # printed beside it, so it stays off the code, and so do the office lines:
    # the person's own number is the one a contact card is saved for.
    card = helpers.make_vcard_data(
        name=f"{p['family']};{p['given']}",
        displayname=p["name"],
        org=COMPANY["name"],
        title=p["title"],
        phone=p["cell"].replace(" ", ""),
        email=p["email"],
        url=COMPANY["web"].removeprefix("www."),
    )
    # Medium error correction: enough to survive a scuffed corner.
    qr = segno.make(card, error="m")
    if qr.version > 10:
        sys.exit(f"QR version {qr.version} is too dense to scan at 17 mm; trim the vCard")
    svg = qr.svg_inline(dark="#1f4678", border=0, omitsize=True)
    return svg, qr.version


def find_chrome() -> str:
    # Playwright's Chromium, whatever build number the container has, before
    # anything on PATH.
    bundled = sorted(Path("/opt/pw-browsers").glob("chromium-*/chrome-linux*/chrome"))
    for c in (
        *(str(b) for b in reversed(bundled)),
        shutil.which("chromium"),
        shutil.which("google-chrome"),
    ):
        if c and Path(c).exists():
            return c
    sys.exit("no chromium found")


def build(slug: str, p: dict) -> None:
    tpl = (HERE / "template.html").read_text(encoding="utf-8")

    profile = PROFILE.read_text(encoding="utf-8")
    font = re.search(r"@font-face\{[^}]*\}", profile)
    if not font:
        sys.exit("no @font-face in scripts/profile/template.html")
    tpl = tpl.replace("/*@FONT*/", font.group(0))

    tpl = tpl.replace(
        "<!--@LOCKUP-->",
        f'<img class="lockup" src="{data_uri(HERE / "assets" / "lockup.png")}" '
        'alt="AD PRO Communications Ltd." />',
    )
    tpl = tpl.replace(
        "<!--@MARK-->",
        f'<img class="mark" src="{data_uri(HERE / "assets" / "mark.png")}" alt="" />',
    )
    svg, version = qr_svg(p)
    tpl = tpl.replace("<!--@QR-->", svg)

    e = html.escape
    rows = [
        ("pin", f"{e(COMPANY['street'])},<br>{e(COMPANY['area'])}"),
        ("phone", " &nbsp;/&nbsp; ".join(e(n) for n in COMPANY["phones"])),
        ("mail", " &nbsp;/&nbsp; ".join(e(m) for m in COMPANY["emails"])),
        ("web", f"{e(COMPANY['web'])} &nbsp;/&nbsp; {e(COMPANY['also'])}"),
    ]
    values = {
        "name": e(p.get("printed", p["name"])),
        "title": e(p["title"]),
        "cell": e(p["cell"]),
        "email": e(p["email"]),
        "lines": "<i>&middot;</i>".join(e(x) for x in COMPANY["lines"]),
        "web": f"{e(COMPANY['web'])} &nbsp;&middot;&nbsp; {e(COMPANY['also'])}",
        "rows": "".join(f"<li>{icon(k)}<span>{v}</span></li>" for k, v in rows),
    }
    out = re.sub(r"\{\{([a-z]+)\}\}", lambda m: values[m.group(1)], tpl)

    src = ROOT / f"visiting-card-{slug}.html"
    pdf = ROOT / f"visiting-card-{slug}.pdf"
    # Declared, not sniffed: see the note in scripts/rfp/build.mjs.
    src.write_text('<meta charset="utf-8">\n' + out, encoding="utf-8")

    subprocess.run(
        [
            find_chrome(), "--headless", "--no-sandbox", "--disable-gpu",
            "--disable-dev-shm-usage", "--run-all-compositor-stages-before-draw",
            "--virtual-time-budget=10000", "--no-pdf-header-footer",
            f"--print-to-pdf={pdf}", src.as_uri(),
        ],
        check=True,
        capture_output=True,
    )

    previews = previews_of(pdf, slug)

    dest = ROOT / "deliverables" / (
        f"AD PRO Communications Ltd - Visiting Card - {p['name']} (print, 3mm bleed).pdf"
    )
    dest.parent.mkdir(exist_ok=True)
    shutil.copy(pdf, dest)

    print(
        f"visiting-card-{slug}.pdf: front and back, {TRIM_MM[0]} x {TRIM_MM[1]} mm "
        f"+ {BLEED_MM} mm bleed, vCard QR version {version}"
        + (f", previews {', '.join(previews)}" if previews else ", no previews (pymupdf missing)")
    )


def previews_of(pdf: Path, slug: str) -> list[str]:
    """PNG of each side at trim size, for sending the design round before it
    goes to print. Optional: the PDF is the deliverable, so a machine without
    PyMuPDF just skips this."""
    try:
        import pymupdf
    except ImportError:
        return []
    mm = 72 / 25.4
    names = []
    doc = pymupdf.open(pdf)
    for page, side in zip(doc, ("front", "back")):
        r = page.rect
        clip = pymupdf.Rect(BLEED_MM * mm, BLEED_MM * mm, r.width - BLEED_MM * mm, r.height - BLEED_MM * mm)
        name = f"visiting-card-{slug}-{side}.png"
        page.get_pixmap(dpi=600, clip=clip).save(ROOT / name)
        names.append(name)
    return names


def main() -> None:
    wanted = sys.argv[1:] or list(PEOPLE)
    for slug in wanted:
        if slug not in PEOPLE:
            sys.exit(f"no card for {slug!r}; known: {', '.join(PEOPLE)}")
        build(slug, PEOPLE[slug])


if __name__ == "__main__":
    main()
