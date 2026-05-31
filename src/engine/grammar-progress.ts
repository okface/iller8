import type { UserProgress } from '../store/types';
import { lessons } from '../data/lessons';
import { phraseStage, isChunkPhrase } from '../data/phrase-meta';
import { STAGES } from '../data/grammar-stages';

/**
 * Grammar-stage progression — the learner's "frontier".
 *
 * New content is introduced stage by stage so difficulty ramps instead of
 * shuffling randomly. A stage is "cleared" once enough of its phrases are
 * mastered; the frontier is the lowest non-chunk stage not yet cleared, and
 * new phrases are only introduced up to the frontier (chunks always flow).
 *
 * Thresholds are deliberately gentle and easy to tune — this is a soft ramp,
 * not a hard gate (the daily allocator still backfills so sessions never empty).
 */

const MASTER_BUCKET = 2; // "mastered enough to count toward clearing a stage"
const CLEAR_THRESHOLD = 8; // phrases to master in a stage before the next opens

// stage id → phrase ids (built once at module load)
const stagePhraseIds = new Map<number, string[]>();
for (const lesson of lessons) {
  for (const group of lesson.phraseGroups) {
    for (const p of group.phrases) {
      const s = phraseStage(p.id);
      const arr = stagePhraseIds.get(s);
      if (arr) arr.push(p.id);
      else stagePhraseIds.set(s, [p.id]);
    }
  }
}

export interface StageProgress {
  stage: number;
  total: number;
  met: number; // bucket >= 1
  mastered: number; // bucket >= MASTER_BUCKET
  cleared: boolean;
}

export function getStageProgress(progress: UserProgress): StageProgress[] {
  return STAGES.map((st) => {
    const ids = stagePhraseIds.get(st.id) ?? [];
    let met = 0;
    let mastered = 0;
    for (const id of ids) {
      const b = progress.phrases[id]?.bucket ?? 0;
      if (b >= 1) met++;
      if (b >= MASTER_BUCKET) mastered++;
    }
    const need = Math.min(CLEAR_THRESHOLD, ids.length);
    const cleared = ids.length === 0 ? true : mastered >= need;
    return { stage: st.id, total: ids.length, met, mastered, cleared };
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
