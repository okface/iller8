import { cn } from '../lib/utils';

interface ProgressBarProps {
  current: number;
  total: number;
  className?: string;
  color?: string;
}

export default function ProgressBar({
  current,
  total,
  className,
  color = 'bg-amber-500',
}: ProgressBarProps) {
  const pct = total > 0 ? Math.min(100, (current / total) * 100) : 0;

  return (
    <div className={cn('h-2 w-full rounded-full bg-navy-800', className)}>
      <div
        className={cn('h-full rounded-full transition-all duration-500', color)}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
