/**
 * Assembles the Uber RFP response into one self-contained file.
 *
 * The design system is not duplicated: the stylesheet is lifted at build time
 * out of the company profile's template, so the two documents that go to the
 * same prospect cannot drift apart. Only what is specific to a proposal —
 * tables, the KPI matrix, the letterhead rule — is declared in this template.
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

// The profile's stylesheet, verbatim — including the fonts already inlined
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
// Grouped by city, cheapest city last, so Dhaka — where Uber will spend — leads.
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
    return (
      `<h3 style="margin-top:1.3rem;font-size:0.8125rem;font-weight:500;letter-spacing:0.13em;` +
      `text-transform:uppercase;color:var(--blue)">${esc(city)} · ${byCity.get(city).length} screens</h3>` +
      `<table style="margin-top:0.5rem"><thead><tr><th>Site</th><th style="width:15%">Dimension</th>` +
      `<th style="width:8%">Pitch</th><th style="width:15%">On air</th>` +
      `<th class="num" style="width:16%">BDT / min / day</th></tr></thead><tbody>${rows}</tbody></table>`
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
// it. Naming the shortfall — and where it is — is cheaper than having Uber
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
  return { count: short.length, where };
})();

out = out.replace(
  '<!--@NETWORK-TABLE-->',
  `<table style="margin-top:1.3rem"><thead><tr><th>City</th><th class="num" style="width:14%">Screens</th>` +
    `<th style="width:20%">Screen area</th><th style="width:20%">On air</th><th style="width:10%">Pitch</th>` +
    `</tr></thead><tbody>${summary}` +
    `<tr class="tot"><td>Total owned and operated</td><td class="num">${rates.screens.length}</td>` +
    `<td colspan="3">All 1920×1080, MP4, minimum 60 minutes per day</td></tr></tbody></table>` +
    `<p class="tnote">${UNPRICED.count} further screens are held in the network without a ` +
    `published minute rate — ${UNPRICED.where} — and are surveyed and quoted on request within ` +
    `24 hours of brief, giving fifty-eight owned sites in total. The full priced list, site by ` +
    `site, is at 5.2.</p>`,
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

out = out.replace(
  '<!--@MAP-->',
  existsSync(resolve(HERE, 'map.svg')) ? readFileSync(resolve(HERE, 'map.svg'), 'utf8') : '',
);

const dest = resolve(ROOT, 'uber-rfp-response.html');
writeFileSync(dest, out);

const unfilled = (out.match(/class="fill"/g) || []).length;
console.log(
  `uber-rfp-response.html — ${rates.screens.length} screens priced across ${cities.length} cities, ` +
    `${wall.length} client marks, ${unfilled} rates left to fill, ${(out.length / 1024 / 1024).toFixed(2)} MB`,
);
