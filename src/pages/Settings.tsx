import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  updateSettings,
  saveProgress,
  resetProgress,
  exportProgress,
  importProgress,
} from '../store/progress';
import type { UserProgress } from '../store/types';

interface SettingsProps {
  progress: UserProgress;
  setProgress: (p: UserProgress) => void;
  script: 'latin' | 'cyrillic';
}

export default function Settings({
  progress,
  setProgress,
  script,
}: SettingsProps) {
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

  return (
    <div className="flex flex-col gap-6 pb-4">
      <h1 className="text-2xl font-bold text-white">
        {script === 'cyrillic' ? 'Подешавања' : 'Podešavanja'}
      </h1>

      <Section title="Script Preference">
        <div className="flex gap-2">
          {(['latin', 'cyrillic', 'both'] as const).map((opt) => (
            <button
              key={opt}
              onClick={() => update({ scriptPreference: opt })}
              className={`flex-1 rounded-xl border-2 p-3 text-sm font-medium transition-colors ${
                settings.scriptPreference === opt
                  ? 'border-amber-500 bg-amber-500/10 text-amber-400'
                  : 'border-navy-600 text-gray-400 hover:border-navy-500'
              }`}
            >
              {opt === 'latin' ? 'Latin' : opt === 'cyrillic' ? 'Ћирилица' : 'Both'}
            </button>
          ))}
        </div>
      </Section>

      <Section title="Daily Goal">
        <div className="flex gap-2">
          {[5, 10, 15, 20].map((goal) => (
            <button
              key={goal}
              onClick={() => update({ dailyGoal: goal })}
              className={`flex-1 rounded-xl border-2 p-3 text-sm font-medium transition-colors ${
                settings.dailyGoal === goal
                  ? 'border-amber-500 bg-amber-500/10 text-amber-400'
                  : 'border-navy-600 text-gray-400 hover:border-navy-500'
              }`}
            >
              {goal}
            </button>
          ))}
        </div>
      </Section>

      <Section title="Claude API Key">
        <p className="text-xs text-gray-500 mb-2">
          Optional. Enables custom content extraction from pasted Serbian text.
        </p>
        <input
          type="password"
          value={settings.apiKey}
          onChange={(e) => update({ apiKey: e.target.value })}
          placeholder="sk-ant-..."
          className="w-full rounded-xl border-2 border-navy-600 bg-navy-800/50 p-3 text-sm text-white placeholder-gray-600 outline-none focus:border-amber-500"
        />
      </Section>

      <Section title="Data">
        <div className="flex gap-3">
          <button
            onClick={handleExport}
            className="flex-1 rounded-xl border border-navy-600 p-3 text-sm text-gray-400 hover:text-white transition-colors"
          >
            Export Progress
          </button>
          <button
            onClick={handleImport}
            className="flex-1 rounded-xl border border-navy-600 p-3 text-sm text-gray-400 hover:text-white transition-colors"
          >
            Import Progress
          </button>
        </div>
        {importError && (
          <p className="text-sm text-incorrect mt-2">{importError}</p>
        )}
      </Section>

      <Section title="Reset">
        {!showResetConfirm ? (
          <button
            onClick={() => setShowResetConfirm(true)}
            className="w-full rounded-xl border border-red-500/30 p-3 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
          >
            Reset All Progress
          </button>
        ) : (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-red-400">
              This will delete all your progress. Are you sure?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="flex-1 rounded-xl border border-navy-600 p-3 text-sm text-gray-400"
              >
                Cancel
              </button>
              <button
                onClick={handleReset}
                className="flex-1 rounded-xl bg-red-500 p-3 text-sm font-semibold text-white"
              >
                Yes, reset
              </button>
            </div>
          </div>
        )}
      </Section>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-navy-700 bg-navy-800/30 p-4">
      <h3 className="text-sm font-medium text-gray-400 mb-3">{title}</h3>
      {children}
    </div>
  );
}
