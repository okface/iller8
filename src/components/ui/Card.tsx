import type { CSSProperties, ReactNode } from 'react';
import { T } from '../../lib/tokens';

interface CardProps {
  children: ReactNode;
  pad?: number;
  warm?: boolean;
  style?: CSSProperties;
  className?: string;
  onClick?: () => void;
}

export default function Card({ children, pad = T.s4, warm, style, className, onClick }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={className}
      style={{
        background: warm ? T.surfaceWarm : T.surface,
        border: `1px solid ${warm ? T.borderWarm : T.border}`,
        borderRadius: T.r3,
        padding: pad,
        cursor: onClick ? 'pointer' : undefined,
        transition: `all ${T.fast} ${T.ease}`,
        ...style,
      }}
    >
      {children}
    </div>
  );
}
