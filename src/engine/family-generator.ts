import type { Exercise, FamilyVariant, PhraseFamily, Phrase } from '../store/types';
import { families, variantSrsKey, familyAllVariants } from '../data/phrase-families';

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * The exercise engine and the SRS code both expect a `Phrase` per
 * exercise. For family variants we synthesize a Phrase from the
 * variant so the rest of the pipeline (SRS tracking, retry queue,
 * stats) keeps working unchanged.
 */
function variantAsPhrase(family: PhraseFamily, variant: FamilyVariant): Phrase {
  return {
    id: variantSrsKey(family, variant),
    sr_latin: variant.sr_latin,
    sr_cyrillic: variant.sr_cyrillic,
    en: variant.en,
    context: family.theme,
    notes: variant.note,
  };
}

/**
 * Build a single perspective-shift exercise for a given (family, variant).
 * If `multipleChoice` is true, includes 3 distractors drawn from OTHER
 * variants in the same family — same idea, wrong transform — that's the
 * point: force the learner to pick the right transformation, not just the
 * right meaning.
 */
export function generatePerspectiveShiftExercise(
  family: PhraseFamily,
  variant: FamilyVariant,
  script: 'latin' | 'cyrillic',
  multipleChoice: boolean
): Exercise {
  const srField = script === 'cyrillic' ? 'sr_cyrillic' : 'sr_latin';
  const baseSr = family.base[srField];
  const correct = variant[srField];

  let options: string[] | undefined;
  if (multipleChoice) {
    const siblings = familyAllVariants(family)
      .filter((v) => v.id !== variant.id)
      .map((v) => v[srField])
      .filter((s) => s !== correct);
    const distractors = shuffle(siblings).slice(0, 3);
    options = shuffle([correct, ...distractors]);
  }

  return {
    type: 'perspective-shift',
    phrase: variantAsPhrase(family, variant),
    direction: 'en-to-sr',
    options,
    correctAnswer: correct,
    prompt: variant.en,
    baseSr,
    baseSrLatin: family.base.sr_latin,
    baseSrCyrillic: family.base.sr_cyrillic,
    baseEn: family.base.en,
    transformLabel: variant.label,
    transformHint: variant.hint,
    familyId: family.id,
    variantId: variant.id,
    grammarNote: variant.note,
  };
}

/**
 * Generate a session of perspective-shift exercises across all families.
 * Picks each family's "least-mastered" variants first, mixes type-it and
 * multiple-choice for variety.
 *
 * Strategy:
 * - 60% multiple-choice (recognition — easier, builds confidence)
 * - 40% type-it (production — harder, deeper encoding)
 * - Pick 1–2 variants per family until we hit `count`
 */
export function generateFamilyDrillSession(
  phraseProgress: Record<string, { bucket: number }>,
  script: 'latin' | 'cyrillic',
  count: number = 10,
  lessonId?: string
): Exercise[] {
  const pool = lessonId
    ? families.filter((f) => f.lessonId === lessonId)
    : families;

  if (pool.length === 0) return [];

  type Candidate = { family: PhraseFamily; variant: FamilyVariant; bucket: number };
  const candidates: Candidate[] = [];

  for (const family of pool) {
    for (const variant of family.variants) {
      const bucket = phraseProgress[variantSrsKey(family, variant)]?.bucket ?? 0;
      candidates.push({ family, variant, bucket });
    }
  }

  // Bias toward least-mastered (low bucket) with some randomness so it
  // doesn't always start with the exact same variants.
  candidates.sort((a, b) => {
    const bucketDiff = a.bucket - b.bucket;
    if (bucketDiff !== 0) return bucketDiff;
    return Math.random() - 0.5;
  });

  // Avoid drilling the same family back-to-back: interleave across families.
  const byFamily = new Map<string, Candidate[]>();
  for (const c of candidates) {
    const list = byFamily.get(c.family.id) ?? [];
    list.push(c);
    byFamily.set(c.family.id, list);
  }

  const familyIds = shuffle([...byFamily.keys()]);
  const picked: Candidate[] = [];
  let round = 0;
  while (picked.length < count) {
    let progressed = false;
    for (const fid of familyIds) {
      const list = byFamily.get(fid)!;
      if (list[round]) {
        picked.push(list[round]);
        progressed = true;
        if (picked.length >= count) break;
      }
    }
    if (!progressed) break;
    round++;
  }

  return picked.map((c, i) => {
    // First two are multiple-choice (warm-up), then mix
    const useMC = i < 2 ? true : Math.random() < 0.6;
    return generatePerspectiveShiftExercise(c.family, c.variant, script, useMC);
  });
}

/**
 * Build a single "introduction" exercise for the first variant of a
 * family — used when surfacing a new family to a learner who only
 * knows the base.
 */
export function generateFamilyIntroExercise(
  family: PhraseFamily,
  script: 'latin' | 'cyrillic'
): Exercise | null {
  const firstVariant = family.variants[0];
  if (!firstVariant) return null;
  return generatePerspectiveShiftExercise(family, firstVariant, script, true);
}
