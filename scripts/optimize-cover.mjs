/**
 * One-off: turn a full-resolution cover photograph into the two web assets a
 * release card ships.
 *
 *   node scripts/optimize-cover.mjs <source.jpg> <slug>
 *
 * Outputs public/cover-<slug>-900.webp and public/cover-<slug>-420.webp, both
 * committed. The source aspect ratio is preserved — covers are not forced to
 * a square, because cropping someone's artwork to fit a grid is the grid's
 * problem to solve, not the artwork's. Print the reported dimensions into the
 * release's `coverW` / `coverH` in src/data/acnd.ts so the card reserves the
 * right box and nothing shifts as the image loads.
 *
 * `sharp` stays a devDependency — this never runs during a build or in CI.
 */

import { mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const publicDir = resolve(here, '..', 'public');

const [source, slug] = process.argv.slice(2);
if (!source || !slug) {
  console.error('usage: node scripts/optimize-cover.mjs <source-image> <slug>');
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
  { width: 900, quality: 80 },
  { width: 420, quality: 72 },
];

for (const v of variants) {
  const file = `cover-${slug}-${v.width}.webp`;
  const info = await sharp(source)
    .rotate() // honour EXIF orientation before resizing
    .resize({ width: v.width, withoutEnlargement: true })
    .webp({ quality: v.quality })
    .toFile(resolve(publicDir, file));
  console.log(`${file}  ${info.width}x${info.height}  ${(info.size / 1024).toFixed(1)} kB`);
}
