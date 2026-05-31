import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { generateFamilyDrillSession } from '../engine/family-generator';
import { families, getFamiliesForLesson, familyAllVariants } from '../data/phrase-families';
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
import SectionHead from '../components/ui/SectionHead';
import PerspectiveShift from '../components/exercises/PerspectiveShift';
import { T, metaLabel } from '../lib/tokens';
import type { Exercise, UserProgress } from '../store/types';

interface FamilyDrillProps {
  progress: UserProgress;
  setProgress: (p: UserProgress) => void;
  script: 'latin' | 'cyrillic';
}

type Phase = 'browse' | 'drill' | 'finished';

export default function FamilyDrill({ progress, setProgress, script }: FamilyDrillProps) {
  const navigate = useNavigate();
  const { lessonId } = useParams<{ lessonId?: string }>();

  const pool = useMemo(
    () => (lessonId ? getFamiliesForLesson(lessonId) : families),
    [lessonId]
  );

  const [phase, setPhase] = useState<Phase>('browse');
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [totalAnswered, setTotalAnswered] = useState(0);

  useEffect(() => {
    if (phase !== 'drill') return;
    const generated = generateFamilyDrillSession(progress.phrases, script, 10, lessonId);
    setExercises(generated);
    // `script` intentionally excluded — prevents mid-session reshuffle/skip.
  }, [phase, lessonId]); // eslint-disable-line react-hooks/exhaustive-deps

  const startDrill = () => {
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
      newProgress = updateDailyStats(newProgress, correct, phraseId);

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
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        <div style={{ ...metaLabel, color: T.purple }}>PERSPECTIVE DRILL</div>
        <h1
          style={{
            fontSize: 28,
            fontWeight: 700,
            letterSpacing: -0.6,
            margin: '8px 0 4px',
            color: T.text,
          }}
        >
          Phrase Families
        </h1>
        <p style={{ fontSize: 13, color: T.dim, lineHeight: 1.55, maxWidth: 420 }}>
          One idea, many forms. Drill the way Serbian bends a phrase across formality,
          gender, tense and aspect — the place where the language clicks.
        </p>

        {pool.length === 0 ? (
          <Card pad={14} style={{ marginTop: 16 }}>
            <p style={{ color: T.dim, fontSize: 13 }}>
              No families for this lesson yet.
            </p>
          </Card>
        ) : (
          <>
            <Card warm pad={16} style={{ marginTop: 18 }}>
              <div style={{ ...metaLabel, color: T.amber }}>READY TO DRILL</div>
              <div
                style={{
                  fontSize: 16,
                  fontWeight: 600,
                  marginTop: 6,
                  letterSpacing: -0.2,
                }}
              >
                {pool.length} {pool.length === 1 ? 'family' : 'families'} ·{' '}
                {pool.reduce((sum, f) => sum + f.variants.length, 0)} variants
              </div>
              <div style={{ fontSize: 11, color: T.dim, marginTop: 3 }}>
                10-question session · mixes recognize + type-it
              </div>
              <div style={{ marginTop: 12 }}>
                <Btn kind="primary" size="lg" full onClick={startDrill}>
                  Start drill
                </Btn>
              </div>
            </Card>

            <div style={{ marginTop: 22 }}>
              <SectionHead suffix={String(pool.length)}>FAMILIES</SectionHead>
              {pool.map((family, i) => {
                const masteredVariants = family.variants.filter((v) => {
                  const key = `family:${family.id}:${v.id}`;
                  return (progress.phrases[key]?.bucket ?? 0) >= 4;
                }).length;
                const seenVariants = family.variants.filter((v) => {
                  const key = `family:${family.id}:${v.id}`;
                  return (progress.phrases[key]?.bucket ?? 0) >= 1;
                }).length;
                return (
                  <div
                    key={family.id}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr auto',
                      gap: 12,
                      padding: '14px 0',
                      borderTop: i === 0 ? `0.5px solid ${T.border}` : `0.5px solid ${T.border}`,
                      borderBottom:
                        i === pool.length - 1 ? `0.5px solid ${T.border}` : undefined,
                      alignItems: 'center',
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 15,
                          fontWeight: 500,
                          letterSpacing: -0.2,
                          color: T.text,
                        }}
                      >
                        {family.theme}
                      </div>
                      <div
                        className="font-serif-sr"
                        style={{
                          fontSize: 13,
                          color: T.dim,
                          marginTop: 2,
                          fontStyle: 'italic',
                        }}
                      >
                        {script === 'cyrillic'
                          ? family.base.sr_cyrillic
                          : family.base.sr_latin}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {masteredVariants > 0 ? (
                        <MonoBadge kind="green">
                          {masteredVariants}/{family.variants.length}
                        </MonoBadge>
                      ) : seenVariants > 0 ? (
                        <MonoBadge kind="amber">
                          {seenVariants}/{family.variants.length}
                        </MonoBadge>
                      ) : (
                        <MonoBadge>
                          {family.variants.length} forms
                        </MonoBadge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Preview the first family's variants — gives the user a taste */}
            {pool[0] && (
              <div style={{ marginTop: 28 }}>
                <SectionHead>SAMPLE · {pool[0].theme.toUpperCase()}</SectionHead>
                <Card pad={0}>
                  {familyAllVariants(pool[0]).slice(0, 5).map((v, i) => (
                    <div
                      key={v.id}
                      style={{
                        padding: '12px 14px',
                        borderTop: i === 0 ? 'none' : `0.5px solid ${T.border}`,
                        display: 'grid',
                        gridTemplateColumns: '1fr auto',
                        gap: 10,
                        alignItems: 'center',
                      }}
                    >
                      <div style={{ minWidth: 0 }}>
                        <div
                          className="font-serif-sr"
                          style={{ fontSize: 15, fontWeight: 500, color: T.text }}
                        >
                          {script === 'cyrillic' ? v.sr_cyrillic : v.sr_latin}
                        </div>
                        <div style={{ fontSize: 11, color: T.dim, marginTop: 2 }}>
                          {v.en}
                        </div>
                      </div>
                      <MonoBadge>{v.label}</MonoBadge>
                    </div>
                  ))}
                </Card>
              </div>
            )}
          </>
        )}
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
        contextLabel={`FAMILIES · perspective shift`}
        streak={progress.currentStreak}
        onClose={() => setPhase('browse')}
      >
        <PerspectiveShift
          key={currentIndex}
          exercise={exercise}
          onAnswer={handleAnswer}
          script={script}
        />
      </DrillFrame>
    );
  }

  // ────────────── Finished view ──────────────
  const accuracy = totalAnswered > 0 ? Math.round((correctCount / totalAnswered) * 100) : 0;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0, paddingTop: 16 }}>
      <div style={{ ...metaLabel, color: T.purple }}>FAMILY DRILL · COMPLETE</div>
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
        Odlično.
      </h1>
      <p style={{ fontSize: 14, color: T.dim, marginTop: 14, lineHeight: 1.5 }}>
        {totalAnswered} variants logged. Buckets shuffled.
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
        <Btn kind="primary" size="lg" full onClick={startDrill}>
          Another round
        </Btn>
      </div>
    </div>
  );
}
