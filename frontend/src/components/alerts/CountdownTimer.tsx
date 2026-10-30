import React, { useEffect, useState } from 'react';
import { formatCountdown, getSecondsRemaining } from '../../utils/timeUtils';

/** Seconds left until a scheduled cut-off, as a tabular figure. Ticks once a second. */
export const CountdownTimer: React.FC<{ scheduledActionAt: string; className?: string }> = ({ scheduledActionAt, className = '' }) => {
  const [left, setLeft] = useState(() => getSecondsRemaining(scheduledActionAt));
  useEffect(() => {
    setLeft(getSecondsRemaining(scheduledActionAt));
    const id = setInterval(() => setLeft(getSecondsRemaining(scheduledActionAt)), 1000);
    return () => clearInterval(id);
  }, [scheduledActionAt]);
  return (
    <span className={`num ${className}`} aria-live="off">
      {left > 0 ? formatCountdown(left) : 'due'}
    </span>
  );
};
