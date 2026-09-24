#!/usr/bin/env python3
"""
Completes Uber's standard MNDA with AD PRO's details and nothing else.

Uber has said the template is non-negotiable and cannot accept redlines, so
this touches only the bracketed fields it asks to be filled and leaves every
other byte of the document alone, including the DocuSign anchor tags, which
are what Uber's signature process keys on. It is returned unsigned, as .docx,
which is what the invitation asked for.

    ADPRO_RFP_SRC=/path/to/uploads python3 scripts/rfp/mnda.py

Writes uber-mnda-adpro.docx at the project root.
"""

from pathlib import Path
import os
import re
import shutil
import sys
import zipfile

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent
SRC = Path(os.environ.get("ADPRO_RFP_SRC", HERE / "source"))
TEMPLATE = "d1f8aa20-Uber_Bangladesh_NDA_Template_2.docx"
DEST = ROOT / "uber-mnda-adpro.docx"

# The registered office, not the Gulshan operating address: an NDA names the
# entity as the registrar holds it, and this is the address on the trade
# licence and the incorporation record Uber will be given.
FIELDS = {
    "[Counterparty_Name]": "Ad Pro Communications Ltd.",
    "[Entity_Type]": "private company limited by shares",
    "[Counterparty_Registration_Country]": "Bangladesh",
    "[Counterparty_Address]": (
        "37/2 Purana Paltan (9th floor), Fayanaz Apartment, Dhaka 1000, Bangladesh"
    ),
    "[COUNTERPARTY_NAME]": "AD PRO COMMUNICATIONS LTD.",
    # Dated the day the response is submitted, and phrased to fit the
    # sentence around it: "made as of the [Effective_Date],". Uber can change
    # it on execution with a single edit, which beats filling a blank.
    "[Effective_Date]": "25th day of August 2026",
}


def fill(xml: str, token: str, value: str) -> tuple[str, int]:
    """Replace one bracketed field, however Word has split it into runs.

    Word breaks a run wherever formatting or a spell-check marker changes, and
    it puts one around every bracket in this template, so `[Counterparty_Name]`
    is three separate text runs with proofing tags between them, and a plain
    string replace finds nothing. The bracket runs are emptied rather than
    deleted so the run structure, and therefore the DocuSign anchors, survive.

    The yellow highlight goes with the value: a field still marked for filling
    in, after it has been filled in, reads as an oversight.
    """
    name = token.strip("[]")
    esc = re.escape(name)
    gap = r"(?:(?!<w:t)[\s\S])*?"
    # The closing run is not always just "]": on [Effective_Date] Word carried
    # the following comma into the same run, so whatever trails the bracket is
    # captured and put back rather than required to be empty.
    split = re.compile(
        rf"(<w:t[^>]*>)\[(</w:t>{gap}<w:t[^>]*>){esc}(</w:t>{gap}<w:t[^>]*>)\]"
        rf"((?:(?!</w:t>)[\s\S])*</w:t>)"
    )
    xml, n = split.subn(rf"\g<1>\g<2>{value}\g<3>\g<4>", xml)

    whole = re.compile(rf"(<w:t[^>]*>)\[{esc}\](</w:t>)")
    xml, m = whole.subn(rf"\g<1>{value}\g<2>", xml)

    if n + m:
        xml = xml.replace('<w:highlight w:val="yellow"/>', "")
    return xml, n + m


def main() -> None:
    src = SRC / TEMPLATE
    if not src.exists():
        sys.exit(f"missing {src}, set ADPRO_RFP_SRC")

    shutil.copy(src, DEST)

    with zipfile.ZipFile(src) as zin:
        names = zin.namelist()
        parts = {n: zin.read(n) for n in names}

    hits = {k: 0 for k in FIELDS}
    for name in ("word/document.xml", "word/header1.xml", "word/footer1.xml"):
        if name not in parts:
            continue
        xml = parts[name].decode("utf8")
        for token, value in FIELDS.items():
            xml, n = fill(xml, token, value)
            hits[token] += n
        parts[name] = xml.encode("utf8")

    with zipfile.ZipFile(DEST, "w", zipfile.ZIP_DEFLATED) as zout:
        for name in names:                       # original order preserved
            zout.writestr(name, parts[name])

    missed = [k for k, v in hits.items() if v == 0]
    print(f"uber-mnda-adpro.docx: {sum(hits.values())} fields filled")
    for token, count in hits.items():
        print(f"   {count} x {token}")
    if missed:
        print("   not found in template:", ", ".join(missed))
    print("   signatory block left unsigned for DocuSign")


if __name__ == "__main__":
    main()
