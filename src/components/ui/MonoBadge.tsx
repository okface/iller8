import type { CSSProperties, ReactNode } from 'react';
import { T, monoPillStyle } from '../../lib/tokens';

type BadgeKind = 'default' | 'amber' | 'green' | 'red' | 'purple';

interface MonoBadgeProps {
  children: ReactNode;
  kind?: BadgeKind;
  style?: CSSProperties;
}

const KINDS: Record<BadgeKind, { bg: string; fg: string; bd: string }> = {
  default: { bg: T.surface,    fg: T.dim,    bd: T.border },
  amber:   { bg: T.amberDim,   fg: T.amber,  bd: T.borderWarm },
  green:   { bg: T.greenDim,   fg: T.green,  bd: 'rgba(34,197,94,0.3)' },
  red:     { bg: T.redDim,     fg: T.red,    bd: 'rgba(239,68,68,0.3)' },
  purple:  { bg: T.purpleDim,  fg: T.purple, bd: 'rgba(167,139,250,0.3)' },
};

export default function MonoBadge({ children, kind = 'default', style }: MonoBadgeProps) {
  const k = KINDS[kind];
  return <span style={{ ...monoPillStyle(k.bg, k.fg, k.bd), ...style }}>{children}</span>;
}
