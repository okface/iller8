import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { lessons } from '../data/lessons';
import { generateHammerSession } from '../engine/exercise-generator';
import { createPhraseProgress, recordAnswer } from '../engine/srs';
import {
  updatePhraseProgress,
  updateDailyStats,
  saveProgress,
} from '../store/progress';
import DrillFrame from '../components/ui/DrillFrame';
import Card from '../components/ui/Card';
import Btn from '../components/ui/Btn';
import MonoBadge from '../components/ui/MonoBadge';
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
import { IconBolt } from '../components/ui/Icons';
import type { Exercise, UserProgress } from '../store/types';

interface HammerProps {
  progress: UserProgress;
  setProgress: (p: UserProgress) => void;
  script: 'latin' | 'cyrillic';
}

type Phase = 'browse' | 'drill' | 'finished';

const SESSION_SIZES = [10, 15, 25, 50] as const;

export default function Hammer({ progress, setProgress, script }: HammerProps) {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>('browse');
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [totalAnswered, setTotalAnswered] = useState(0);
  const [sessionSize, setSessionSize] = useState<number>(15);
  const [sessionSkipTyping, setSessionSkipTyping] = useState<boolean | null>(null);

  useEffect(() => {
    if (phase !== 'drill') return;
    const skipTyping =
      sessionSkipTyping ?? progress.settings.skipTyping;
    const generated = generateHammerSession(
      lessons,
      progress.phrases,
      script,
      sessionSize,
      skipTyping
    );
    setExercises(generated);
  }, [phase, script, sessionSize, sessionSkipTyping]); // eslint-disable-line react-hooks/exhaustive-deps

  const startDrill = (size: number, overrideSkipTyping?: boolean) => {
    setSessionSize(size);
    if (overrideSkipTyping !== undefined) setSessionSkipTyping(overrideSkipTyping);
    else setSessionSkipTyping(null);
    setPhase('drill');
    setCurrentIndex(0);
    setCorrectCount(0);
    setTotalAnswered(0);
  };

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
        setPhase('finished');
      } else {
        setCurrentIndex((i) => i + 1);
      }
    },
    [exercises, currentIndex, progress, setProgress]
  );

  // ────────────── Browse view ──────────────
  if (phase === 'browse') {
    const totalPhrases = lessons.reduce(
      (sum, l) => sum + l.phraseGroups.reduce((s, g) => s + g.phrases.length, 0),
      0
    );
    const seenPhrases = Object.values(progress.phrases).filter(
      (p) => p.bucket >= 1
    ).length;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        <div style={{ ...metaLabel, color: T.amber }}>QUICK · RANDOM · NO COMMITMENT</div>
        <h1
          style={{
            fontSize: 32,
            fontWeight: 700,
            letterSpacing: -0.8,
            margin: '8px 0 4px',
            color: T.text,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <IconBolt size={28} /> Hammer
        </h1>
        <p
          style={{
            fontSize: 14,
            color: T.dim,
            lineHeight: 1.55,
            maxWidth: 440,
            marginBottom: 8,
          }}
        >
          Got five minutes? Hammer randomizes across the whole catalog — favouring stuff
          you haven't seen yet, with a sprinkle of older phrases to keep them fresh.
        </p>

        <Card pad={16} style={{ marginTop: 16 }}>
          <div style={{ ...metaLabel }}>SESSION SIZE</div>
          <div
            style={{
              marginTop: 10,
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 6,
            }}
          >
            {SESSION_SIZES.map((s) => {
              const active = sessionSize === s;
              return (
                <button
                  key={s}
                  onClick={() => setSessionSize(s)}
                  style={{
                    padding: '12px 0',
                    borderRadius: T.r2,
                    border: `1px solid ${active ? T.amber : T.border}`,
                    background: active ? T.amberDim : T.surface,
                    color: active ? T.amber : T.dim,
                    fontFamily: T.mono,
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: `all ${T.fast} ${T.ease}`,
                  }}
                >
                  {s}
                </button>
              );
            })}
          </div>
          <div
            style={{
              ...metaLabel,
              marginTop: 12,
              color: T.mute,
              textAlign: 'center',
            }}
          >
            ~{Math.max(1, Math.round(sessionSize / 3))} MIN
          </div>
        </Card>

        <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Btn
            kind="primary"
            size="lg"
            full
            onClick={() => startDrill(sessionSize, progress.settings.skipTyping)}
          >
            Start hammering
          </Btn>
          <Btn
            kind="secondary"
            size="md"
            full
            onClick={() => startDrill(sessionSize, !progress.settings.skipTyping)}
          >
            {progress.settings.skipTyping
              ? 'Start with typing on (just this session)'
              : 'Start in skip-typing mode (just this session)'}
          </Btn>
        </div>

        <Card pad={14} style={{ marginTop: 22 }}>
          <div style={{ ...metaLabel, marginBottom: 8 }}>CATALOG</div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: 12,
            }}
          >
            <div>
              <div style={{ fontFamily: T.mono, fontSize: 22, color: T.text, fontWeight: 500 }}>
                {seenPhrases}
              </div>
              <div style={{ fontSize: 11, color: T.dim }}>phrases seen</div>
            </div>
            <div>
              <div style={{ fontFamily: T.mono, fontSize: 22, color: T.text, fontWeight: 500 }}>
                {totalPhrases - seenPhrases}
              </div>
              <div style={{ fontSize: 11, color: T.dim }}>still untouched</div>
            </div>
          </div>
          <div style={{ marginTop: 12 }}>
            <MonoBadge>{lessons.length} lessons</MonoBadge>
          </div>
        </Card>

        <Card pad={14} style={{ marginTop: 12 }} onClick={() => navigate('/catalog')}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 500 }}>Browse catalog</div>
              <div style={{ fontSize: 11, color: T.dim, marginTop: 2 }}>
                See every phrase, drill any of them.
              </div>
            </div>
            <span style={{ color: T.dim, fontSize: 18 }}>›</span>
          </div>
        </Card>

        <Card pad={14} style={{ marginTop: 8 }} onClick={() => navigate('/families')}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 500 }}>Perspective drill</div>
              <div style={{ fontSize: 11, color: T.dim, marginTop: 2 }}>
                Same idea, many forms — formality, gender, tense, aspect.
              </div>
            </div>
            <span style={{ color: T.dim, fontSize: 18 }}>›</span>
          </div>
        </Card>
      </div>
    );
  }

  // ────────────── Drill view ──────────────
  if (phase === 'drill') {
    const exercise = exercises[currentIndex];
    if (!exercise) {
      return <p style={{ color: T.dim }}>Loading…</p>;
    }
    return (
      <DrillFrame
        progress={currentIndex + 1}
        total={exercises.length}
        contextLabel={`HAMMER · ${exercise.type.replace('-', ' ')}`}
        streak={progress.currentStreak}
        onClose={() => setPhase('browse')}
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
      </DrillFrame>
    );
  }

  // ────────────── Finished view ──────────────
  const accuracy = totalAnswered > 0 ? Math.round((correctCount / totalAnswered) * 100) : 0;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0, paddingTop: 16 }}>
      <div style={{ ...metaLabel, color: T.amber }}>HAMMER · COMPLETE</div>
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
      <p style={{ fontSize: 14, color: T.dim, marginTop: 14 }}>
        {totalAnswered} answered. Buckets updated.
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

      <div style={{ display: 'flex', gap: 8, marginTop: 22 }}>
        <Btn kind="secondary" size="lg" full onClick={() => navigate('/')}>
          Home
        </Btn>
        <Btn kind="primary" size="lg" full onClick={() => startDrill(sessionSize)}>
          Hammer again
        </Btn>
      </div>
    </div>
  );
}
