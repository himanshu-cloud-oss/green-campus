import React from 'react';
import { Alert } from '../../types';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { formatDateTime } from '../../utils/formatters';
import {
  AlertTriangle,
  AlertOctagon,
  Info,
  CheckCircle2,
  Trash2,
  Check,
  Eye,
} from 'lucide-react';

export interface AlertCardProps {
  alert: Alert;
  onAcknowledge?: (id: number) => void;
  onResolve?: (id: number) => void;
  onDelete?: (id: number) => void;
}

export const AlertCard: React.FC<AlertCardProps> = ({
  alert,
  onAcknowledge,
  onResolve,
  onDelete,
}) => {
  const getSeverityConfig = (severity: Alert['severity']) => {
    switch (severity) {
      case 'CRITICAL':
        return {
          icon: AlertOctagon,
          badgeVariant: 'error' as const,
          borderClass: 'border-rose-500/40 bg-rose-950/10',
          iconColor: 'text-rose-400',
        };
      case 'WARNING':
        return {
          icon: AlertTriangle,
          badgeVariant: 'warning' as const,
          borderClass: 'border-amber-500/40 bg-amber-950/10',
          iconColor: 'text-amber-400',
        };
      case 'INFO':
        return {
          icon: Info,
          badgeVariant: 'info' as const,
          borderClass: 'border-cyan-500/30 bg-cyan-950/10',
          iconColor: 'text-cyan-400',
        };
      case 'RESOLVED':
      default:
        return {
          icon: CheckCircle2,
          badgeVariant: 'neutral' as const,
          borderClass: 'border-slate-800 bg-slate-900/30 opacity-75',
          iconColor: 'text-slate-400',
        };
    }
  };

  const config = getSeverityConfig(alert.severity);
  const Icon = config.icon;
  const isResolved = alert.severity === 'RESOLVED';
  const isAcknowledged = !!alert.acknowledged_at;

  return (
    <Card padding="sm" className={`border ${config.borderClass} transition-all`}>
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-lg bg-slate-900 shrink-0 ${config.iconColor}`}>
          <Icon className="w-5 h-5" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-semibold text-slate-100 truncate">{alert.title}</h4>
              <Badge variant={config.badgeVariant} size="sm">
                {alert.severity}
              </Badge>
              {alert.classroom_name && (
                <span className="text-[11px] font-mono font-medium text-cyan-400 bg-cyan-950/50 px-1.5 py-0.5 rounded border border-cyan-800/50">
                  {alert.classroom_name}
                </span>
              )}
            </div>
            <span className="text-[11px] text-slate-400">
              {formatDateTime(alert.created_at)}
            </span>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed mb-3">{alert.message}</p>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/80">
            <div className="flex items-center gap-2 text-[10px] text-slate-400">
              {isAcknowledged && (
                <span className="flex items-center gap-1 text-cyan-400">
                  <Eye className="w-3 h-3" /> Acknowledged
                </span>
              )}
              {isResolved && (
                <span className="flex items-center gap-1 text-emerald-400">
                  <CheckCircle2 className="w-3 h-3" /> Resolved
                </span>
              )}
              <span className="text-slate-400">Type: {alert.alert_type}</span>
            </div>

            <div className="flex items-center gap-1.5">
              {!isAcknowledged && !isResolved && onAcknowledge && (
                <Button
                  variant="outline"
                  size="xs"
                  onClick={() => onAcknowledge(alert.id)}
                  icon={<Eye className="w-3 h-3" />}
                >
                  Ack
                </Button>
              )}
              {!isResolved && onResolve && (
                <Button
                  variant="primary"
                  size="xs"
                  onClick={() => onResolve(alert.id)}
                  icon={<Check className="w-3 h-3" />}
                >
                  Resolve
                </Button>
              )}
              {onDelete && (
                <button
                  onClick={() => onDelete(alert.id)}
                  className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                  title="Delete Alert"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};
