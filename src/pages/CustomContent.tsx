import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { extractContent } from '../lib/claude';
import type { UserProgress } from '../store/types';

interface CustomContentProps {
  progress: UserProgress;
  script: 'latin' | 'cyrillic';
}

interface ExtractedPhrase {
  sr_latin: string;
  sr_cyrillic: string;
  en: string;
  context: string;
  notes?: string;
}

export default function CustomContent({ progress, script }: CustomContentProps) {
  const navigate = useNavigate();
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<{
    title: string;
    phrases: ExtractedPhrase[];
  } | null>(null);

  const hasApiKey = !!progress.settings.apiKey;

  const handleExtract = async () => {
    if (!input.trim() || !hasApiKey) return;
    setLoading(true);
    setError('');
    try {
      const data = await extractContent(input, progress.settings.apiKey);
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  if (!hasApiKey) {
    return (
      <div className="flex flex-col items-center gap-6 py-12 text-center">
        <span className="text-5xl">🔑</span>
        <h2 className="text-xl font-bold text-white">API Key Required</h2>
        <p className="text-gray-400 max-w-sm">
          To extract vocabulary from custom text, add your Anthropic API key in
          Settings.
        </p>
        <button
          onClick={() => navigate('/settings')}
          className="rounded-xl bg-amber-500 px-6 py-3 font-semibold text-navy-900"
        >
          Go to Settings
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 pb-4">
      <h1 className="text-2xl font-bold text-white">
        {script === 'cyrillic' ? 'Свој садржај' : 'Svoj sadržaj'}
      </h1>
      <p className="text-sm text-gray-400">
        Paste Serbian text — song lyrics, phrases you've heard, messages, articles — and
        extract vocabulary and phrases from it.
      </p>

      <textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Paste Serbian text here..."
        rows={6}
        className="w-full rounded-xl border-2 border-navy-600 bg-navy-800/50 p-4 text-white placeholder-gray-600 outline-none focus:border-amber-500 resize-y"
      />

      <button
        onClick={handleExtract}
        disabled={loading || !input.trim()}
        className="rounded-xl bg-amber-500 px-6 py-3 font-semibold text-navy-900 transition-opacity disabled:opacity-40"
      >
        {loading ? 'Extracting...' : 'Extract Phrases'}
      </button>

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {result && (
        <div className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold text-white">{result.title}</h2>
          <p className="text-sm text-gray-400">
            {result.phrases.length} phrases extracted
          </p>
          <div className="flex flex-col gap-3">
            {result.phrases.map((phrase, i) => (
              <div
                key={i}
                className="rounded-xl border border-navy-700 bg-navy-800/30 p-4"
              >
                <p className="text-lg text-white font-medium">
                  {script === 'cyrillic' ? phrase.sr_cyrillic : phrase.sr_latin}
                </p>
                <p className="text-sm text-gray-400 mt-1">{phrase.en}</p>
                {phrase.context && (
                  <p className="text-xs text-amber-400 mt-2">{phrase.context}</p>
                )}
                {phrase.notes && (
                  <p className="text-xs text-gray-500 mt-1">{phrase.notes}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
