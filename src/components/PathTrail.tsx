import { useNavigate } from 'react-router-dom';
import type { UserProgress } from '../store/types';
import { STAGES } from '../data/grammar-stages';
import { getStageProgress, getLearnerStage } from '../engine/grammar-progress';
import { getDueItems } from '../engine/srs';
import { T, metaLabel } from '../lib/tokens';
import { IconChev } from './ui/Icons';

interface PathTrailProps {
  progress: UserProgress;
}

interface NodeRowProps {
  color: string;
  glyph: string;
  title: string;
  subtitle: string;
  badge?: string;
  pct?: number;
  now?: boolean;
  locked?: boolean;
  filled?: boolean;
  connectorTop: boolean;
  onTap: () => void;
}

function NodeRow({
  color, glyph, title, subtitle, badge, pct, now, locked, filled, connectorTop, onTap,
}: NodeRowProps) {
  return (
    <div
      role={locked ? undefined : 'button'}
      tabIndex={locked ? undefined : 0}
      onClick={locked ? undefined : onTap}
      onKeyDown={(e) => {
        if (!locked && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onTap();
        }
      }}
      style={{
        display: 'grid',
        gridTemplateColumns: '44px 1fr auto',
        gap: 14,
        alignItems: 'center',
        padding: '10px 0',
        cursor: locked ? 'default' : 'pointer',
        opacity: locked ? 0.5 : 1,
      }}
    >
      {/* node + spine connector */}
      <div style={{ position: 'relative', width: 44, display: 'flex', justifyContent: 'center' }}>
        {connectorTop && (
          <div style={{ position: 'absolute', top: -14, bottom: '50%', width: 2, background: T.border }} />
        )}
        <div
          style={{
            position: 'relative',
            width: now ? 44 : 38,
            height: now ? 44 : 38,
            borderRadius: '50%',
            border: `2px solid ${color}`,
            background: filled ? color : T.bg,
            color: filled ? T.bg : color,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: T.mono,
            fontSize: now ? 18 : 15,
            fontWeight: 700,
            boxShadow: now ? `0 0 0 4px ${color}22` : 'none',
          }}
        >
          {glyph}
        </div>
      </div>

      {/* label */}
      <div style={{ minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 15, fontWeight: 600, color: locked ? T.mute : T.text, letterSpacing: -0.2 }}>
            {title}
          </span>
          {now && (
            <span
              style={{
                fontFamily: T.mono, fontSize: 9, color: T.amber,
                border: `1px solid ${T.amber}`, borderRadius: 4, padding: '1px 5px', letterSpacing: 0.5,
              }}
            >
              NOW
            </span>
          )}
        </div>
        <div style={{ fontSize: 11.5, color: T.dim, marginTop: 2, lineHeight: 1.4 }}>{subtitle}</div>
        {pct !== undefined && (
          <div style={{ marginTop: 6, height: 4, borderRadius: 2, background: T.border, overflow: 'hidden', maxWidth: 220 }}>
            <div style={{ width: `${pct * 100}%`, height: '100%', background: color, transition: `width ${T.fast} ${T.ease}` }} />
          </div>
        )}
      </div>

      {/* right side */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {badge && <span style={{ fontFamily: T.mono, fontSize: 10, color: T.mute, whiteSpace: 'nowrap' }}>{badge}</span>}
        {!locked && <span style={{ color, display: 'flex' }}><IconChev size={16} /></span>}
      </div>
    </div>
  );
}

/**
 * The gamified learning spine: grammar stages as a tappable vertical trail.
 * Current frontier stage = amber "NOW" → starts a session. Cleared stages =
 * green ✓ → re-practice (maintenance). Locked stages are dimmed. A "keep sharp"
 * node at the top surfaces due maintenance across all layers.
 */
export default function PathTrail({ progress }: PathTrailProps) {
  const navigate = useNavigate();
  const stages = getStageProgress(progress);
  const frontier = getLearnerStage(progress);
  const dueCount = getDueItems(progress.phrases).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      <div style={{ ...metaLabel, marginBottom: 12 }}>YOUR GRAMMAR PATH</div>

      {dueCount > 0 && (
        <NodeRow
          color={T.purple}
          glyph="↻"
          title="Keep sharp"
          subtitle={`${dueCount} due — refresh older words & phrases`}
          onTap={() => navigate('/review')}
          connectorTop={false}
          now
          filled
        />
      )}

      {STAGES.map((st, i) => {
        const sp = stages[i];
        const isCurrent = st.id === frontier;
        const isLocked = st.id > frontier && st.id !== 0;
        const isDone = sp.cleared && !isCurrent;
        const color = isDone ? T.green : isLocked ? T.mute : T.amber;
        return (
          <NodeRow
            key={st.id}
            color={color}
            glyph={isDone ? '✓' : st.id === 0 ? '∞' : String(st.id)}
            title={st.title}
            subtitle={st.blurb}
            badge={st.id === 0 ? undefined : `${sp.met}/${sp.need}`}
            pct={st.id === 0 ? undefined : sp.pct}
            now={isCurrent}
            locked={isLocked}
            filled={isDone || isCurrent}
            connectorTop={i > 0 || dueCount > 0}
            onTap={() => navigate(isDone ? '/review' : '/daily')}
          />
        );
      })}
    </div>
  );
}
