import { useNavigate } from 'react-router-dom';
import Card from '../components/ui/Card';
import RingProgress from '../components/ui/RingProgress';
import MonoBadge from '../components/ui/MonoBadge';
import { IconChev } from '../components/ui/Icons';
import { T, metaLabel } from '../lib/tokens';
import { loadDrivingState } from '../driving/progress';
import { QUESTIONS, EXAM_SIZE, listTopics, masteredByTopic, topicLabel } from '../driving/session';
import type { DrivingMode } from '../driving/types';

/**
 * Entry screen for the körkortsteori track. A clearly-separate module from the
 * Serbian content: pick a mode (Quick 10 / Exam / by topic / all) and see
 * mastery. UI chrome is English; exam-domain terms stay Swedish.
 */
export default function DrivingHome() {
  const navigate = useNavigate();
  const state = loadDrivingState();

  const total = QUESTIONS.length;
  const seen = Object.keys(state.questions).length;
  const mastered = Object.values(state.questions).filter((q) => q.bucket >= 5).length;
  const accuracy =
    state.totalAnswered > 0 ? Math.round((state.totalCorrect / state.totalAnswered) * 100) : 0;
  const topics = listTopics();
  const topicMastered = masteredByTopic(state);

  const start = (mode: DrivingMode) => navigate(`/driving/quiz?mode=${encodeURIComponent(mode)}`);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      <div style={metaLabel}>KÖRKORTSTEORI</div>
      <h1
        style={{
          fontSize: 28,
          fontWeight: 700,
          letterSpacing: -0.6,
          margin: '8px 0 4px',
          lineHeight: 1.1,
          color: T.text,
        }}
      >
        Körkortsteori 🚗
      </h1>
      <div style={{ fontSize: 13, color: T.dim }}>
        Swedish driving-licence quiz — a separate track from your Serbian.
      </div>

      {/* Mastery summary */}
      <Card pad={16} style={{ marginTop: 18, display: 'flex', alignItems: 'center', gap: 16 }}>
        <RingProgress value={mastered} total={total} size={56} stroke={5} color={T.green} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: T.text }}>
            {mastered} / {total} mastered
          </div>
          <div style={{ fontSize: 12, color: T.dim, marginTop: 2 }}>
            {seen} seen · {accuracy}% all-time accuracy
          </div>
        </div>
      </Card>

      {/* Quick 10 — hero */}
      <Card
        warm
        pad={16}
        onClick={() => start('quick10')}
        style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 8 }}
      >
        <div style={{ ...metaLabel, color: T.amber }}>QUICK SESSION</div>
        <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: -0.3, color: T.text }}>
          Quick 10
        </div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: 12,
            color: T.dim,
          }}
        >
          <span>10 questions, weak ones first</span>
          <span style={{ color: T.amber, display: 'flex', alignItems: 'center', gap: 4 }}>
            Start <IconChev size={16} />
          </span>
        </div>
      </Card>

      {/* Exam mode */}
      <Card
        pad={14}
        onClick={() => start('exam')}
        style={{
          marginTop: 8,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <MonoBadge kind="purple">EXAM</MonoBadge>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: T.text }}>Mock test</div>
            <div style={{ fontSize: 11, color: T.dim, marginTop: 2 }}>
              {EXAM_SIZE} mixed questions · pass/fail like the real thing
            </div>
          </div>
        </div>
        <span style={{ color: T.mute, display: 'flex' }}>
          <IconChev size={18} />
        </span>
      </Card>

      {/* Topics */}
      <div style={{ ...metaLabel, marginTop: 24, marginBottom: 8 }}>BY TOPIC</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {topics.map(({ topic, count }) => (
          <Card
            key={topic}
            pad={14}
            onClick={() => start(`topic:${topic}`)}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
          >
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: T.text }}>
                {topicLabel(topic)}
              </div>
              <div style={{ fontSize: 11, color: T.dim, marginTop: 2 }}>
                {topicMastered[topic] ?? 0} / {count} mastered
              </div>
            </div>
            <span style={{ color: T.mute, display: 'flex' }}>
              <IconChev size={18} />
            </span>
          </Card>
        ))}
      </div>

      {/* All */}
      <Card
        pad={14}
        onClick={() => start('all')}
        style={{
          marginTop: 8,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <MonoBadge kind="amber">ALL</MonoBadge>
          <div style={{ fontSize: 14, fontWeight: 600, color: T.text }}>
            Full set — {total} questions
          </div>
        </div>
        <span style={{ color: T.mute, display: 'flex' }}>
          <IconChev size={18} />
        </span>
      </Card>
    </div>
  );
}
