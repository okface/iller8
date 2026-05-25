import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { extractContent } from '../lib/claude';
import Card from '../components/ui/Card';
import SectionHead from '../components/ui/SectionHead';
import MonoBadge from '../components/ui/MonoBadge';
import Btn from '../components/ui/Btn';
import { IconSpark } from '../components/ui/Icons';
import { T, metaLabel } from '../lib/tokens';
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
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '48px 0', textAlign: 'center' }}>
        <span style={{ fontSize: 40 }}>🔑</span>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: T.text }}>API key required</h2>
        <p style={{ color: T.dim, maxWidth: 320 }}>
          To extract vocabulary from custom text, add your Anthropic API key in Settings.
        </p>
        <Btn kind="primary" size="lg" onClick={() => navigate('/settings')}>
          Go to Settings
        </Btn>
      </div>
    );
  }

  const lineCount = input ? input.split('\n').filter((l) => l.trim()).length : 0;
  const wordCount = input ? input.trim().split(/\s+/).filter(Boolean).length : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h1
          style={{
            fontSize: 28,
            fontWeight: 700,
            letterSpacing: -0.6,
            margin: '0',
            color: T.text,
          }}
        >
          {script === 'cyrillic' ? 'Свој садржај' : 'Custom content'}
        </h1>
        <MonoBadge kind="amber">
          <IconSpark size={11} /> BETA
        </MonoBadge>
      </div>
      <div style={metaLabel}>BUILD YOUR OWN LESSON</div>
      <p style={{ fontSize: 13, color: T.dim, marginTop: 8, lineHeight: 1.55 }}>
        Paste Serbian text — chat snippets, song lyrics, articles — and we'll mine the phrases for you.
      </p>

      <div style={{ marginTop: 16 }}>
        <SectionHead>YOUR TEXT</SectionHead>
        <Card pad={14}>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Paste Serbian text here…"
            rows={8}
            className="font-serif-sr"
            style={{
              width: '100%',
              padding: 0,
              border: 'none',
              outline: 'none',
              resize: 'vertical',
              background: 'transparent',
              color: T.text,
              fontSize: 15,
              lineHeight: 1.65,
            }}
          />
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: 12,
              paddingTop: 12,
              borderTop: `0.5px solid ${T.border}`,
            }}
          >
            <span style={{ fontFamily: T.mono, fontSize: 11, color: T.dim }}>
              {lineCount} lines · {wordCount} words
            </span>
            <button
              onClick={() => setInput('')}
              style={{
                background: 'none',
                border: 'none',
                color: T.amber,
                fontFamily: T.mono,
                fontSize: 11,
                padding: 0,
                cursor: 'pointer',
              }}
            >
              CLEAR
            </button>
          </div>
        </Card>
      </div>

      <div style={{ marginTop: 16 }}>
        <Btn
          kind="primary"
          size="lg"
          full
          onClick={handleExtract}
          disabled={loading || !input.trim()}
        >
          {loading ? 'Extracting…' : 'Extract phrases'}
        </Btn>
      </div>

      {error && (
        <Card
          pad={12}
          style={{ marginTop: 12, borderColor: 'rgba(239,68,68,0.3)', background: T.redDim }}
        >
          <p style={{ color: T.red, fontSize: 13, margin: 0 }}>{error}</p>
        </Card>
      )}

      {result && (
        <div style={{ marginTop: 22 }}>
          <SectionHead suffix={`${result.phrases.length} FOUND`}>DETECTED PHRASES</SectionHead>
          <h2 style={{ fontSize: 16, fontWeight: 600, color: T.text, marginTop: 0, marginBottom: 8 }}>
            {result.title}
          </h2>
          <Card pad={0}>
            {result.phrases.map((p, i) => (
              <div
                key={i}
                style={{
                  padding: '12px 14px',
                  borderTop: i === 0 ? 'none' : `0.5px solid ${T.border}`,
                }}
              >
                <div className="font-serif-sr" style={{ fontSize: 15, fontWeight: 500, color: T.text }}>
                  {script === 'cyrillic' ? p.sr_cyrillic : p.sr_latin}
                </div>
                <div style={{ fontSize: 11, color: T.dim, marginTop: 2 }}>{p.en}</div>
                {p.context && (
                  <div style={{ fontSize: 11, color: T.amber, marginTop: 4 }}>{p.context}</div>
                )}
                {p.notes && (
                  <div
                    className="font-serif-sr"
                    style={{ fontStyle: 'italic', fontSize: 11, color: T.mute, marginTop: 4 }}
                  >
                    {p.notes}
                  </div>
                )}
              </div>
            ))}
          </Card>
        </div>
      )}
    </div>
  );
}
