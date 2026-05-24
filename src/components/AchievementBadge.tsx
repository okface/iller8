import type { Achievement } from '../store/types';

const iconMap: Record<string, string> = {
  star: '⭐',
  fire: '🔥',
  scroll: '📜',
  heart: '❤️',
  handshake: '🤝',
  globe: '🌍',
  trophy: '🏆',
  moon: '🌙',
  sunrise: '🌅',
  medal: '🏅',
};

interface AchievementBadgeProps {
  achievement: Achievement;
  unlocked: boolean;
}

export default function AchievementBadge({
  achievement,
  unlocked,
}: AchievementBadgeProps) {
  return (
    <div
      className={`flex flex-col items-center gap-1 rounded-xl p-3 transition-all ${
        unlocked
          ? 'bg-amber-500/10 border border-amber-500/30'
          : 'bg-navy-800/50 border border-navy-700/30 opacity-50 grayscale'
      }`}
    >
      <span className="text-2xl">{iconMap[achievement.icon] ?? '🎯'}</span>
      <span className="text-xs font-medium text-white">{achievement.title}</span>
      <span className="text-[10px] text-gray-400 text-center">
        {achievement.description}
      </span>
    </div>
  );
}
