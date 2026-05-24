import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getLessonById } from '../data/lessons';
import { generateLessonExercises } from '../engine/exercise-generator';
import { createPhraseProgress, recordAnswer } from '../engine/srs';
import {
  updatePhraseProgress,
  markLessonComplete,
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
import MatchPairs from '../components/exercises/MatchPairs';
import type { Exercise, UserProgress } from '../store/types';

interface LessonViewProps {
  progress: UserProgress;
  setProgress: (p: UserProgress) => void;
  script: 'latin' | 'cyrillic';
}

export default function LessonView({
  progress,
  setProgress,
  script,
}: LessonViewProps) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const lesson = id ? getLessonById(id) : undefined;

  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [totalAnswered, setTotalAnswered] = useState(0);
  const [showMatchPairs, setShowMatchPairs] = useState(false);
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    if (!lesson) return;
    const generated = generateLessonExercises(lesson, progress.phrases, script, 15);
    setExercises(generated);
  }, [lesson, script]); // eslint-disable-line react-hooks/exhaustive-deps

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

      const hour = new Date().getHours();
      if (hour >= 23 || hour < 5) newProgress = addAchievement(newProgress, 'night-owl');
      if (hour >= 5 && hour < 7) newProgress = addAchievement(newProgress, 'early-bird');

      setProgress(newProgress);
      saveProgress(newProgress);

      setTimeout(() => {
        if (currentIndex + 1 >= exercises.length) {
          finishLesson(newProgress, correct);
        } else {
          setCurrentIndex((i) => i + 1);
        }
      }, 300);
    },
    [exercises, currentIndex, progress, setProgress] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const finishLesson = (currentProgress: UserProgress, lastCorrect: boolean) => {
    if (!lesson) return;
    let newProgress = markLessonComplete(currentProgress, lesson.id);

    if (!newProgress.achievements.includes('first-lesson')) {
      newProgress = addAchievement(newProgress, 'first-lesson');
    }

    const finalCorrect = correctCount + (lastCorrect ? 1 : 0);
    const finalTotal = totalAnswered + 1;
    if (finalTotal > 0 && finalCorrect === finalTotal) {
      newProgress = addAchievement(newProgress, 'perfect-lesson');
    }

    const learnedCount = Object.values(newProgress.phrases).filter(
      (p) => p.bucket >= 1
    ).length;
    if (learnedCount >= 100) {
      newProgress = addAchievement(newProgress, 'polyglot');
    }

    if (newProgress.currentStreak >= 3) newProgress = addAchievement(newProgress, 'streak-3');
    if (newProgress.currentStreak >= 7) newProgress = addAchievement(newProgress, 'streak-7');
    if (newProgress.currentStreak >= 14) newProgress = addAchievement(newProgress, 'streak-14');
    if (newProgress.currentStreak >= 30) newProgress = addAchievement(newProgress, 'streak-30');

    setProgress(newProgress);
    saveProgress(newProgress);
    setFinished(true);
  };

  const handleMatchPairsComplete = (correctPairs: number, totalPairs: number) => {
    for (let i = 0; i < totalPairs; i++) {
      const correct = i < correctPairs;
      let newProgress = updateDailyStats(progress, correct);
      setProgress(newProgress);
      saveProgress(newProgress);
    }
    setShowMatchPairs(false);
    setCorrectCount((c) => c + correctPairs);
    setTotalAnswered((t) => t + totalPairs);
  };

  if (!lesson) {
    return (
      <div className="flex flex-col items-center gap-4 py-12">
        <p className="text-gray-400">Lesson not found</p>
        <button
          onClick={() => navigate('/')}
          className="rounded-xl bg-amber-500 px-6 py-3 font-semibold text-navy-900"
        >
          Back to lessons
        </button>
      </div>
    );
  }

  if (finished) {
    const accuracy =
      totalAnswered > 0 ? Math.round((correctCount / totalAnswered) * 100) : 0;

    return (
      <div className="flex flex-col items-center gap-6 py-12 text-center">
        <span className="text-6xl">{accuracy === 100 ? '🏆' : accuracy >= 70 ? '🎉' : '💪'}</span>
        <h2 className="text-2xl font-bold text-white">
          {script === 'cyrillic' ? 'Лекција завршена!' : 'Lekcija završena!'}
        </h2>
        <p className="text-gray-400">Lesson complete</p>

        <div className="flex gap-8">
          <div className="text-center">
            <p className="text-3xl font-bold text-amber-500">{accuracy}%</p>
            <p className="text-xs text-gray-400">accuracy</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-white">{correctCount}</p>
            <p className="text-xs text-gray-400">correct</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-white">{totalAnswered}</p>
            <p className="text-xs text-gray-400">total</p>
          </div>
        </div>

        <div className="flex gap-3 mt-4">
          <button
            onClick={() => navigate('/')}
            className="rounded-xl border border-navy-600 px-6 py-3 font-semibold text-white"
          >
            {script === 'cyrillic' ? 'Назад' : 'Nazad'}
          </button>
          <button
            onClick={() => {
              setFinished(false);
              setCurrentIndex(0);
              setCorrectCount(0);
              setTotalAnswered(0);
              const newExercises = generateLessonExercises(
                lesson,
                progress.phrases,
                script,
                15
              );
              setExercises(newExercises);
            }}
            className="rounded-xl bg-amber-500 px-6 py-3 font-semibold text-navy-900"
          >
            {script === 'cyrillic' ? 'Поново' : 'Ponovo'}
          </button>
        </div>
      </div>
    );
  }

  if (showMatchPairs) {
    return (
      <div className="py-4">
        <MatchPairs
          lesson={lesson}
          script={script}
          onComplete={handleMatchPairsComplete}
        />
      </div>
    );
  }

  const exercise = exercises[currentIndex];
  if (!exercise) {
    return <p className="text-gray-400">Loading exercises...</p>;
  }

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

      {exercise.phrase.notes && (
        <div className="rounded-xl bg-navy-800/50 border border-navy-700 px-4 py-2">
          <p className="text-xs text-amber-400">{exercise.phrase.notes}</p>
        </div>
      )}

      {exercise.type === 'multiple-choice' && (
        <MultipleChoice exercise={exercise} onAnswer={handleAnswer} />
      )}
      {exercise.type === 'type-translation' && (
        <TypeTranslation exercise={exercise} onAnswer={handleAnswer} />
      )}
      {exercise.type === 'fill-in-blank' && (
        <FillInBlank exercise={exercise} onAnswer={handleAnswer} />
      )}
      {exercise.type === 'word-tiles' && (
        <WordTiles exercise={exercise} onAnswer={handleAnswer} />
      )}
      {exercise.type === 'script-convert' && (
        <ScriptConvert exercise={exercise} onAnswer={handleAnswer} />
      )}
      {exercise.type === 'context-pick' && (
        <ContextPick exercise={exercise} onAnswer={handleAnswer} />
      )}

      {currentIndex === 4 && !showMatchPairs && exercises.length > 5 && (
        <button
          onClick={() => setShowMatchPairs(true)}
          className="rounded-xl border border-navy-600 px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
        >
          Try matching pairs instead
        </button>
      )}
    </div>
  );
}
