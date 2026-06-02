import type { CSSProperties } from 'react';

export const T = {
  bg:          '#06070d',
  paper:       '#0c0e17',
  surface:     'rgba(255,255,255,0.025)',
  surfaceHi:   'rgba(255,255,255,0.05)',
  surfaceWarm: 'rgba(255,193,7,0.05)',
  border:      'rgba(255,255,255,0.07)',
  borderHi:    'rgba(255,255,255,0.13)',
  borderWarm:  'rgba(255,193,7,0.3)',
  text:        '#f0f1f8',
  dim:         '#9ca3af',
  mute:        '#5a5e72',
  inkOnAmber:  '#1a1300',
  amber:       '#ffc107',
  amberDark:   '#ff8f00',
  amberDim:    'rgba(255,193,7,0.13)',
  amberSoft:   'rgba(255,193,7,0.25)',
  green:       '#22c55e',
  greenDim:    'rgba(34,197,94,0.12)',
  greenBorder: 'rgba(34,197,94,0.3)',
  red:         '#ef4444',
  redDim:      'rgba(239,68,68,0.12)',
  redBorder:   'rgba(239,68,68,0.3)',
  purple:      '#a78bfa',
  purpleDim:   'rgba(167,139,250,0.12)',
  signPlate:   '#f7f7f5',   // light tile behind SVG road signs (assume light bg)
  miraGrad:    'linear-gradient(135deg, #ffc107 0%, #ff8f00 100%)',

  r1: 4, r2: 6, r3: 10, r4: 14, r5: 20, rPill: 999,
  s1: 4, s2: 8, s3: 12, s4: 16, s5: 20, s6: 24, s7: 32, s8: 40, s9: 48, s10: 64,

  sans:  "'Geist', 'Inter', -apple-system, 'Segoe UI', Roboto, sans-serif",
  mono:  "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace",
  serif: "'Newsreader', 'Iowan Old Style', 'Charter', Georgia, serif",

  shadow1: '0 1px 0 rgba(255,255,255,0.04) inset, 0 1px 2px rgba(0,0,0,0.3)',
  shadow2: '0 12px 32px rgba(0,0,0,0.4)',

  ease: 'cubic-bezier(0.32, 0.72, 0, 1)',
  fast: '120ms',
  med:  '220ms',
  slow: '420ms',
} as const;

export const metaLabel: CSSProperties = {
  fontFamily: T.mono,
  fontSize: 10,
  color: T.mute,
  letterSpacing: 0.7,
  textTransform: 'uppercase',
};

export const monoPillStyle = (
  bg: string,
  color: string,
  borderColor?: string
): CSSProperties => ({
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
  padding: '3px 7px',
  borderRadius: T.r1,
  background: bg,
  color,
  fontFamily: T.mono,
  fontSize: 11,
  fontWeight: 500,
  letterSpacing: 0.2,
  border: borderColor ? `1px solid ${borderColor}` : undefined,
});
