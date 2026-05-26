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
import DrillFrame from '../components/ui/DrillFrame';
import Card from '../components/ui/Card';
import MonoBadge from '../components/ui/MonoBadge';
import Btn from '../components/ui/Btn';
import { T, metaLabel } from '../lib/tokens';
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

const EXERCISE_LABELS: Record<string, string> = {
  'multiple-choice': 'multiple choice',
  'type-translation': 'type it',
  'fill-in-blank': 'fill in',
  'word-tiles': 'build it',
  'script-convert': 'script swap',
  'context-pick': 'context',
  'sentence-builder': 'build sentence',
  'comprehension': 'comprehension',
  'pattern-match': 'pattern',
  'match-pairs': 'match pairs',
};

export default function LessonView({ progress, setProgress, script }: LessonViewProps) {
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
    const generated = generateLessonExercises(
      lesson,
      progress.phrases,
      script,
      15,
      progress.settings.skipTyping,
      progress
    );
    setExercises(generated);
  }, [lesson, script, phase]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleIntroComplete = useCallback(() => {
    if (!lesson) return;
    introPhrases.forEach((phrase) => {
      const existing = progress.phrases[phrase.id] ?? createPhraseProgress(phrase.id);
      if (existing.bucket === 0) {
        const newProgress = updatePhraseProgress(progress, {
          ...existing,
          bucket: 0,
          lastReviewed: Date.now(),
        });
        setProgress(newProgress);
        saveProgress(newProgress);
      }
    });
    setPhase('exercises');
  }, [lesson, introPhrases, progress, setProgress]);

  const retryCountRef = React.useRef<Record<string, number>>({});

  // Declared before handleAnswer so the closure references a real function,
  // not a TDZ-dangerous forward reference. (Bug A in the code-health audit.)
  const finishLesson = useCallback(
    (currentProgress: UserProgress, lastCorrect: boolean) => {
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
      if (learnedCount >= 100) newProgress = addAchievement(newProgress, 'polyglot');

      if (newProgress.currentStreak >= 3) newProgress = addAchievement(newProgress, 'streak-3');
      if (newProgress.currentStreak >= 7) newProgress = addAchievement(newProgress, 'streak-7');
      if (newProgress.currentStreak >= 14) newProgress = addAchievement(newProgress, 'streak-14');
      if (newProgress.currentStreak >= 30) newProgress = addAchievement(newProgress, 'streak-30');

      setProgress(newProgress);
      saveProgress(newProgress);
      setPhase('finished');
    },
    [lesson, correctCount, totalAnswered, setProgress]
  );

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
          const allPhrases = lesson.phraseGroups.flatMap((g) => g.phrases);
          const retryExercise = generateExercise(
            exercise.phrase,
            allPhrases,
            script,
            0,
            'multiple-choice'
          );
          const insertAt = Math.min(currentIndex + 4, exercises.length);
          setExercises((prev) => {
            const next = [...prev];
            next.splice(insertAt, 0, retryExercise);
            return next;
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
    [exercises, currentIndex, progress, setProgress, lesson, script, finishLesson]
  );

  const handleMatchPairsComplete = (correctPairs: number, totalPairs: number) => {
    // Bug B fix: previously the loop called setProgress N times with the same
    // stale closure `progress`, so only the last call won and `phrasesStudied`
    // was incremented by 1 instead of `totalPairs`. Thread the running value
    // through the loop and commit once at the end.
    let next = progress;
    for (let i = 0; i < totalPairs; i++) {
      const correct = i < correctPairs;
      next = updateDailyStats(next, correct);
    }
    setProgress(next);
    saveProgress(next);
    setShowMatchPairs(false);
    setCorrectCount((c) => c + correctPairs);
    setTotalAnswered((t) => t + totalPairs);
  };

  if (!lesson) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '48px 0' }}>
        <p style={{ color: T.dim }}>Lesson not found</p>
        <Btn kind="primary" onClick={() => navigate('/')}>Back to lessons</Btn>
      </div>
    );
  }

  const lessonLabel = `${String(lesson.order).padStart(2, '0')} · ${
    script === 'cyrillic' ? lesson.title.sr_cyrillic : lesson.title.sr_latin
  }`;

  if (phase === 'intro') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <DrillFrame
          progress={0}
          total={introPhrases.length}
          contextLabel={`${lessonLabel} · intro`}
          streak={progress.currentStreak}
          onClose={() => navigate('/')}
        >
          <PhraseIntro
            phrases={introPhrases}
            script={script}
            onComplete={handleIntroComplete}
            progress={progress}
          />
        </DrillFrame>
      </div>
    );
  }

  if (phase === 'finished') {
    const accuracy =
      totalAnswered > 0 ? Math.round((correctCount / totalAnswered) * 100) : 0;
    const lessonTitle = script === 'cyrillic' ? lesson.title.sr_cyrillic : lesson.title.sr_latin;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0, paddingTop: 16 }}>
        <div style={{ ...metaLabel, color: T.amber }}>
          LESSON {String(lesson.order).padStart(2, '0')} · COMPLETE
        </div>
        <h1
          className="font-serif-sr"
          style={{
            fontSize: 44,
            fontWeight: 700,
            letterSpacing: -1.2,
            margin: '14px 0 0',
            lineHeight: 1,
            color: T.text,
          }}
        >
          Bravo,{' '}
          <em
            style={{
              fontStyle: 'italic',
              color: T.amber,
              fontWeight: 500,
            }}
          >
            dušo.
          </em>
        </h1>
        <p style={{ fontSize: 14, color: T.dim, lineHeight: 1.5, marginTop: 14, maxWidth: 320 }}>
          You finished {lessonTitle} — {totalAnswered} answers logged. Mira will check in tomorrow.
        </p>

        {/* Stat grid */}
        <div style={{ marginTop: 22, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {[
            { v: String(correctCount), l: 'correct', c: T.text },
            { v: `${accuracy}%`, l: 'accuracy', c: accuracy >= 80 ? T.green : T.text },
            { v: String(totalAnswered), l: 'answered', c: T.text },
            { v: `+${Math.max(0, progress.currentStreak - (progress.longestStreak - 1))}`, l: 'streak', c: T.amber },
          ].map((stat) => (
            <Card key={stat.l} pad={16}>
              <div
                style={{
                  fontFamily: T.mono,
                  fontSize: 32,
                  fontWeight: 600,
                  letterSpacing: -1,
                  color: stat.c,
                }}
              >
                {stat.v}
              </div>
              <div style={{ ...metaLabel, marginTop: 4 }}>{stat.l}</div>
            </Card>
          ))}
        </div>

        <div style={{ marginTop: 22 }}>
          <PhraseReviewSummary phrases={allLessonPhrases} progress={progress} script={script} />
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
          <Btn
            kind="secondary"
            size="lg"
            full
            onClick={() => navigate('/')}
          >
            Back home
          </Btn>
          <Btn
            kind="primary"
            size="lg"
            full
            onClick={() => {
              setPhase(introNeeded ? 'intro' : 'exercises');
              setCurrentIndex(0);
              setCorrectCount(0);
              setTotalAnswered(0);
            }}
          >
            Try again
          </Btn>
        </div>
      </div>
    );
  }

  if (showMatchPairs) {
    return (
      <DrillFrame
        progress={currentIndex}
        total={exercises.length}
        contextLabel={`${lessonLabel} · match pairs`}
        streak={progress.currentStreak}
        onClose={() => navigate('/')}
      >
        <MatchPairs lesson={lesson} script={script} onComplete={handleMatchPairsComplete} />
      </DrillFrame>
    );
  }

  const exercise = exercises[currentIndex];
  if (!exercise) {
    return <p style={{ color: T.dim }}>Loading exercises…</p>;
  }

  const contextLabel = `${lessonLabel} · ${EXERCISE_LABELS[exercise.type] ?? exercise.type}`;

  return (
    <DrillFrame
      progress={currentIndex + 1}
      total={exercises.length}
      contextLabel={contextLabel}
      streak={progress.currentStreak}
      onClose={() => navigate('/')}
    >
      {exercise.type === 'multiple-choice' && (
        <MultipleChoice key={currentIndex} exercise={exercise} onAnswer={handleAnswer} script={script} />
      )}
      {exercise.type === 'type-translation' && (
        <TypeTranslation key={currentIndex} exercise={exercise} onAnswer={handleAnswer} script={script} />
      )}
      {exercise.type === 'fill-in-blank' && (
        <FillInBlank key={currentIndex} exercise={exercise} onAnswer={handleAnswer} script={script} />
      )}
      {exercise.type === 'word-tiles' && (
        <WordTiles key={currentIndex} exercise={exercise} onAnswer={handleAnswer} script={script} />
      )}
      {exercise.type === 'script-convert' && (
        <ScriptConvert key={currentIndex} exercise={exercise} onAnswer={handleAnswer} script={script} />
      )}
      {exercise.type === 'context-pick' && (
        <ContextPick key={currentIndex} exercise={exercise} onAnswer={handleAnswer} script={script} />
      )}
      {exercise.type === 'sentence-builder' && (
        <SentenceBuilder key={currentIndex} exercise={exercise} onAnswer={handleAnswer} script={script} />
      )}
      {exercise.type === 'comprehension' && (
        <Comprehension key={currentIndex} exercise={exercise} onAnswer={handleAnswer} script={script} />
      )}
      {exercise.type === 'pattern-match' && (
        <PatternMatch key={currentIndex} exercise={exercise} onAnswer={handleAnswer} script={script} />
      )}

      {currentIndex === 4 && !showMatchPairs && exercises.length > 5 && (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 16 }}>
          <Btn kind="quiet" size="sm" onClick={() => setShowMatchPairs(true)}>
            Try matching pairs instead
          </Btn>
        </div>
      )}
    </DrillFrame>
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

  const best = studied
    .slice()
    .sort((a, b) => (progress.phrases[b.id].bucket - progress.phrases[a.id].bucket))[0];
  const hardest = studied
    .slice()
    .sort((a, b) => {
      const aP = progress.phrases[a.id];
      const bP = progress.phrases[b.id];
      const aRatio = aP.incorrectCount / Math.max(1, aP.correctCount + aP.incorrectCount);
      const bRatio = bP.incorrectCount / Math.max(1, bP.correctCount + bP.incorrectCount);
      return bRatio - aRatio;
    })[0];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
      <Card pad={14}>
        <div style={{ ...metaLabel, color: T.green }}>NAILED</div>
        <div
          className="font-serif-sr"
          style={{ fontSize: 14, fontWeight: 500, marginTop: 6, lineHeight: 1.3 }}
        >
          {script === 'cyrillic' ? best.sr_cyrillic : best.sr_latin}
        </div>
      </Card>
      <Card pad={14}>
        <div style={{ ...metaLabel, color: T.red }}>STUMBLED</div>
        <div
          className="font-serif-sr"
          style={{ fontSize: 14, fontWeight: 500, marginTop: 6, lineHeight: 1.3 }}
        >
          {script === 'cyrillic' ? hardest.sr_cyrillic : hardest.sr_latin}
        </div>
        <div style={{ fontSize: 11, color: T.dim, marginTop: 4 }}>
          <MonoBadge>retry queued</MonoBadge>
        </div>
      </Card>
    </div>
  );
}
