import type { UserProgress, PhraseProgress, DailyStats, UserSettings } from './types';

const STORAGE_KEY = 'iller8_progress';

const defaultSettings: UserSettings = {
  scriptPreference: 'latin',
  dailyGoal: 10,
  darkMode: true,
  apiKey: '',
  skipTyping: false,
  autoplayAudio: true,
  voiceGender: 'female',
};

function createDefaultProgress(): UserProgress {
  return {
    phrases: {},
    completedLessons: [],
    dailyStats: [],
    achievements: [],
    currentStreak: 0,
    longestStreak: 0,
    lastActiveDate: '',
    settings: { ...defaultSettings },
  };
}

export function loadProgress(): UserProgress {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createDefaultProgress();
    const parsed = JSON.parse(raw) as UserProgress;
    return { ...createDefaultProgress(), ...parsed, settings: { ...defaultSettings, ...parsed.settings } };
  } catch {
    return createDefaultProgress();
  }
}

export function saveProgress(progress: UserProgress): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
}

export function updatePhraseProgress(
  progress: UserProgress,
  phraseProgress: PhraseProgress
): UserProgress {
  return {
    ...progress,
    phrases: {
      ...progress.phrases,
      [phraseProgress.phraseId]: phraseProgress,
    },
  };
}

export function markLessonComplete(
  progress: UserProgress,
  lessonId: string
): UserProgress {
  if (progress.completedLessons.includes(lessonId)) return progress;
  return {
    ...progress,
    completedLessons: [...progress.completedLessons, lessonId],
  };
}

export function getTodayStats(progress: UserProgress): DailyStats {
  const today = new Date().toISOString().split('T')[0];
  return (
    progress.dailyStats.find((s) => s.date === today) ?? {
      date: today,
      phrasesStudied: 0,
      correctAnswers: 0,
      totalAnswers: 0,
      timeSpentSeconds: 0,
      studiedPhraseIds: [],
    }
  );
}

export function updateDailyStats(
  progress: UserProgress,
  correct: boolean,
  phraseId?: string
): UserProgress {
  const today = new Date().toISOString().split('T')[0];
  const existing = progress.dailyStats.find((s) => s.date === today);
  // When the day rolls over `existing` is undefined, so the fresh record
  // below resets every daily counter — including studiedPhraseIds — to empty.
  const stats: DailyStats = existing
    ? { ...existing, studiedPhraseIds: [...(existing.studiedPhraseIds ?? [])] }
    : {
        date: today,
        phrasesStudied: 0,
        correctAnswers: 0,
        totalAnswers: 0,
        timeSpentSeconds: 0,
        studiedPhraseIds: [],
      };

  // phrasesStudied counts DISTINCT phrase ids studied today. Dedupe the id
  // into the set and mirror its size; repeats/retries don't inflate it.
  if (phraseId && !stats.studiedPhraseIds!.includes(phraseId)) {
    stats.studiedPhraseIds!.push(phraseId);
  }
  // NOTE: callers without a phrase id (e.g. the MatchPairs loop in
  // LessonView) fall back to incrementing by 1, preserving prior behavior.
  if (phraseId) {
    stats.phrasesStudied = stats.studiedPhraseIds!.length;
  } else {
    stats.phrasesStudied += 1;
  }
  stats.totalAnswers += 1;
  if (correct) stats.correctAnswers += 1;

  const otherDays = progress.dailyStats.filter((s) => s.date !== today);

  let { currentStreak, longestStreak, lastActiveDate } = progress;
  if (lastActiveDate !== today) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    currentStreak = lastActiveDate === yesterdayStr ? currentStreak + 1 : 1;
    longestStreak = Math.max(longestStreak, currentStreak);
    lastActiveDate = today;
  }

  return {
    ...progress,
    dailyStats: [...otherDays, stats],
    currentStreak,
    longestStreak,
    lastActiveDate,
  };
}

export function updateSettings(
  progress: UserProgress,
  settings: Partial<UserSettings>
): UserProgress {
  return {
    ...progress,
    settings: { ...progress.settings, ...settings },
  };
}

export function addAchievement(
  progress: UserProgress,
  achievementId: string
): UserProgress {
  if (progress.achievements.includes(achievementId)) return progress;
  return {
    ...progress,
    achievements: [...progress.achievements, achievementId],
  };
}

/**
 * Award the achievements that depend only on overall progress + clock —
 * the "universal" ones that any session path can earn. Idempotent.
 * Lesson-specific badges (first-lesson, perfect-lesson, sweet-talker,
 * brate, script-scholar, review-champion) stay with their own contexts.
 *
 * Centralized here so the unified `/daily` loop and word/family drills
 * award them too — previously only LessonView/ReviewSession did, so the
 * primary path earned nothing.
 */
export function checkAchievements(progress: UserProgress): UserProgress {
  let p = progress;

  const streak = p.currentStreak;
  if (streak >= 3) p = addAchievement(p, 'streak-3');
  if (streak >= 7) p = addAchievement(p, 'streak-7');
  if (streak >= 14) p = addAchievement(p, 'streak-14');
  if (streak >= 30) p = addAchievement(p, 'streak-30');

  const learned = Object.values(p.phrases).filter((x) => x.bucket >= 1).length;
  if (learned >= 100) p = addAchievement(p, 'polyglot');

  const hour = new Date().getHours();
  if (hour >= 23 || hour < 5) p = addAchievement(p, 'night-owl');
  if (hour >= 5 && hour < 7) p = addAchievement(p, 'early-bird');

  return p;
}

export function exportProgress(): string {
  return localStorage.getItem(STORAGE_KEY) ?? '{}';
}

export function importProgress(json: string): UserProgress {
  const data = JSON.parse(json) as UserProgress;
  saveProgress(data);
  return data;
}

export function resetProgress(): UserProgress {
  const fresh = createDefaultProgress();
  saveProgress(fresh);
  return fresh;
}
