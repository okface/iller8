import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { lessons } from '../data/lessons';
import { families } from '../data/phrase-families';
import Card from '../components/ui/Card';
import SectionHead from '../components/ui/SectionHead';
import MonoBadge from '../components/ui/MonoBadge';
import AudioButton from '../components/ui/AudioButton';
import { T, metaLabel } from '../lib/tokens';
import type { UserProgress } from '../store/types';

interface CatalogProps {
  progress: UserProgress;
  script: 'latin' | 'cyrillic';
}

type Filter = 'all' | 'unseen' | 'learning' | 'mastered';

export default function Catalog({ progress, script }: CatalogProps) {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<Filter>('all');
  const [openLessons, setOpenLessons] = useState<Set<string>>(new Set([lessons[0]?.id ?? '']));

  const totals = useMemo(() => {
    let total = 0;
    let unseen = 0;
    let learning = 0;
    let mastered = 0;
    for (const lesson of lessons) {
      for (const group of lesson.phraseGroups) {
        for (const phrase of group.phrases) {
          total++;
          const bucket = progress.phrases[phrase.id]?.bucket ?? 0;
          if (bucket === 0) unseen++;
          else if (bucket < 4) learning++;
          else mastered++;
        }
      }
    }
    return { total, unseen, learning, mastered };
  }, [progress.phrases]);

  const passesFilter = (bucket: number) => {
    if (filter === 'all') return true;
    if (filter === 'unseen') return bucket === 0;
    if (filter === 'learning') return bucket >= 1 && bucket < 4;
    return bucket >= 4;
  };

  const toggleLesson = (id: string) => {
    setOpenLessons((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      <div style={metaLabel}>EVERY PHRASE · EVERY LESSON</div>
      <h1
        style={{
          fontSize: 28,
          fontWeight: 700,
          letterSpacing: -0.6,
          margin: '8px 0 4px',
          color: T.text,
        }}
      >
        Catalog
      </h1>
      <p style={{ fontSize: 13, color: T.dim, lineHeight: 1.55, maxWidth: 440 }}>
        The whole map. Tap a lesson to expand. Tap a phrase to drill it in context.
      </p>

      {/* Stat row */}
      <div
        style={{
          marginTop: 16,
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 1,
          background: T.border,
          borderRadius: T.r2,
          overflow: 'hidden',
          border: `1px solid ${T.border}`,
        }}
      >
        {[
          { k: 'TOTAL', v: totals.total, c: T.text, filter: 'all' as Filter },
          { k: 'UNSEEN', v: totals.unseen, c: T.mute, filter: 'unseen' as Filter },
          { k: 'LEARNING', v: totals.learning, c: T.amber, filter: 'learning' as Filter },
          { k: 'MASTERED', v: totals.mastered, c: T.green, filter: 'mastered' as Filter },
        ].map(({ k, v, c, filter: f }) => {
          const active = filter === f;
          return (
            <button
              key={k}
              onClick={() => setFilter(f)}
              style={{
                background: active ? T.surfaceWarm : T.bg,
                padding: '12px 10px',
                border: 'none',
                cursor: 'pointer',
                textAlign: 'left',
                color: T.text,
                transition: `all ${T.fast} ${T.ease}`,
              }}
            >
              <div
                style={{
                  ...metaLabel,
                  color: active ? T.amber : T.mute,
                }}
              >
                {k}
              </div>
              <div
                style={{
                  fontFamily: T.mono,
                  fontSize: 18,
                  fontWeight: 500,
                  marginTop: 2,
                  letterSpacing: -0.5,
                  color: c,
                }}
              >
                {v}
              </div>
            </button>
          );
        })}
      </div>

      {/* Lessons */}
      <div style={{ marginTop: 22 }}>
        <SectionHead suffix={`${lessons.length} lessons`}>LESSONS</SectionHead>
        {lessons.map((lesson) => {
          const isOpen = openLessons.has(lesson.id);
          const allPhrases = lesson.phraseGroups.flatMap((g) => g.phrases);
          const lessonStats = allPhrases.reduce(
            (acc, p) => {
              const bucket = progress.phrases[p.id]?.bucket ?? 0;
              if (bucket === 0) acc.unseen++;
              else if (bucket < 4) acc.learning++;
              else acc.mastered++;
              return acc;
            },
            { unseen: 0, learning: 0, mastered: 0 }
          );
          const phrasesInFilter = allPhrases.filter((p) => {
            const bucket = progress.phrases[p.id]?.bucket ?? 0;
            return passesFilter(bucket);
          });

          if (filter !== 'all' && phrasesInFilter.length === 0) return null;

          return (
            <div
              key={lesson.id}
              style={{
                borderTop: `0.5px solid ${T.border}`,
                paddingTop: 12,
                paddingBottom: 12,
              }}
            >
              <button
                onClick={() => toggleLesson(lesson.id)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                  width: '100%',
                  display: 'grid',
                  gridTemplateColumns: '32px 1fr auto',
                  gap: 12,
                  alignItems: 'center',
                  color: T.text,
                  textAlign: 'left',
                }}
              >
                <span style={{ fontFamily: T.mono, fontSize: 11, color: T.mute }}>
                  {String(lesson.order).padStart(2, '0')}
                </span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 500, letterSpacing: -0.2 }}>
                    {script === 'cyrillic' ? lesson.title.sr_cyrillic : lesson.title.sr_latin}
                  </div>
                  <div
                    style={{
                      fontFamily: T.mono,
                      fontSize: 11,
                      color: T.dim,
                      marginTop: 1,
                    }}
                  >
                    {allPhrases.length} phrases · {lessonStats.mastered} mastered
                  </div>
                </div>
                <span style={{ color: T.dim, fontFamily: T.mono, fontSize: 12 }}>
                  {isOpen ? '−' : '+'}
                </span>
              </button>

              {isOpen && (
                <Card pad={0} style={{ marginTop: 10 }}>
                  {phrasesInFilter.map((phrase, i) => {
                    const bucket = progress.phrases[phrase.id]?.bucket ?? 0;
                    const dotColor =
                      bucket === 0
                        ? T.border
                        : bucket >= 4
                          ? T.green
                          : T.amber;
                    return (
                      <div
                        key={phrase.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => navigate(`/lesson/${lesson.id}`)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            navigate(`/lesson/${lesson.id}`);
                          }
                        }}
                        style={{
                          width: '100%',
                          textAlign: 'left',
                          background: 'transparent',
                          border: 'none',
                          padding: '10px 14px',
                          borderTop: i === 0 ? 'none' : `0.5px solid ${T.border}`,
                          cursor: 'pointer',
                          display: 'grid',
                          gridTemplateColumns: 'auto 1fr auto auto',
                          gap: 12,
                          alignItems: 'center',
                          color: T.text,
                          transition: `background ${T.fast} ${T.ease}`,
                        }}
                      >
                        <span
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            background: dotColor,
                            flexShrink: 0,
                          }}
                        />
                        <div style={{ minWidth: 0 }}>
                          <div
                            className="font-serif-sr"
                            style={{
                              fontSize: 15,
                              fontWeight: 500,
                              color: T.text,
                              letterSpacing: -0.2,
                            }}
                          >
                            {script === 'cyrillic' ? phrase.sr_cyrillic : phrase.sr_latin}
                          </div>
                          <div style={{ fontSize: 11, color: T.dim, marginTop: 1 }}>
                            {phrase.en}
                          </div>
                        </div>
                        <AudioButton text={phrase.sr_latin} size={14} />
                        <span
                          style={{
                            fontFamily: T.mono,
                            fontSize: 10,
                            color: T.mute,
                          }}
                        >
                          {bucket > 0 ? `B${bucket}` : 'new'}
                        </span>
                      </div>
                    );
                  })}
                </Card>
              )}
            </div>
          );
        })}
      </div>

      {/* Phrase families row */}
      {families.length > 0 && (
        <div style={{ marginTop: 28 }}>
          <SectionHead suffix={String(families.length)}>PHRASE FAMILIES</SectionHead>
          <p style={{ fontSize: 12, color: T.dim, marginBottom: 12 }}>
            Curated clusters that drill perspective shifts — formality, gender, tense,
            aspect. The most efficient way to learn how Serbian bends.
          </p>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: 8,
            }}
          >
            {families.map((family) => {
              const masteredVariants = family.variants.filter((v) => {
                const key = `family:${family.id}:${v.id}`;
                return (progress.phrases[key]?.bucket ?? 0) >= 4;
              }).length;
              return (
                <Card
                  key={family.id}
                  pad={12}
                  onClick={() => navigate('/families')}
                  style={{ display: 'flex', flexDirection: 'column', gap: 6 }}
                >
                  <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>
                    {family.theme}
                  </div>
                  <div
                    className="font-serif-sr"
                    style={{ fontSize: 13, fontStyle: 'italic', color: T.dim }}
                  >
                    {script === 'cyrillic' ? family.base.sr_cyrillic : family.base.sr_latin}
                  </div>
                  <div>
                    {masteredVariants > 0 ? (
                      <MonoBadge kind="green">
                        {masteredVariants}/{family.variants.length}
                      </MonoBadge>
                    ) : (
                      <MonoBadge>{family.variants.length} forms</MonoBadge>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
