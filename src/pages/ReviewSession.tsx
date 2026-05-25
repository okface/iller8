import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { lessons } from '../data/lessons';
import { getDueItems, createPhraseProgress, recordAnswer } from '../engine/srs';
import { generateReviewExercises } from '../engine/exercise-generator';
import {
  updatePhraseProgress,
  updateDailyStats,
  saveProgress,
  addAchievement,
} from '../store/progress';
import ProgressBar from '../components/ProgressBar';
import MultipleChoice from '../components/exercises/MultipleChoice';
import TypeTranslation from '../components/exercises/TypeTranslation';
import FillInBlank from '../components/exercises/FillInBlank';
import WordTiles from '../components/exercises/WordTiles';
import ScriptConvert from '../components/exercises/ScriptConvert';
import ContextPick from '../components/exercises/ContextPick';
import SentenceBuilder from '../components/exercises/SentenceBuilder';
import Comprehension from '../components/exercises/Comprehension';
import PatternMatch from '../components/exercises/PatternMatch';
import type { Exercise, UserProgress } from '../store/types';

interface ReviewSessionProps {
  progress: UserProgress;
  setProgress: (p: UserProgress) => void;
  script: 'latin' | 'cyrillic';
}

export default function ReviewSession({
  progress,
  setProgress,
  script,
}: ReviewSessionProps) {
  const navigate = useNavigate();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [totalAnswered, setTotalAnswered] = useState(0);
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    const dueItems = getDueItems(progress.phrases);
    if (dueItems.length === 0) return;
    const generated = generateReviewExercises(lessons, dueItems, script, 15);
    setExercises(generated);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const dueCount = getDueItems(progress.phrases).length;

  const handleAnswer = useCallback(
    (correct: boolean) => {
      const exercise = exercises[currentIndex];
      if (!exercise) return;

      const phraseId = exercise.phrase.id;
      const existing = progress.phrases[phraseId] ?? createPhraseProgress(phraseId);
      const updated = recordAnswer(existing, correct);

      let newProgress = updatePhraseProgress(progress, updated);
      newProgress = updateDailyStats(newProgress, correct);

      if (correct) setCorrectCount((c) => c + 1);
      setTotalAnswered((t) => t + 1);

      setProgress(newProgress);
      saveProgress(newProgress);

      if (currentIndex + 1 >= exercises.length) {
        let finalProgress = newProgress;
        const reviewCount = (finalProgress.dailyStats || []).reduce(
          (sum, d) => sum + d.phrasesStudied,
          0
        );
        if (reviewCount >= 150) {
          finalProgress = addAchievement(finalProgress, 'review-champion');
          setProgress(finalProgress);
          saveProgress(finalProgress);
        }
        setFinished(true);
      } else {
        setCurrentIndex((i) => i + 1);
      }
    },
    [exercises, currentIndex, progress, setProgress]
  );

  if (dueCount === 0 && exercises.length === 0) {
    return (
      <div className="flex flex-col items-center gap-6 py-12 text-center">
        <span className="text-6xl">✨</span>
        <h2 className="text-2xl font-bold text-white">
          {script === 'cyrillic' ? 'Све си поновио!' : 'Sve si ponovio!'}
        </h2>
        <p className="text-gray-400">Nothing to review right now. Come back later!</p>
        <button
          onClick={() => navigate('/')}
          className="rounded-xl bg-amber-500 px-6 py-3 font-semibold text-navy-900"
        >
          {script === 'cyrillic' ? 'Назад' : 'Nazad'}
        </button>
      </div>
    );
  }

  if (finished) {
    const accuracy =
      totalAnswered > 0 ? Math.round((correctCount / totalAnswered) * 100) : 0;

    return (
      <div className="flex flex-col items-center gap-6 py-12 text-center">
        <span className="text-6xl">{accuracy >= 80 ? '🔥' : '💪'}</span>
        <h2 className="text-2xl font-bold text-white">
          {script === 'cyrillic' ? 'Понављање завршено!' : 'Ponavljanje završeno!'}
        </h2>
        <p className="text-gray-400">Review session complete</p>

        <div className="flex gap-8">
          <div className="text-center">
            <p className="text-3xl font-bold text-amber-500">{accuracy}%</p>
            <p className="text-xs text-gray-400">accuracy</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-white">{correctCount}</p>
            <p className="text-xs text-gray-400">correct</p>
          </div>
        </div>

        <button
          onClick={() => navigate('/')}
          className="rounded-xl bg-amber-500 px-6 py-3 font-semibold text-navy-900 mt-4"
        >
          {script === 'cyrillic' ? 'Назад' : 'Nazad'}
        </button>
      </div>
    );
  }

  const exercise = exercises[currentIndex];
  if (!exercise) return <p className="text-gray-400">Loading...</p>;

  return (
    <div className="flex flex-col gap-6 pb-4">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/')}
          className="text-gray-400 hover:text-white transition-colors"
        >
          ✕
        </button>
        <ProgressBar current={currentIndex} total={exercises.length} className="flex-1" />
        <span className="text-xs text-gray-500">
          {currentIndex + 1}/{exercises.length}
        </span>
      </div>

      <div className="rounded-xl bg-navy-800/30 border border-navy-700 px-3 py-1.5 text-xs text-amber-400 inline-block self-start">
        Review
      </div>

      {exercise.type === 'multiple-choice' && (
        <MultipleChoice key={currentIndex} exercise={exercise} onAnswer={handleAnswer} />
      )}
      {exercise.type === 'type-translation' && (
        <TypeTranslation key={currentIndex} exercise={exercise} onAnswer={handleAnswer} />
      )}
      {exercise.type === 'fill-in-blank' && (
        <FillInBlank key={currentIndex} exercise={exercise} onAnswer={handleAnswer} />
      )}
      {exercise.type === 'word-tiles' && (
        <WordTiles key={currentIndex} exercise={exercise} onAnswer={handleAnswer} />
      )}
      {exercise.type === 'script-convert' && (
        <ScriptConvert key={currentIndex} exercise={exercise} onAnswer={handleAnswer} />
      )}
      {exercise.type === 'context-pick' && (
        <ContextPick key={currentIndex} exercise={exercise} onAnswer={handleAnswer} />
      )}
      {exercise.type === 'sentence-builder' && (
        <SentenceBuilder key={currentIndex} exercise={exercise} onAnswer={handleAnswer} />
      )}
      {exercise.type === 'comprehension' && (
        <Comprehension key={currentIndex} exercise={exercise} onAnswer={handleAnswer} />
      )}
      {exercise.type === 'pattern-match' && (
        <PatternMatch key={currentIndex} exercise={exercise} onAnswer={handleAnswer} />
      )}
    </div>
  );
}
