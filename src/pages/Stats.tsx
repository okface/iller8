import { useMemo } from 'react';
import { lessons } from '../data/lessons';
import { getMasteryLevel, getMasteryColor } from '../engine/srs';
import AchievementBadge from '../components/AchievementBadge';
import achievementsData from '../data/achievements.json';
import type { UserProgress, Achievement } from '../store/types';
import { getDaysAgo } from '../lib/utils';

interface StatsProps {
  progress: UserProgress;
  script: 'latin' | 'cyrillic';
}

export default function Stats({ progress, script }: StatsProps) {
  const achievements = achievementsData as Achievement[];

  const stats = useMemo(() => {
    const allPhrases = lessons.flatMap((l) =>
      l.phraseGroups.flatMap((g) => g.phrases)
    );
    const totalPhrases = allPhrases.length;
    const learned = Object.values(progress.phrases).filter(
      (p) => p.bucket >= 1
    ).length;
    const mastered = Object.values(progress.phrases).filter(
      (p) => p.bucket >= 4
    ).length;

    const bucketCounts = [0, 0, 0, 0, 0, 0];
    Object.values(progress.phrases).forEach((p) => {
      bucketCounts[p.bucket]++;
    });
    bucketCounts[0] = totalPhrases - learned;

    const totalCorrect = Object.values(progress.phrases).reduce(
      (sum, p) => sum + p.correctCount,
      0
    );
    const totalIncorrect = Object.values(progress.phrases).reduce(
      (sum, p) => sum + p.incorrectCount,
      0
    );
    const totalAnswers = totalCorrect + totalIncorrect;
    const accuracy = totalAnswers > 0 ? Math.round((totalCorrect / totalAnswers) * 100) : 0;

    return { totalPhrases, learned, mastered, bucketCounts, accuracy, totalAnswers };
  }, [progress.phrases]);

  const streakCalendar = useMemo(() => {
    const days: { date: string; active: boolean; count: number }[] = [];
    for (let i = 27; i >= 0; i--) {
      const date = getDaysAgo(i);
      const dayStats = progress.dailyStats.find((s) => s.date === date);
      days.push({
        date,
        active: !!dayStats && dayStats.phrasesStudied > 0,
        count: dayStats?.phrasesStudied ?? 0,
      });
    }
    return days;
  }, [progress.dailyStats]);

  return (
    <div className="flex flex-col gap-6 pb-4">
      <h1 className="text-2xl font-bold text-white">
        {script === 'cyrillic' ? 'Напредак' : 'Napredak'}
      </h1>

      <div className="grid grid-cols-3 gap-3">
        <StatBox label="Learned" value={stats.learned} sub={`/ ${stats.totalPhrases}`} />
        <StatBox label="Mastered" value={stats.mastered} color="text-emerald-500" />
        <StatBox label="Accuracy" value={`${stats.accuracy}%`} color="text-amber-500" />
      </div>

      <div className="rounded-2xl border border-navy-700 bg-navy-800/30 p-4">
        <h3 className="text-sm font-medium text-gray-400 mb-3">Mastery Distribution</h3>
        <div className="flex flex-col gap-2">
          {stats.bucketCounts.map((count, bucket) => (
            <div key={bucket} className="flex items-center gap-3">
              <span className={`text-xs w-16 ${getMasteryColor(bucket)}`}>
                {getMasteryLevel(bucket)}
              </span>
              <div className="flex-1 h-3 rounded-full bg-navy-700 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    bucket === 0
                      ? 'bg-gray-600'
                      : bucket <= 2
                        ? 'bg-amber-500'
                        : 'bg-emerald-500'
                  }`}
                  style={{
                    width: `${stats.totalPhrases > 0 ? (count / stats.totalPhrases) * 100 : 0}%`,
                  }}
                />
              </div>
              <span className="text-xs text-gray-500 w-8 text-right">{count}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-navy-700 bg-navy-800/30 p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-gray-400">Streak Calendar</h3>
          <div className="flex items-center gap-2">
            <span className="text-lg">🔥</span>
            <span className="text-sm font-bold text-white">{progress.currentStreak}</span>
            <span className="text-xs text-gray-500">
              (best: {progress.longestStreak})
            </span>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-1">
          {streakCalendar.map((day) => (
            <div
              key={day.date}
              title={`${day.date}: ${day.count} phrases`}
              className={`aspect-square rounded-sm ${
                day.active
                  ? day.count >= 10
                    ? 'bg-amber-500'
                    : day.count >= 5
                      ? 'bg-amber-500/60'
                      : 'bg-amber-500/30'
                  : 'bg-navy-800'
              }`}
            />
          ))}
        </div>
        <div className="flex justify-between mt-2 text-[10px] text-gray-600">
          <span>4 weeks ago</span>
          <span>today</span>
        </div>
      </div>

      <div className="rounded-2xl border border-navy-700 bg-navy-800/30 p-4">
        <h3 className="text-sm font-medium text-gray-400 mb-3">
          {script === 'cyrillic' ? 'Достигнућа' : 'Dostignuća'}
        </h3>
        <div className="grid grid-cols-3 gap-2">
          {achievements.map((a) => (
            <AchievementBadge
              key={a.id}
              achievement={a}
              unlocked={progress.achievements.includes(a.id)}
            />
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-navy-700 bg-navy-800/30 p-4">
        <h3 className="text-sm font-medium text-gray-400 mb-3">Per-lesson Progress</h3>
        <div className="flex flex-col gap-2">
          {lessons.map((lesson) => {
            const phraseCount = lesson.phraseGroups.reduce(
              (s, g) => s + g.phrases.length,
              0
            );
            const learnedInLesson = lesson.phraseGroups.reduce(
              (s, g) =>
                s + g.phrases.filter((p) => (progress.phrases[p.id]?.bucket ?? 0) >= 1).length,
              0
            );
            return (
              <div key={lesson.id} className="flex items-center gap-3">
                <span className="text-sm text-white flex-1 truncate">
                  {script === 'cyrillic' ? lesson.title.sr_cyrillic : lesson.title.sr_latin}
                </span>
                <span className="text-xs text-gray-500">
                  {learnedInLesson}/{phraseCount}
                </span>
                <div className="w-20 h-2 rounded-full bg-navy-700 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-amber-500 transition-all"
                    style={{
                      width: `${phraseCount > 0 ? (learnedInLesson / phraseCount) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function StatBox({
  label,
  value,
  sub,
  color = 'text-white',
}: {
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
}) {
  return (
    <div className="rounded-xl border border-navy-700 bg-navy-800/30 p-3 text-center">
      <p className={`text-2xl font-bold ${color}`}>
        {value}
        {sub && <span className="text-sm text-gray-500">{sub}</span>}
      </p>
      <p className="text-xs text-gray-400 mt-1">{label}</p>
    </div>
  );
}
