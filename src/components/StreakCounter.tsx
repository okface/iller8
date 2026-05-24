interface StreakCounterProps {
  count: number;
}

export default function StreakCounter({ count }: StreakCounterProps) {
  return (
    <div className="flex items-center gap-2">
      <span className={`text-2xl ${count > 0 ? 'animate-pulse' : 'opacity-40'}`}>
        {count > 0 ? '🔥' : '💤'}
      </span>
      <div className="text-left">
        <div className="text-lg font-bold text-white">{count}</div>
        <div className="text-xs text-gray-400">
          {count === 1 ? 'day' : 'days'}
        </div>
      </div>
    </div>
  );
}
