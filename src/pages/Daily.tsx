import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { generateDailySession, getDailySummary, buildRetryExercise } from '../engine/daily-session';
import { useDrillSession } from '../engine/use-drill-session';
import { checkAchievements } from '../store/progress';
import DrillFrame from '../components/ui/DrillFrame';
import ExerciseRenderer from '../components/ui/ExerciseRenderer';
import Card from '../components/ui/Card';
import Btn from '../components/ui/Btn';
import SectionHead from '../components/ui/SectionHead';
import { T, metaLabel } from '../lib/tokens';
import { IconBolt, IconRefresh, IconSpark, IconBrain } from '../components/ui/Icons';
import type { UserProgress } from '../store/types';

interface DailyProps {
  progress: UserProgress;
  setProgress: (p: UserProgress) => void;
  script: 'latin' | 'cyrillic';
}

/**
 * The unified daily session. One button → a session mixing new / review
 * / consolidation across words, phrases, and family variants. The
 * keystone of the unified-path vision (ARCHITECTURE.md §6).
 *
 * This page demonstrates the orchestration primitives:
 *   - useDrillSession owns the phase machine
 *   - ExerciseRenderer dispatches to the right component per type
 * Five lines of UI per phase instead of 200.
 */
export default function Daily({ progress, setProgress, script }: DailyProps) {
  const navigate = useNavigate();

  // Session length honours the learner's daily goal (clamped 5–25) rather
  // than a hardcoded 15 — respects their stated time budget.
  const sessionSize = Math.min(25, Math.max(5, progress.settings.dailyGoal || 15));

  // Compute today's mix preview (cheap, pure). Recompute when progress
  // changes so the "browse" landing always reflects current state.
  const summary = useMemo(
    () => getDailySummary({ progress, script, skipTyping: progress.settings.skipTyping }, sessionSize),
    [progress, script, sessionSize]
  );

  const session = useDrillSession({
    generate: () =>
      generateDailySession(
        { progress, script, skipTyping: progress.settings.skipTyping },
        sessionSize
      ),
    progress,
    setProgress,
    checkAchievements,
    buildRetry: (ex) =>
      buildRetryExercise(ex, { progress, script, skipTyping: progress.settings.skipTyping }),
  });

  // ────────────── Browse landing ──────────────
  if (session.phase === 'browse') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        <div style={{ ...metaLabel, color: T.amber }}>TODAY · ONE LOOP</div>
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
          <IconBolt size={28} /> Daily session
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
          Tap Start. The app picks {sessionSize} items mixing review (SRS-due),
          new vocabulary you're ready for, and recently-met items that need a
          second pass. You don't choose what to drill — the loop does.
        </p>

        {/* Today's mix */}
        <Card pad={16} style={{ marginTop: 16 }}>
          <div style={metaLabel}>TODAY'S MIX</div>
          <div
            style={{
              marginTop: 12,
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 10,
            }}
          >
            <SessionStat
              icon={<IconRefresh size={14} />}
              label="REVIEW"
              count={summary.reviewCount}
              color={T.amber}
            />
            <SessionStat
              icon={<IconSpark size={14} />}
              label="NEW"
              count={summary.newCount}
              color={T.green}
            />
            <SessionStat
              icon={<IconBrain size={14} />}
              label="PRACTICE"
              count={summary.consolidationCount}
              color={T.purple}
            />
          </div>
          {summary.total < sessionSize && summary.total > 0 && (
            <div
              style={{
                ...metaLabel,
                marginTop: 14,
                color: T.dim,
                lineHeight: 1.6,
                textTransform: 'none',
                letterSpacing: 0.2,
                fontSize: 11,
              }}
            >
              Pool is light today — the session will fill with random ready
              phrases.
            </div>
          )}
          {summary.total === 0 && (
            <div
              style={{
                marginTop: 14,
                fontSize: 12,
                color: T.dim,
                lineHeight: 1.6,
              }}
            >
              Cold start — first session will introduce ~9 new items. No review
              or consolidation yet.
            </div>
          )}
        </Card>

        <div style={{ marginTop: 16 }}>
          <Btn kind="primary" size="lg" full onClick={session.start}>
            Start
          </Btn>
        </div>

        <Card pad={14} style={{ marginTop: 16 }}>
          <div style={metaLabel}>HOW IT WORKS</div>
          <ul
            style={{
              marginTop: 10,
              paddingLeft: 18,
              fontSize: 12,
              color: T.dim,
              lineHeight: 1.65,
            }}
          >
            <li>
              <span style={{ color: T.amber, fontWeight: 600 }}>Review</span>{' '}
              items are due in the SRS — words, phrases, and family variants you've
              seen before that need a refresh.
            </li>
            <li>
              <span style={{ color: T.green, fontWeight: 600 }}>New</span>{' '}
              items are picked by frequency: most-common words and phrases whose
              vocabulary you already know.
            </li>
            <li>
              <span style={{ color: T.purple, fontWeight: 600 }}>Practice</span>{' '}
              items are recently-met items where you're not yet getting them
              right consistently.
            </li>
            <li>The three streams are interleaved, not blocked — better for retention.</li>
          </ul>
        </Card>

        <div
          style={{
            marginTop: 18,
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: 8,
          }}
        >
          <Card pad={12} onClick={() => navigate('/words')}>
            <div style={{ fontSize: 12, fontWeight: 600, color: T.text }}>
              Drill words only
            </div>
            <div style={{ fontSize: 11, color: T.dim, marginTop: 2 }}>
              Focused vocab session.
            </div>
          </Card>
          <Card pad={12} onClick={() => navigate('/families')}>
            <div style={{ fontSize: 12, fontWeight: 600, color: T.text }}>
              Perspective drill
            </div>
            <div style={{ fontSize: 11, color: T.dim, marginTop: 2 }}>
              Drill grammar transforms.
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // ────────────── Drill ──────────────
  if (session.phase === 'drill') {
    const ex = session.currentExercise;
    if (!ex) return <p style={{ color: T.dim }}>Loading…</p>;
    return (
      <DrillFrame
        progress={session.currentIndex + 1}
        total={session.exercises.length}
        contextLabel={`DAILY · ${ex.type.replace('-', ' ')}`}
        streak={progress.currentStreak}
        onClose={session.reset}
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

  // ────────────── Finished ──────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0, paddingTop: 16 }}>
      <div style={{ ...metaLabel, color: T.amber }}>DAILY · COMPLETE</div>
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
        {session.totalAnswered} items logged. Buckets shuffled. See you tomorrow.
      </p>

      <div
        style={{
          marginTop: 22,
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 12,
        }}
      >
        <Card pad={16}>
          <div
            style={{
              fontFamily: T.mono,
              fontSize: 32,
              fontWeight: 600,
              letterSpacing: -1,
              color: session.accuracy >= 80 ? T.green : T.text,
            }}
          >
            {session.accuracy}%
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
            {session.correctCount}
          </div>
          <div style={{ ...metaLabel, marginTop: 4 }}>correct</div>
        </Card>
      </div>

      <div style={{ marginTop: 16 }}>
        <SectionHead>STREAK</SectionHead>
        <Card pad={14} warm>
          <div style={{ fontFamily: T.mono, fontSize: 18, color: T.amber }}>
            {progress.currentStreak} day{progress.currentStreak === 1 ? '' : 's'}
          </div>
          <div style={{ fontSize: 11, color: T.dim, marginTop: 2 }}>
            best: {progress.longestStreak}
          </div>
        </Card>
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 22 }}>
        <Btn kind="secondary" size="lg" full onClick={() => navigate('/')}>
          Home
        </Btn>
        <Btn kind="primary" size="lg" full onClick={session.start}>
          Another round
        </Btn>
      </div>
    </div>
  );
}

function SessionStat({
  icon,
  label,
  count,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  count: number;
  color: string;
}) {
  return (
    <div>
      <div
        style={{
          ...metaLabel,
          color: color,
          display: 'flex',
          alignItems: 'center',
          gap: 4,
        }}
      >
        {icon} {label}
      </div>
      <div
        style={{
          fontFamily: T.mono,
          fontSize: 24,
          fontWeight: 500,
          marginTop: 4,
          letterSpacing: -0.5,
          color: count > 0 ? T.text : T.mute,
        }}
      >
        {count}
      </div>
    </div>
  );
}
