import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { T, monoPillStyle } from '../lib/tokens';
import I8Mark from './ui/I8Mark';
import ScriptToggle from './ScriptToggle';
import StreakCounter from './StreakCounter';
import { IconBook, IconRefresh, IconUser, IconBolt, IconFire } from './ui/Icons';

interface LayoutProps {
  script: 'latin' | 'cyrillic';
  onScriptChange: (script: 'latin' | 'cyrillic') => void;
  streak?: number;
}

const SECTION_MAP: Record<string, string> = {
  '/': 'home',
  '/review': 'review',
  '/stats': 'stats',
  '/settings': 'me',
  '/custom': 'custom',
};

function getSectionLabel(pathname: string): string {
  if (pathname.startsWith('/lesson/')) return 'lesson';
  if (pathname.startsWith('/review')) return 'review';
  if (pathname.startsWith('/stats')) return 'stats';
  if (pathname.startsWith('/settings')) return 'me';
  if (pathname.startsWith('/custom')) return 'custom';
  return SECTION_MAP[pathname] ?? 'home';
}

export default function Layout({ script, onScriptChange, streak = 0 }: LayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const section = getSectionLabel(location.pathname);
  const inLesson =
    location.pathname.startsWith('/lesson/') || location.pathname.startsWith('/review');

  return (
    <div
      style={{
        minHeight: '100vh',
        background: T.bg,
        color: T.text,
        fontFamily: T.sans,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 50,
          background: 'rgba(6,7,13,0.92)',
          backdropFilter: 'blur(12px)',
          borderBottom: `0.5px solid ${T.border}`,
        }}
      >
        <div
          style={{
            maxWidth: 720,
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '12px 20px',
            minHeight: 56,
          }}
        >
          <div
            onClick={() => navigate('/')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              cursor: 'pointer',
              minWidth: 0,
            }}
          >
            <I8Mark size={22} />
            <span
              style={{
                fontFamily: T.mono,
                fontSize: 12,
                color: T.dim,
                letterSpacing: 0.4,
                whiteSpace: 'nowrap',
              }}
            >
              iller8 / {section}
            </span>
          </div>
          <div style={{ flex: 1 }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {streak > 0 && (
              <span style={monoPillStyle(T.amberDim, T.amber, T.borderWarm)}>
                <IconFire size={11} /> {streak}
              </span>
            )}
            <ScriptToggle script={script} onChange={onScriptChange} />
          </div>
        </div>
      </header>

      <main
        style={{
          flex: 1,
          maxWidth: 720,
          width: '100%',
          margin: '0 auto',
          padding: inLesson ? '8px 20px 96px' : '20px 20px 96px',
        }}
      >
        <Outlet />
      </main>

      <nav
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          background: 'rgba(6,7,13,0.92)',
          backdropFilter: 'blur(12px)',
          borderTop: `0.5px solid ${T.border}`,
          zIndex: 50,
        }}
      >
        <div
          style={{
            maxWidth: 720,
            margin: '0 auto',
            display: 'flex',
            justifyContent: 'space-around',
            padding: '8px 12px 14px',
          }}
        >
          <TabItem to="/" label="Home" icon={<IconBook size={16} />} />
          <TabItem to="/daily" label="Daily" icon={<IconBolt size={16} />} />
          <TabItem to="/words" label="Words" icon={<IconBook size={16} />} />
          <TabItem to="/review" label="Review" icon={<IconRefresh size={16} />} />
          <TabItem to="/settings" label="Me" icon={<IconUser size={16} />} />
        </div>
      </nav>
    </div>
  );
}

function TabItem({
  to,
  label,
  icon,
}: {
  to: string;
  label: string;
  icon: React.ReactNode;
}) {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      style={{ textDecoration: 'none' }}
    >
      {({ isActive }) => (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 4,
            padding: '4px 12px',
          }}
        >
          <div
            style={{
              width: 26,
              height: 26,
              borderRadius: 6,
              background: isActive ? T.amber : 'transparent',
              border: isActive ? 'none' : `1px solid ${T.borderHi}`,
              color: isActive ? T.inkOnAmber : T.dim,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: `all ${T.fast} ${T.ease}`,
            }}
          >
            {icon}
          </div>
          <span
            style={{
              fontSize: 9,
              color: isActive ? T.text : T.mute,
              fontWeight: 600,
              letterSpacing: 0.4,
              textTransform: 'uppercase',
              fontFamily: T.mono,
            }}
          >
            {label}
          </span>
        </div>
      )}
    </NavLink>
  );
}

// keep prior import for backward compatibility (not used now)
export { StreakCounter };
