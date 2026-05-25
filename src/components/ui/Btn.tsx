import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from 'react';
import { T } from '../../lib/tokens';

type Kind = 'primary' | 'secondary' | 'ghost' | 'success' | 'danger' | 'quiet';
type Size = 'sm' | 'md' | 'lg';

interface BtnProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  children?: ReactNode;
  kind?: Kind;
  size?: Size;
  full?: boolean;
  icon?: ReactNode;
  suffix?: ReactNode;
  style?: CSSProperties;
}

const SIZES: Record<Size, CSSProperties> = {
  sm: { padding: '8px 12px', fontSize: 13 },
  md: { padding: '12px 16px', fontSize: 14 },
  lg: { padding: '15px 18px', fontSize: 15 },
};

const KINDS: Record<Kind, CSSProperties> = {
  primary:   { background: T.amber, color: T.inkOnAmber, border: `1px solid ${T.amber}` },
  secondary: { background: T.surfaceHi, color: T.text, border: `1px solid ${T.border}` },
  ghost:     { background: 'transparent', color: T.text, border: `1px solid ${T.borderHi}` },
  success:   { background: T.green, color: '#072c14', border: `1px solid ${T.green}` },
  danger:    { background: T.red, color: '#3a0a0a', border: `1px solid ${T.red}` },
  quiet:     { background: 'transparent', color: T.dim, border: `1px solid transparent` },
};

export default function Btn({
  children,
  kind = 'primary',
  size = 'md',
  full,
  icon,
  suffix,
  style,
  disabled,
  ...rest
}: BtnProps) {
  return (
    <button
      {...rest}
      disabled={disabled}
      style={{
        borderRadius: T.r3,
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontFamily: T.sans,
        fontWeight: 600,
        letterSpacing: -0.1,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        transition: `all ${T.fast} ${T.ease}`,
        opacity: disabled ? 0.4 : 1,
        width: full ? '100%' : undefined,
        ...SIZES[size],
        ...KINDS[kind],
        ...style,
      }}
    >
      {icon}
      {children}
      {suffix}
    </button>
  );
}
