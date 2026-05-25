import { T } from '../../lib/tokens';

interface I8MarkProps {
  size?: number;
}

export default function I8Mark({ size = 22 }: I8MarkProps) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.25,
        background: T.miraGrad,
        color: T.inkOnAmber,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: T.mono,
        fontWeight: 700,
        fontSize: size * 0.5,
        letterSpacing: -0.5,
        flexShrink: 0,
      }}
    >
      i8
    </div>
  );
}
