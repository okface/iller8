import { T } from '../../lib/tokens';

interface RingProgressProps {
  value: number;
  total: number;
  size?: number;
  stroke?: number;
  color?: string;
  label?: string;
}

export default function RingProgress({
  value,
  total,
  size = 22,
  stroke = 2.4,
  color = T.amber,
  label,
}: RingProgressProps) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = total > 0 ? Math.min(1, Math.max(0, value / total)) : 0;
  return (
    <div style={{ position: 'relative', width: size, height: size, display: 'inline-block' }}>
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={T.border} strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeDasharray={`${c * pct} ${c}`}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: `stroke-dasharray ${T.slow} ${T.ease}` }}
        />
      </svg>
      {label && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: T.mono,
            fontSize: size * 0.32,
            color: T.text,
            fontWeight: 600,
          }}
        >
          {label}
        </div>
      )}
    </div>
  );
}
