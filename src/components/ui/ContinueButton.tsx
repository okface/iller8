import { useEffect } from 'react';
import Btn from './Btn';

/**
 * The "Continue" button shown after an exercise has been answered.
 * Replaces auto-advance — the learner controls when they move on, so
 * they can actually read the grammar note. Pressing Enter / Space also
 * advances (keyboard ergonomics).
 */
interface ContinueButtonProps {
  correct: boolean;
  onContinue: () => void;
  label?: string;
}

export default function ContinueButton({ correct, onContinue, label }: ContinueButtonProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        // Don't hijack typing in input fields
        const target = e.target as HTMLElement | null;
        if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;
        e.preventDefault();
        onContinue();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onContinue]);

  return (
    <Btn
      kind={correct ? 'success' : 'primary'}
      size="lg"
      full
      onClick={onContinue}
      suffix={
        <span style={{ opacity: 0.7, fontFamily: 'monospace', fontSize: 11 }}>↵</span>
      }
    >
      {label ?? 'Continue'}
    </Btn>
  );
}
