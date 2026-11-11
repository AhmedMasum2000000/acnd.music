/**
 * Copies the built files into deliverables/ under the names they go out with.
 *
 * The build scripts write short stable names because a dozen other things read
 * them. What lands in Uber's inbox should say what it is and who it is from
 * without being opened, so the copy happens here rather than by renaming the
 * build outputs and breaking every path that points at them.
 *
 *     node scripts/rfp/deliver.mjs
 */

import { copyFileSync, mkdirSync, existsSync, statSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT = resolve(ROOT, 'deliverables');

const FILES = [
  // The email that carries the rest. It lives with them so nobody has to
  // reconstruct what the covering note said when the thread is picked up again.
  ['scripts/rfp/submission-email.txt', 'AD PRO Communications Ltd - Uber Bangladesh - Submission Email.txt'],
  ['uber-cover-letter.pdf', 'AD PRO Communications Ltd - Uber Bangladesh - Cover Letter.pdf'],
  ['uber-rfp-response.pdf', 'AD PRO Communications Ltd - Uber Bangladesh - Strategic Plan and Commercial Proposal.pdf'],
  ['uber-presentation.pptx', 'AD PRO Communications Ltd - Uber Bangladesh - Presentation.pptx'],
  ['company-profile.pdf', 'AD PRO Communications Ltd - Company Profile.pdf'],
  ['uber-mnda-adpro.docx', 'AD PRO Communications Ltd - Uber Mutual NDA (completed, unsigned for DocuSign).docx'],
];

mkdirSync(OUT, { recursive: true });

let total = 0;
const missing = [];
for (const [from, to] of FILES) {
  const src = resolve(ROOT, from);
  if (!existsSync(src)) {
    missing.push(from);
    continue;
  }
  copyFileSync(src, resolve(OUT, to));
  total += statSync(src).size;
}

console.log(
  `deliverables: ${FILES.length - missing.length} files, ${(total / 1024 / 1024).toFixed(2)} MB` +
    (missing.length ? `, missing ${missing.join(', ')}` : ''),
);
