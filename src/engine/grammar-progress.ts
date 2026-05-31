import type { UserProgress, WordRef } from '../store/types';
import { lessons } from '../data/lessons';
import { phraseStage, isChunkPhrase } from '../data/phrase-meta';
import { STAGES } from '../data/grammar-stages';

/**
 * Grammar-stage progression — the learner's "frontier".
 *
 * New content is introduced stage by stage so difficulty ramps instead of
 * shuffling randomly. The frontier is the lowest non-chunk stage not yet
 * cleared; new phrases are only introduced up to it (chunks always flow).
 *
 * Two things were broken before and are fixed here:
 *  1. The old version counted only PHRASE buckets, but ~half of daily practice
 *     is spent on `word:` keys (and conjugations). Those never counted, so the
 *     frontier barely moved. We now count a stage's WORDS too (the `word:` keys
 *     of its phrases' wordRefs).
 *  2. Clearing required mastering (bucket≥2) eight phrases — far too slow. A
 *     stage now clears on ENGAGEMENT (bucket≥1) of ~60% of its items (capped),
 *     which matches the "retrieval-later, low-commitment" philosophy.
 */

const MET_BUCKET = 1; // engaged / learning — counts toward clearing
const MASTER_BUCKET = 2; // mastered — shown as "depth", not required to advance
const CLEAR_FRACTION = 0.6; // clear when 60% of a stage's (capped) items are met
const CLEAR_CAP = 10; // never require more than ~10 items, even in huge stages

function wordRefId(ref: WordRef): string {
  return typeof ref === 'string' ? ref : ref.id;
}

// stage id → the SRS keys that count toward it: the stage's phrase ids PLUS the
// `word:` keys of those phrases' content words. Built once at module load.
const stageKeys = new Map<number, string[]>();
function addKey(stage: number, key: string) {
  const arr = stageKeys.get(stage);
  if (arr) {
    if (!arr.includes(key)) arr.push(key);
  } else {
    stageKeys.set(stage, [key]);
  }
}
for (const lesson of lessons) {
  for (const group of lesson.phraseGroups) {
    for (const p of group.phrases) {
      const s = phraseStage(p.id);
      addKey(s, p.id);
      for (const ref of p.wordRefs ?? []) {
        addKey(s, `word:${wordRefId(ref)}`);
      }
    }
  }
}

export interface StageProgress {
  stage: number;
  total: number;
  met: number; // bucket >= MET_BUCKET
  mastered: number; // bucket >= MASTER_BUCKET
  need: number; // items to "met" before the stage clears
  pct: number; // 0..1 progress toward clearing
  cleared: boolean;
}

export function getStageProgress(progress: UserProgress): StageProgress[] {
  return STAGES.map((st) => {
    const keys = stageKeys.get(st.id) ?? [];
    let met = 0;
    let mastered = 0;
    for (const k of keys) {
      const b = progress.phrases[k]?.bucket ?? 0;
      if (b >= MET_BUCKET) met++;
      if (b >= MASTER_BUCKET) mastered++;
    }
    const need =
      keys.length === 0
        ? 0
        : Math.max(1, Math.min(CLEAR_CAP, Math.ceil(keys.length * CLEAR_FRACTION)));
    const cleared = keys.length === 0 ? true : met >= need;
    const pct = need === 0 ? 1 : Math.min(1, met / need);
    return { stage: st.id, total: keys.length, met, mastered, need, pct, cleared };
  });
}

/**
 * The learner's current working stage — the lowest non-chunk stage not yet
 * cleared. New content is introduced up to this stage (chunks always flow).
 */
export function getLearnerStage(progress: UserProgress): number {
  for (const sp of getStageProgress(progress)) {
    if (sp.stage === 0) continue; // chunks always available
    if (!sp.cleared) return sp.stage;
  }
  return STAGES[STAGES.length - 1].id;
}

/** Whether a phrase may enter the NEW stream given the current frontier. */
export function isStageUnlocked(phraseId: string, frontier: number): boolean {
  if (isChunkPhrase(phraseId)) return true;
  return phraseStage(phraseId) <= frontier;
}
