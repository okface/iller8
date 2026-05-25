import { useMemo } from 'react';
import { lessons } from '../data/lessons';
import AchievementBadge from '../components/AchievementBadge';
import Card from '../components/ui/Card';
import SectionHead from '../components/ui/SectionHead';
import achievementsData from '../data/achievements.json';
import type { UserProgress, Achievement } from '../store/types';
import { getDaysAgo } from '../lib/utils';
import { T, metaLabel } from '../lib/tokens';

interface StatsProps {
  progress: UserProgress;
  script: 'latin' | 'cyrillic';
}

export default function Stats({ progress, script }: StatsProps) {
  const achievements = achievementsData as Achievement[];

  const stats = useMemo(() => {
    const allPhrases = lessons.flatMap((l) =>
      l.phraseGroups.flatMap((g) => g.phrases)
    );
    const totalPhrases = allPhrases.length;
    const learned = Object.values(progress.phrases).filter(
      (p) => p.bucket >= 1
    ).length;
    const learning = Object.values(progress.phrases).filter(
      (p) => p.bucket >= 1 && p.bucket <= 2
    ).length;
    const reviewing = Object.values(progress.phrases).filter(
      (p) => p.bucket >= 3 && p.bucket <= 4
    ).length;
    const mastered = Object.values(progress.phrases).filter(
      (p) => p.bucket >= 5
    ).length;
    const newCount = totalPhrases - learned;

    const totalCorrect = Object.values(progress.phrases).reduce(
      (sum, p) => sum + p.correctCount,
      0
    );
    const totalIncorrect = Object.values(progress.phrases).reduce(
      (sum, p) => sum + p.incorrectCount,
      0
    );
    const totalAnswers = totalCorrect + totalIncorrect;
    const accuracy = totalAnswers > 0 ? Math.round((totalCorrect / totalAnswers) * 100) : 0;

    return {
      totalPhrases,
      learned,
      learning,
      reviewing,
      mastered,
      newCount,
      accuracy,
      totalAnswers,
    };
  }, [progress.phrases]);

  const activityCells = useMemo(() => {
    const days: { active: boolean; count: number }[] = [];
    for (let i = 27; i >= 0; i--) {
      const date = getDaysAgo(i);
      const dayStats = progress.dailyStats.find((s) => s.date === date);
      const count = dayStats?.phrasesStudied ?? 0;
      days.push({ active: count > 0, count });
    }
    return days;
  }, [progress.dailyStats]);

  const activeCount = activityCells.filter((c) => c.active).length;

  const cellColor = (count: number) => {
    if (count === 0) return 'rgba(255,255,255,0.05)';
    if (count < 5) return 'rgba(255,193,7,0.2)';
    if (count < 10) return 'rgba(255,193,7,0.5)';
    return T.amber;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      <div style={metaLabel}>CURRENT STREAK</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 6 }}>
        <span
          style={{
            fontSize: 56,
            fontWeight: 700,
            letterSpacing: -2,
            lineHeight: 1,
            color: T.text,
          }}
        >
          {progress.currentStreak}
        </span>
        <span style={{ fontFamily: T.mono, fontSize: 12, color: T.dim }}>days</span>
        <span
          style={{
            marginLeft: 'auto',
            fontFamily: T.mono,
            fontSize: 11,
            color: T.amber,
          }}
        >
          ▲ best {progress.longestStreak}
        </span>
      </div>

      {/* Activity grid */}
      <div style={{ marginTop: 24 }}>
        <SectionHead suffix={`${activeCount} / 28 ACTIVE`}>LAST 28 DAYS</SectionHead>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 5 }}>
          {activityCells.map((c, i) => (
            <div
              key={i}
              title={`${c.count} phrases`}
              style={{ aspectRatio: '1/1', borderRadius: 4, background: cellColor(c.count) }}
            />
          ))}
        </div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'center',
            gap: 4,
            marginTop: 10,
          }}
        >
          <span style={{ ...metaLabel, marginRight: 4 }}>less</span>
          {[0, 3, 7, 15].map((c) => (
            <div key={c} style={{ width: 10, height: 10, borderRadius: 2, background: cellColor(c) }} />
          ))}
          <span style={{ ...metaLabel, marginLeft: 4 }}>more</span>
        </div>
      </div>

      {/* Mastery */}
      <div style={{ marginTop: 28 }}>
        <SectionHead>MASTERY</SectionHead>
        {[
          { label: 'New', v: stats.newCount, c: T.mute },
          { label: 'Learning', v: stats.learning, c: T.amber },
          { label: 'Reviewing', v: stats.reviewing, c: T.purple },
          { label: 'Mastered', v: stats.mastered, c: T.green },
        ].map((row) => {
          const pct = stats.totalPhrases > 0 ? (row.v / stats.totalPhrases) * 100 : 0;
          return (
            <div
              key={row.label}
              style={{
                display: 'grid',
                gridTemplateColumns: '90px 1fr 36px',
                gap: 10,
                alignItems: 'center',
                marginBottom: 8,
              }}
            >
              <span style={{ fontFamily: T.mono, fontSize: 11, color: T.dim }}>{row.label}</span>
              <div style={{ height: 6, background: T.border, borderRadius: 3, overflow: 'hidden' }}>
                <div
                  style={{
                    width: `${pct}%`,
                    height: '100%',
                    background: row.c,
                    transition: `width ${T.slow} ${T.ease}`,
                  }}
                />
              </div>
              <span
                style={{
                  fontFamily: T.mono,
                  fontSize: 11,
                  color: T.text,
                  textAlign: 'right',
                }}
              >
                {row.v}
              </span>
            </div>
          );
        })}
      </div>

      {/* Overall accuracy */}
      <div style={{ marginTop: 28 }}>
        <SectionHead>ACCURACY</SectionHead>
        <Card pad={16}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <span
              style={{
                fontFamily: T.mono,
                fontSize: 32,
                fontWeight: 600,
                color: stats.accuracy >= 80 ? T.green : T.text,
                letterSpacing: -1,
              }}
            >
              {stats.accuracy}%
            </span>
            <span style={{ fontSize: 12, color: T.dim }}>{stats.totalAnswers} answers total</span>
          </div>
        </Card>
      </div>

      {/* Per lesson */}
      <div style={{ marginTop: 28 }}>
        <SectionHead>PER LESSON</SectionHead>
        {lessons.map((lesson, i) => {
          const phraseCount = lesson.phraseGroups.reduce((s, g) => s + g.phrases.length, 0);
          const learnedInLesson = lesson.phraseGroups.reduce(
            (s, g) =>
              s + g.phrases.filter((p) => (progress.phrases[p.id]?.bucket ?? 0) >= 1).length,
            0
          );
          const pct = phraseCount > 0 ? Math.round((learnedInLesson / phraseCount) * 100) : 0;
          return (
            <div
              key={lesson.id}
              style={{
                display: 'grid',
                gridTemplateColumns: '40px 1fr 56px',
                alignItems: 'center',
                gap: 12,
                padding: '12px 0',
                borderTop: i === 0 ? `0.5px solid ${T.border}` : `0.5px solid ${T.border}`,
                borderBottom: i === lessons.length - 1 ? `0.5px solid ${T.border}` : undefined,
              }}
            >
              <span style={{ fontFamily: T.mono, fontSize: 11, color: T.dim }}>
                {String(lesson.order).padStart(2, '0')}
              </span>
              <span style={{ fontSize: 14, fontWeight: 500 }}>
                {script === 'cyrillic' ? lesson.title.sr_cyrillic : lesson.title.sr_latin}
              </span>
              <span
                style={{
                  fontFamily: T.mono,
                  fontSize: 12,
                  color: pct === 100 ? T.green : T.text,
                  textAlign: 'right',
                }}
              >
                {pct}%
              </span>
            </div>
          );
        })}
      </div>

      {/* Achievements */}
      <div style={{ marginTop: 28 }}>
        <SectionHead
          suffix={`${progress.achievements.length} / ${achievements.length}`}
        >
          ACHIEVEMENTS
        </SectionHead>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
          {achievements.map((a) => (
            <AchievementBadge
              key={a.id}
              achievement={a}
              unlocked={progress.achievements.includes(a.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
