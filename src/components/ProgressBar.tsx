import LinearProgress from './ui/LinearProgress';
import { T } from '../lib/tokens';

interface ProgressBarProps {
  current: number;
  total: number;
  className?: string;
  color?: string;
  height?: number;
}

export default function ProgressBar({
  current,
  total,
  className,
  color = T.amber,
  height = 4,
}: ProgressBarProps) {
  return (
    <div className={className} style={{ width: '100%' }}>
      <LinearProgress value={current} total={total} color={color} height={height} />
    </div>
  );
}
