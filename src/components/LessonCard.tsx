import { useNavigate } from 'react-router-dom';
import type { Lesson, PhraseProgress } from '../store/types';

interface LessonCardProps {
  lesson: Lesson;
  script: 'latin' | 'cyrillic';
  completed: boolean;
  unlocked: boolean;
  phraseProgress: Record<string, PhraseProgress>;
}

export default function LessonCard({
  lesson,
  script,
  completed,
  unlocked,
  phraseProgress,
}: LessonCardProps) {
  const navigate = useNavigate();

  const totalPhrases = lesson.phraseGroups.reduce(
    (sum, g) => sum + g.phrases.length,
    0
  );
  const masteredPhrases = lesson.phraseGroups.reduce(
    (sum, g) =>
      sum +
      g.phrases.filter((p) => (phraseProgress[p.id]?.bucket ?? 0) >= 4).length,
    0
  );
  const progress = totalPhrases > 0 ? masteredPhrases / totalPhrases : 0;

  const title =
    script === 'cyrillic' ? lesson.title.sr_cyrillic : lesson.title.sr_latin;

  return (
    <button
      onClick={() => unlocked && navigate(`/lesson/${lesson.id}`)}
      disabled={!unlocked}
      className={`relative w-full rounded-2xl border p-4 text-left transition-all ${
        unlocked
          ? completed
            ? 'border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/10'
            : 'border-navy-600 bg-navy-800/50 hover:bg-navy-700/50 hover:border-amber-500/40'
          : 'border-navy-700/30 bg-navy-900/50 opacity-50 cursor-not-allowed'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="text-xs text-gray-500 mb-1">
            {lesson.order}. lekcija
          </div>
          <h3 className="text-base font-semibold text-white truncate">
            {title}
          </h3>
          <p className="text-sm text-gray-400 mt-1">
            {lesson.description.en}
          </p>
        </div>
        <div className="flex-shrink-0">
          {completed ? (
            <span className="text-2xl">✓</span>
          ) : !unlocked ? (
            <span className="text-2xl opacity-40">🔒</span>
          ) : (
            <div className="relative w-12 h-12">
              <svg className="w-12 h-12 -rotate-90" viewBox="0 0 36 36">
                <circle
                  cx="18"
                  cy="18"
                  r="15.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="text-navy-700"
                />
                <circle
                  cx="18"
                  cy="18"
                  r="15.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeDasharray={`${progress * 97.4} 97.4`}
                  className="text-amber-500"
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-xs text-gray-300">
                {Math.round(progress * 100)}%
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
        <span>{totalPhrases} phrases</span>
        {masteredPhrases > 0 && (
          <>
            <span>·</span>
            <span className="text-amber-500">{masteredPhrases} mastered</span>
          </>
        )}
      </div>
    </button>
  );
}
