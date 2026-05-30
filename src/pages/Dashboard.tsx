import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { lessons, isLessonUnlocked, getAllPhrases } from '../data/lessons';
import { families } from '../data/phrase-families';
import { words } from '../data/words';
import { getWordBucket } from '../lib/word-progress';
import { getDailySummary } from '../engine/daily-session';
import LessonCard from '../components/LessonCard';
import Card from '../components/ui/Card';
import Btn from '../components/ui/Btn';
import LinearProgress from '../components/ui/LinearProgress';
import SectionHead from '../components/ui/SectionHead';
import MonoBadge from '../components/ui/MonoBadge';
import { IconChev, IconBolt, IconBrain, IconBook } from '../components/ui/Icons';
import AudioButton from '../components/ui/AudioButton';
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

  const dailySummary = useMemo(
    () =>
      getDailySummary(
        { progress, script, skipTyping: progress.settings.skipTyping },
        15
      ),
    [progress, script]
  );
  // nextLesson and nextLessonStats remain available for future "continue
  // the specific lesson you were on" surfaces. The Continue card itself
  // now points at /daily, the unified front door.
  void nextLessonStats;

  // Phrases the learner can now actually say (mastered, bucket >= 4).
  // Words and family variants are excluded — this is about whole phrases
  // they could speak. The emotional payoff for a solo learner.
  const canSay = useMemo(() => {
    return getAllPhrases()
      .filter(({ phrase }) => (progress.phrases[phrase.id]?.bucket ?? 0) >= 4)
      .map(({ phrase }) => phrase);
  }, [progress.phrases]);

  // Streak-at-risk: studied before, but not yet today.
  const streakAtRisk =
    progress.currentStreak > 0 && progress.lastActiveDate !== getToday();

  const now = new Date();
  const dateLabel = `${DAY_LABELS[now.getDay()]} · ${now
    .getHours()
    .toString()
    .padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

  const greetingText = script === 'cyrillic' ? greeting.sr_cyrillic : greeting.sr_latin;

  // ── Day-1 experience ────────────────────────────────────────
  // A brand-new learner (nothing studied) gets ONE clear action, not the
  // full expert dashboard (5 drill modes, 11 filters, 10 lessons). The
  // tester flagged the choice paralysis; the don't-do list forbids it.
  if (totalLearned === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        <div style={metaLabel}>DAY 1</div>
        <h1
          style={{
            fontSize: 30,
            fontWeight: 700,
            letterSpacing: -0.7,
            margin: '8px 0 4px',
            lineHeight: 1.1,
            color: T.text,
          }}
        >
          {greetingText}.
        </h1>
        <p style={{ fontSize: 14, color: T.dim, lineHeight: 1.55, maxWidth: 380, marginTop: 6 }}>
          Welcome. Let's learn some Serbian — starting with the most common
          words and a few easy phrases. About five minutes.
        </p>

        <Card warm pad={18} style={{ marginTop: 22 }}>
          <div style={{ ...metaLabel, color: T.amber }}>START HERE</div>
          <div style={{ fontSize: 18, fontWeight: 700, marginTop: 8, letterSpacing: -0.3 }}>
            Your first session
          </div>
          <div style={{ fontSize: 13, color: T.dim, marginTop: 4, lineHeight: 1.5 }}>
            Hear it, see both scripts, pick the meaning. We'll repeat what you
            miss and remember what you know.
          </div>
          <div style={{ marginTop: 16 }}>
            <Btn kind="primary" size="lg" full onClick={() => navigate('/daily')}>
              Start learning
            </Btn>
          </div>
        </Card>

        {phraseOfDay && (
          <Card style={{ marginTop: 16 }} pad={16}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span style={metaLabel}>A TASTE</span>
              <AudioButton text={phraseOfDay.phrase.sr_latin} size={14} />
            </div>
            <div
              className="font-serif-sr"
              style={{ fontSize: 24, fontWeight: 500, marginTop: 10, color: T.text }}
            >
              {script === 'cyrillic'
                ? phraseOfDay.phrase.sr_cyrillic
                : phraseOfDay.phrase.sr_latin}
            </div>
            <div style={{ fontSize: 13, color: T.amber, marginTop: 4 }}>
              {phraseOfDay.phrase.en}
            </div>
          </Card>
        )}
      </div>
    );
  }

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

      {/* Streak-at-risk banner — the cheapest daily-return hook for a
          no-backend app. Only when there's a streak and today isn't done. */}
      {streakAtRisk && (
        <Card
          warm
          pad={12}
          onClick={() => navigate('/daily')}
          style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 10 }}
        >
          <span style={{ fontSize: 18 }}>🔥</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>
              {progress.currentStreak}-day streak
            </div>
            <div style={{ fontSize: 11, color: T.dim }}>
              Do today's session to keep it alive.
            </div>
          </div>
          <span style={{ color: T.amber, display: 'flex' }}>
            <IconChev size={18} />
          </span>
        </Card>
      )}

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
          onClick={() => navigate('/daily')}
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            minHeight: 100,
          }}
        >
          <div>
            <div style={{ ...metaLabel, color: T.amber }}>DAILY SESSION</div>
            <div
              style={{
                fontSize: 16,
                fontWeight: 600,
                marginTop: 6,
                letterSpacing: -0.2,
                color: T.text,
              }}
            >
              Tap to start
            </div>
            <div style={{ fontSize: 11, color: T.dim, marginTop: 3 }}>
              {dailySummary.newCount} new · {dailySummary.reviewCount} review · {dailySummary.consolidationCount} practice
            </div>
          </div>
          <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontFamily: T.mono, fontSize: 11, color: T.amber }}>
              ~15 items
            </span>
            <span style={{ color: T.amber, display: 'flex' }}>
              <IconChev size={18} />
            </span>
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
            <AudioButton text={phraseOfDay.phrase.sr_latin} size={14} />
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

      {/* Things you can say — mastered phrases, the emotional payoff.
          Turns abstract bucket numbers into "I can actually say this." */}
      {canSay.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <SectionHead suffix={String(canSay.length)}>YOU CAN SAY</SectionHead>
          <Card pad={0}>
            {canSay.slice(0, 6).map((phrase, i) => (
              <div
                key={phrase.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '10px 14px',
                  borderTop: i === 0 ? 'none' : `0.5px solid ${T.border}`,
                }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: T.green,
                    flexShrink: 0,
                  }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    className="font-serif-sr"
                    style={{ fontSize: 15, fontWeight: 500, color: T.text }}
                  >
                    {script === 'cyrillic' ? phrase.sr_cyrillic : phrase.sr_latin}
                  </div>
                  <div style={{ fontSize: 11, color: T.dim, marginTop: 1 }}>{phrase.en}</div>
                </div>
                <AudioButton text={phrase.sr_latin} size={14} />
              </div>
            ))}
            {canSay.length > 6 && (
              <div
                onClick={() => navigate('/catalog')}
                style={{
                  padding: '10px 14px',
                  fontSize: 11,
                  color: T.mute,
                  fontFamily: T.mono,
                  borderTop: `0.5px solid ${T.border}`,
                  textAlign: 'center',
                  cursor: 'pointer',
                }}
              >
                +{canSay.length - 6} more — see all
              </div>
            )}
          </Card>
        </div>
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
