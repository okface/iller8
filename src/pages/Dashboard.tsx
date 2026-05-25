import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { lessons, isLessonUnlocked, getAllPhrases } from '../data/lessons';
import { families } from '../data/phrase-families';
import { words } from '../data/words';
import { getWordBucket } from '../lib/word-progress';
import LessonCard from '../components/LessonCard';
import Card from '../components/ui/Card';
import LinearProgress from '../components/ui/LinearProgress';
import SectionHead from '../components/ui/SectionHead';
import MonoBadge from '../components/ui/MonoBadge';
import { IconAudio, IconChev, IconBolt, IconBrain, IconBook } from '../components/ui/Icons';
import { getDueItems } from '../engine/srs';
import { getTodayStats } from '../store/progress';
import { getTimeGreeting, getToday } from '../lib/utils';
import { T, metaLabel } from '../lib/tokens';
import type { UserProgress } from '../store/types';

interface DashboardProps {
  progress: UserProgress;
  script: 'latin' | 'cyrillic';
}

const DAY_LABELS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

export default function Dashboard({ progress, script }: DashboardProps) {
  const navigate = useNavigate();
  const greeting = getTimeGreeting();
  const todayStats = getTodayStats(progress);

  const dueCount = useMemo(
    () => getDueItems(progress.phrases).length,
    [progress.phrases]
  );

  const phraseOfDay = useMemo(() => {
    const all = getAllPhrases();
    if (all.length === 0) return null;
    const dayHash = getToday().split('-').reduce((a, b) => a + parseInt(b, 10), 0);
    return all[dayHash % all.length];
  }, []);

  const totalLearned = useMemo(
    () => Object.values(progress.phrases).filter((p) => p.bucket >= 1).length,
    [progress.phrases]
  );

  const accuracy =
    todayStats.totalAnswers > 0
      ? Math.round((todayStats.correctAnswers / todayStats.totalAnswers) * 100)
      : null;

  const nextLesson = useMemo(() => {
    return lessons.find((l) => {
      if (!isLessonUnlocked(l.id, progress.completedLessons)) return false;
      const totalPhrases = l.phraseGroups.reduce(
        (s, g) => s + g.phrases.length,
        0
      );
      const masteredInLesson = l.phraseGroups.reduce(
        (s, g) =>
          s + g.phrases.filter((p) => (progress.phrases[p.id]?.bucket ?? 0) >= 4).length,
        0
      );
      return masteredInLesson < totalPhrases;
    }) ?? lessons[0];
  }, [progress.completedLessons, progress.phrases]);

  const nextLessonStats = useMemo(() => {
    const total = nextLesson.phraseGroups.reduce((s, g) => s + g.phrases.length, 0);
    const learned = nextLesson.phraseGroups.reduce(
      (s, g) => s + g.phrases.filter((p) => (progress.phrases[p.id]?.bucket ?? 0) >= 1).length,
      0
    );
    return { total, learned };
  }, [nextLesson, progress.phrases]);

  const now = new Date();
  const dateLabel = `${DAY_LABELS[now.getDay()]} · ${now
    .getHours()
    .toString()
    .padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

  const greetingText = script === 'cyrillic' ? greeting.sr_cyrillic : greeting.sr_latin;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      <div style={metaLabel}>{dateLabel}</div>
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
        {greetingText}.
      </h1>
      <div style={{ fontSize: 13, color: T.dim }}>{greeting.en}.</div>

      {/* Stat row */}
      <div
        style={{
          marginTop: 16,
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 1,
          background: T.border,
          borderRadius: T.r2,
          overflow: 'hidden',
          border: `1px solid ${T.border}`,
        }}
      >
        {[
          { k: 'LEARNED', v: String(totalLearned), c: T.text },
          { k: 'DUE', v: String(dueCount), c: dueCount > 0 ? T.amber : T.text },
          {
            k: 'ACCURACY',
            v: accuracy !== null ? `${accuracy}%` : '—',
            c: accuracy !== null && accuracy >= 80 ? T.green : T.text,
          },
        ].map(({ k, v, c }) => (
          <div key={k} style={{ background: T.bg, padding: '12px 14px' }}>
            <div style={metaLabel}>{k}</div>
            <div
              style={{
                fontFamily: T.mono,
                fontSize: 20,
                fontWeight: 500,
                marginTop: 2,
                letterSpacing: -0.5,
                color: c,
              }}
            >
              {v}
            </div>
          </div>
        ))}
      </div>

      {/* Daily goal */}
      <Card style={{ marginTop: 16 }} pad={14}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            marginBottom: 8,
          }}
        >
          <span style={metaLabel}>DAILY GOAL</span>
          <span style={{ fontFamily: T.mono, fontSize: 11, color: T.text }}>
            {todayStats.phrasesStudied} / {progress.settings.dailyGoal}
          </span>
        </div>
        <LinearProgress value={todayStats.phrasesStudied} total={progress.settings.dailyGoal} />
      </Card>

      {/* Continue + Review side by side */}
      <div
        style={{
          marginTop: 16,
          display: 'grid',
          gridTemplateColumns: '1.5fr 1fr',
          gap: 8,
        }}
      >
        <Card
          warm
          pad={14}
          onClick={() => navigate(`/lesson/${nextLesson.id}`)}
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            minHeight: 100,
          }}
        >
          <div>
            <div style={{ ...metaLabel, color: T.amber }}>CONTINUE</div>
            <div
              style={{
                fontSize: 16,
                fontWeight: 600,
                marginTop: 6,
                letterSpacing: -0.2,
                color: T.text,
              }}
            >
              {String(nextLesson.order).padStart(2, '0')} ·{' '}
              {script === 'cyrillic'
                ? nextLesson.title.sr_cyrillic
                : nextLesson.title.sr_latin}
            </div>
            <div style={{ fontSize: 11, color: T.dim, marginTop: 3 }}>
              {nextLessonStats.learned} of {nextLessonStats.total} phrases
            </div>
          </div>
          <div style={{ marginTop: 10 }}>
            <LinearProgress value={nextLessonStats.learned} total={nextLessonStats.total} />
          </div>
        </Card>

        <Card
          pad={14}
          onClick={() => dueCount > 0 && navigate('/review')}
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            minHeight: 100,
            opacity: dueCount > 0 ? 1 : 0.5,
          }}
        >
          <div>
            <div style={metaLabel}>REVIEW</div>
            <div
              style={{
                fontSize: 16,
                fontWeight: 600,
                marginTop: 6,
                letterSpacing: -0.2,
                color: T.text,
              }}
            >
              {dueCount > 0 ? `${dueCount} due` : 'Nothing'}
            </div>
            <div style={{ fontSize: 11, color: T.dim, marginTop: 3 }}>
              {dueCount > 0 ? `~${Math.max(1, Math.round(dueCount / 3))} min` : 'all caught up'}
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
            <span style={{ color: dueCount > 0 ? T.amber : T.mute, display: 'flex' }}>
              <IconChev size={18} />
            </span>
          </div>
        </Card>
      </div>

      {/* Quick-access tiles — Words / Hammer / Perspective / Catalog */}
      <div style={{ marginTop: 16 }}>
        <SectionHead suffix="QUICK">JUMP IN</SectionHead>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: 8,
          }}
        >
          <Card
            warm
            pad={12}
            onClick={() => navigate('/words')}
            style={{ display: 'flex', flexDirection: 'column', gap: 6, minHeight: 96 }}
          >
            <span style={{ color: T.amber }}>
              <IconBook size={18} />
            </span>
            <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>Words</div>
            <div style={{ fontSize: 11, color: T.dim, lineHeight: 1.4 }}>
              Single words, both directions. Beginner-first.
            </div>
            <div style={{ marginTop: 'auto' }}>
              <MonoBadge kind="amber">
                {words.filter((w) => getWordBucket(progress, w.id) >= 1).length} / {words.length} met
              </MonoBadge>
            </div>
          </Card>
          <Card
            pad={12}
            onClick={() => navigate('/hammer')}
            style={{ display: 'flex', flexDirection: 'column', gap: 6, minHeight: 96 }}
          >
            <span style={{ color: T.amber }}>
              <IconBolt size={18} />
            </span>
            <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>Hammer</div>
            <div style={{ fontSize: 11, color: T.dim, lineHeight: 1.4 }}>
              Random phrases across all lessons.
            </div>
          </Card>
          <Card
            pad={12}
            onClick={() => navigate('/families')}
            style={{ display: 'flex', flexDirection: 'column', gap: 6, minHeight: 96 }}
          >
            <span style={{ color: T.purple }}>
              <IconBrain size={18} />
            </span>
            <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>Perspective</div>
            <div style={{ fontSize: 11, color: T.dim, lineHeight: 1.4 }}>
              Same phrase, many forms.
            </div>
            <div style={{ marginTop: 'auto' }}>
              <MonoBadge kind="purple">{families.length} fams</MonoBadge>
            </div>
          </Card>
          <Card
            pad={12}
            onClick={() => navigate('/catalog')}
            style={{ display: 'flex', flexDirection: 'column', gap: 6, minHeight: 96 }}
          >
            <span style={{ color: T.dim }}>
              <IconBook size={18} />
            </span>
            <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>Catalog</div>
            <div style={{ fontSize: 11, color: T.dim, lineHeight: 1.4 }}>
              Browse every phrase.
            </div>
          </Card>
        </div>
      </div>

      {/* Phrase of the day */}
      {phraseOfDay && (
        <Card style={{ marginTop: 16 }} pad={16}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span style={metaLabel}>PHRASE OF THE DAY</span>
            <button
              style={{
                background: 'none',
                border: 'none',
                color: T.mute,
                cursor: 'not-allowed',
                padding: 0,
              }}
              disabled
              aria-label="audio (coming soon)"
            >
              <IconAudio size={14} />
            </button>
          </div>
          <div
            className="font-serif-sr"
            style={{
              fontSize: 24,
              fontWeight: 500,
              marginTop: 10,
              color: T.text,
            }}
          >
            {script === 'cyrillic'
              ? phraseOfDay.phrase.sr_cyrillic
              : phraseOfDay.phrase.sr_latin}
          </div>
          <div style={{ fontSize: 13, color: T.amber, marginTop: 4 }}>
            {phraseOfDay.phrase.en}
          </div>
          {phraseOfDay.phrase.context && (
            <div
              className="font-serif-sr"
              style={{
                fontStyle: 'italic',
                fontSize: 12,
                color: T.mute,
                marginTop: 6,
                lineHeight: 1.5,
              }}
            >
              {phraseOfDay.phrase.context}
            </div>
          )}
        </Card>
      )}

      {/* Lesson list */}
      <div style={{ marginTop: 24 }}>
        <SectionHead suffix={String(lessons.length)}>LESSONS</SectionHead>
        <div>
          {lessons.map((lesson, i) => (
            <LessonCard
              key={lesson.id}
              lesson={lesson}
              script={script}
              completed={progress.completedLessons.includes(lesson.id)}
              unlocked={isLessonUnlocked(lesson.id, progress.completedLessons)}
              phraseProgress={progress.phrases}
              topBorder={i === 0}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
