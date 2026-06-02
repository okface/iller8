import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDailySummary } from '../engine/daily-session';
import { getTimeGreeting, getToday } from '../lib/utils';
import { getTodayStats } from '../store/progress';
import PathTrail from '../components/PathTrail';
import Card from '../components/ui/Card';
import LinearProgress from '../components/ui/LinearProgress';
import { IconChev } from '../components/ui/Icons';
import { T, metaLabel } from '../lib/tokens';
import type { UserProgress } from '../store/types';

interface PathProps {
  progress: UserProgress;
  script: 'latin' | 'cyrillic';
}

/**
 * Home = the learning PATH. One clear action (Continue → the smart daily
 * session) on top, then the gamified grammar trail. Deliberately spare — the
 * old Dashboard's stat grids, 4-tile jump-in, phrase-of-day, "you can say" and
 * the full lesson list moved to Browse / Me.
 */
export default function Path({ progress, script }: PathProps) {
  const navigate = useNavigate();
  const greeting = getTimeGreeting();
  const greetingText = script === 'cyrillic' ? greeting.sr_cyrillic : greeting.sr_latin;

  const sessionSize = Math.min(25, Math.max(5, progress.settings.dailyGoal || 15));
  const summary = useMemo(
    () => getDailySummary({ progress, script, skipTyping: progress.settings.skipTyping }, sessionSize),
    [progress, script, sessionSize],
  );
  const todayStats = getTodayStats(progress);
  const streakAtRisk = progress.currentStreak > 0 && progress.lastActiveDate !== getToday();
  const goalDone = todayStats.phrasesStudied >= progress.settings.dailyGoal;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      <div style={metaLabel}>{(greeting.en || 'TODAY').toUpperCase()}</div>
      <h1
        style={{ fontSize: 28, fontWeight: 700, letterSpacing: -0.6, margin: '8px 0 4px', lineHeight: 1.1, color: T.text }}
      >
        {greetingText}.
      </h1>
      <div style={{ fontSize: 13, color: T.dim }}>
        {progress.currentStreak > 0 ? `🔥 ${progress.currentStreak}-day streak` : "Let's build a streak."}
      </div>

      {/* Hero — the single smart session */}
      <Card warm pad={16} onClick={() => navigate('/daily')} style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ ...metaLabel, color: T.amber }}>
          {streakAtRisk ? 'KEEP YOUR STREAK' : goalDone ? "TODAY'S GOAL DONE — KEEP GOING" : "TODAY'S SESSION"}
        </div>
        <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: -0.3, color: T.text }}>Continue</div>
        <div style={{ fontSize: 12, color: T.dim }}>
          {summary.newCount} new · {summary.reviewCount} review · {summary.consolidationCount} practice
        </div>
        <div style={{ marginTop: 4 }}>
          <LinearProgress value={todayStats.phrasesStudied} total={progress.settings.dailyGoal} />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
            <span style={{ fontFamily: T.mono, fontSize: 11, color: T.dim }}>
              {todayStats.phrasesStudied} / {progress.settings.dailyGoal} today
            </span>
            <span style={{ color: T.amber, display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 600 }}>
              ~{sessionSize} items <IconChev size={16} />
            </span>
          </div>
        </div>
      </Card>

      {/* The trail */}
      <div style={{ marginTop: 26 }}>
        <PathTrail progress={progress} />
      </div>

      {/* Gentle pointer to lookup */}
      <Card pad={12} onClick={() => navigate('/browse')} style={{ marginTop: 22, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>Browse & look things up</div>
          <div style={{ fontSize: 11, color: T.dim, marginTop: 2 }}>
            Every phrase, word and category — search the whole deck.
          </div>
        </div>
        <span style={{ color: T.mute, display: 'flex' }}><IconChev size={18} /></span>
      </Card>

      {/* Separate track: Swedish driving-theory quiz */}
      <Card pad={12} onClick={() => navigate('/driving')} style={{ marginTop: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>🚗 Körkortsteori</div>
          <div style={{ fontSize: 11, color: T.dim, marginTop: 2 }}>
            Swedish driving theory — a separate quiz track.
          </div>
        </div>
        <span style={{ color: T.mute, display: 'flex' }}><IconChev size={18} /></span>
      </Card>
    </div>
  );
}
