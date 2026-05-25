import { useNavigate } from 'react-router-dom';
import { T } from '../lib/tokens';
import MonoBadge from './ui/MonoBadge';
import RingProgress from './ui/RingProgress';
import { IconLock } from './ui/Icons';
import type { Lesson, PhraseProgress } from '../store/types';

interface LessonCardProps {
  lesson: Lesson;
  script: 'latin' | 'cyrillic';
  completed: boolean;
  unlocked: boolean;
  phraseProgress: Record<string, PhraseProgress>;
  topBorder?: boolean;
}

export default function LessonCard({
  lesson,
  script,
  completed,
  unlocked,
  phraseProgress,
  topBorder,
}: LessonCardProps) {
  const navigate = useNavigate();

  const totalPhrases = lesson.phraseGroups.reduce(
    (sum, g) => sum + g.phrases.length,
    0
  );
  const masteredPhrases = lesson.phraseGroups.reduce(
    (sum, g) =>
      sum +
      g.phrases.filter((p) => (phraseProgress[p.id]?.bucket ?? 0) >= 4).length,
    0
  );
  const learnedPhrases = lesson.phraseGroups.reduce(
    (sum, g) =>
      sum + g.phrases.filter((p) => (phraseProgress[p.id]?.bucket ?? 0) >= 1).length,
    0
  );
  const progress = totalPhrases > 0 ? learnedPhrases / totalPhrases : 0;

  const title =
    script === 'cyrillic' ? lesson.title.sr_cyrillic : lesson.title.sr_latin;
  const subtitle = lesson.description.en;

  return (
    <button
      onClick={() => unlocked && navigate(`/lesson/${lesson.id}`)}
      disabled={!unlocked}
      style={{
        display: 'grid',
        gridTemplateColumns: '32px 1fr auto',
        alignItems: 'center',
        gap: 12,
        padding: '14px 0',
        borderTop: topBorder ? `0.5px solid ${T.border}` : undefined,
        borderBottom: `0.5px solid ${T.border}`,
        opacity: unlocked ? 1 : 0.4,
        background: 'transparent',
        border: 'none',
        borderBottomLeftRadius: 0,
        borderBottomRightRadius: 0,
        cursor: unlocked ? 'pointer' : 'not-allowed',
        width: '100%',
        textAlign: 'left',
        color: T.text,
        transition: `all ${T.fast} ${T.ease}`,
      }}
    >
      <span
        style={{
          fontFamily: T.mono,
          fontSize: 11,
          color: completed ? T.green : T.mute,
        }}
      >
        {String(lesson.order).padStart(2, '0')}
      </span>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 500, letterSpacing: -0.2 }}>{title}</div>
        <div
          style={{
            fontFamily: T.mono,
            fontSize: 11,
            color: T.dim,
            marginTop: 1,
            display: 'flex',
            gap: 8,
            alignItems: 'center',
          }}
        >
          {subtitle}
        </div>
      </div>
      {!unlocked ? (
        <span style={{ color: T.dim, display: 'flex' }}>
          <IconLock size={14} />
        </span>
      ) : completed && masteredPhrases >= totalPhrases ? (
        <MonoBadge kind="green">100%</MonoBadge>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontFamily: T.mono, fontSize: 11, color: T.text }}>
            {Math.round(progress * 100)}%
          </span>
          <RingProgress value={progress * 100} total={100} size={20} stroke={2.4} />
        </div>
      )}
    </button>
  );
}
