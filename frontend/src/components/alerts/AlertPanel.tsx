import React, { useState } from 'react';
import { Alert, SimulationEvent } from '../../types';
import { AlertCard } from './AlertCard';
import { CountdownTimer } from './CountdownTimer';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { EmptyState } from '../ui/EmptyState';
import { Bell, Filter, CheckCheck, Sparkles, XCircle } from 'lucide-react';

export interface AlertPanelProps {
  alerts: Alert[];
  simulations?: SimulationEvent[];
  onAcknowledgeAlert?: (id: number) => void;
  onResolveAlert?: (id: number) => void;
  onDeleteAlert?: (id: number) => void;
  onClearResolved?: () => void;
  onCancelSimulation?: (id: number) => void;
}

export const AlertPanel: React.FC<AlertPanelProps> = ({
  alerts,
  simulations = [],
  onAcknowledgeAlert,
  onResolveAlert,
  onDeleteAlert,
  onClearResolved,
  onCancelSimulation,
}) => {
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const activeSimulations = simulations.filter(s => s.status === 'PENDING');

  const filteredAlerts = alerts.filter(a => {
    if (severityFilter !== 'ALL' && a.severity !== severityFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        a.title.toLowerCase().includes(q) ||
        a.message.toLowerCase().includes(q) ||
        (a.classroom_name && a.classroom_name.toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Active Simulations Banner if any */}
      {activeSimulations.length > 0 && (
        <Card glow="amber" padding="sm" className="border-amber-500/40 bg-amber-950/20">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <h4 className="text-xs font-bold text-amber-300 uppercase tracking-wider">
              Active Automation Cutoff Simulations ({activeSimulations.length})
            </h4>
          </div>

          <div className="space-y-3">
            {activeSimulations.map(sim => (
              <div
                key={sim.id}
                className="p-3 bg-slate-900/90 rounded-xl border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white text-sm">
                      {sim.classroom_name || `Classroom #${sim.classroom_id}`}
                    </span>
                    <span className="text-xs text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 font-mono">
                      {sim.period_label}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Smart sensor reported zero occupancy. Automated cutoff timer initiated.
                  </p>
                </div>

                <div className="flex items-center gap-4 shrink-0">
                  <CountdownTimer
                    scheduledActionAt={sim.scheduled_action_at}
                    className="w-44"
                  />
                  {onCancelSimulation && (
                    <Button
                      variant="outline"
                      size="xs"
                      onClick={() => onCancelSimulation(sim.id)}
                      icon={<XCircle className="w-3.5 h-3.5" />}
                    >
                      Cancel Cutoff
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Filter and Controls Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-900/50 rounded-xl border border-slate-800">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <div className="flex flex-wrap gap-1">
            {['ALL', 'CRITICAL', 'WARNING', 'INFO', 'RESOLVED'].map(sev => (
              <button
                key={sev}
                onClick={() => setSeverityFilter(sev)}
                className={`text-xs px-2.5 py-1 rounded-lg transition-all ${
                  severityFilter === sev
                    ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm'
                    : 'text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-800'
                }`}
              >
                {sev}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Search alerts..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 w-36 sm:w-48"
          />

          {onClearResolved && (
            <Button
              variant="secondary"
              size="xs"
              onClick={onClearResolved}
              icon={<CheckCheck className="w-3.5 h-3.5 text-emerald-400" />}
            >
              Clear Resolved
            </Button>
          )}
        </div>
      </div>

      {/* Alerts List */}
      {filteredAlerts.length === 0 ? (
        <EmptyState
          icon={<Bell className="w-8 h-8 text-cyan-400" />}
          title="No Alerts Found"
          description="System telemetry is clean. No warnings or unacknowledged errors matching current filters."
        />
      ) : (
        <div className="space-y-3">
          {filteredAlerts.map(alert => (
            <AlertCard
              key={alert.id}
              alert={alert}
              onAcknowledge={onAcknowledgeAlert}
              onResolve={onResolveAlert}
              onDelete={onDeleteAlert}
            />
          ))}
        </div>
      )}
    </div>
  );
};
