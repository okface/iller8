import { T } from '../lib/tokens';
import { IconStar, IconFire, IconBook, IconSpark, IconBolt, IconBrain, IconMsg } from './ui/Icons';
import type { Achievement } from '../store/types';
import type { ReactNode } from 'react';

const iconMap: Record<string, (size?: number) => ReactNode> = {
  star: (s = 18) => <IconStar size={s} />,
  fire: (s = 18) => <IconFire size={s} />,
  scroll: (s = 18) => <IconBook size={s} />,
  heart: (s = 18) => <IconSpark size={s} />,
  handshake: (s = 18) => <IconMsg size={s} />,
  globe: (s = 18) => <IconBrain size={s} />,
  trophy: (s = 18) => <IconStar size={s} />,
  moon: (s = 18) => <IconBolt size={s} />,
  sunrise: (s = 18) => <IconSpark size={s} />,
  medal: (s = 18) => <IconStar size={s} />,
};

interface AchievementBadgeProps {
  achievement: Achievement;
  unlocked: boolean;
}

export default function AchievementBadge({ achievement, unlocked }: AchievementBadgeProps) {
  const icon = (iconMap[achievement.icon] ?? iconMap.star)(18);
  return (
    <div
      style={{
        padding: '14px 10px',
        borderRadius: T.r3,
        textAlign: 'center',
        background: unlocked ? T.surfaceWarm : T.surface,
        border: unlocked ? `1px solid ${T.borderWarm}` : `1px dashed ${T.border}`,
        opacity: unlocked ? 1 : 0.55,
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: '50%',
          background: unlocked ? T.amberDim : T.surface,
          color: unlocked ? T.amber : T.mute,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto',
        }}
      >
        {icon}
      </div>
      <div
        style={{
          fontSize: 12,
          fontWeight: 600,
          marginTop: 8,
          letterSpacing: -0.1,
          color: T.text,
        }}
      >
        {achievement.title}
      </div>
      <div
        style={{
          fontSize: 10,
          color: T.dim,
          marginTop: 2,
          lineHeight: 1.4,
        }}
      >
        {achievement.description}
      </div>
    </div>
  );
}
