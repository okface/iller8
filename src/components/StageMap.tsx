import type { UserProgress } from '../store/types';
import { STAGES } from '../data/grammar-stages';
import { getStageProgress, getLearnerStage } from '../engine/grammar-progress';
import { T, metaLabel } from '../lib/tokens';

interface StageMapProps {
  progress: UserProgress;
}

/**
 * The "you are here" spine: the grammar stages as a vertical map with
 * done / current / locked states and per-stage mastery. Makes the difficulty
 * ramp legible — the thing that turns a flat shuffle into a sense of leveling up.
 */
export default function StageMap({ progress }: StageMapProps) {
  const stages = getStageProgress(progress);
  const frontier = getLearnerStage(progress);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      <div style={{ ...metaLabel, marginBottom: 10 }}>YOUR GRAMMAR PATH</div>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {STAGES.map((st, i) => {
          const sp = stages[i];
          const isCurrent = st.id === frontier;
          const isLocked = st.id > frontier && st.id !== 0;
          const isDone = sp.cleared && !isCurrent;
          const need = Math.min(8, sp.total || 1);
          const pct = sp.total === 0 ? 0 : Math.min(1, sp.mastered / need);

          const accent = isDone ? T.green : isCurrent ? T.amber : T.mute;
          const titleColor = isLocked ? T.mute : T.text;

          return (
            <div
              key={st.id}
              style={{
                display: 'grid',
                gridTemplateColumns: '26px 1fr auto',
                gap: 12,
                alignItems: 'center',
                padding: '10px 0',
                borderTop: i === 0 ? 'none' : `0.5px solid ${T.border}`,
                opacity: isLocked ? 0.55 : 1,
              }}
            >
              {/* node */}
              <div
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: '50%',
                  border: `1.5px solid ${accent}`,
                  background: isDone ? T.green : isCurrent ? T.amber : 'transparent',
                  color: isDone || isCurrent ? T.bg : T.mute,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: T.mono,
                  fontSize: 12,
                  fontWeight: 600,
                  flexShrink: 0,
                }}
              >
                {isDone ? '✓' : st.id === 0 ? '∞' : st.id}
              </div>

              {/* label */}
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: titleColor,
                    letterSpacing: -0.2,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  {st.title}
                  {isCurrent && (
                    <span
                      style={{
                        fontFamily: T.mono,
                        fontSize: 9,
                        color: T.amber,
                        border: `1px solid ${T.amber}`,
                        borderRadius: 4,
                        padding: '1px 5px',
                        letterSpacing: 0.5,
                      }}
                    >
                      NOW
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 11.5, color: T.dim, marginTop: 2, lineHeight: 1.4 }}>
                  {st.blurb}
                </div>
                {/* progress bar */}
                {st.id !== 0 && sp.total > 0 && (
                  <div
                    style={{
                      marginTop: 6,
                      height: 4,
                      borderRadius: 2,
                      background: T.border,
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        width: `${pct * 100}%`,
                        height: '100%',
                        background: accent,
                        transition: `width ${T.fast} ${T.ease}`,
                      }}
                    />
                  </div>
                )}
              </div>

              {/* count */}
              <div
                style={{
                  fontFamily: T.mono,
                  fontSize: 10,
                  color: T.mute,
                  textAlign: 'right',
                  whiteSpace: 'nowrap',
                }}
              >
                {st.id === 0 ? `${sp.total}` : `${sp.mastered}/${sp.total}`}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
