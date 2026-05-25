import type { ReactNode } from 'react';
import { T, metaLabel, monoPillStyle } from '../../lib/tokens';
import { IconClose, IconFire } from './Icons';

interface DrillFrameProps {
  progress: number;
  total: number;
  contextLabel: string;
  streak: number;
  onClose: () => void;
  children: ReactNode;
}

export default function DrillFrame({
  progress,
  total,
  contextLabel,
  streak,
  onClose,
  children,
}: DrillFrameProps) {
  const pct = total > 0 ? Math.min(1, Math.max(0, progress / total)) : 0;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '0 0 12px',
        }}
      >
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            color: T.dim,
            padding: 0,
            cursor: 'pointer',
            display: 'flex',
          }}
          aria-label="Close"
        >
          <IconClose size={18} />
        </button>
        <div
          style={{
            flex: 1,
            height: 4,
            background: T.border,
            borderRadius: 2,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: `${pct * 100}%`,
              height: '100%',
              background: T.amber,
              transition: `width ${T.med} ${T.ease}`,
            }}
          />
        </div>
        <span style={{ fontFamily: T.mono, fontSize: 11, color: T.dim }}>
          {progress} / {total}
        </span>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 0 14px',
          borderBottom: `0.5px solid ${T.border}`,
        }}
      >
        <span style={metaLabel}>{contextLabel}</span>
        {streak > 0 && (
          <span style={monoPillStyle(T.amberDim, T.amber, T.borderWarm)}>
            <IconFire size={11} /> {streak}
          </span>
        )}
      </div>

      <div style={{ paddingTop: 18 }}>{children}</div>
    </div>
  );
}
