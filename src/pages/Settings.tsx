import { useState, type CSSProperties, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  updateSettings,
  saveProgress,
  resetProgress,
  exportProgress,
  importProgress,
} from '../store/progress';
import Card from '../components/ui/Card';
import SectionHead from '../components/ui/SectionHead';
import MonoBadge from '../components/ui/MonoBadge';
import Btn from '../components/ui/Btn';
import ScriptToggle from '../components/ScriptToggle';
import { IconChev } from '../components/ui/Icons';
import { T } from '../lib/tokens';
import type { UserProgress } from '../store/types';

interface SettingsProps {
  progress: UserProgress;
  setProgress: (p: UserProgress) => void;
  script: 'latin' | 'cyrillic';
}

export default function Settings({ progress, setProgress, script }: SettingsProps) {
  const navigate = useNavigate();
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [importError, setImportError] = useState('');

  const { settings } = progress;

  const update = (partial: Partial<typeof settings>) => {
    const newProgress = updateSettings(progress, partial);
    setProgress(newProgress);
    saveProgress(newProgress);
  };

  const handleExport = () => {
    const data = exportProgress();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'iller8-progress.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const data = importProgress(ev.target?.result as string);
          setProgress(data);
          setImportError('');
        } catch {
          setImportError('Invalid progress file');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const handleReset = () => {
    const fresh = resetProgress();
    setProgress(fresh);
    setShowResetConfirm(false);
    navigate('/');
  };

  const masteredCount = Object.values(progress.phrases).filter(
    (p) => p.bucket >= 5
  ).length;

  const goalBadgeKind: 'amber' | 'default' =
    settings.dailyGoal >= 20 ? 'amber' : 'default';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      <h1
        style={{
          fontSize: 28,
          fontWeight: 700,
          letterSpacing: -0.6,
          margin: '0 0 4px',
          color: T.text,
        }}
      >
        {script === 'cyrillic' ? 'Подешавања' : 'Settings'}
      </h1>
      <p style={{ fontSize: 13, color: T.dim, marginBottom: 18 }}>
        Tune the app to fit how you learn.
      </p>

      {/* Profile */}
      <Card pad={16} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: '50%',
            background: T.surfaceHi,
            border: `1px solid ${T.border}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 16,
            fontWeight: 600,
            color: T.text,
          }}
        >
          V
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 600 }}>Victor</div>
          <div style={{ fontSize: 12, color: T.dim, fontFamily: T.mono }}>
            day {progress.currentStreak} · {masteredCount} mastered
          </div>
        </div>
      </Card>

      {/* Learning */}
      <div style={{ marginTop: 22 }}>
        <SectionHead>LEARNING</SectionHead>
        <Card pad={0}>
          <Row
            label="Daily goal"
            sub={`${settings.dailyGoal} phrases`}
            trailing={
              <MonoBadge kind={goalBadgeKind}>
                {settings.dailyGoal <= 5
                  ? 'CASUAL'
                  : settings.dailyGoal <= 10
                    ? 'STEADY'
                    : settings.dailyGoal <= 15
                      ? 'SERIOUS'
                      : 'OBSESSED'}
              </MonoBadge>
            }
          />
          <div style={{ padding: '0 16px 14px', display: 'flex', gap: 6 }}>
            {[5, 10, 15, 20].map((g) => {
              const active = settings.dailyGoal === g;
              return (
                <button
                  key={g}
                  onClick={() => update({ dailyGoal: g })}
                  style={{
                    flex: 1,
                    padding: '8px 0',
                    borderRadius: T.r2,
                    border: `1px solid ${active ? T.amber : T.border}`,
                    background: active ? T.amberDim : T.surface,
                    color: active ? T.amber : T.dim,
                    fontFamily: T.mono,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: `all ${T.fast} ${T.ease}`,
                  }}
                >
                  {g}
                </button>
              );
            })}
          </div>
          <Divider />
          <Row
            label="Default script"
            trailing={
              <ScriptToggle
                script={settings.scriptPreference === 'cyrillic' ? 'cyrillic' : 'latin'}
                onChange={(s) => update({ scriptPreference: s })}
              />
            }
            last
          />
        </Card>
      </div>

      {/* Claude API */}
      <div style={{ marginTop: 22 }}>
        <SectionHead>CUSTOM CONTENT</SectionHead>
        <Card pad={16}>
          <div style={{ fontSize: 13, fontWeight: 500 }}>Claude API key</div>
          <div style={{ fontSize: 11, color: T.dim, marginTop: 2 }}>
            Optional. Enables custom content extraction from pasted Serbian text.
          </div>
          <input
            type="password"
            value={settings.apiKey}
            onChange={(e) => update({ apiKey: e.target.value })}
            placeholder="sk-ant-..."
            style={{
              width: '100%',
              marginTop: 12,
              padding: '10px 12px',
              borderRadius: T.r2,
              border: `1px solid ${T.border}`,
              background: T.surface,
              color: T.text,
              fontFamily: T.mono,
              fontSize: 12,
              outline: 'none',
            }}
          />
        </Card>
      </div>

      {/* Account / Data */}
      <div style={{ marginTop: 22 }}>
        <SectionHead>DATA</SectionHead>
        <Card pad={0}>
          <Row
            label="Export progress"
            sub="Download JSON snapshot"
            trailing={<IconChev size={14} />}
            onClick={handleExport}
          />
          <Divider />
          <Row
            label="Import progress"
            sub="Restore from a previous export"
            trailing={<IconChev size={14} />}
            onClick={handleImport}
          />
          <Divider />
          <Row
            label="Reset all data"
            sub="Wipe progress, settings, achievements"
            trailing={
              <span style={{ color: T.red, fontSize: 13, fontWeight: 600 }}>
                Reset
              </span>
            }
            onClick={() => setShowResetConfirm(true)}
            last
          />
        </Card>
        {importError && (
          <p style={{ color: T.red, fontSize: 12, marginTop: 8 }}>{importError}</p>
        )}
      </div>

      {showResetConfirm && (
        <Card style={{ marginTop: 12, borderColor: T.red }} pad={14}>
          <div style={{ fontSize: 13, color: T.red, marginBottom: 12 }}>
            This will delete all your progress. Are you sure?
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Btn
              kind="secondary"
              size="md"
              onClick={() => setShowResetConfirm(false)}
              style={{ flex: 1 }}
            >
              Cancel
            </Btn>
            <Btn kind="danger" size="md" onClick={handleReset} style={{ flex: 1 }}>
              Yes, reset
            </Btn>
          </div>
        </Card>
      )}

      <div
        style={{
          marginTop: 26,
          textAlign: 'center',
          fontFamily: T.mono,
          fontSize: 10,
          color: T.mute,
          letterSpacing: 0.6,
        }}
      >
        iller8 · built for Victor
      </div>
    </div>
  );
}

function Divider() {
  return <div style={{ height: 0.5, background: T.border }} />;
}

function Row({
  label,
  sub,
  trailing,
  last,
  onClick,
}: {
  label: string;
  sub?: string;
  trailing?: ReactNode;
  last?: boolean;
  onClick?: () => void;
}) {
  const style: CSSProperties = {
    padding: '14px 16px',
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    cursor: onClick ? 'pointer' : 'default',
    borderBottom: last ? 'none' : undefined,
  };
  return (
    <div style={style} onClick={onClick}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 500, color: T.text }}>{label}</div>
        {sub && <div style={{ fontSize: 11, color: T.dim, marginTop: 2 }}>{sub}</div>}
      </div>
      <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6, color: T.dim }}>
        {trailing}
      </div>
    </div>
  );
}
