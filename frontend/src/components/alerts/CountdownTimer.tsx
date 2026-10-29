import React, { useState, useEffect, useRef } from 'react';
import { getSecondsRemaining, formatCountdown } from '../../utils/timeUtils';
import { Clock } from 'lucide-react';

export interface CountdownTimerProps {
  scheduledActionAt: string;
  totalDurationSeconds?: number;
  onComplete?: () => void;
  className?: string;
}

export const CountdownTimer: React.FC<CountdownTimerProps> = ({
  scheduledActionAt,
  totalDurationSeconds = 180, // default 3 min
  onComplete,
  className = '',
}) => {
  const [remainingSeconds, setRemainingSeconds] = useState<number>(() =>
    getSecondsRemaining(scheduledActionAt)
  );

  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    // Immediate calculation
    const initial = getSecondsRemaining(scheduledActionAt);
    setRemainingSeconds(initial);

    if (initial <= 0) {
      onCompleteRef.current?.();
      return;
    }

    const interval = setInterval(() => {
      const remaining = getSecondsRemaining(scheduledActionAt);
      setRemainingSeconds(remaining);

      if (remaining <= 0) {
        clearInterval(interval);
        onCompleteRef.current?.();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [scheduledActionAt]);

  const progressPercent = Math.min(
    100,
    Math.max(0, ((totalDurationSeconds - remainingSeconds) / totalDurationSeconds) * 100)
  );

  const isExecuting = remainingSeconds <= 0;

  return (
    <div className={`space-y-1.5 ${className}`}>
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5 text-amber-300 font-medium">
          <Clock className={`w-3.5 h-3.5 ${!isExecuting ? 'animate-spin' : ''}`} style={{ animationDuration: '4s' }} />
          <span>Cutoff Timer</span>
        </div>
        <span className="font-mono font-bold text-amber-400">
          {formatCountdown(remainingSeconds)}
        </span>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
        <div
          className={`h-full transition-all duration-1000 ease-linear ${
            isExecuting ? 'bg-rose-500' : 'bg-gradient-to-r from-amber-400 to-rose-500'
          }`}
          style={{ width: `${isExecuting ? 100 : progressPercent}%` }}
        />
      </div>
    </div>
  );
};
