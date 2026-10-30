import React from 'react';

export interface StatusIndicatorProps {
  /** energised = red lamp, tripped = green lamp, off = unlit. */
  status: 'energised' | 'tripped' | 'off';
  label?: string;
  className?: string;
}

/** A panel lamp (Indian switchgear code: red energised, green tripped). */
export const StatusIndicator: React.FC<StatusIndicatorProps> = ({ status, label, className = '' }) => {
  const lamp = { energised: 'bg-lamp-on', tripped: 'bg-lamp-off', off: 'bg-panel-wire' }[status];
  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      <span className={`w-2 h-2 rounded-full ${lamp}`} aria-hidden />
      {label && <span className="text-xs text-panel-muted">{label}</span>}
    </span>
  );
};
