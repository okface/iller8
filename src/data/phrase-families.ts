import type { PhraseFamily, FamilyVariant } from '../store/types';
import data from './phrase-families.json';

interface FamiliesFile {
  families: PhraseFamily[];
}

const file = data as FamiliesFile;

export const families: PhraseFamily[] = file.families ?? [];

export function getFamilyById(id: string): PhraseFamily | undefined {
  return families.find((f) => f.id === id);
}

export function getFamiliesForLesson(lessonId: string): PhraseFamily[] {
  return families.filter((f) => f.lessonId === lessonId);
}

/**
 * Stable id for a family variant — used as the SRS key so a learner's
 * progress on each transformation is tracked independently.
 */
export function variantSrsKey(family: PhraseFamily, variant: FamilyVariant): string {
  return `family:${family.id}:${variant.id}`;
}

/** Returns base + all variants flattened, in stable order. */
export function familyAllVariants(family: PhraseFamily): FamilyVariant[] {
  return [family.base, ...family.variants];
}

/** Picks variants the user hasn't mastered yet, biased by SRS bucket. */
export function pickDueVariants(
  family: PhraseFamily,
  phraseProgress: Record<string, { bucket: number }>,
  count: number
): FamilyVariant[] {
  const variants = [...family.variants];
  // Sort by SRS bucket asc — least-mastered first
  variants.sort((a, b) => {
    const aBucket = phraseProgress[variantSrsKey(family, a)]?.bucket ?? 0;
    const bBucket = phraseProgress[variantSrsKey(family, b)]?.bucket ?? 0;
    return aBucket - bBucket;
  });
  return variants.slice(0, count);
}
