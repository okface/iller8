interface ScriptToggleProps {
  script: 'latin' | 'cyrillic';
  onChange: (script: 'latin' | 'cyrillic') => void;
}

export default function ScriptToggle({ script, onChange }: ScriptToggleProps) {
  return (
    <div className="flex items-center gap-1 rounded-lg bg-navy-800/50 p-1">
      <button
        onClick={() => onChange('latin')}
        className={`rounded-md px-3 py-1 text-sm font-medium transition-colors ${
          script === 'latin'
            ? 'bg-amber-500 text-navy-900'
            : 'text-gray-400 hover:text-gray-200'
        }`}
      >
        Lat
      </button>
      <button
        onClick={() => onChange('cyrillic')}
        className={`rounded-md px-3 py-1 text-sm font-medium transition-colors ${
          script === 'cyrillic'
            ? 'bg-amber-500 text-navy-900'
            : 'text-gray-400 hover:text-gray-200'
        }`}
      >
        Ћир
      </button>
    </div>
  );
}
