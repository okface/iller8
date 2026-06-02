import { useMemo, useState } from 'react';
import { T, metaLabel } from '../../lib/tokens';
import Card from '../ui/Card';
import MCOptionList from '../ui/MCOptionList';
import MonoBadge from '../ui/MonoBadge';
import ContinueButton from '../ui/ContinueButton';
import { shuffleOptions, topicLabel } from '../../driving/session';
import type { DrivingQuestion } from '../../driving/types';

interface DrivingQuestionCardProps {
  question: DrivingQuestion;
  onAnswer: (correct: boolean) => void;
}

/**
 * A single körkortsteori question: Swedish prompt, optional road-sign image,
 * shuffled options via the shared MCOptionList (same green/red feedback
 * ladder as the Serbian exercises), then post-answer per-option feedback and
 * the question explanation. Deliberately NOT built on the phrase-centric
 * MultipleChoice/Exercise type — driving questions have no phrase/script/audio.
 */
export default function DrivingQuestionCard({ question, onAnswer }: DrivingQuestionCardProps) {
  // Shuffle once per question instance (the parent remounts via key=index).
  const options = useMemo(() => shuffleOptions(question), [question]);
  const correct = options.find((o) => o.correct)!;
  const optionTexts = options.map((o) => o.text);

  const [selected, setSelected] = useState<string | null>(null);
  const revealed = selected !== null;
  const selectedOption = options.find((o) => o.text === selected) ?? null;
  const isCorrect = selectedOption?.correct ?? false;

  const imgSrc = question.image
    ? `${import.meta.env.BASE_URL}driving-signs/${question.image}`
    : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={metaLabel}>FRÅGA</span>
        <MonoBadge>{topicLabel(question.topic)}</MonoBadge>
      </div>

      <div style={{ fontSize: 19, fontWeight: 600, lineHeight: 1.3, color: T.text }}>
        {question.question}
      </div>

      {imgSrc && (
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <div
            style={{
              display: 'inline-flex',
              padding: T.s3,
              background: T.signPlate,
              borderRadius: T.r3,
              boxShadow: T.shadow1,
            }}
          >
            <img
              src={imgSrc}
              alt="Road sign"
              style={{ width: 150, height: 150, objectFit: 'contain', display: 'block' }}
            />
          </div>
        </div>
      )}

      <MCOptionList
        options={optionTexts}
        correctAnswer={correct.text}
        selected={selected}
        revealed={revealed}
        onSelect={(opt) => {
          if (revealed) return;
          setSelected(opt);
        }}
      />

      {revealed && (
        <>
          {selectedOption && (
            <Card
              pad={12}
              style={{
                background: isCorrect ? T.greenDim : T.redDim,
                border: `1px solid ${isCorrect ? T.greenBorder : T.redBorder}`,
              }}
            >
              <div style={{ fontSize: 13, color: T.text, lineHeight: 1.45 }}>
                {selectedOption.feedback}
              </div>
            </Card>
          )}

          {/* When wrong, also surface WHY the right answer is right. */}
          {!isCorrect && (
            <Card
              pad={12}
              style={{ background: T.greenDim, border: `1px solid ${T.greenBorder}` }}
            >
              <MonoBadge kind="green" style={{ marginBottom: 8 }}>
                RÄTT SVAR
              </MonoBadge>
              <div style={{ fontSize: 13, color: T.text, lineHeight: 1.45, marginBottom: 4 }}>
                {correct.text}
              </div>
              {correct.feedback && (
                <div style={{ fontSize: 13, color: T.dim, lineHeight: 1.45 }}>
                  {correct.feedback}
                </div>
              )}
            </Card>
          )}

          {question.explanation && (
            <Card pad={12}>
              <MonoBadge kind="purple" style={{ marginBottom: 8 }}>
                FÖRKLARING
              </MonoBadge>
              <div style={{ fontSize: 13, color: T.dim, lineHeight: 1.5 }}>
                {question.explanation}
              </div>
            </Card>
          )}

          <ContinueButton correct={isCorrect} onContinue={() => onAnswer(isCorrect)} />
        </>
      )}
    </div>
  );
}
