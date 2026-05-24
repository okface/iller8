import { NavLink, Outlet } from 'react-router-dom';
import ScriptToggle from './ScriptToggle';

interface LayoutProps {
  script: 'latin' | 'cyrillic';
  onScriptChange: (script: 'latin' | 'cyrillic') => void;
}

export default function Layout({ script, onScriptChange }: LayoutProps) {
  return (
    <div className="min-h-screen bg-navy-950 text-white">
      <header className="sticky top-0 z-50 border-b border-navy-800 bg-navy-950/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
          <NavLink to="/" className="flex items-center gap-2">
            <span className="text-xl font-bold text-amber-500">iller8</span>
            <span className="text-xs text-gray-500">srpski</span>
          </NavLink>
          <ScriptToggle script={script} onChange={onScriptChange} />
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-6">
        <Outlet />
      </main>

      <nav className="fixed bottom-0 left-0 right-0 border-t border-navy-800 bg-navy-950/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-2xl justify-around py-2">
          <NavItem to="/" label="Učenje" icon="📚" />
          <NavItem to="/review" label="Ponovi" icon="🔄" />
          <NavItem to="/custom" label="Svoj" icon="✨" />
          <NavItem to="/stats" label="Napredak" icon="📊" />
          <NavItem to="/settings" label="Podešavanja" icon="⚙️" />
        </div>
      </nav>

      <div className="h-16" />
    </div>
  );
}

function NavItem({ to, label, icon }: { to: string; label: string; icon: string }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex flex-col items-center gap-0.5 px-3 py-1 text-xs transition-colors ${
          isActive ? 'text-amber-500' : 'text-gray-500 hover:text-gray-300'
        }`
      }
    >
      <span className="text-lg">{icon}</span>
      <span>{label}</span>
    </NavLink>
  );
}
