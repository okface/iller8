import { T, monoPillStyle } from '../lib/tokens';
import { IconFire } from './ui/Icons';

interface StreakCounterProps {
  count: number;
}

export default function StreakCounter({ count }: StreakCounterProps) {
  if (count <= 0) {
    return (
      <span style={monoPillStyle(T.surface, T.mute, T.border)}>
        <IconFire size={11} /> 0
      </span>
    );
  }
  return (
    <span style={monoPillStyle(T.amberDim, T.amber, T.borderWarm)}>
      <IconFire size={11} /> {count}
    </span>
  );
}
