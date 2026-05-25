import type { ReactNode } from 'react';
import { T, metaLabel } from '../../lib/tokens';

interface SectionHeadProps {
  children: ReactNode;
  suffix?: ReactNode;
}

export default function SectionHead({ children, suffix }: SectionHeadProps) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        marginBottom: T.s3,
      }}
    >
      <span style={metaLabel}>{children}</span>
      {suffix && <span style={{ ...metaLabel, color: T.dim }}>{suffix}</span>}
    </div>
  );
}
