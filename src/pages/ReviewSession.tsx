import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { generateMaintenanceSession, buildRetryExercise } from '../engine/daily-session';
import { getDueItems } from '../engine/srs';
import { useDrillSession } from '../engine/use-drill-session';
import { checkAchievements } from '../store/progress';
import DrillFrame from '../components/ui/DrillFrame';
import ExerciseRenderer from '../components/ui/ExerciseRenderer';
import Card from '../components/ui/Card';
import Btn from '../components/ui/Btn';
import { T, metaLabel } from '../lib/tokens';
import type { UserProgress } from '../store/types';

interface ReviewSessionProps {
  progress: UserProgress;
  setProgress: (p: UserProgress) => void;
  script: 'latin' | 'cyrillic';
}

/**
 * "Keep sharp" — pure SRS maintenance across ALL layers (words/phrases/family
 * variants/conjugations) via generateMaintenanceSession + ExerciseRenderer.
 * Replaces the old phrase-only Review that silently dropped word/family due
 * items. Auto-starts (no separate landing) since it's launched from the path.
 */
export default function ReviewSession({ progress, setProgress, script }: ReviewSessionProps) {
  const navigate = useNavigate();
  const sessionSize = Math.min(25, Math.max(5, progress.settings.dailyGoal || 15));
  const dueCount = useMemo(() => getDueItems(progress.phrases).length, [progress.phrases]);

  const session = useDrillSession({
    generate: () =>
      generateMaintenanceSession(
        { progress, script, skipTyping: progress.settings.skipTyping },
        sessionSize
      ),
    progress,
    setProgress,
    checkAchievements,
    buildRetry: (ex) =>
      buildRetryExercise(ex, { progress, script, skipTyping: progress.settings.skipTyping }),
  });

  // Auto-start straight into the drill (this screen has no landing of its own).
  useEffect(() => {
    if (session.phase === 'browse' && dueCount > 0) session.start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Nothing due → friendly empty state.
  if (dueCount === 0 && session.phase === 'browse') {
    return (
      <div
        style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18,
          padding: '48px 0', textAlign: 'center',
        }}
      >
        <span style={{ fontSize: 48 }}>✨</span>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: T.text }}>
          {script === 'cyrillic' ? 'Све си поновио!' : 'All caught up'}
        </h2>
        <p style={{ color: T.dim, maxWidth: 280, fontSize: 13 }}>
          Nothing is due right now. Keep going on the path and come back later.
        </p>
        <Btn kind="primary" size="lg" onClick={() => navigate('/')}>
          Back to path
        </Btn>
      </div>
    );
  }

  if (session.phase === 'drill') {
    const ex = session.currentExercise;
    if (!ex) return <p style={{ color: T.dim }}>Loading…</p>;
    return (
      <DrillFrame
        progress={session.currentIndex + 1}
        total={session.exercises.length}
        contextLabel={`KEEP SHARP · ${ex.type.replace('-', ' ')}`}
        streak={progress.currentStreak}
        onClose={() => navigate('/')}
      >
        <ExerciseRenderer
          itemKey={session.currentIndex}
          exercise={ex}
          onAnswer={session.handleAnswer}
          script={script}
        />
      </DrillFrame>
    );
  }

  // Finished.
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0, paddingTop: 16 }}>
      <div style={{ ...metaLabel, color: T.amber }}>KEEP SHARP · COMPLETE</div>
      <h1
        className="font-serif-sr"
        style={{ fontSize: 40, fontWeight: 700, letterSpacing: -1.1, margin: '14px 0 0', lineHeight: 1, color: T.text }}
      >
        Bravo.
      </h1>
      <p style={{ fontSize: 14, color: T.dim, marginTop: 14 }}>
        {session.totalAnswered} items refreshed. Buckets shuffled.
      </p>
      <div style={{ marginTop: 22, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Card pad={16}>
          <div style={{ fontFamily: T.mono, fontSize: 32, fontWeight: 600, letterSpacing: -1, color: session.accuracy >= 80 ? T.green : T.text }}>
            {session.accuracy}%
          </div>
          <div style={{ ...metaLabel, marginTop: 4 }}>accuracy</div>
        </Card>
        <Card pad={16}>
          <div style={{ fontFamily: T.mono, fontSize: 32, fontWeight: 600, letterSpacing: -1, color: T.text }}>
            {session.correctCount}
          </div>
          <div style={{ ...metaLabel, marginTop: 4 }}>correct</div>
        </Card>
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 22 }}>
        <Btn kind="secondary" size="lg" full onClick={() => navigate('/')}>
          Back to path
        </Btn>
        <Btn kind="primary" size="lg" full onClick={session.start}>
          Another round
        </Btn>
      </div>
    </div>
  );
}
