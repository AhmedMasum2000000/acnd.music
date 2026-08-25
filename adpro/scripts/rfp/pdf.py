#!/usr/bin/env python3
"""
Prints the Uber RFP response to PDF.

The response is authored as HTML because that is the form that survives being
edited. What actually gets attached to an email is a PDF, and asking whoever
sends it to open a browser and find the right print settings is asking for a
document that goes out on US Letter with a file:// URL across the footer. So
the settings live here: A4, backgrounds on, no browser furniture, margins
left to the document's own @page rule.

Two passes, because the second one matters more than it sounds. Chromium
stores every image losslessly, which for 19 photographs means a 9 MB file
that some mail servers will bounce and every recipient will resent. The
photographs are re-encoded as JPEG afterwards; the client marks are left
exactly as they are, since JPEG rings around flat colour and hard edges and
a logo is nothing but flat colour and hard edges.

    python3 scripts/profile/pdf.py

Writes uber-rfp-response.pdf beside the HTML.
"""

from pathlib import Path
import io
import shutil
import subprocess
import sys

from PIL import Image
from pypdf import PdfReader, PdfWriter
from pypdf._page import PageObject
from pypdf.generic import DecodedStreamObject, DictionaryObject, NameObject

ROOT = Path(__file__).resolve().parent.parent.parent
SRC = ROOT / "uber-rfp-response.html"
OUT = ROOT / "uber-rfp-response.pdf"

# The running line along the foot of every inside page. The cover and the
# back cover are photographs to their edges and take neither.
RUNNER = "AD PRO COMMUNICATIONS LTD.   \u00b7   OUTDOOR ADVERTISING AGENCY IN BANGLADESH"
HEAD_L = "AD PRO COMMUNICATIONS LTD."
HEAD_R = "UBER BANGLADESH   \u00b7   STRATEGIC PLAN AND PROPOSAL"
MM = 72 / 25.4

# What separates a photograph from a client mark here: the marks are all
# 260x96, and every photograph is a landscape crop of 16:9 or wider. The
# square logo on the cover fails the second test and keeps its lossless
# encoding, which is what you want for a mark.
PHOTO_WIDTH = 300
PHOTO_RATIO = 1.3
QUALITY = 76


def find_chrome() -> str:
    for c in (
        "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
        shutil.which("chromium"),
        shutil.which("google-chrome"),
    ):
        if c and Path(c).exists():
            return c
    sys.exit("no chromium found")


def render() -> None:
    subprocess.run(
        [
            find_chrome(),
            "--headless",
            "--no-sandbox",
            "--disable-gpu",
            "--disable-dev-shm-usage",
            # Without this the print can start before the last image has been
            # composited, and the page goes out with an empty box on it.
            "--run-all-compositor-stages-before-draw",
            "--virtual-time-budget=30000",
            "--no-pdf-header-footer",
            f"--print-to-pdf={OUT}",
            SRC.as_uri(),
        ],
        check=True,
        capture_output=True,
    )


def esc(text: str) -> str:
    return text.replace("\\", r"\\\\").replace("(", r"\(").replace(")", r"\)")


# Helvetica advance widths, thousandths of an em, for the characters the
# running line and the header actually use. Enough to set the header flush
# right instead of guessing an offset that stops being true when the wording
# changes.
_ADV = {c: 556 for c in "0123456789"}
_ADV.update(dict(zip(
    "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
    (667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833,
     722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611),
)))
_ADV.update({" ": 278, ".": 278, ",": 278, "/": 278, "·": 278, "'": 191})


def width_of(text: str, size: float, tracking: float) -> float:
    """Set width in points, tracking included the way the operator applies it."""
    return sum(_ADV.get(c, 556) for c in text) / 1000 * size + tracking * len(text)


def stamp(writer: PdfWriter) -> None:
    """Draw the running line and the folio on every inside page.

    Set in Helvetica rather than the document's own Inter: a base-14 font
    needs no embedding, and at 6.5pt letterspaced small caps in grey the two
    grotesques are not told apart. Everything above this line is real text
    from the HTML, so the document stays searchable either way.
    """
    font = writer._add_object(
        DictionaryObject({
            NameObject("/Type"): NameObject("/Font"),
            NameObject("/Subtype"): NameObject("/Type1"),
            NameObject("/BaseFont"): NameObject("/Helvetica"),
            NameObject("/Encoding"): NameObject("/WinAnsiEncoding"),
        })
    )

    inside = writer.pages[1:-1]
    total = len(writer.pages)

    for n, page in enumerate(inside, start=2):
        width = float(page.mediabox.width)
        height = float(page.mediabox.height)
        left, right, base = 15 * MM, width - 15 * MM, 11 * MM
        folio = f"{n:02d} / {total:02d}"

        top = height - 12 * MM
        ops = (
            # letterhead: the RFP asks for the response on the firm's paper
            f"q 0.12 0.23 0.39 RG 0.5 w {left} {top - 2.6 * MM} m "
            f"{right} {top - 2.6 * MM} l S Q\n"
            "q BT /ProfileRunner 7 Tf 0.12 0.23 0.39 rg 0.7 Tc "
            f"1 0 0 1 {left} {top} Tm ({esc(HEAD_L)}) Tj ET Q\n"
            "q BT /ProfileRunner 6.5 Tf 0.48 0.53 0.60 rg 0.6 Tc "
            f"1 0 0 1 {right - width_of(HEAD_R, 6.5, 0.6)} {top} Tm "
            f"({esc(HEAD_R)}) Tj ET Q\n"
            # the hairline the line sits under
            f"q 0.78 0.80 0.84 RG 0.4 w {left} {base + 4 * MM} m "
            f"{right} {base + 4 * MM} l S Q\n"
            "q BT /ProfileRunner 6.5 Tf 0.48 0.53 0.60 rg 0.6 Tc "
            f"1 0 0 1 {left} {base} Tm ({esc(RUNNER)}) Tj ET Q\n"
            "q BT /ProfileRunner 6.5 Tf 0.48 0.53 0.60 rg 0.6 Tc "
            f"1 0 0 1 {right - 17 * MM} {base} Tm ({folio}) Tj ET Q"
        )

        page.merge_page(_overlay(writer, ops, font, page))


def _overlay(writer: PdfWriter, ops: str, font, page):
    """A standalone page carrying just the stamp, to merge over the real one."""
    sheet = PageObject.create_blank_page(
        None, float(page.mediabox.width), float(page.mediabox.height)
    )
    content = DecodedStreamObject()
    # WinAnsi, not latin-1: the em dash lives at 0x97 in the former and nowhere
    # in the latter.
    content.set_data(ops.encode("cp1252"))
    sheet[NameObject("/Contents")] = writer._add_object(content)
    sheet[NameObject("/Resources")] = DictionaryObject({
        NameObject("/Font"): DictionaryObject({NameObject("/ProfileRunner"): font})
    })
    return sheet


def shrink() -> tuple[int, int]:
    reader = PdfReader(OUT)
    writer = PdfWriter(clone_from=reader)
    done, seen = 0, set()

    for page in writer.pages:
        for img in page.images:
            ref = img.indirect_reference
            key = ref.idnum if ref else None
            if key in seen:
                continue
            seen.add(key)
            pil = img.image
            if pil is None:
                continue
            if pil.width < PHOTO_WIDTH or pil.width / pil.height < PHOTO_RATIO:
                continue
            img.replace(pil.convert("RGB"), quality=QUALITY, optimize=True)
            done += 1

    stamp(writer)

    buf = io.BytesIO()
    writer.write(buf)
    OUT.write_bytes(buf.getvalue())
    return done, len(writer.pages)


def main() -> None:
    if not SRC.exists():
        sys.exit("no uber-rfp-response.html, run: node scripts/rfp/build.mjs")
    render()
    before = OUT.stat().st_size
    photos, pages = shrink()
    after = OUT.stat().st_size
    print(
        f"uber-rfp-response.pdf: {pages} pages, {photos} photographs recompressed, "
        f"{before / 1024 / 1024:.2f} MB -> {after / 1024 / 1024:.2f} MB"
    )


if __name__ == "__main__":
    main()
