/**
 * One-off: turn a full-resolution source photograph into the two web assets
 * the site actually ships.
 *
 *   node scripts/optimize-portrait.mjs <source.jpg>
 *
 * Outputs public/portrait-1200.webp and public/portrait-480.webp, both of
 * which are committed. `sharp` stays a devDependency — this never runs during
 * a build or in CI, so nothing in the deploy path depends on it.
 */

import { mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const publicDir = resolve(here, '..', 'public');

const source = process.argv[2];
if (!source) {
  console.error('usage: node scripts/optimize-portrait.mjs <source-image>');
  process.exit(1);
}

let sharp;
try {
  ({ default: sharp } = await import('sharp'));
} catch {
  console.error('sharp is not installed. Run: npm install --save-dev sharp');
  process.exit(1);
}

await mkdir(publicDir, { recursive: true });

const variants = [
  { width: 1200, file: 'portrait-1200.webp', quality: 78 },
  { width: 480, file: 'portrait-480.webp', quality: 70 },
];

for (const v of variants) {
  const out = resolve(publicDir, v.file);
  const info = await sharp(source)
    .rotate() // honour EXIF orientation before resizing
    .resize({ width: v.width, withoutEnlargement: true })
    .webp({ quality: v.quality })
    .toFile(out);
  console.log(`${v.file}  ${info.width}x${info.height}  ${(info.size / 1024).toFixed(1)} kB`);
}

// The Open Graph card: the portrait cropped to 1200x630 and darkened so the
// overlaid wordmark stays legible in a link preview.
//
// JPEG rather than PNG — this is a photograph, and the PNG version of the
// same card is roughly fifteen times the size for no visible gain. Link
// previews are fetched by chat clients on mobile connections.
const ogPath = resolve(publicDir, 'og.jpg');
const og = await sharp(source)
  .rotate()
  .resize({ width: 1200, height: 630, fit: 'cover', position: 'top' })
  .modulate({ brightness: 0.62 })
  .composite([
    {
      input: Buffer.from(
        `<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
          <rect width="1200" height="630" fill="#07070a" opacity="0.42"/>
          <text x="72" y="470" font-family="monospace" font-size="132" font-weight="bold"
                letter-spacing="12" fill="#e8e4dc">ACND</text>
          <text x="76" y="530" font-family="monospace" font-size="30"
                letter-spacing="8" fill="#ff2e4d">PRODUCER · DJ · COMPOSER</text>
          <text x="76" y="574" font-family="monospace" font-size="26"
                letter-spacing="6" fill="#8b8798">DHAKA, BANGLADESH</text>
        </svg>`,
      ),
      top: 0,
      left: 0,
    },
  ])
  .jpeg({ quality: 82, mozjpeg: true })
  .toFile(ogPath);
console.log(`og.jpg  ${og.width}x${og.height}  ${(og.size / 1024).toFixed(1)} kB`);
