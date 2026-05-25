import { T } from '../../lib/tokens';

interface MiraAvatarProps {
  size?: number;
  ring?: boolean;
}

export default function MiraAvatar({ size = 32, ring }: MiraAvatarProps) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: T.miraGrad,
        color: T.inkOnAmber,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 700,
        fontSize: size * 0.42,
        flexShrink: 0,
        boxShadow: ring ? `0 0 0 2px ${T.bg}, 0 0 0 3px ${T.amber}` : 'none',
      }}
    >
      M
    </div>
  );
}
