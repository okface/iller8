import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { words } from '../data/words';
import { generateWordSession } from '../engine/word-generator';
import { getWordBucket, wordSrsKey } from '../lib/word-progress';
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
import WordRecognize from '../components/exercises/WordRecognize';
import WordProduce from '../components/exercises/WordProduce';
import { T, metaLabel } from '../lib/tokens';
import { IconBolt, IconBook, IconBrain } from '../components/ui/Icons';
import type { Exercise, UserProgress } from '../store/types';

interface WordDrillProps {
  progress: UserProgress;
  setProgress: (p: UserProgress) => void;
  script: 'latin' | 'cyrillic';
}

type Phase = 'browse' | 'drill' | 'finished';

const POS_LABELS: Record<string, string> = {
  verb: 'verbs',
  noun: 'nouns',
  adj: 'adjectives',
  pron: 'pronouns',
  prep: 'prepositions',
  conj: 'conjunctions',
  adv: 'adverbs',
  particle: 'particles',
  num: 'numbers',
  interj: 'interjections',
};

export default function WordDrill({ progress, setProgress, script }: WordDrillProps) {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>('browse');
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [totalAnswered, setTotalAnswered] = useState(0);
  const [posFilter, setPosFilter] = useState<string | null>(null);

  const posBreakdown = useMemo(() => {
    const counts: Record<string, { total: number; seen: number; mastered: number }> = {};
    for (const w of words) {
      const key = w.pos;
      if (!counts[key]) counts[key] = { total: 0, seen: 0, mastered: 0 };
      counts[key].total++;
      const bucket = getWordBucket(progress, w.id);
      if (bucket >= 1) counts[key].seen++;
      if (bucket >= 4) counts[key].mastered++;
    }
    return counts;
  }, [progress]);

  const filteredWords = useMemo(
    () => (posFilter ? words.filter((w) => w.pos === posFilter) : words),
    [posFilter]
  );

  useEffect(() => {
    if (phase !== 'drill') return;
    const session = generateWordSession(
      filteredWords,
      words,
      (id) => getWordBucket(progress, id),
      script,
      12
    );
    setExercises(session);
    // `script` intentionally excluded: toggling script mid-session must
    // not regenerate (and thereby reshuffle / skip) the current item.
    // The live script prop still updates DualScript prompt displays.
  }, [phase, posFilter]); // eslint-disable-line react-hooks/exhaustive-deps

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
    const totalSeen = words.filter((w) => getWordBucket(progress, w.id) >= 1).length;
    const totalMastered = words.filter((w) => getWordBucket(progress, w.id) >= 5).length;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        <div style={{ ...metaLabel, color: T.purple }}>VOCABULARY · ONE WORD AT A TIME</div>
        <h1
          style={{
            fontSize: 28,
            fontWeight: 700,
            letterSpacing: -0.6,
            margin: '8px 0 4px',
            color: T.text,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <IconBook size={24} /> Words
        </h1>
        <p style={{ fontSize: 13, color: T.dim, lineHeight: 1.55, maxWidth: 440 }}>
          Drill single words both directions. Distractors are minimal pairs — same
          part of speech, similar shape — so you have to actually know each word.
        </p>

        {/* Headline stats */}
        <div
          style={{
            marginTop: 16,
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 1,
            background: T.border,
            borderRadius: T.r2,
            overflow: 'hidden',
            border: `1px solid ${T.border}`,
          }}
        >
          {[
            { k: 'TOTAL', v: words.length, c: T.text },
            { k: 'MET', v: totalSeen, c: T.amber },
            { k: 'MASTERED', v: totalMastered, c: T.green },
          ].map(({ k, v, c }) => (
            <div key={k} style={{ background: T.bg, padding: '12px 14px' }}>
              <div style={metaLabel}>{k}</div>
              <div
                style={{
                  fontFamily: T.mono,
                  fontSize: 20,
                  fontWeight: 500,
                  marginTop: 2,
                  letterSpacing: -0.5,
                  color: c,
                }}
              >
                {v}
              </div>
            </div>
          ))}
        </div>

        {/* POS filter */}
        <div style={{ marginTop: 22 }}>
          <SectionHead>FILTER · OR DRILL ALL</SectionHead>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 6,
            }}
          >
            {[
              { id: null, label: 'all' },
              ...Object.keys(posBreakdown).map((k) => ({ id: k, label: POS_LABELS[k] ?? k })),
            ].map((opt) => {
              const active = posFilter === opt.id;
              const counts = opt.id ? posBreakdown[opt.id] : null;
              return (
                <button
                  key={opt.id ?? 'all'}
                  onClick={() => setPosFilter(opt.id)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: T.rPill,
                    border: `1px solid ${active ? T.amber : T.border}`,
                    background: active ? T.amberDim : T.surface,
                    color: active ? T.amber : T.dim,
                    fontFamily: T.mono,
                    fontSize: 12,
                    fontWeight: 500,
                    cursor: 'pointer',
                    transition: `all ${T.fast} ${T.ease}`,
                  }}
                >
                  {opt.label}
                  {counts && (
                    <span style={{ marginLeft: 6, color: T.mute }}>
                      {counts.seen}/{counts.total}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ marginTop: 18 }}>
          <Btn kind="primary" size="lg" full onClick={startDrill}>
            <IconBolt size={16} /> Drill 12 {posFilter ? POS_LABELS[posFilter] ?? posFilter : 'words'}
          </Btn>
        </div>

        {/* Per-POS breakdown */}
        <div style={{ marginTop: 28 }}>
          <SectionHead>BY PART OF SPEECH</SectionHead>
          {Object.entries(posBreakdown)
            .sort(([, a], [, b]) => b.total - a.total)
            .map(([pos, counts], i) => {
              const pct = counts.total > 0 ? counts.seen / counts.total : 0;
              return (
                <div
                  key={pos}
                  onClick={() => {
                    setPosFilter(pos);
                  }}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '100px 1fr auto',
                    gap: 12,
                    padding: '12px 0',
                    borderTop: `0.5px solid ${T.border}`,
                    borderBottom: i === Object.keys(posBreakdown).length - 1 ? `0.5px solid ${T.border}` : undefined,
                    alignItems: 'center',
                    cursor: 'pointer',
                  }}
                >
                  <span style={{ fontSize: 13, color: T.text, fontWeight: 500 }}>
                    {POS_LABELS[pos] ?? pos}
                  </span>
                  <div style={{ height: 6, background: T.border, borderRadius: 3, overflow: 'hidden' }}>
                    <div
                      style={{
                        width: `${pct * 100}%`,
                        height: '100%',
                        background: T.amber,
                        transition: `width ${T.slow} ${T.ease}`,
                      }}
                    />
                  </div>
                  <span style={{ fontFamily: T.mono, fontSize: 11, color: T.dim, textAlign: 'right' }}>
                    {counts.seen}/{counts.total}
                  </span>
                </div>
              );
            })}
        </div>

        {/* Word list (compact preview) */}
        <div style={{ marginTop: 28 }}>
          <SectionHead suffix={String(filteredWords.length)}>
            {posFilter ? `LIST · ${(POS_LABELS[posFilter] ?? posFilter).toUpperCase()}` : 'ALL WORDS'}
          </SectionHead>
          <Card pad={0}>
            {filteredWords.slice(0, 30).map((w, i) => {
              const bucket = getWordBucket(progress, w.id);
              const dotColor =
                bucket === 0 ? T.border : bucket >= 4 ? T.green : T.amber;
              return (
                <div
                  key={w.id}
                  style={{
                    padding: '10px 14px',
                    borderTop: i === 0 ? 'none' : `0.5px solid ${T.border}`,
                    display: 'grid',
                    gridTemplateColumns: 'auto 1fr auto',
                    gap: 12,
                    alignItems: 'center',
                  }}
                >
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: dotColor,
                      flexShrink: 0,
                    }}
                  />
                  <div style={{ minWidth: 0 }}>
                    <div
                      className="font-serif-sr"
                      style={{ fontSize: 15, fontWeight: 500, color: T.text }}
                    >
                      {script === 'cyrillic' ? w.lemma_sr_cyrillic : w.lemma_sr_latin}
                    </div>
                    <div style={{ fontSize: 11, color: T.dim, marginTop: 1 }}>
                      {w.gloss_en}
                    </div>
                  </div>
                  <MonoBadge>{w.pos}</MonoBadge>
                </div>
              );
            })}
            {filteredWords.length > 30 && (
              <div
                style={{
                  padding: '10px 14px',
                  fontSize: 11,
                  color: T.mute,
                  fontFamily: T.mono,
                  borderTop: `0.5px solid ${T.border}`,
                  textAlign: 'center',
                }}
              >
                +{filteredWords.length - 30} more
              </div>
            )}
          </Card>
        </div>
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
        contextLabel={`WORDS · ${exercise.type === 'word-recognize' ? 'recognize' : 'produce'}`}
        streak={progress.currentStreak}
        onClose={() => setPhase('browse')}
      >
        {exercise.type === 'word-recognize' && (
          <WordRecognize key={currentIndex} exercise={exercise} onAnswer={handleAnswer} script={script} />
        )}
        {exercise.type === 'word-produce' && (
          <WordProduce key={currentIndex} exercise={exercise} onAnswer={handleAnswer} script={script} />
        )}
      </DrillFrame>
    );
  }

  // ────────────── Finished view ──────────────
  const accuracy = totalAnswered > 0 ? Math.round((correctCount / totalAnswered) * 100) : 0;
  // suppress unused warning — wordSrsKey is re-exported for callers
  void wordSrsKey;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0, paddingTop: 16 }}>
      <div style={{ ...metaLabel, color: T.purple }}>
        <IconBrain size={11} /> WORD DRILL · COMPLETE
      </div>
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
      <p style={{ fontSize: 14, color: T.dim, marginTop: 14 }}>
        {totalAnswered} words logged.
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
