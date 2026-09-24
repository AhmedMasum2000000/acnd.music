/**
 * Assembles the Motijheel Metro Rail Station LED proposal into one file.
 *
 * Like the Uber response, it takes its stylesheet, font and logo from the
 * company profile at build time, so every document AD PRO sends looks the same
 * without keeping a copy of the design system. Every figure in the
 * document comes from RATES below. The rate card, the package, the VAT and
 * the worked example are all calculated from it, so no two of them can
 * disagree.
 *
 *     python3 scripts/metro/photos.py      # once, when the photographs change
 *     node scripts/metro/build.mjs
 *     python3 scripts/rfp/pdf.py motijheel-metro-proposal
 *
 * Writes motijheel-metro-proposal.html at the project root.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '../..');
const PROFILE = resolve(HERE, '../profile');

// ----------------------------------------------------------------- rates ---
// BDT per minute of airtime, per screen, before VAT.
const RATES = {
  large: { screens: 2, rate: 35 },
  standard: { screens: 26, rate: 30 },
  // Every screen, large or standard, when all of them are booked together.
  package: 25,
  vat: 0.15,
  minMonths: 6,
};

// The worked example: what a typical minimum booking costs, so a buyer sees a
// budget as well as a unit rate. Months are counted as 30 days.
const EXAMPLE = { minutesPerDay: 10, days: RATES.minMonths * 30 };

const DATE = '24 September 2026';

// ------------------------------------------------------------------ maths ---
const nLarge = RATES.large.screens;
const nStd = RATES.standard.screens;
const nTotal = nLarge + nStd;
const mLarge = nLarge * RATES.large.rate;
const mStd = nStd * RATES.standard.rate;
const mCard = mLarge + mStd;
const mPkg = nTotal * RATES.package;

const exMinutes = EXAMPLE.minutesPerDay * EXAMPLE.days;
const exCard = mCard * exMinutes;
const exPkg = mPkg * exMinutes;
const vat = (n) => Math.round(n * RATES.vat * 100) / 100;

const bdt = (n) => n.toLocaleString('en-US', { maximumFractionDigits: 2 });
const WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
const word = (n) => WORDS[n] ?? String(n);

const values = {
  n_total: nTotal,
  n_large: nLarge,
  n_std: nStd,
  n_large_word: word(nLarge),
  n_std_word: word(nStd),
  r_large: bdt(RATES.large.rate),
  r_std: bdt(RATES.standard.rate),
  m_large: bdt(mLarge),
  m_std: bdt(mStd),
  m_card: bdt(mCard),
  m_pkg: bdt(mPkg),
  pkg_rate: RATES.package,
  save_pct: (((mCard - mPkg) / mCard) * 100).toFixed(1),
  vat_pct: Math.round(RATES.vat * 100),
  min_months: RATES.minMonths,
  ex_min: EXAMPLE.minutesPerDay,
  ex_days: EXAMPLE.days,
  ex_minutes: bdt(exMinutes),
  ex_card: bdt(exCard),
  ex_pkg: bdt(exPkg),
  ex_card_vat: bdt(vat(exCard)),
  ex_pkg_vat: bdt(vat(exPkg)),
  ex_card_tot: bdt(exCard + vat(exCard)),
  ex_pkg_tot: bdt(exPkg + vat(exPkg)),
  date: DATE,
};

// ---------------------------------------------------------------- inputs ---
const read = (p) => readFileSync(p, 'utf8');
const profileTpl = read(resolve(PROFILE, 'template.html'));
const photos = JSON.parse(read(resolve(HERE, 'photos.json')));

let out = read(resolve(HERE, 'template.html'));

out = out.replace('/*@SHARED-CSS*/', profileTpl.slice(profileTpl.indexOf('<style>') + 7, profileTpl.indexOf('</style>')));
out = out.replaceAll('<!--@LOGO-->', profileTpl.match(/<img class="cover__logo"[\s\S]*?\/>/)[0]);

const ALT = {
  cover: 'The large LED screen on the concourse wall at Motijheel Metro Rail Station',
  big: 'A large landscape LED screen at Motijheel Metro Rail Station',
  small: 'Standard portrait LED screens on the concourse columns at Motijheel Metro Rail Station',
};
out = out.replace(/<!--@PHOTO:([a-z]+)-->/g, (_, key) => {
  const p = photos[key];
  return p ? `<img src="${p.uri}" alt="${ALT[key]}" width="${p.width}" height="${p.height}" />` : '';
});

out = out.replace(/\{\{([a-z_]+)\}\}/g, (whole, key) => {
  if (!(key in values)) throw new Error(`no value for ${whole}`);
  return String(values[key]);
});

const dest = resolve(ROOT, 'motijheel-metro-proposal.html');
writeFileSync(dest, '<meta charset="utf-8">\n' + out, 'utf8');

console.log(
  `motijheel-metro-proposal.html: ${nTotal} screens, card BDT ${bdt(mCard)}/min, ` +
    `package BDT ${bdt(mPkg)}/min, example ${values.ex_pkg_tot} incl. VAT, ` +
    `${(out.length / 1024 / 1024).toFixed(2)} MB`,
);
