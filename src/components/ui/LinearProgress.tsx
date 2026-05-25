import { T } from '../../lib/tokens';

interface LinearProgressProps {
  value: number;
  total: number;
  color?: string;
  height?: number;
}

export default function LinearProgress({
  value,
  total,
  color = T.amber,
  height = 4,
}: LinearProgressProps) {
  const pct = total > 0 ? Math.min(1, Math.max(0, value / total)) : 0;
  return (
    <div
      style={{
        height,
        background: T.border,
        borderRadius: height / 2,
        overflow: 'hidden',
        width: '100%',
      }}
    >
      <div
        style={{
          width: `${pct * 100}%`,
          height: '100%',
          background: color,
          transition: `width ${T.slow} ${T.ease}`,
        }}
      />
    </div>
  );
}
