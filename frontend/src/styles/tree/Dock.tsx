import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { hw, HwTask } from '../../services/hw';
import { useTree, usePoll } from './data';
import { AlarmTable } from './tables';
import { Dot, Empty, ErrorNote, Loading, TD, TH, hhmmss } from './ui';

type DockTab = 'tasks' | 'alarms' | 'audit';

export const TaskTable: React.FC<{ tasks: HwTask[] }> = ({ tasks }) => (
  <table className="w-full text-[13px]">
    <thead className="sticky top-0">
      <tr>
        <th className={`${TH} w-[100px]`}>Time</th>
        <th className={TH}>Target</th>
        <th className={TH}>Task</th>
        <th className={`${TH} w-[120px]`}>User</th>
        <th className={TH}>Result</th>
      </tr>
    </thead>
    <tbody>
      {tasks.map((t, i) => (
        <tr key={`${t.time}-${t.target}-${i}`} className="hover:bg-panel-ground">
          <td className={`${TD} num`}>{hhmmss(t.time)}</td>
          <td className={`${TD} num`}>{t.target}</td>
          <td className={TD}>{t.task}</td>
          <td className={TD}>{t.user}</td>
          <td className={TD}>
            <span className="inline-flex items-center gap-1.5"><Dot tone={t.status === 'OK' ? 'ok' : t.status === 'WARN' ? 'warn' : 'bad'} />{t.result}</span>
          </td>
        </tr>
      ))}
    </tbody>
  </table>
);

const AuditTab: React.FC = () => {
  const { version } = useTree();
  const { data, error, loading } = usePoll(() => hw.tasks(200), [], { signal: version });
  if (error && !data) return <ErrorNote message="Audit log unavailable." />;
  if (loading) return <Loading what="audit log" />;
  if (!data || data.length === 0) return <Empty>No audited actions yet.</Empty>;
  return <TaskTable tasks={data} />;
};

export const Dock: React.FC = () => {
  const { tasks, alarms, errors } = useTree();
  const [open, setOpen] = useState(true);
  const [tab, setTab] = useState<DockTab>('tasks');
  const unacked = (alarms ?? []).filter(a => !a.acked).length;
  const tabs: { id: DockTab; label: string }[] = [
    { id: 'tasks', label: 'Tasks' },
    { id: 'alarms', label: unacked ? `Alarms (${unacked})` : 'Alarms' },
    { id: 'audit', label: 'Audit' },
  ];
  return (
    <section aria-label="Task and alarm log" className="shrink-0 bg-panel-raised border-t border-panel-wire flex flex-col" style={{ height: open ? 190 : 32 }}>
      <div className="h-8 shrink-0 flex items-center px-2 gap-1 bg-panel-ground border-b border-panel-seam" role="tablist" aria-label="Log views">
        {tabs.map(t => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => { setTab(t.id); setOpen(true); }}
            className={`px-2.5 h-8 text-[13px] border-b-2 -mb-px ${tab === t.id && open ? 'border-accent font-semibold text-panel-ink' : 'border-transparent text-panel-muted hover:text-panel-ink'}`}
          >
            {t.label}
          </button>
        ))}
        <span className="ml-auto text-xs text-panel-muted pr-1">Refreshes every 10 s</span>
        <button
          type="button"
          aria-label={open ? 'Collapse log' : 'Expand log'}
          aria-expanded={open}
          onClick={() => setOpen(o => !o)}
          className="w-6 h-6 inline-flex items-center justify-center rounded-[3px] hover:bg-panel-grid text-panel-muted"
        >
          {open ? <ChevronDown size={14} aria-hidden /> : <ChevronUp size={14} aria-hidden />}
        </button>
      </div>
      {open && (
        <div className="flex-1 overflow-auto" role="tabpanel">
          {tab === 'tasks' && (
            errors.tasks && !tasks ? <ErrorNote message={`Tasks unavailable: ${errors.tasks}`} />
              : !tasks ? <Loading what="tasks" />
              : tasks.length === 0 ? <Empty>No tasks recorded.</Empty>
              : <TaskTable tasks={tasks} />
          )}
          {tab === 'alarms' && (
            errors.alarms && !alarms ? <ErrorNote message={`Alarms unavailable: ${errors.alarms}`} />
              : !alarms ? <Loading what="alarms" />
              : alarms.length === 0 ? <Empty>No alarms.</Empty>
              : <AlarmTable alarms={alarms} compact />
          )}
          {tab === 'audit' && <AuditTab />}
        </div>
      )}
    </section>
  );
};
