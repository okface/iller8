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
    }
  );
}

export function updateDailyStats(
  progress: UserProgress,
  correct: boolean
): UserProgress {
  const today = new Date().toISOString().split('T')[0];
  const existing = progress.dailyStats.find((s) => s.date === today);
  const stats: DailyStats = existing
    ? { ...existing }
    : {
        date: today,
        phrasesStudied: 0,
        correctAnswers: 0,
        totalAnswers: 0,
        timeSpentSeconds: 0,
      };

  stats.phrasesStudied += 1;
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
