import type { SVGProps } from 'react';

type IconProps = { size?: number } & SVGProps<SVGSVGElement>;

const base = (size: number): SVGProps<SVGSVGElement> => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
});

export const IconClose = ({ size = 16, ...p }: IconProps) => (
  <svg {...base(size)} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" {...p}>
    <path d="M6 6l12 12M6 18L18 6" />
  </svg>
);

export const IconCheck = ({ size = 16, ...p }: IconProps) => (
  <svg {...base(size)} fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M5 12l5 5L20 7" />
  </svg>
);

export const IconChev = ({ size = 16, ...p }: IconProps) => (
  <svg {...base(size)} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M9 6l6 6-6 6" />
  </svg>
);

export const IconBack = ({ size = 16, ...p }: IconProps) => (
  <svg {...base(size)} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M15 6l-6 6 6 6" />
  </svg>
);

export const IconLock = ({ size = 14, ...p }: IconProps) => (
  <svg {...base(size)} fill="none" stroke="currentColor" strokeWidth={2} {...p}>
    <rect x="5" y="11" width="14" height="10" rx="1" />
    <path d="M8 11V7a4 4 0 018 0v4" />
  </svg>
);

export const IconPlay = ({ size = 14, ...p }: IconProps) => (
  <svg {...base(size)} fill="currentColor" {...p}>
    <path d="M6 4l14 8-14 8z" />
  </svg>
);

export const IconFire = ({ size = 14, ...p }: IconProps) => (
  <svg {...base(size)} fill="currentColor" {...p}>
    <path d="M12 2c2 4 5 6 5 10a5 5 0 11-10 0c0-2 1-3 2-4 0 2 1 3 2 3-1-3 0-6 1-9z" />
  </svg>
);

export const IconStar = ({ size = 14, ...p }: IconProps) => (
  <svg {...base(size)} fill="currentColor" {...p}>
    <path d="M12 2l3 7h7l-5.5 4.5L18 21l-6-4-6 4 1.5-7.5L2 9h7z" />
  </svg>
);

export const IconAudio = ({ size = 14, ...p }: IconProps) => (
  <svg {...base(size)} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M11 5L6 9H2v6h4l5 4z" />
    <path d="M15 9a4 4 0 010 6" />
    <path d="M18 6a8 8 0 010 12" />
  </svg>
);

export const IconSpark = ({ size = 14, ...p }: IconProps) => (
  <svg {...base(size)} fill="currentColor" {...p}>
    <path d="M12 2l1.5 6.5L20 10l-6.5 1.5L12 18l-1.5-6.5L4 10l6.5-1.5z" />
  </svg>
);

export const IconBolt = ({ size = 14, ...p }: IconProps) => (
  <svg {...base(size)} fill="currentColor" {...p}>
    <path d="M13 2L4 14h7l-1 8 9-12h-7z" />
  </svg>
);

export const IconMsg = ({ size = 14, ...p }: IconProps) => (
  <svg {...base(size)} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M21 12a8 8 0 11-3-6L21 4l-1 4a8 8 0 011 4z" />
  </svg>
);

export const IconBrain = ({ size = 14, ...p }: IconProps) => (
  <svg {...base(size)} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M8 10c0-2 2-3 4-3M16 14c0 2-2 3-4 3" />
  </svg>
);

export const IconCog = ({ size = 14, ...p }: IconProps) => (
  <svg {...base(size)} fill="none" stroke="currentColor" strokeWidth={2} {...p}>
    <circle cx="12" cy="12" r="3" />
    <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1" />
  </svg>
);

export const IconBook = ({ size = 14, ...p }: IconProps) => (
  <svg {...base(size)} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M4 4h12a2 2 0 012 2v14H6a2 2 0 01-2-2V4z" />
    <path d="M4 4v14a2 2 0 002 2" />
  </svg>
);

export const IconRefresh = ({ size = 14, ...p }: IconProps) => (
  <svg {...base(size)} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M21 12a9 9 0 01-15 6.7L3 16M3 12a9 9 0 0115-6.7L21 8" />
    <path d="M21 3v5h-5M3 21v-5h5" />
  </svg>
);

export const IconUser = ({ size = 14, ...p }: IconProps) => (
  <svg {...base(size)} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...p}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21a8 8 0 0116 0" />
  </svg>
);
