/**
 * Assembles the Uber RFP response into one self-contained file.
 *
 * The design system is not duplicated: the stylesheet is lifted at build time
 * out of the company profile's template, so the two documents that go to the
 * same prospect cannot drift apart. Only what is specific to a proposal,
 * tables, the KPI matrix, the letterhead rule, is declared in this template.
 *
 *     python3 scripts/rfp/rates.py        # once, when the quotations change
 *     node scripts/rfp/build.mjs
 *     python3 scripts/rfp/pdf.py
 *
 * Writes uber-rfp-response.html at the project root.
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '../..');
const PROFILE = resolve(HERE, '../profile');

const esc = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const bdt = (n) => n.toLocaleString('en-US');

const read = (p) => readFileSync(p, 'utf8');
const json = (p) => JSON.parse(read(p));

// ---------------------------------------------------------------- inputs ---
const profileTpl = read(resolve(PROFILE, 'template.html'));
const rates = json(resolve(HERE, 'rates.json'));

const OPENER_LABELS = {
  profile: ['4.1', 'Company profile'],
  permissions: ['4.4', 'Government liaison and permissions'],
  inventory: ['4.3', 'Owned inventory'],
  execution: ['4.5', 'Execution capability'],
  commercial: ['5', 'Commercial proposal'],
};

const photos = json(resolve(PROFILE, 'photos.json'));
const logos = json(resolve(PROFILE, 'logos.json'));

let out = read(resolve(HERE, 'template.html'));

// The profile's stylesheet, verbatim, including the fonts already inlined
// into it by the profile build.
const shared = profileTpl.slice(profileTpl.indexOf('<style>') + 7, profileTpl.indexOf('</style>'));
out = out.replace('/*@SHARED-CSS*/', shared);

// The brand mark, taken from wherever the profile currently keeps it.
const logo = profileTpl.match(/<img class="cover__logo"[\s\S]*?\/>/)[0];
out = out.replaceAll('<!--@LOGO-->', logo);

// ------------------------------------------------------------ photography ---
out = out.replace(
  '<!--@COVER-->',
  photos.cover
    ? `<img src="${photos.cover}" alt="An AD PRO LED billboard at Gulshan 1 Circle, Dhaka" width="1400" height="1000" />`
    : '',
);
out = out.replace(
  '<!--@CLOSE-->',
  photos.close
    ? `<img src="${photos.close}" alt="An AD PRO LED screen at Kamlapur Railway Station, Dhaka" width="1200" height="800" />`
    : '',
);
out = out.replace(
  '<!--@COVERAGE-->',
  photos.network?.length
    ? `<div class="net-grid">${photos.network
        .map(
          (n) =>
            `<figure><img src="${n.uri}" alt="${esc(n.name)}, ${esc(n.city)}" loading="lazy" ` +
            `width="620" height="465" /><figcaption>${esc(n.name)}<span>${esc(n.city)}</span></figcaption></figure>`,
        )
        .join('')}</div>`
    : '',
);

/**
 * The client wall, narrowed to brands whose Bangladesh campaigns AD PRO can
 * evidence and reference. An RFP scores references and may verify them, so a
 * roster that cannot be stood behind is worth less than a shorter one that can.
 */
const REFERENCEABLE = new Set([
  'ACI Group', 'Aarong', 'Apex', 'AugMedix', 'Aurora Specialised Hospital', 'Bangladesh Air Force',
  'Bangladesh Ansar & VDP', 'Bangladesh Army', 'Banglalink', 'Bashundhara', 'Beacon Pharmaceuticals',
  'CEMS', 'DC Office Manikganj', 'Dekko Foods', 'Dekko Isho', 'Department of Fisheries', 'DGHS',
  'Elephant Brand Cement', 'FillUp', 'Grameen Bank', 'Hamdard', 'Hatil', 'Jui', 'Kazi Food Industries',
  'Le Reve', 'Mediacom', 'Mega Builders', 'MGH Group', 'Milvik', 'Ministry of Finance',
  'Ministry of Planning', 'Mumtaz Herbal', 'Nagorik TV', 'Obhai', 'Pathao', 'Pepsi', 'Polar Ice Cream',
  'Praava Health', 'Prothom Alo', 'Radio Foorti 88.0 FM', 'Sailor', 'Sea Pearl', 'Sena Cement',
  'Seven Rings Cement', 'Shark Tank Bangladesh', 'Singer', 'Solasta', 'Spellbound', 'Square',
  'T Sports', 'Taaga', 'Transcom', 'Turaag', 'Twelve', 'U.S. Embassy Dhaka', 'UNDP', 'Unimart',
  'Uttara Motors', 'Walton', 'Watermark Group', 'X Ceramics',
]);

const wall = logos.filter((l) => REFERENCEABLE.has(l.name));
out = out.replace(
  '<!--@CLIENTS-->',
  `<div class="wall">${wall
    .map(
      (l) =>
        `<figure><img src="${l.uri}" alt="${esc(l.name)}" loading="lazy" width="260" height="118" /></figure>`,
    )
    .join('')}</div>`,
);

// ------------------------------------------------------------- rate cards ---
// Grouped by city, cheapest city last, so Dhaka, where Uber will spend, leads.
const byCity = new Map();
for (const s of rates.screens) {
  if (!byCity.has(s.city)) byCity.set(s.city, []);
  byCity.get(s.city).push(s);
}
const ORDER = ['Dhaka', 'Chattogram', 'Sylhet', "Cox's Bazar", 'Rajshahi', 'Narayanganj', 'Bogura', 'Cumilla', 'Rangpur'];
const cities = [...byCity.keys()].sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b));

const rateCard = cities
  .map((city) => {
    const rows = byCity
      .get(city)
      .map(
        (s) =>
          `<tr><td>${esc(s.name)}</td><td>${esc(s.dimension)}</td><td>${esc(s.model || 'P5')}</td>` +
          `<td>${esc(s.schedule)}</td><td class="num">${bdt(s.rate)}</td></tr>`,
      )
      .join('');
    // A city's name and its rates are one block. Wrapped so the print
    // stylesheet can hold them on the same sheet: a heading at the foot of one
    // page with its table on the next reads as two different things.
    return (
      // A city with more rows than a sheet holds cannot be kept whole, and
      // asking for it only pushes the block to the next page before breaking it
      // anyway, leaving the page it came from a third full. Dhaka is the only
      // one, at thirty-four screens.
      `<div class="${byCity.get(city).length > 18 ? 'block block--long' : 'block'}">` +
      `<h3 style="margin-top:1.3rem;font-size:0.8125rem;font-weight:500;letter-spacing:0.13em;` +
      `text-transform:uppercase;color:var(--blue)">${esc(city)} · ${byCity.get(city).length} screens</h3>` +
      `<table style="margin-top:0.5rem"><thead><tr><th>Site</th><th style="width:15%">Dimension</th>` +
      `<th style="width:8%">Pitch</th><th style="width:15%">On air</th>` +
      `<th class="num" style="width:16%">BDT / min / day</th></tr></thead><tbody>${rows}</tbody></table>` +
      `</div>`
    );
  })
  .join('');
out = out.replace('<!--@RATE-CARD-->', rateCard);

// Section 4.3 states what is owned; the priced list belongs in Part 5, so the
// inventory section summarises by city rather than printing the same fifty-two
// rows twice.
const summary = cities
  .map((city) => {
    const set = byCity.get(city);
    const sizes = set.map((s) => {
      const m = s.dimension.match(/W-([\d.]+).*?H-([\d.]+)/);
      return m ? Math.round(Number(m[1]) * Number(m[2])) : 0;
    }).filter(Boolean);
    const hours = [...new Set(set.map((s) => s.schedule).filter(Boolean))];
    return (
      `<tr><td><strong>${esc(city)}</strong></td><td class="num">${set.length}</td>` +
      `<td>${Math.min(...sizes).toLocaleString()}–${Math.max(...sizes).toLocaleString()} sq ft</td>` +
      `<td>${esc(hours.sort()[0] || '')}${hours.length > 1 ? ' onward' : ''}</td>` +
      `<td>P5</td></tr>`
    );
  })
  .join('');


// The rate card publishes a minute rate for most of the network but not all of
// it. Naming the shortfall, and where it is, is cheaper than having Uber
// notice that the map counts ten cities and the rate card prices nine.
const UNPRICED = (() => {
  const inventory = json(resolve(ROOT, 'src/data/boards.json'));
  const left = [...rates.screens];
  const short = [];
  for (const b of inventory) {
    const i = left.findIndex((r) => r.name === b.name);
    if (i >= 0) left.splice(i, 1);
    else short.push(b.city);
  }
  const by = {};
  for (const c of short) by[c] = (by[c] ?? 0) + 1;
  const where = Object.entries(by)
    .map(([c, n]) => `${n} in ${c}`)
    .join(', ');
  // Whatever is still in `left` is a screen the current deck prices but the
  // published inventory has not caught up with. Counting those as part of the
  // fifty-eight would make the arithmetic wrong by exactly their number.
  return {
    count: short.length,
    where,
    added: left.length,
    priced: rates.screens.length - left.length,
  };
})();

out = out.replace(
  '<!--@NETWORK-TABLE-->',
  `<table style="margin-top:1.3rem"><thead><tr><th>City</th><th class="num" style="width:14%">Screens</th>` +
    `<th style="width:20%">Screen area</th><th style="width:20%">On air</th><th style="width:10%">Pitch</th>` +
    `</tr></thead><tbody>${summary}` +
    `<tr class="tot"><td>Total owned and operated</td><td class="num">${rates.screens.length}</td>` +
    `<td colspan="3">All 1920×1080, MP4, minimum 60 minutes per day</td></tr></tbody></table>` +
    `<p class="tnote">Of the fifty-eight owned sites, ${UNPRICED.priced} carry a published ` +
    `minute rate. The other ${UNPRICED.count} (${UNPRICED.where}) are surveyed and quoted on ` +
    `request within 24 hours of brief. A further ${UNPRICED.added} screens commissioned since ` +
    `this inventory was published are priced in the current rate card and are included in the ` +
    `${rates.screens.length} listed at 5.2.</p>`,
);

const metro = rates.metro;
out = out.replace(
  '<!--@METRO-->',
  `<h3 style="font-size:1.0625rem;font-weight:500;margin-top:0.4rem">Metro rail coach branding</h3>` +
    `<table style="margin-top:0.6rem"><thead><tr><th>Package</th>` +
    metro.columns.map((c) => `<th class="num">${esc(c)}</th>`).join('') +
    `</tr></thead><tbody>` +
    metro.rows
      .map(
        (r) =>
          `<tr><td>${esc(r[0])}</td>` + r.slice(1).map((v) => `<td class="num">${bdt(v)}</td>`).join('') + `</tr>`,
      )
      .join('') +
    `</tbody></table><p class="tnote">${esc(metro.note)} Creative changes require 90 days' notice, ` +
    `maximum four in a year. Use of the DMTCL name in creative is not permitted.</p>`,
);

const simple = (title, block, extra = '') =>
  `<h3 style="font-size:1.0625rem;font-weight:500;margin-top:1.5rem">${title}</h3>` +
  `<table style="margin-top:0.6rem"><thead><tr><th>Item</th><th class="num" style="width:22%">BDT</th></tr></thead><tbody>` +
  block.rows.map((r) => `<tr><td>${esc(r[0])}</td><td class="num">${bdt(r[1])}</td></tr>`).join('') +
  `</tbody></table><p class="tnote">${esc(block.note)}${extra}</p>`;

out = out.replace('<!--@CARAVAN-->', simple('LED-covered van', rates.caravan,
  ' Inside-Dhaka routing quoted on the same basis against a named route.'));
out = out.replace('<!--@HUMANLED-->', simple('Human LED display', rates.human_led));

// ---------------------------------------------------- static and furniture ---

const money = (n) => n.toLocaleString('en-US');

out = out.replace(
  '<!--@FOOTBRIDGE-->',
  rates.footbridges?.length
    ? `<h3 style="font-size:1.0625rem;font-weight:500;margin-top:1.4rem">Foot over bridge branding, Dhaka</h3>` +
      `<table class="zebra" style="margin-top:0.6rem"><thead><tr><th>Bridge</th>` +
      `<th style="width:17%">Size</th><th class="num" style="width:10%">Sq ft</th>` +
      `<th class="num" style="width:20%">BDT / year</th></tr></thead><tbody>` +
      rates.footbridges
        .map(
          (f) =>
            `<tr><td>${esc(f.name)}</td><td>${esc(f.size)}</td>` +
            `<td class="num">${money(f.sft)}</td><td class="num">${money(f.price)}</td></tr>`,
        )
        .join('') +
      `</tbody></table>` +
      `<p class="tnote">${rates.footbridges.length} bridges, each held for twelve months. ` +
      `Rates exclude VAT and taxes. Artwork approved 48 hours before display; payment 50 per ` +
      `cent on work order, the balance in stages through the campaign.</p>`
    : '',
);

const lb = rates.lightbox;
out = out.replace(
  '<!--@LIGHTBOX-->',
  lb?.units
    ? `<h3 style="font-size:1.0625rem;font-weight:500;margin-top:1.6rem">Metro rail pillar light boxes</h3>` +
      `<p class="tnote" style="margin-bottom:0.6rem">${esc(lb.route)}. ` +
      `${lb.pillars} metro pillars (${esc(lb.span)}), two digital light boxes to a pillar, ` +
      `each ${esc(lb.size)}. The route runs past Dhaka University, Doyel Chattar, the High ` +
      `Court, the Press Club and the Secretariat.</p>` +
      `<table><thead><tr><th>Item</th><th class="num" style="width:14%">Units</th>` +
      `<th class="num" style="width:20%">BDT / year each</th>` +
      `<th class="num" style="width:22%">BDT / year</th></tr></thead><tbody>` +
      `<tr><td>Digital light boxes, ${esc(lb.size)}</td><td class="num">${lb.units}</td>` +
      `<td class="num">${money(lb.each)}</td><td class="num">${money(lb.subtotal)}</td></tr>` +
      `<tr><td>VAT at 15 per cent</td><td class="num"></td><td class="num"></td>` +
      `<td class="num">${money(lb.vat)}</td></tr>` +
      `<tr class="tot"><td>Total, twelve months</td><td class="num"></td><td class="num"></td>` +
      `<td class="num">${money(lb.total)}</td></tr>` +
      `</tbody></table>` +
      `<p class="tnote">The only rate in this response quoted inclusive of VAT, because the ` +
      `source quotation is. Payment 60 per cent on work order, the balance in stages.</p>`
    : '',
);

const air = rates.airport;
out = out.replace(
  '<!--@AIRPORT-->',
  air?.yearly
    ? `<table style="margin-top:1rem"><thead><tr><th>Site</th><th style="width:16%">Size</th>` +
      `<th style="width:18%">On air</th><th class="num" style="width:20%">BDT / year</th>` +
      `</tr></thead><tbody><tr><td>${esc(air.site)}<br>` +
      `<span style="color:var(--grey)">${esc(air.position)}</span></td>` +
      `<td>${esc(air.size)}</td><td>${esc(air.hours)}</td>` +
      `<td class="num">${money(air.yearly)}</td></tr></tbody></table>` +
      `<p class="tnote">Airport branding sits under the Civil Aviation Authority and the ` +
      `terminal operator, so the permission lead time in 4.4 applies before installation. ` +
      `Rate excludes VAT and taxes.</p>`
    : '',
);

const ins = rates.install;
out = out.replace(
  '<!--@INSTALL-->',
  ins?.rows
    ? `<table style="margin-top:1rem"><thead><tr><th>Item</th><th style="width:20%">Unit</th>` +
      `<th class="num" style="width:20%">Rate (BDT)</th></tr></thead><tbody>` +
      ins.rows
        .map(
          ([item, unit, rate]) =>
            `<tr><td>${esc(item)}</td><td>${esc(unit)}</td>` +
            `<td class="num">${money(rate)}</td></tr>`,
        )
        .join('') +
      `<tr class="tot"><td>Worked example, ${esc(ins.example)}</td><td></td>` +
      `<td class="num">${money(ins.worked)}</td></tr></tbody></table>` +
      `<p class="tnote">${esc(ins.note)} Payment 80 per cent on order, the balance on ` +
      `delivery. Rates exclude VAT, tax and AIT.</p>`
    : '',
);

// ------------------------------------------------------------------ write ---

// The chapter openers and the coverage map. Photography is the argument in a
// document about outdoor media, so it is generated rather than optional.
const rfpPhotos = existsSync(resolve(HERE, 'photos.json'))
  ? json(resolve(HERE, 'photos.json'))
  : { openers: {}, cities: {} };

out = out.replace(/<!--@OPENER:([a-z]+)-->/g, (whole, key) => {
  const shot = rfpPhotos.openers?.[key];
  if (!shot) return '';
  const label = OPENER_LABELS[key] ?? '';
  return (
    `<figure class="opener"><img src="${shot.uri}" alt="${esc(shot.alt)}" ` +
    `width="1200" height="281" />` +
    `<figcaption class="opener__tag"><b>${label[0]}</b><span>${esc(label[1])}</span></figcaption>` +
    `</figure>`
  );
});

// ------------------------------------------------------------ signatures ---
// Drop a PNG or JPG named after the signatory into scripts/rfp/signatures/ and
// it lands above that person's rule at print resolution. Nothing there means a
// ruled line to sign by hand, which is what the document ships as until the
// files arrive.
const SIGNATORIES = { habib: 'ABM Zakaria Habib', masum: 'A. H. Al-Masum' };
const signed = [];
for (const [slug, name] of Object.entries(SIGNATORIES)) {
  const dir = resolve(HERE, 'signatures');
  const file = ['png', 'jpg', 'jpeg']
    .map((ext) => resolve(dir, `${slug}.${ext}`))
    .find((f) => existsSync(f));
  let mark = '';
  if (file) {
    const mime = file.endsWith('.png') ? 'png' : 'jpeg';
    mark =
      `<img src="data:image/${mime};base64,${readFileSync(file).toString('base64')}" ` +
      `alt="Signature of ${esc(name)}" />`;
    signed.push(slug);
  }
  out = out.replaceAll(`<!--@SIG:${slug}-->`, mark);
}

out = out.replace(
  '<!--@MAP-->',
  existsSync(resolve(HERE, 'map.svg')) ? readFileSync(resolve(HERE, 'map.svg'), 'utf8') : '',
);

const dest = resolve(ROOT, 'uber-rfp-response.html');
// Chromium sniffs the encoding when the file declares none, and a shift in
// the byte pattern can flip that guess to a Chinese codepage: en dashes and
// cedillas then print as CJK. Declare it rather than let it be guessed.
writeFileSync(dest, '<meta charset="utf-8">\n' + out, 'utf8');

const unfilled = (out.match(/class="fill"/g) || []).length;
console.log(
  `uber-rfp-response.html: ${rates.screens.length} screens priced across ${cities.length} cities, ` +
    `${wall.length} client marks, ${unfilled} rates left to fill, ` +
    `${signed.length ? signed.join(' and ') + ' signed' : 'signature lines blank'}, ` +
    `${(out.length / 1024 / 1024).toFixed(2)} MB`,
);
