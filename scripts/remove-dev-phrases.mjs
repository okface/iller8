// One-off: remove the contrived developer-jargon phrases from the lesson data.
// The owner (not a developer) doesn't want them in the app at all. Run once:
//   node scripts/remove-dev-phrases.mjs
// Safe: parses + re-stringifies JSON (no comma/format hand-editing). Only files
// that actually contained a removed id are rewritten.

import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const LESSONS_DIR = join(__dirname, '..', 'src', 'data', 'lessons');

const DEV_IDS = new Set([
  'imam-bag', 'radi-na-mom', 'ko-je-ovo-pisao',
  'pustam-deploy', 'ne-diraj-petkom', 'pukao-prod', 'rollback',
  'radim-na-tiketu', 'blokiram-se', 'opet-meeting',
  'radi-li-ti-ovo', 'probaj-sad', 'ne-radi-opet',
  'erp-opet-pao', 'migracija-podataka', 'ko-je-menjao-semu', 'pim-integracija',
  'pustam-pr', 'vidimo-se-sutra', 'ubija-me-ovaj-task',
]);

const files = readdirSync(LESSONS_DIR).filter((f) => /^\d+.*\.json$/.test(f)).sort();
let totalRemoved = 0;
for (const file of files) {
  const p = join(LESSONS_DIR, file);
  const lesson = JSON.parse(readFileSync(p, 'utf8'));
  let removed = 0;
  for (const group of lesson.phraseGroups ?? []) {
    const before = group.phrases.length;
    group.phrases = group.phrases.filter((ph) => !DEV_IDS.has(ph.id));
    removed += before - group.phrases.length;
  }
  // Drop any group left empty by the removal.
  const groupsBefore = lesson.phraseGroups.length;
  lesson.phraseGroups = lesson.phraseGroups.filter((g) => g.phrases.length > 0);
  const groupsDropped = groupsBefore - lesson.phraseGroups.length;
  if (removed > 0) {
    writeFileSync(p, JSON.stringify(lesson, null, 2) + '\n', 'utf8');
    totalRemoved += removed;
    console.log(`${file}: removed ${removed} dev phrase(s)${groupsDropped ? `, dropped ${groupsDropped} empty group(s)` : ''}`);
  }
}
console.log(`Done. Removed ${totalRemoved} dev phrases total.`);
