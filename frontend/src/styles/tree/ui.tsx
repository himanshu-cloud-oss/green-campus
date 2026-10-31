import React from 'react';
import { NavLink } from 'react-router-dom';
import { alpha, useTheme } from '../../theme';
import type { Priority } from '../../services/hw';

export type Tone = 'ok' | 'warn' | 'bad' | 'idle';

const DOT: Record<Tone, string> = { ok: 'bg-lamp-off', warn: 'bg-waste', bad: 'bg-lamp-on', idle: 'bg-panel-wire' };
export const TONE_LABEL: Record<Tone, string> = { ok: 'OK', warn: 'Warning', bad: 'Fault', idle: 'No data' };

export const Dot: React.FC<{ tone: Tone; className?: string }> = ({ tone, className = '' }) => (
  <span className={`inline-block w-2 h-2 rounded-full shrink-0 ${DOT[tone]} ${className}`} role="img" aria-label={TONE_LABEL[tone]} />
);

export const StatusText: React.FC<{ tone: Tone; children: React.ReactNode }> = ({ tone, children }) => (
  <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
    <Dot tone={tone} />
    <span>{children}</span>
  </span>
);

type BtnKind = 'primary' | 'default' | 'ghost';
const BTN: Record<BtnKind, string> = {
  primary: 'bg-accent text-accent-on border-accent hover:bg-accent-hover hover:border-accent-hover',
  default: 'bg-panel-raised text-panel-ink border-panel-wire hover:bg-panel-ground',
  ghost: 'bg-transparent text-panel-muted border-transparent hover:bg-panel-grid hover:text-panel-ink',
};

export const Btn: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { kind?: BtnKind; small?: boolean }> = ({
  kind = 'default', small, className = '', type = 'button', ...rest
}) => (
  <button
    type={type}
    {...rest}
    className={`inline-flex items-center justify-center gap-1.5 border rounded-[4px] font-semibold whitespace-nowrap disabled:opacity-45 disabled:pointer-events-none ${
      small ? 'h-6 px-2 text-xs' : 'h-8 px-3 text-[13px]'
    } ${BTN[kind]} ${className}`}
  />
);

export const Panel: React.FC<{
  title?: React.ReactNode; right?: React.ReactNode; children: React.ReactNode; className?: string; flush?: boolean; label?: string;
}> = ({ title, right, children, className = '', flush, label }) => (
  <section aria-label={label ?? (typeof title === 'string' ? title : undefined)} className={`bg-panel-raised border border-panel-seam rounded-[4px] min-w-0 ${className}`}>
    {(title || right) && (
      <header className="flex items-center justify-between gap-3 px-3 h-9 border-b border-panel-seam">
        <h2 className="text-[13px] font-semibold truncate">{title}</h2>
        {right && <div className="text-xs text-panel-muted flex items-center gap-2">{right}</div>}
      </header>
    )}
    <div className={flush ? '' : 'p-3'}>{children}</div>
  </section>
);

export const KV: React.FC<{ rows: [string, React.ReactNode][] }> = ({ rows }) => (
  <dl className="text-[13px]">
    {rows.map(([k, v]) => (
      <div key={k} className="grid grid-cols-[140px_1fr] border-b border-panel-seam last:border-b-0">
        <dt className="px-3 py-2 text-panel-muted bg-panel-ground/60">{k}</dt>
        <dd className="px-3 py-2 min-w-0">{v}</dd>
      </div>
    ))}
  </dl>
);

export const Tabs: React.FC<{ tabs: { id: string; label: string; to: string; count?: number }[]; current: string }> = ({ tabs, current }) => (
  <nav className="flex gap-0 border-b border-panel-seam" role="tablist" aria-label="Object views">
    {tabs.map(t => (
      <NavLink
        key={t.id}
        to={t.to}
        role="tab"
        aria-selected={t.id === current}
        className={`px-3.5 h-9 inline-flex items-center gap-1.5 text-[13px] border-b-2 -mb-px ${
          t.id === current ? 'border-accent text-accent font-semibold' : 'border-transparent text-panel-muted hover:text-panel-ink'
        }`}
      >
        {t.label}
        {t.count !== undefined && t.count > 0 && <span className="num text-[11px] text-panel-muted">({t.count})</span>}
      </NavLink>
    ))}
  </nav>
);

export const ObjectHeader: React.FC<{
  title: React.ReactNode; status?: React.ReactNode; actions?: React.ReactNode; crumbs?: React.ReactNode;
}> = ({ title, status, actions, crumbs }) => (
  <div className="px-4 pt-3 pb-1">
    {crumbs && <div className="text-xs text-panel-muted mb-0.5">{crumbs}</div>}
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      <h1 className="text-[17px] font-semibold leading-8">{title}</h1>
      {status && <div className="text-[13px] text-panel-muted flex items-center gap-1.5 min-w-0">{status}</div>}
      {actions && <div className="ml-auto flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  </div>
);

export const Chip: React.FC<{ color: string; children: React.ReactNode; title?: string }> = ({ color, children, title }) => (
  <span title={title} className="inline-flex items-center rounded-[3px] px-1.5 h-5 text-[11px] font-semibold num whitespace-nowrap text-panel-ink" style={{ background: alpha(color, 0.16), boxShadow: `inset 0 0 0 1px ${alpha(color, 0.35)}` }}>
    {children}
  </span>
);

/** ON/OFF indicator; `bad` marks a feedback that disagrees with the command. */
export const OnOffChip: React.FC<{ value: 'ON' | 'OFF'; bad?: boolean }> = ({ value, bad }) => {
  const { p } = useTheme();
  return <Chip color={bad ? p.waste : value === 'ON' ? p.accent : p.catNeutral}>{value}</Chip>;
};

export const PriorityChip: React.FC<{ priority: Priority }> = ({ priority }) => {
  const { p } = useTheme();
  return <Chip color={priority === 'P1' ? p.lampOn : priority === 'P2' ? p.waste : p.catNeutral}>{priority}</Chip>;
};

export const Empty: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="px-3 py-6 text-center text-[13px] text-panel-muted">{children}</div>
);

export const Loading: React.FC<{ what?: string }> = ({ what = 'data' }) => (
  <div className="px-3 py-6 text-center text-[13px] text-panel-muted" role="status">Loading {what}...</div>
);

export const ErrorNote: React.FC<{ message: string }> = ({ message }) => (
  <div className="px-3 py-3 text-[13px] text-panel-ink bg-waste-field border-b border-panel-seam" role="alert">{message}</div>
);

export const TH = 'text-left text-xs font-semibold text-panel-muted bg-panel-ground px-3 h-8 border-b border-panel-seam whitespace-nowrap';
export const TD = 'px-3 h-9 border-b border-panel-seam align-middle';
export const TDR = `${TD} text-right num`;
export const THR = `${TH} text-right`;

export const Seg: React.FC<{ value: 'ON' | 'OFF'; onPick: (v: 'ON' | 'OFF') => void; disabled?: boolean; label: string }> = ({ value, onPick, disabled, label }) => (
  <div role="group" aria-label={label} className="inline-flex border border-panel-wire rounded-[4px] overflow-hidden">
    {(['ON', 'OFF'] as const).map(v => (
      <button
        key={v}
        type="button"
        disabled={disabled}
        aria-pressed={value === v}
        onClick={() => value !== v && onPick(v)}
        className={`h-6 px-2.5 text-[11px] font-semibold num disabled:opacity-45 ${
          value === v ? 'bg-accent text-accent-on' : 'bg-panel-raised text-panel-muted hover:bg-panel-ground hover:text-panel-ink'
        }`}
      >
        {v}
      </button>
    ))}
  </div>
);

/** "Classroom LS-10" -> "Classroom" when the code is already part of the name. */
export const shortName = (code: string, name: string) => name.replace(code, '').replace(/\s+/g, ' ').trim();

export const hhmmss = (s: string) => (s.includes('T') ? s.slice(11, 19) : s.length > 8 ? s.slice(-8) : s);
export const hhmm = (s: string) => s.slice(0, 5);
