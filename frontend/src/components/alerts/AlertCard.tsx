import React from 'react';
import { Alert } from '../../types';
import { Badge } from '../ui/Badge';
import { formatDateTime } from '../../utils/formatters';

export interface AlertRowProps {
  alert: Alert;
  onAcknowledge: (id: number) => void;
  onResolve: (id: number) => void;
  onDelete: (id: number) => void;
}

const SEVERITY: Record<Alert['severity'], { label: string; variant: 'strong' | 'neutral' | 'quiet' }> = {
  CRITICAL: { label: 'Critical', variant: 'strong' },
  WARNING: { label: 'Warning', variant: 'neutral' },
  INFO: { label: 'Info', variant: 'quiet' },
  RESOLVED: { label: 'Resolved', variant: 'quiet' },
};

/** Column template shared by the log header and every row (lg and up). */
export const ALERT_GRID = 'grid-cols-[76px_minmax(0,1fr)] lg:grid-cols-[76px_minmax(0,1fr)_64px_120px_96px_236px]';

/** One logged event: severity tag, what happened, where, when, its state and what can be done. */
export const AlertCard: React.FC<AlertRowProps> = ({ alert, onAcknowledge, onResolve, onDelete }) => {
  const sev = SEVERITY[alert.severity] ?? SEVERITY.INFO;
  const resolved = alert.severity === 'RESOLVED';
  const acked = !!alert.acknowledged_at;
  const state = resolved ? 'Resolved' : acked ? 'Acknowledged' : 'Open';

  return (
    <li className={`grid ${ALERT_GRID} gap-x-3 gap-y-1 px-4 py-2.5 border-t border-panel-seam items-start ${resolved ? 'text-panel-muted' : ''}`}>
      <span className="pt-0.5"><Badge variant={sev.variant}>{sev.label}</Badge></span>
      <div className="min-w-0">
        <div className={`text-[13px] ${resolved ? '' : 'text-panel-ink'}`}>{alert.title}</div>
        <p className="text-xs text-panel-muted max-w-prose">{alert.message}</p>
        <p className="lg:hidden text-[11px] text-panel-muted mt-0.5">
          {alert.classroom_name && <span className="num">{alert.classroom_name} · </span>}
          {formatDateTime(alert.created_at)} · {state}
        </p>
      </div>
      <span className="hidden lg:block num text-[13px]">{alert.classroom_name ?? <span className="font-sans text-xs text-panel-muted">Floor</span>}</span>
      <span className="hidden lg:block text-xs text-panel-muted">{formatDateTime(alert.created_at)}</span>
      <span className={`hidden lg:block text-xs ${state === 'Open' ? 'text-panel-ink' : 'text-panel-muted'}`}>{state}</span>
      <div className="col-start-2 lg:col-start-auto flex flex-wrap lg:flex-nowrap items-center gap-x-3 gap-y-1 lg:justify-end">
        {!resolved && !acked && (
          <button onClick={() => onAcknowledge(alert.id)} className="text-xs border border-panel-wire hover:border-accent hover:text-accent px-2.5 py-1 rounded-[3px] snap">
            Acknowledge
          </button>
        )}
        {!resolved && (
          <button onClick={() => onResolve(alert.id)} className="text-xs border border-panel-wire hover:border-accent hover:text-accent px-2.5 py-1 rounded-[3px] snap">
            Resolve
          </button>
        )}
        <button onClick={() => onDelete(alert.id)} className="text-xs text-panel-muted hover:text-lamp-on snap">
          Delete
        </button>
      </div>
    </li>
  );
};
