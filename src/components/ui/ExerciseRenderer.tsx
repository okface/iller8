import type { Exercise } from '../../store/types';
import MultipleChoice from '../exercises/MultipleChoice';
import TypeTranslation from '../exercises/TypeTranslation';
import FillInBlank from '../exercises/FillInBlank';
import WordTiles from '../exercises/WordTiles';
import ScriptConvert from '../exercises/ScriptConvert';
import ContextPick from '../exercises/ContextPick';
import SentenceBuilder from '../exercises/SentenceBuilder';
import Comprehension from '../exercises/Comprehension';
import PatternMatch from '../exercises/PatternMatch';
import PerspectiveShift from '../exercises/PerspectiveShift';
import WordRecognize from '../exercises/WordRecognize';
import WordProduce from '../exercises/WordProduce';
import ListenChoice from '../exercises/ListenChoice';
import Conjugate from '../exercises/Conjugate';

/**
 * Single dispatcher over the `Exercise.type` union. Used to live as a
 * hand-rolled 9-way switch duplicated in 4 pages (Hammer, LessonView,
 * ReviewSession, WordDrill — soon also Daily Session). Now one place.
 *
 * Spec: CODE_HEALTH.md §3 refactor #4.
 *
 * NOTE: `match-pairs` is intentionally unhandled — it runs as a side-
 * channel session inside LessonView via a separate `<MatchPairs>` element
 * rendered out-of-band, not as a regular exercise in the drill sequence.
 */

interface ExerciseRendererProps {
  exercise: Exercise;
  onAnswer: (correct: boolean) => void;
  script: 'latin' | 'cyrillic';
  /** A stable key used to force-remount the inner component between
   *  questions (so state like `selected` clears). Usually pass the
   *  exercise index. */
  itemKey: string | number;
}

export default function ExerciseRenderer({
  exercise,
  onAnswer,
  script,
  itemKey,
}: ExerciseRendererProps) {
  switch (exercise.type) {
    case 'multiple-choice':
      return <MultipleChoice key={itemKey} exercise={exercise} onAnswer={onAnswer} script={script} />;
    case 'type-translation':
      return <TypeTranslation key={itemKey} exercise={exercise} onAnswer={onAnswer} script={script} />;
    case 'fill-in-blank':
      return <FillInBlank key={itemKey} exercise={exercise} onAnswer={onAnswer} script={script} />;
    case 'word-tiles':
      return <WordTiles key={itemKey} exercise={exercise} onAnswer={onAnswer} script={script} />;
    case 'script-convert':
      return <ScriptConvert key={itemKey} exercise={exercise} onAnswer={onAnswer} script={script} />;
    case 'context-pick':
      return <ContextPick key={itemKey} exercise={exercise} onAnswer={onAnswer} script={script} />;
    case 'sentence-builder':
      return <SentenceBuilder key={itemKey} exercise={exercise} onAnswer={onAnswer} script={script} />;
    case 'comprehension':
      return <Comprehension key={itemKey} exercise={exercise} onAnswer={onAnswer} script={script} />;
    case 'pattern-match':
      return <PatternMatch key={itemKey} exercise={exercise} onAnswer={onAnswer} script={script} />;
    case 'perspective-shift':
      return <PerspectiveShift key={itemKey} exercise={exercise} onAnswer={onAnswer} script={script} />;
    case 'word-recognize':
      return <WordRecognize key={itemKey} exercise={exercise} onAnswer={onAnswer} script={script} />;
    case 'word-produce':
      return <WordProduce key={itemKey} exercise={exercise} onAnswer={onAnswer} script={script} />;
    case 'listen-choice':
      return <ListenChoice key={itemKey} exercise={exercise} onAnswer={onAnswer} script={script} />;
    case 'conjugate':
      return <Conjugate key={itemKey} exercise={exercise} onAnswer={onAnswer} script={script} />;
    case 'match-pairs':
    default:
      return null;
  }
}
