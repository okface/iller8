import type { Phrase, UserProgress, WordRef } from '../store/types';
import { getWordBucket } from '../lib/word-progress';

function wordRefId(ref: WordRef): string {
  return typeof ref === 'string' ? ref : ref.id;
}

/**
 * Readiness gate: a phrase is fully drillable once the learner has met
 * its content words individually. The audit (§3.5) defines three tiers:
 *
 *   readiness ≥ 0.7  → full exercise set unlocked
 *   readiness ≥ 0.4  → preview + recognition only
 *   readiness < 0.4  → hidden from drills (catalog browse only)
 *
 * `readiness` is the fraction of `phrase.wordRefs` the learner has at
 * SRS bucket ≥ `minBucket` (default 1: at least met once). If a phrase
 * has no `wordRefs` at all, readiness is treated as 1.0 — legacy phrases
 * fall through unchanged until tagged.
 */

export type ReadinessTier = 'hidden' | 'preview' | 'ready';

export interface ReadinessReport {
  ratio: number;
  tier: ReadinessTier;
  knownWordIds: string[];
  missingWordIds: string[];
}

export function computeReadiness(
  phrase: Phrase,
  progress: UserProgress,
  minBucket = 1
): ReadinessReport {
  const refs = phrase.wordRefs ?? [];
  if (refs.length === 0) {
    return { ratio: 1, tier: 'ready', knownWordIds: [], missingWordIds: [] };
  }

  const knownWordIds: string[] = [];
  const missingWordIds: string[] = [];
  for (const ref of refs) {
    const id = wordRefId(ref);
    if (getWordBucket(progress, id) >= minBucket) knownWordIds.push(id);
    else missingWordIds.push(id);
  }

  const ratio = knownWordIds.length / refs.length;
  let tier: ReadinessTier;
  if (ratio >= 0.7) tier = 'ready';
  else if (ratio >= 0.4) tier = 'preview';
  else tier = 'hidden';

  return { ratio, tier, knownWordIds, missingWordIds };
}

/** Quick check — true when the phrase can enter a normal drill. */
export function isPhraseReady(phrase: Phrase, progress: UserProgress): boolean {
  return computeReadiness(phrase, progress).tier === 'ready';
}

/** Quick check — true when the phrase can at least be previewed. */
export function isPhrasePreviewable(phrase: Phrase, progress: UserProgress): boolean {
  const t = computeReadiness(phrase, progress).tier;
  return t === 'ready' || t === 'preview';
}

/**
 * Filter a list of phrases down to those at or above the given tier.
 * Used by the exercise generator and the Hammer pool builder.
 */
export function filterByReadiness(
  phrases: Phrase[],
  progress: UserProgress,
  minTier: ReadinessTier = 'ready'
): Phrase[] {
  const tierRank: Record<ReadinessTier, number> = { hidden: 0, preview: 1, ready: 2 };
  const min = tierRank[minTier];
  return phrases.filter((p) => tierRank[computeReadiness(p, progress).tier] >= min);
}
