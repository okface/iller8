// One-off: strip "say it in one word / two words / (slang)" META hints out of
// context cues — the owner doesn't want prompts that reveal the answer's form.
// Substring replacements only; logs any miss so we can spot char mismatches.
//   node scripts/fix-context-cues.mjs

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dir = join(__dirname, '..', 'src', 'data', 'lessons');

const EDITS = {
  '02-reactions.json': [
    ['— react with one upbeat word.', '— what do you fire back?'],
    ['— tip your hat to them in two words.', '— tip your hat to them.'],
    ['— react with one slangy upbeat word.', "— react like it's awesome."],
    ['— react with one word.', '— react to the bad news.'],
    ['flair, one word.', 'flair.'],
    ['— react with sympathy in one word.', '— react with sympathy.'],
    ['that was (slang).', 'that was.'],
    ['absolutely top (youth slang).', 'absolutely top.'],
  ],
  '07-feelings-opinions.json': [
    ["react with the one-word 'is that true?'", "ask whether it's really true."],
    ['— react with pure one-word enthusiasm.', '— react with pure enthusiasm.'],
    ['— react with one word of retro-flavored slang.', "— react like that's seriously cool."],
    ['— react with one dramatic word.', '— react with dramatic sympathy.'],
  ],
  '10-celebrations.json': [
    ["— what's the one-word reply?", '— congratulate them.'],
    ['— show them respect in two words.', '— show them respect.'],
  ],
};

let total = 0;
for (const [file, pairs] of Object.entries(EDITS)) {
  const p = join(dir, file);
  let text = readFileSync(p, 'utf8');
  let changed = 0;
  for (const [from, to] of pairs) {
    if (text.includes(from)) {
      text = text.split(from).join(to);
      changed++;
    } else {
      console.log(`  MISS in ${file}: ${JSON.stringify(from)}`);
    }
  }
  if (changed > 0) {
    JSON.parse(text); // validate before writing
    writeFileSync(p, text, 'utf8');
    console.log(`${file}: applied ${changed}/${pairs.length}`);
    total += changed;
  }
}
console.log(`Done. ${total} context cues de-meta'd.`);
