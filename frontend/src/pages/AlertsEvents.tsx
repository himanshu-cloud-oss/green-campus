import React, { useState } from 'react';
import { useAlerts } from '../hooks/useAlerts';
import { useSimulations } from '../hooks/useSimulations';
import { AlertPanel } from '../components/alerts/AlertPanel';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { formatDateTime } from '../utils/formatters';
import { Sparkles, RefreshCw, Radio, Terminal, Filter } from 'lucide-react';

export const AlertsEvents: React.FC = () => {
  const {
    alerts,
    activeAlertsCount,
    unreadCount,
    isLoading,
    acknowledgeAlert,
    resolveAlert,
    deleteAlert,
    clearResolved,
    refetch,
  } = useAlerts();

  const { simulations, cancelSimulation, triggerNoShow } = useSimulations();

  const [activeTab, setActiveTab] = useState<'console' | 'history'>('console');
  const [testClassroomId, setTestClassroomId] = useState<number>(4);

  const handleSimulateTestAlert = async () => {
    await triggerNoShow(testClassroomId, 'Console Manual Trigger', 180);
    refetch();
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <Radio className="w-6 h-6 text-rose-500 animate-pulse" />
            <span>Server Room Console & Event Monitor</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time incident response, automated HVAC cutoffs, and smart sensor telemetry monitoring.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSimulateTestAlert}
            icon={<Sparkles className="w-3.5 h-3.5 text-amber-400" />}
          >
            Trigger Test No-Show
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={refetch}
            isLoading={isLoading}
            icon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Sync Feeds
          </Button>
        </div>
      </div>

      {/* Status Counters Row */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3.5">
        <Card glow="amber" padding="sm" className="space-y-1">
          <span className="text-[11px] font-semibold text-slate-400">Active Incidents</span>
          <div className="text-2xl font-bold font-mono text-white">{activeAlertsCount}</div>
          <div className="text-[10px] text-amber-400 font-mono">Requires attention or monitoring</div>
        </Card>

        <Card glow="cyan" padding="sm" className="space-y-1">
          <span className="text-[11px] font-semibold text-slate-400">Unread / Unacknowledged</span>
          <div className="text-2xl font-bold font-mono text-cyan-300">{unreadCount}</div>
          <div className="text-[10px] text-slate-400 font-mono">TopNav badge counter</div>
        </Card>

        <Card glow="violet" padding="sm" className="space-y-1">
          <span className="text-[11px] font-semibold text-slate-400">Active Simulation Timers</span>
          <div className="text-2xl font-bold font-mono text-purple-300">
            {simulations.filter(s => s.status === 'PENDING').length}
          </div>
          <div className="text-[10px] text-purple-400 font-mono">1-second interval execution</div>
        </Card>

        <Card glow="green" padding="sm" className="space-y-1">
          <span className="text-[11px] font-semibold text-slate-400">Resolved Today</span>
          <div className="text-2xl font-bold font-mono text-emerald-400">
            {alerts.filter(a => a.severity === 'RESOLVED').length}
          </div>
          <div className="text-[10px] text-emerald-400 font-mono">Energy cutoffs confirmed</div>
        </Card>
      </div>

      {/* View Switcher: Live Console vs Event History */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('console')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'console'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Terminal className="w-4 h-4" />
          <span>Live Alert Console & Countdown Timers</span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'history'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Filter className="w-4 h-4" />
          <span>Full Event History Table ({alerts.length})</span>
        </button>
      </div>

      {/* Main Tab Content */}
      {activeTab === 'console' ? (
        <AlertPanel
          alerts={alerts}
          simulations={simulations}
          onAcknowledgeAlert={acknowledgeAlert}
          onResolveAlert={resolveAlert}
          onDeleteAlert={deleteAlert}
          onClearResolved={clearResolved}
          onCancelSimulation={cancelSimulation}
        />
      ) : (
        /* Event History Table View */
        <Card padding="none" className="overflow-hidden">
          <div className="p-4 border-b border-slate-800 bg-slate-900/90 flex justify-between items-center">
            <div>
              <h3 className="text-sm font-bold text-white">Historical Telemetry Log</h3>
              <p className="text-xs text-slate-400">Complete record of all detected conditions and operator actions</p>
            </div>
            <Button
              variant="outline"
              size="xs"
              onClick={clearResolved}
            >
              Purge Resolved
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900 text-slate-400 font-semibold border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Severity</th>
                  <th className="py-3 px-4">Event Title</th>
                  <th className="py-3 px-4">Location</th>
                  <th className="py-3 px-4">Event Type</th>
                  <th className="py-3 px-4">Logged At</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {alerts.map(a => {
                  const isResolved = a.severity === 'RESOLVED';
                  return (
                    <tr key={a.id} className="hover:bg-slate-800/40">
                      <td className="py-3 px-4">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            a.severity === 'CRITICAL'
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                              : a.severity === 'WARNING'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                              : a.severity === 'INFO'
                              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {a.severity}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-sans font-medium text-slate-200">{a.title}</td>
                      <td className="py-3 px-4 text-cyan-300">{a.classroom_name || 'Campus Wide'}</td>
                      <td className="py-3 px-4 text-slate-400 font-sans text-[11px]">{a.alert_type}</td>
                      <td className="py-3 px-4 text-slate-400 font-sans text-[11px]">
                        {formatDateTime(a.created_at)}
                      </td>
                      <td className="py-3 px-4 font-sans">
                        {isResolved ? (
                          <span className="text-emerald-400 font-semibold text-[11px]">Resolved</span>
                        ) : a.acknowledged_at ? (
                          <span className="text-cyan-400 font-semibold text-[11px]">Acknowledged</span>
                        ) : (
                          <span className="text-amber-400 font-semibold text-[11px]">Pending</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {!isResolved && (
                            <button
                              onClick={() => resolveAlert(a.id)}
                              className="px-2 py-0.5 text-[10px] font-sans font-semibold rounded bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30"
                            >
                              Resolve
                            </button>
                          )}
                          <button
                            onClick={() => deleteAlert(a.id)}
                            className="p-1 rounded text-slate-500 hover:text-rose-400"
                            title="Delete"
                          >
                            ×
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
};
