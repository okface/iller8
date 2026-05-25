import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getLessonById } from '../data/lessons';
import { generateLessonExercises, generateExercise } from '../engine/exercise-generator';
import { createPhraseProgress, recordAnswer } from '../engine/srs';
import {
  updatePhraseProgress,
  markLessonComplete,
  updateDailyStats,
  saveProgress,
  addAchievement,
} from '../store/progress';
import ProgressBar from '../components/ProgressBar';
import PhraseIntro from '../components/exercises/PhraseIntro';
import MultipleChoice from '../components/exercises/MultipleChoice';
import TypeTranslation from '../components/exercises/TypeTranslation';
import FillInBlank from '../components/exercises/FillInBlank';
import WordTiles from '../components/exercises/WordTiles';
import ScriptConvert from '../components/exercises/ScriptConvert';
import ContextPick from '../components/exercises/ContextPick';
import SentenceBuilder from '../components/exercises/SentenceBuilder';
import Comprehension from '../components/exercises/Comprehension';
import PatternMatch from '../components/exercises/PatternMatch';
import MatchPairs from '../components/exercises/MatchPairs';
import type { Exercise, Phrase, UserProgress } from '../store/types';

type LessonPhase = 'intro' | 'exercises' | 'finished';

interface LessonViewProps {
  progress: UserProgress;
  setProgress: (p: UserProgress) => void;
  script: 'latin' | 'cyrillic';
}

const INTRO_BATCH_SIZE = 5;

export default function LessonView({
  progress,
  setProgress,
  script,
}: LessonViewProps) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const lesson = id ? getLessonById(id) : undefined;

  const allLessonPhrases = useMemo(() => {
    if (!lesson) return [];
    return lesson.phraseGroups.flatMap((g) => g.phrases);
  }, [lesson]);

  const newPhrases = useMemo(() => {
    return allLessonPhrases.filter(
      (p) => !progress.phrases[p.id] || progress.phrases[p.id].bucket === 0
    );
  }, [allLessonPhrases, progress.phrases]);

  const introNeeded = newPhrases.length > 0;
  const introPhrases = useMemo(
    () => newPhrases.slice(0, INTRO_BATCH_SIZE),
    [newPhrases]
  );

  const [phase, setPhase] = useState<LessonPhase>(introNeeded ? 'intro' : 'exercises');
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [totalAnswered, setTotalAnswered] = useState(0);
  const [showMatchPairs, setShowMatchPairs] = useState(false);

  useEffect(() => {
    if (!lesson || phase !== 'exercises') return;
    const generated = generateLessonExercises(lesson, progress.phrases, script, 15);
    setExercises(generated);
  }, [lesson, script, phase]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleIntroComplete = useCallback(() => {
    if (!lesson) return;
    introPhrases.forEach((phrase) => {
      const existing = progress.phrases[phrase.id] ?? createPhraseProgress(phrase.id);
      if (existing.bucket === 0) {
        const newProgress = updatePhraseProgress(progress, { ...existing, bucket: 0, lastReviewed: Date.now() });
        setProgress(newProgress);
        saveProgress(newProgress);
      }
    });
    setPhase('exercises');
  }, [lesson, introPhrases, progress, setProgress]);

  const retryCountRef = React.useRef<Record<string, number>>({});

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

      if (!correct && lesson) {
        const retries = retryCountRef.current[phraseId] ?? 0;
        if (retries < 2) {
          retryCountRef.current[phraseId] = retries + 1;
          const allPhrases = lesson.phraseGroups.flatMap(g => g.phrases);
          const retryExercise = generateExercise(
            exercise.phrase,
            allPhrases,
            script,
            0,
            'multiple-choice'
          );
          const insertAt = Math.min(currentIndex + 4, exercises.length);
          setExercises(prev => {
            const updated = [...prev];
            updated.splice(insertAt, 0, retryExercise);
            return updated;
          });
        }
      }

      setProgress(newProgress);
      saveProgress(newProgress);

      if (currentIndex + 1 >= exercises.length) {
        finishLesson(newProgress, correct);
      } else {
        setCurrentIndex((i) => i + 1);
      }
    },
    [exercises, currentIndex, progress, setProgress, lesson, script] // eslint-disable-line react-hooks/exhaustive-deps
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
    setPhase('finished');
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

  if (phase === 'intro') {
    const title = script === 'cyrillic' ? lesson.title.sr_cyrillic : lesson.title.sr_latin;
    return (
      <div className="flex flex-col gap-6 pb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="text-gray-400 hover:text-white transition-colors"
          >
            ✕
          </button>
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-white">{title}</h2>
            <p className="text-xs text-gray-500">{lesson.description.en}</p>
          </div>
        </div>

        <PhraseIntro
          phrases={introPhrases}
          script={script}
          onComplete={handleIntroComplete}
        />
      </div>
    );
  }

  if (phase === 'finished') {
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

        <div className="mt-4 w-full max-w-xs">
          <PhraseReviewSummary
            phrases={allLessonPhrases}
            progress={progress}
            script={script}
          />
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
              setPhase(introNeeded ? 'intro' : 'exercises');
              setCurrentIndex(0);
              setCorrectCount(0);
              setTotalAnswered(0);
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

function PhraseReviewSummary({
  phrases,
  progress,
  script,
}: {
  phrases: Phrase[];
  progress: UserProgress;
  script: 'latin' | 'cyrillic';
}) {
  const studied = phrases.filter((p) => progress.phrases[p.id]);
  if (studied.length === 0) return null;

  return (
    <div className="rounded-xl border border-navy-700 bg-navy-800/30 p-3 text-left">
      <p className="text-xs text-gray-400 mb-2">Phrases studied:</p>
      <div className="flex flex-col gap-1">
        {studied.slice(0, 8).map((p) => {
          const prog = progress.phrases[p.id];
          const mastery = prog ? Math.min(100, prog.bucket * 20) : 0;
          return (
            <div key={p.id} className="flex items-center gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-xs text-white truncate">
                  {script === 'cyrillic' ? p.sr_cyrillic : p.sr_latin}
                </p>
              </div>
              <div className="w-12 h-1.5 rounded-full bg-navy-700 overflow-hidden">
                <div
                  className="h-full rounded-full bg-amber-500"
                  style={{ width: `${mastery}%` }}
                />
              </div>
            </div>
          );
        })}
        {studied.length > 8 && (
          <p className="text-[10px] text-gray-600">+{studied.length - 8} more</p>
        )}
      </div>
    </div>
  );
}
