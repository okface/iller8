import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { lessons, isLessonUnlocked } from '../data/lessons';
import LessonCard from '../components/LessonCard';
import StreakCounter from '../components/StreakCounter';
import ProgressBar from '../components/ProgressBar';
import { getDueItems } from '../engine/srs';
import { getTodayStats } from '../store/progress';
import { getTimeGreeting } from '../lib/utils';
import type { UserProgress } from '../store/types';

interface DashboardProps {
  progress: UserProgress;
  script: 'latin' | 'cyrillic';
}

export default function Dashboard({ progress, script }: DashboardProps) {
  const navigate = useNavigate();
  const greeting = getTimeGreeting();
  const todayStats = getTodayStats(progress);
  const dueCount = useMemo(
    () => getDueItems(progress.phrases).length,
    [progress.phrases]
  );

  const greetingText = script === 'cyrillic' ? greeting.sr_cyrillic : greeting.sr_latin;

  return (
    <div className="flex flex-col gap-6 pb-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">{greetingText}!</h1>
          <p className="text-sm text-gray-400">{greeting.en}</p>
        </div>
        <StreakCounter count={progress.currentStreak} />
      </div>

      <div className="rounded-2xl border border-navy-700 bg-navy-800/30 p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-400">Today's goal</span>
          <span className="text-sm text-amber-500 font-medium">
            {todayStats.phrasesStudied} / {progress.settings.dailyGoal}
          </span>
        </div>
        <ProgressBar
          current={todayStats.phrasesStudied}
          total={progress.settings.dailyGoal}
        />
        {todayStats.totalAnswers > 0 && (
          <p className="text-xs text-gray-500 mt-2">
            {Math.round(
              (todayStats.correctAnswers / todayStats.totalAnswers) * 100
            )}
            % accuracy today
          </p>
        )}
      </div>

      {dueCount > 0 && (
        <button
          onClick={() => navigate('/review')}
          className="flex items-center justify-between rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 transition-colors hover:bg-amber-500/10"
        >
          <div className="text-left">
            <p className="font-semibold text-amber-400">
              {script === 'cyrillic' ? 'Време за понављање!' : 'Vreme za ponavljanje!'}
            </p>
            <p className="text-sm text-gray-400">
              {dueCount} {dueCount === 1 ? 'phrase' : 'phrases'} to review
            </p>
          </div>
          <span className="text-2xl">🔄</span>
        </button>
      )}

      <div>
        <h2 className="text-lg font-semibold text-white mb-3">
          {script === 'cyrillic' ? 'Лекције' : 'Lekcije'}
        </h2>
        <div className="flex flex-col gap-3">
          {lessons.map((lesson) => (
            <LessonCard
              key={lesson.id}
              lesson={lesson}
              script={script}
              completed={progress.completedLessons.includes(lesson.id)}
              unlocked={isLessonUnlocked(lesson.id, progress.completedLessons)}
              phraseProgress={progress.phrases}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
