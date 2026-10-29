import React from 'react';

export interface StatusIndicatorProps {
  status: 'online' | 'offline' | 'warning' | 'simulating' | 'active';
  label?: string;
  pulse?: boolean;
  className?: string;
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  status,
  label,
  pulse = true,
  className = '',
}) => {
  const statusStyles = {
    online: {
      dot: 'bg-emerald-400',
      ring: 'bg-emerald-400/20',
      text: 'text-emerald-400',
    },
    active: {
      dot: 'bg-cyan-400',
      ring: 'bg-cyan-400/20',
      text: 'text-cyan-400',
    },
    warning: {
      dot: 'bg-amber-400',
      ring: 'bg-amber-400/20',
      text: 'text-amber-400',
    },
    simulating: {
      dot: 'bg-purple-400',
      ring: 'bg-purple-400/20',
      text: 'text-purple-400',
    },
    offline: {
      dot: 'bg-rose-500',
      ring: 'bg-rose-500/20',
      text: 'text-rose-400',
    },
  };

  const style = statusStyles[status];

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <span className="relative flex h-2.5 w-2.5">
        {pulse && (
          <span
            className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${style.ring}`}
          />
        )}
        <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${style.dot}`} />
      </span>
      {label && <span className={`text-xs font-medium ${style.text}`}>{label}</span>}
    </div>
  );
};
