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
import DrillFrame from '../components/ui/DrillFrame';
import Card from '../components/ui/Card';
import Btn from '../components/ui/Btn';
import { T, metaLabel } from '../lib/tokens';
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
};

export default function ReviewSession({ progress, setProgress, script }: ReviewSessionProps) {
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
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18, padding: '48px 0', textAlign: 'center' }}>
        <span style={{ fontSize: 48 }}>✨</span>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: T.text }}>
          {script === 'cyrillic' ? 'Све си поновио!' : 'All caught up'}
        </h2>
        <p style={{ color: T.dim, maxWidth: 280, fontSize: 13 }}>
          Nothing is due right now. Come back in a few hours.
        </p>
        <Btn kind="primary" size="lg" onClick={() => navigate('/')}>
          Back home
        </Btn>
      </div>
    );
  }

  if (finished) {
    const accuracy = totalAnswered > 0 ? Math.round((correctCount / totalAnswered) * 100) : 0;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0, paddingTop: 16 }}>
        <div style={{ ...metaLabel, color: T.amber }}>REVIEW · COMPLETE</div>
        <h1
          className="font-serif-sr"
          style={{
            fontSize: 40,
            fontWeight: 700,
            letterSpacing: -1.1,
            margin: '14px 0 0',
            lineHeight: 1,
            color: T.text,
          }}
        >
          Bravo.
        </h1>
        <p style={{ fontSize: 14, color: T.dim, marginTop: 14, lineHeight: 1.5 }}>
          {totalAnswered} reviews logged. Buckets shuffled.
        </p>

        <div style={{ marginTop: 22, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Card pad={16}>
            <div
              style={{
                fontFamily: T.mono,
                fontSize: 32,
                fontWeight: 600,
                letterSpacing: -1,
                color: accuracy >= 80 ? T.green : T.text,
              }}
            >
              {accuracy}%
            </div>
            <div style={{ ...metaLabel, marginTop: 4 }}>accuracy</div>
          </Card>
          <Card pad={16}>
            <div
              style={{
                fontFamily: T.mono,
                fontSize: 32,
                fontWeight: 600,
                letterSpacing: -1,
                color: T.text,
              }}
            >
              {correctCount}
            </div>
            <div style={{ ...metaLabel, marginTop: 4 }}>correct</div>
          </Card>
        </div>

        <Btn kind="primary" size="lg" full style={{ marginTop: 22 }} onClick={() => navigate('/')}>
          Back home
        </Btn>
      </div>
    );
  }

  const exercise = exercises[currentIndex];
  if (!exercise) return <p style={{ color: T.dim }}>Loading…</p>;

  return (
    <DrillFrame
      progress={currentIndex + 1}
      total={exercises.length}
      contextLabel={`REVIEW · ${EXERCISE_LABELS[exercise.type] ?? exercise.type}`}
      streak={progress.currentStreak}
      onClose={() => navigate('/')}
    >
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
    </DrillFrame>
  );
}
