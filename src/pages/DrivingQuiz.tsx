import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Card from '../components/ui/Card';
import Btn from '../components/ui/Btn';
import LinearProgress from '../components/ui/LinearProgress';
import RingProgress from '../components/ui/RingProgress';
import MonoBadge from '../components/ui/MonoBadge';
import { IconBack } from '../components/ui/Icons';
import DrivingQuestionCard from '../components/driving/DrivingQuestionCard';
import { T, metaLabel } from '../lib/tokens';
import { buildSession, EXAM_PASS } from '../driving/session';
import { loadDrivingState, recordDrivingAnswer, saveDrivingState } from '../driving/progress';
import type { DrivingMode, DrivingQuestion } from '../driving/types';

/**
 * The körkortsteori quiz loop. Reads ?mode= from the URL, builds the session
 * once, then steps through questions. Persists to the SEPARATE driving store
 * only — it never touches the Serbian progress / streak / daily stats.
 */
export default function DrivingQuiz() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const mode = (params.get('mode') ?? 'quick10') as DrivingMode;
  const isExam = mode === 'exam';

  // The session order is built once per ?mode= from the snapshot at mount.
  const initial = useMemo(() => buildSession(mode, loadDrivingState()), [mode]);

  const [session, setSession] = useState<DrivingQuestion[]>(initial);
  const [index, setIndex] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [missed, setMissed] = useState<DrivingQuestion[]>([]);
  const total = session.length;
  const done = index >= total;

  const handleAnswer = (correct: boolean) => {
    const q = session[index];
    saveDrivingState(recordDrivingAnswer(loadDrivingState(), q.id, correct));
    if (correct) setCorrectCount((c) => c + 1);
    else setMissed((m) => [...m, q]);
    setIndex((i) => i + 1);
  };

  // SPA-local restart — no full page reload.
  const restart = (questions: DrivingQuestion[]) => {
    setSession(questions);
    setIndex(0);
    setCorrectCount(0);
    setMissed([]);
  };

  if (total === 0) {
    return (
      <div style={{ textAlign: 'center', paddingTop: 60 }}>
        <div style={{ color: T.dim, marginBottom: 16 }}>No questions for this mode.</div>
        <Btn kind="secondary" onClick={() => navigate('/driving')}>
          Back
        </Btn>
      </div>
    );
  }

  if (done) {
    const pct = Math.round((correctCount / total) * 100);
    const passed = correctCount >= EXAM_PASS;
    const ringColor = isExam ? (passed ? T.green : T.red) : pct >= 80 ? T.green : T.amber;
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 18,
          paddingTop: 40,
          textAlign: 'center',
        }}
      >
        {isExam && (
          <MonoBadge kind={passed ? 'green' : 'red'}>{passed ? 'GODKÄND · PASS' : 'UNDERKÄND · FAIL'}</MonoBadge>
        )}
        <RingProgress
          value={correctCount}
          total={total}
          size={120}
          stroke={8}
          color={ringColor}
          label={`${pct}%`}
        />
        <div>
          <div style={{ fontSize: 22, fontWeight: 700, color: T.text }}>
            {correctCount} / {total} correct
          </div>
          <div style={{ fontSize: 13, color: T.dim, marginTop: 4 }}>
            {isExam
              ? `Pass mark: ${EXAM_PASS} / ${total}`
              : pct >= 80
                ? 'Nice — you know your stuff.'
                : 'Good effort — keep practising.'}
          </div>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 10, marginTop: 8 }}>
          {missed.length > 0 && (
            <Btn kind="primary" onClick={() => restart([...missed])}>
              Retry {missed.length} missed
            </Btn>
          )}
          <Btn
            kind={missed.length > 0 ? 'secondary' : 'primary'}
            onClick={() => restart(buildSession(mode, loadDrivingState()))}
          >
            Again
          </Btn>
          <Btn kind="ghost" onClick={() => navigate('/driving')}>
            Home
          </Btn>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Progress header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button
          onClick={() => navigate('/driving')}
          style={{
            background: 'transparent',
            border: 'none',
            color: T.dim,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
          }}
          aria-label="Back to driving menu"
        >
          <IconBack size={18} />
        </button>
        <div style={{ flex: 1 }}>
          <LinearProgress value={index} total={total} />
        </div>
        <span style={{ ...metaLabel, fontSize: 12, color: T.dim, whiteSpace: 'nowrap' }}>
          {isExam ? 'EXAM · ' : ''}
          {index + 1} / {total}
        </span>
      </div>

      <Card pad={18}>
        <DrivingQuestionCard key={index} question={session[index]} onAnswer={handleAnswer} />
      </Card>
    </div>
  );
}
