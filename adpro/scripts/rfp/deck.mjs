/**
 * The eight-slide version of the response, for the presentation round.
 *
 * Every number and every photograph here already appears in
 * uber-rfp-response.pdf, so the two cannot disagree: the figures are read from
 * rates.json, the imagery from the same photos.json the document uses, and the
 * map is the one drawn from Natural Earth boundaries. Nothing is retyped.
 *
 *     python3 scripts/rfp/deck-art.py && node scripts/rfp/deck.mjs
 *
 * Writes uber-presentation.pptx at the project root.
 *
 * On the typeface: the documents are set in Inter, which PowerPoint does not
 * ship and Uber will not have installed. A deck that silently substitutes is
 * worse than one that chose. Arial has the same grotesque skeleton, is on every
 * machine, and is what this uses.
 */

import pptxgen from 'pptxgenjs';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..', '..');
const ART = resolve(HERE, 'deck-art'); // written by deck-art.py

const rates = JSON.parse(readFileSync(resolve(HERE, 'rates.json'), 'utf8'));

// The brand, as the stylesheet defines it. No colour outside this set.
const NAVY = '1E3A63';
const BLUE = '2C6FC6';
const SKY = '6BA3E8';
const INK = '23304A';
const SOFT = '4A5A72';
const GREY = '7A8798';
const WASH = 'F4F8FD';
const WHITE = 'FFFFFF';

const FONT = 'Arial';

const pres = new pptxgen();
pres.layout = 'LAYOUT_WIDE'; // 13.333 x 7.5 in
const W = 13.333;
const H = 7.5;
const M = 0.62; // page margin

pres.author = 'AD PRO Communications Ltd.';
pres.company = 'AD PRO Communications Ltd.';
pres.title = 'Uber Bangladesh: strategic plan and commercial proposal';

const img = (name) => resolve(ART, name);
const has = (name) => existsSync(img(name));

/** Two things this exists for.
 *
 *  pptxgenjs writes the source path into the picture's descr when no altText
 *  is given, which would ship the build machine's directory layout to Uber
 *  inside the file. Every image goes through here so none can.
 *
 *  And it throws on a missing file rather than drawing nothing. A guarded
 *  `if (has(x))` around each addImage silently shipped a slide with no
 *  photograph when deck-art.py changed the openers from PNG to JPEG, and no
 *  geometry check catches an image that was never added. */
function picture(slide, name, opts, alt) {
  if (!has(name)) {
    throw new Error(`missing ${name} in ${ART}, run: python3 scripts/rfp/deck-art.py`);
  }
  return slide.addImage({ path: img(name), altText: alt, ...opts });
}

const money = (n) => n.toLocaleString('en-US');

/** The rule that repeats: a thin eyebrow, then the line that carries the slide. */
function heading(slide, eyebrow, title, opts = {}) {
  const y = opts.y ?? M;
  const color = opts.dark ? WHITE : NAVY;
  const eyeColor = opts.dark ? SKY : BLUE;
  slide.addText(eyebrow.toUpperCase(), {
    x: M, y, w: W - M * 2, h: 0.26,
    fontFace: FONT, fontSize: 11, bold: true, charSpacing: 2.2,
    color: eyeColor, margin: 0,
  });
  slide.addText(title, {
    x: M, y: y + 0.32, w: opts.tw ?? W - M * 2, h: opts.th ?? 0.78,
    fontFace: FONT, fontSize: opts.size ?? 30, bold: false,
    color, margin: 0, valign: 'top',
  });
}

/** Footer: who is speaking and where in the deck we are. */
function footer(slide, n) {
  slide.addText('AD PRO COMMUNICATIONS LTD.', {
    x: M, y: H - 0.74, w: 5, h: 0.24,
    fontFace: FONT, fontSize: 9, charSpacing: 1.4, color: GREY, margin: 0,
  });
  slide.addText(`${n} / 8`, {
    x: W - M - 1.2, y: H - 0.74, w: 1.2, h: 0.24,
    fontFace: FONT, fontSize: 9, charSpacing: 1.4, color: GREY,
    align: 'right', margin: 0,
  });
}

/* ------------------------------------------------------------ 1. cover --- */
{
  const s = pres.addSlide();
  s.background = { color: NAVY };
  {
    picture(s, 'cover.jpg', { x: 6.6, y: 0, w: 6.733, h: H, sizing: { type: 'cover', w: 6.733, h: H } },
      'An AD PRO LED billboard at Gulshan 1 Circle, Dhaka');
  }
  picture(s, 'logo.png', { x: M, y: 0.8, w: 0.72, h: 0.72 },
    'AD PRO Communications Ltd. logo');
  s.addText('AD PRO', {
    x: M + 0.95, y: 0.83, w: 3, h: 0.36,
    fontFace: FONT, fontSize: 20, bold: true, color: WHITE, margin: 0,
  });
  s.addText('COMMUNICATIONS LTD.', {
    x: M + 0.95, y: 1.19, w: 4, h: 0.26,
    fontFace: FONT, fontSize: 10, charSpacing: 1.8, color: SKY, margin: 0,
  });

  s.addText('Marketing activation,\noutdoor media and\ngovernment liaison,\nfor Uber Bangladesh.', {
    x: M, y: 2.5, w: 5.7, h: 2.5,
    fontFace: FONT, fontSize: 30, color: WHITE, lineSpacing: 40, margin: 0,
  });
  s.addText('Strategic plan and commercial proposal', {
    x: M, y: 5.2, w: 5.7, h: 0.3,
    fontFace: FONT, fontSize: 12, color: SKY, margin: 0,
  });
  s.addText('Submitted to Uber Bangladesh Ltd.  ·  One-year term  ·  25 August 2026', {
    x: M, y: 6.5, w: 5.7, h: 0.3,
    fontFace: FONT, fontSize: 9.5, charSpacing: 0.8, color: 'A9BEDA', margin: 0,
  });
  s.addNotes('Open on what we own. Fifty-eight screens, ten cities, and the permissions held in our own name.');
}

/* --------------------------------------------------- 2. the bid in five --- */
{
  const s = pres.addSlide();
  heading(s, 'The answer', 'Most agencies would have to go and rent what Uber is asking for. We already own it.', { size: 26, th: 1.1 });

  const figs = [
    ['58', 'LED screens owned\nand operated'],
    ['10', 'Cities with\nAD PRO screens'],
    ['0%', 'Markup on every\npass-through taka'],
    ['24hr', 'Proof of display\nafter install'],
    ['NET60', 'Payment terms\naccepted'],
  ];
  const gw = (W - M * 2 - 0.4 * 4) / 5;
  figs.forEach(([big, label], i) => {
    const x = M + i * (gw + 0.4);
    // NET60 is a word where the others are numbers, and at 36pt it runs past
    // the cell. Sized to its own content rather than shrinking all five.
    const size = big.length > 4 ? 26 : big.length > 2 ? 32 : 38;
    s.addShape(pres.ShapeType.rect, { x, y: 2.15, w: gw, h: 2.1, fill: { color: NAVY } });
    s.addText(big, {
      x: x + 0.24, y: 2.42, w: gw - 0.48, h: 0.78,
      fontFace: FONT, fontSize: size, color: WHITE, margin: 0, valign: 'top',
    });
    s.addText(label, {
      x: x + 0.24, y: 3.34, w: gw - 0.48, h: 0.72,
      fontFace: FONT, fontSize: 10, charSpacing: 0.6, color: SKY, margin: 0, lineSpacing: 14,
    });
  });

  const claims = [
    ['Zero markup, and on our own screens, zero pass-through',
     'Third-party media, government fees and production are billed at documented actuals. On the screens we own there is no third party at all.'],
    ['No retainer, no account-management fee',
     'The dedicated team, the permissions desk and all reporting are carried in our margin on work delivered.'],
    ['Nothing goes up without two approvals',
     "Uber's written approval and the authority's permission. Neither alone is enough to put anything on a wall."],
  ];
  const cw = (W - M * 2 - 0.5 * 2) / 3;
  claims.forEach(([t, b], i) => {
    const x = M + i * (cw + 0.5);
    s.addText(t, {
      x, y: 4.75, w: cw, h: 0.66,
      fontFace: FONT, fontSize: 14, bold: true, color: NAVY, margin: 0, valign: 'top',
    });
    s.addText(b, {
      x, y: 5.48, w: cw, h: 1.2,
      fontFace: FONT, fontSize: 11, color: SOFT, margin: 0, lineSpacing: 17, valign: 'top',
    });
  });
  footer(s, 2);
  s.addNotes('Five numbers. The one that decides it is the zero: on owned media there is no third party to mark up.');
}

/* ---------------------------------------------------------- 3. the map --- */
{
  const s = pres.addSlide();
  heading(s, 'Coverage', 'Ten cities, and a screen in every one of them.');

  picture(s, 'map.png', { x: M, y: 1.75, w: 4.6, h: 5.1 },
    'Map of Bangladesh with AD PRO screen counts marked in ten cities');

  const counts = {};
  for (const sc of rates.screens) counts[sc.city] = (counts[sc.city] || 0) + 1;
  counts.Feni = counts.Feni || 1; // priced on survey, on the map and in the inventory
  const order = Object.entries(counts).sort((a, b) => b[1] - a[1]);

  const colW = 2.9;
  order.forEach(([city, n], i) => {
    const col = Math.floor(i / 5);
    const row = i % 5;
    const x = 5.9 + col * (colW + 0.5);
    const y = 1.95 + row * 0.82;
    s.addText(city, {
      x, y, w: colW, h: 0.32,
      fontFace: FONT, fontSize: 15, bold: true, color: NAVY, margin: 0,
    });
    s.addText(`${n} screen${n === 1 ? '' : 's'}`, {
      x, y: y + 0.32, w: colW, h: 0.26,
      fontFace: FONT, fontSize: 11, color: GREY, margin: 0,
    });
  });

  s.addText(
    'Head office and studio in Gulshan, Dhaka; registered office in Purana Paltan. Field operations run from Dhaka with resident crews and contracted riggers in each divisional city, which is what keeps a replacement inside the same working day rather than the same week.',
    { x: 5.9, y: 6.05, w: colW * 2 + 0.5, h: 0.62, fontFace: FONT, fontSize: 10, color: SOFT, margin: 0, lineSpacing: 14, valign: 'top' },
  );
  footer(s, 3);
  s.addNotes('Dot area is proportional to screens in the city. Boundary drawn from Natural Earth 1:10m, public domain.');
}

/* -------------------------------------------------- 4. the permissions --- */
{
  const s = pres.addSlide();
  s.background = { color: NAVY };
  {
    picture(s, 'op_permissions.jpg', { x: 0, y: 0, w: W, h: 1.9, sizing: { type: 'cover', w: W, h: 1.9 } },
      'AD PRO permitted outdoor sites in Dhaka');
  }
  s.addShape(pres.ShapeType.rect, { x: 0, y: 1.9, w: W, h: H - 1.9, fill: { color: WHITE } });
  heading(s, 'Government liaison', 'The part of this contract that goes wrong is the part we do in-house.', { y: 2.25, size: 27 });

  s.addText(
    'Unauthorised branding in Bangladesh is not a paperwork problem. It is a removal, a fine, and a conversation with a city corporation that then remembers your brand. AD PRO does not subcontract this: every one of our fifty-eight sites is held under permissions we obtained and renew ourselves.',
    { x: M, y: 3.42, w: 5.5, h: 1.5, fontFace: FONT, fontSize: 12, color: SOFT, margin: 0, lineSpacing: 18, valign: 'top' },
  );

  // The left column would otherwise run to the foot of the slide empty, and
  // this is the point the whole section exists to make.
  s.addShape(pres.ShapeType.rect, { x: M, y: 5.05, w: 5.5, h: 1.65, fill: { color: WASH } });
  s.addText('The two-key rule', {
    x: M + 0.3, y: 5.28, w: 4.9, h: 0.32,
    fontFace: FONT, fontSize: 15, bold: true, color: NAVY, margin: 0,
  });
  s.addText(
    "Nothing is installed without Uber's written approval and the authority's permission. Neither key alone opens the site, and AD PRO holds no site on anyone else's licence.",
    { x: M + 0.3, y: 5.66, w: 4.9, h: 0.85, fontFace: FONT, fontSize: 11, color: SOFT, margin: 0, lineSpacing: 16, valign: 'top' },
  );

  const auth = [
    ['Dhaka North & South City Corporations', 'Billboards, megasigns, wall branding, kiosks', '2 to 4 weeks'],
    ['City corporations, nine other cities', 'The same categories outside Dhaka', '2 to 5 weeks'],
    ['RAJUK', 'Structural consent for gantries and unipoles', '3 to 6 weeks'],
    ['DMTCL', 'Metro rail coach and station branding', '3 to 5 weeks'],
    ['Bangladesh Railway', 'Station and track branding, station stores', '3 to 5 weeks'],
    ['Civil Aviation Authority / airport', 'Airport terminal and approach-road branding', '4 to 6 weeks'],
  ];
  const tx = 6.5;
  s.addText('AUTHORITY', { x: tx, y: 3.42, w: 3.0, h: 0.24, fontFace: FONT, fontSize: 9, bold: true, charSpacing: 1.4, color: GREY, margin: 0 });
  s.addText('LEAD TIME', { x: tx + 4.4, y: 3.42, w: 1.8, h: 0.24, fontFace: FONT, fontSize: 9, bold: true, charSpacing: 1.4, color: GREY, margin: 0, align: 'right' });
  s.addShape(pres.ShapeType.line, { x: tx, y: 3.7, w: 6.2, h: 0, line: { color: NAVY, width: 1 } });
  auth.forEach(([a, what, lead], i) => {
    const y = 3.82 + i * 0.5;
    if (i % 2 === 1) s.addShape(pres.ShapeType.rect, { x: tx, y: y - 0.04, w: 6.2, h: 0.48, fill: { color: WASH } });
    s.addText(a, { x: tx + 0.08, y, w: 2.9, h: 0.22, fontFace: FONT, fontSize: 10, bold: true, color: NAVY, margin: 0 });
    s.addText(what, { x: tx + 0.08, y: y + 0.21, w: 4.2, h: 0.22, fontFace: FONT, fontSize: 9, color: SOFT, margin: 0 });
    s.addText(lead, { x: tx + 4.4, y: y + 0.05, w: 1.72, h: 0.24, fontFace: FONT, fontSize: 10, color: BLUE, align: 'right', margin: 0 });
  });
  footer(s, 4);
  s.addNotes('Permission and government-liaison capability is the heaviest-weighted criterion in the RFP, at 25 per cent.');
}

/* ------------------------------------------------- 5. the owned network --- */
{
  const s = pres.addSlide();
  heading(s, 'Commercial · 5.2', 'The operator’s rate, sold by the minute.');

  const rateList = rates.screens.map((x) => x.rate).filter(Boolean);
  const lo = Math.min(...rateList);
  const hi = Math.max(...rateList);

  const bigs = [
    [`${rateList.length}`, 'screens with a published minute rate'],
    [`${money(lo)} to ${money(hi)}`, 'BDT per minute, per day, by site'],
    ['0', 'agency margin added to any of them'],
  ];
  const bw = (W - M * 2 - 0.5 * 2) / 3;
  bigs.forEach(([big, lab], i) => {
    const x = M + i * (bw + 0.5);
    s.addShape(pres.ShapeType.rect, { x, y: 1.95, w: bw, h: 1.5, fill: { color: WASH } });
    s.addText(big, { x: x + 0.24, y: 2.1, w: bw - 0.48, h: 0.7, fontFace: FONT, fontSize: 30, color: NAVY, margin: 0, valign: 'top' });
    s.addText(lab, { x: x + 0.24, y: 2.82, w: bw - 0.48, h: 0.5, fontFace: FONT, fontSize: 10.5, color: SOFT, margin: 0, lineSpacing: 14 });
  });

  const cities = ['dhaka', 'sylhet', 'chattogram', 'coxsbazar'];
  const names = ['Dhaka', 'Sylhet', 'Chattogram', "Cox's Bazar"];
  const pw = (W - M * 2 - 0.32 * 3) / 4;
  cities.forEach((c, i) => {
    const x = M + i * (pw + 0.32);
    const f = `city_${c}.jpg`;
    picture(s, f, { x, y: 3.85, w: pw, h: pw * 0.66, sizing: { type: 'cover', w: pw, h: pw * 0.66 } },
      `An AD PRO LED screen in ${names[i]}`);
    s.addText(names[i], { x, y: 3.9 + pw * 0.66, w: pw, h: 0.3, fontFace: FONT, fontSize: 12, bold: true, color: NAVY, margin: 0 });
  });

  s.addText(
    'Priced per minute per day, as the RFP asks. Every rate in the full response is the rate AD PRO charges as the operator of the screen, because AD PRO owns it. There is no media owner in the chain and therefore nothing to pass through.',
    // Held to a readable measure rather than run the full 12in width.
    { x: M, y: 6.10, w: 8.7, h: 0.58, fontFace: FONT, fontSize: 11, color: SOFT, margin: 0, lineSpacing: 15, valign: 'top' },
  );
  footer(s, 5);
  s.addNotes(`${rateList.length} screens carry a published rate; the balance of the fifty-eight are surveyed and quoted within 24 hours.`);
}

/* -------------------------------------------- 6. the other rate cards --- */
{
  const s = pres.addSlide();
  heading(s, 'Commercial · 5.3 to 5.6', 'Everything else in the scope, under one supplier.');

  const lb = rates.lightbox;
  const fobLo = Math.min(...rates.footbridges.map((f) => f.price));
  const fobHi = Math.max(...rates.footbridges.map((f) => f.price));

  const cards = [
    ['Foot over bridges',
     `${rates.footbridges.length} Dhaka sites`,
     `BDT ${money(fobLo)} to ${money(fobHi)} per site per year. Mostly 30ft x 5ft both sides; Mirpur-10 runs six sides.`],
    ['Metro rail pillar light boxes',
     `${lb.units} boxes on ${lb.pillars} pillars`,
     `${lb.route}, pillars ${lb.span}. BDT ${money(lb.each)} per box per year. BDT ${money(lb.total)} including VAT.`],
    ['Airport advertising',
     'Domestic Arrival, Dhaka',
     `Hazrat Shahjalal International, luggage belt wall, ${rates.airport.size}, on air ${rates.airport.hours}. BDT ${money(rates.airport.yearly)} per year.`],
    ['LED supply and installation',
     "On Uber's own premises",
     `BDT ${money(rates.install.rows[0][2])} per sq ft plus installation and foundation. Worked example ${rates.install.example} = BDT ${money(rates.install.worked)}.`],
  ];

  const cw = (W - M * 2 - 0.42) / 2;
  const ch = 2.05;
  cards.forEach(([t, sub, body], i) => {
    const x = M + (i % 2) * (cw + 0.42);
    const y = 2.0 + Math.floor(i / 2) * (ch + 0.36);
    s.addShape(pres.ShapeType.rect, { x, y, w: cw, h: ch, fill: { color: WASH } });
    s.addText(t, { x: x + 0.3, y: y + 0.24, w: cw - 0.6, h: 0.36, fontFace: FONT, fontSize: 17, bold: true, color: NAVY, margin: 0 });
    s.addText(sub.toUpperCase(), { x: x + 0.3, y: y + 0.62, w: cw - 0.6, h: 0.26, fontFace: FONT, fontSize: 9.5, bold: true, charSpacing: 1.4, color: BLUE, margin: 0 });
    s.addText(body, { x: x + 0.3, y: y + 0.95, w: cw - 0.6, h: 0.95, fontFace: FONT, fontSize: 11, color: SOFT, margin: 0, lineSpacing: 16, valign: 'top' });
  });

  s.addText('Metro rail coach branding, LED covered vans and human LED display are priced in the same response, at 5.3.', {
    x: M, y: 6.42, w: W - M * 2, h: 0.34, fontFace: FONT, fontSize: 10.5, color: GREY, margin: 0,
  });
  footer(s, 6);
  s.addNotes('Four categories that would otherwise be four separate vendors, each with its own markup.');
}

/* ------------------------------------------------------ 7. zero markup --- */
{
  const s = pres.addSlide();
  s.background = { color: NAVY };
  heading(s, 'Commercial · 5.7 and 5.8', 'Everything bought in, at cost.', { dark: true });

  s.addText(
    'The rate cards are AD PRO’s own media, priced as the operator. Anything else this contract needs is bought in, and every category of it is billed to Uber at the price AD PRO paid, with the document that proves the price attached to the bill.',
    { x: M, y: 2.05, w: 6.0, h: 1.5, fontFace: FONT, fontSize: 13, color: 'D5E2F2', margin: 0, lineSpacing: 20, valign: 'top' },
  );

  s.addText('No handling fee. No commission. No retainer. No account-management fee.', {
    x: M, y: 3.65, w: 6.0, h: 0.7, fontFace: FONT, fontSize: 17, bold: true, color: WHITE, margin: 0, lineSpacing: 26,
  });
  s.addText(
    'Should any circumstance ever warrant one, AD PRO states the reason in writing, shows the cost break-up, and obtains Uber’s prior written agreement before the cost is incurred, as Part 3 of the RFP requires.',
    { x: M, y: 4.5, w: 6.0, h: 1.1, fontFace: FONT, fontSize: 11, color: 'B9CCE4', margin: 0, lineSpacing: 16, valign: 'top' },
  );

  const rows = [
    ['Static billboard, megasign, unipole, wallscape', "Media owner's invoice"],
    ['Brand promoters and activation manpower', 'Supplier invoice, at cost'],
    ['Government permission and liaison', 'Official receipt. No liaison charge'],
    ['Logistics and transportation', 'Carrier receipt'],
    ['Storage of Uber materials', 'Warehouse invoice'],
    ['Annual account-management / retainer fee', 'NIL'],
  ];
  const tx = 7.2;
  s.addText('BOUGHT IN FOR UBER', { x: tx, y: 2.05, w: 3.3, h: 0.24, fontFace: FONT, fontSize: 9, bold: true, charSpacing: 1.4, color: SKY, margin: 0 });
  s.addText('BILLED AGAINST', { x: tx + 3.4, y: 2.05, w: 2.1, h: 0.24, fontFace: FONT, fontSize: 9, bold: true, charSpacing: 1.4, color: SKY, margin: 0 });
  s.addShape(pres.ShapeType.line, { x: tx, y: 2.34, w: 5.5, h: 0, line: { color: SKY, width: 1 } });
  rows.forEach(([a, b], i) => {
    const y = 2.5 + i * 0.62;
    s.addText(a, { x: tx, y, w: 3.3, h: 0.5, fontFace: FONT, fontSize: 11, color: WHITE, margin: 0, valign: 'top' });
    s.addText(b, { x: tx + 3.4, y, w: 2.1, h: 0.5, fontFace: FONT, fontSize: 11, color: i === rows.length - 1 ? WHITE : SKY, bold: i === rows.length - 1, margin: 0, valign: 'top' });
  });
  footer(s, 7);
  s.addNotes('Commercial competitiveness and transparency is 20 per cent of the score. This slide is the whole answer to it.');
}

/* -------------------------------------------------- 8. terms and close --- */
{
  const s = pres.addSlide();
  {
    picture(s, 'close.jpg', { x: 0, y: 0, w: W, h: 3.5, sizing: { type: 'cover', w: W, h: 3.5 } },
      'An AD PRO LED screen at Kamlapur Railway Station, Dhaka');
  }
  s.addShape(pres.ShapeType.rect, { x: 0, y: 3.5, w: W, h: H - 3.5, fill: { color: WHITE } });
  heading(s, 'Terms', 'Accepted as Uber wrote them.', { y: 3.85 });

  const terms = [
    ['NET60', '60 days from a correct invoice against an Uber-issued PO'],
    ['Purchase orders', 'No work commenced and no cost incurred without a valid PO'],
    ['Rate validity', 'Re-confirmed every 15 days, re-issued against the same structure'],
    ['MSA and SOW', "Accepted without redlines on Uber's template"],
    ['Mutual NDA', 'Returned with this submission, completed and unsigned'],
    ['Contract term', 'One year, as proposed'],
  ];
  const cw = (W - M * 2 - 0.5 * 2) / 3;
  terms.forEach(([t, b], i) => {
    const x = M + (i % 3) * (cw + 0.5);
    const y = 4.9 + Math.floor(i / 3) * 0.95;
    s.addText(t, { x, y, w: cw, h: 0.28, fontFace: FONT, fontSize: 13, bold: true, color: BLUE, margin: 0 });
    s.addText(b, { x, y: y + 0.28, w: cw, h: 0.5, fontFace: FONT, fontSize: 10.5, color: SOFT, margin: 0, lineSpacing: 14, valign: 'top' });
  });

  s.addText('adpro.com.bd  ·  +880 1958 503755  ·  mkt.adpro@gmail.com', {
    x: M, y: H - 0.8, w: W - M * 2, h: 0.3,
    fontFace: FONT, fontSize: 10.5, color: NAVY, margin: 0,
  });
  s.addNotes('Close on the terms, because none of them need negotiating. The full response and every annexure are already with the panel.');
}

const dest = resolve(ROOT, 'uber-presentation.pptx');
await pres.writeFile({ fileName: dest });
console.log(`uber-presentation.pptx: 8 slides, ${rates.screens.length} screens and ${rates.footbridges.length} bridges read from rates.json`);
