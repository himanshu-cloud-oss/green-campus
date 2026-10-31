import React from 'react';
import { HwAlarm, Priority } from '../../services/hw';

export const fmtTime = (s: string | null | undefined) => {
  if (!s) return '--';
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s.length > 5 ? s.slice(0, 5) : s;
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
};
export const kw = (v: number | null | undefined) => (v == null ? '--' : v.toFixed(2));

export type Health = 'ok' | 'warn' | 'fault' | 'offline';
export const HEALTH_DOT: Record<Health, string> = {
  ok: 'bg-lamp-off', warn: 'bg-waste', fault: 'bg-lamp-on', offline: 'bg-panel-wire',
};
export const HEALTH_LABEL: Record<Health, string> = {
  ok: 'Healthy', warn: 'Unoccupied and powered', fault: 'Fault', offline: 'Offline',
};

export const Dot: React.FC<{ health: Health; className?: string }> = ({ health, className = '' }) => (
  <span className={`inline-block w-2 h-2 rounded-full shrink-0 ${HEALTH_DOT[health]} ${className}`} role="img" aria-label={HEALTH_LABEL[health]} />
);

const PRI: Record<Priority, string> = {
  P1: 'bg-lamp-on text-accent-on', P2: 'bg-waste text-accent-on', P3: 'bg-panel-wire text-panel-ink',
};
export const PriChip: React.FC<{ priority: Priority }> = ({ priority }) => (
  <span className={`inline-block rounded-[3px] px-1.5 py-px text-[11px] font-bold num leading-4 ${PRI[priority]}`}>{priority}</span>
);

export const SectionTitle: React.FC<{ children: React.ReactNode; right?: React.ReactNode }> = ({ children, right }) => (
  <div className="flex items-center justify-between gap-3 mb-2">
    <h2 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-panel-muted">{children}</h2>
    {right}
  </div>
);

type BtnKind = 'primary' | 'secondary' | 'danger';
export const Btn: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { kind?: BtnKind; small?: boolean }> = ({
  kind = 'secondary', small, className = '', ...rest
}) => {
  const base = 'rounded-[6px] font-semibold border transition-colors disabled:opacity-45 disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2';
  const size = small ? 'px-2.5 py-1 text-xs' : 'px-3 py-2 text-[13px]';
  const look =
    kind === 'primary' ? 'bg-accent text-accent-on border-accent enabled:hover:bg-accent-hover'
    : kind === 'danger' ? 'bg-transparent text-lamp-on border-lamp-on enabled:hover:bg-panel-seam'
    : 'bg-transparent text-panel-ink border-panel-wire enabled:hover:bg-panel-seam';
  return <button type="button" {...rest} className={`${base} ${size} ${look} ${className}`} />;
};

export const Switch: React.FC<{ checked: boolean; label: string; onChange: () => void; disabled?: boolean }> = ({ checked, label, onChange, disabled }) => (
  <button
    type="button" role="switch" aria-checked={checked} aria-label={label} disabled={disabled} onClick={onChange}
    className={`relative w-9 h-5 rounded-full shrink-0 transition-colors disabled:opacity-45 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 ${checked ? 'bg-accent' : 'bg-panel-wire'}`}
  >
    <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-panel-ink transition-all ${checked ? 'left-[18px]' : 'left-0.5'}`} />
  </button>
);

export const Notice: React.FC<{ tone?: 'info' | 'error'; children: React.ReactNode; className?: string }> = ({ tone = 'info', children, className = '' }) => (
  <div role={tone === 'error' ? 'alert' : 'status'} className={`rounded-[6px] border px-3 py-2 text-[13px] ${tone === 'error' ? 'border-lamp-on text-lamp-on' : 'border-panel-seam text-panel-muted'} bg-panel-raised ${className}`}>
    {children}
  </div>
);

export const Empty: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="py-8 text-center text-[13px] text-panel-muted">{children}</div>
);

export const Th: React.FC<React.ThHTMLAttributes<HTMLTableCellElement>> = ({ className = '', ...r }) => (
  <th {...r} className={`text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-panel-muted px-3 py-2 border-b border-panel-seam whitespace-nowrap ${className}`} />
);
export const Td: React.FC<React.TdHTMLAttributes<HTMLTableCellElement>> = ({ className = '', ...r }) => (
  <td {...r} className={`px-3 py-2 text-xs border-b border-panel-seam align-middle ${className}`} />
);

export const FilterSelect: React.FC<{ label: string; value: string; onChange: (v: string) => void; options: [string, string][] }> = ({ label, value, onChange, options }) => (
  <label className="flex items-center gap-1.5 text-xs text-panel-muted">
    {label}
    <select value={value} onChange={e => onChange(e.target.value)} className="bg-panel-raised text-panel-ink border border-panel-wire rounded-[6px] px-2 py-1 text-xs">
      {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
    </select>
  </label>
);

export const alarmCounts = (a: HwAlarm[]) => a.filter(x => !x.acked).length;
