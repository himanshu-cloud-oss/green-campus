import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Building2, ChevronDown, Search } from 'lucide-react';
import { ago } from '../../services/hw';
import { useTree } from './data';
import { Dot } from './ui';

const Clock: React.FC = () => {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);
  return <span className="num text-xs" aria-label="Local time">{now.toLocaleTimeString('en-GB')}</span>;
};

const BuildingSwitcher: React.FC = () => {
  const { buildings, building, selectBuilding } = useTree();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', away);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', away); document.removeEventListener('keydown', esc); };
  }, [open]);

  return (
    <div className="relative" ref={box}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Switch building"
        onClick={() => setOpen(o => !o)}
        className="h-7 px-2.5 inline-flex items-center gap-2 rounded-[4px] border border-chrome-ink/25 hover:bg-chrome-ink/10 text-[13px]"
      >
        <Building2 size={14} aria-hidden />
        <span className="font-semibold">{building?.name ?? 'No building'}</span>
        {building && <span className="num text-xs opacity-70">{building.floors.length} {building.floors.length === 1 ? 'floor' : 'floors'}</span>}
        <ChevronDown size={14} aria-hidden />
      </button>
      {open && (
        <ul role="listbox" aria-label="Buildings" className="absolute left-0 top-8 z-30 min-w-[240px] bg-panel-raised text-panel-ink border border-panel-wire rounded-[4px] shadow-sm py-1">
          {(buildings ?? []).map(b => (
            <li key={b.id} role="option" aria-selected={b.id === building?.id}>
              <button
                type="button"
                className={`w-full text-left px-3 h-8 flex items-center justify-between gap-4 text-[13px] hover:bg-panel-ground ${b.id === building?.id ? 'text-accent font-semibold' : ''}`}
                onClick={() => { selectBuilding(b.id); setOpen(false); navigate('/tree'); }}
              >
                <span>{b.name}</span>
                <span className="num text-xs text-panel-muted">{b.floors.length} {b.floors.length === 1 ? 'floor' : 'floors'}</span>
              </button>
            </li>
          ))}
          {(buildings ?? []).length === 0 && <li className="px-3 py-2 text-xs text-panel-muted">No buildings available</li>}
        </ul>
      )}
    </div>
  );
};

const Stat: React.FC<{ label: string; children: React.ReactNode; warn?: boolean }> = ({ label, children, warn }) => (
  <span className="inline-flex items-center gap-1.5 text-xs whitespace-nowrap">
    <span className="opacity-70">{label}</span>
    <span className={`num ${warn ? 'bg-waste-field text-panel-ink font-semibold rounded-[3px] px-1.5' : ''}`}>{children}</span>
  </span>
);

export const TopBar: React.FC<{ onSearch: () => void }> = ({ onSearch }) => {
  const { overview: o, gatewayTone } = useTree();
  return (
    <header className="h-11 shrink-0 bg-chrome text-chrome-ink flex items-center gap-4 px-3">
      <Link to="/tree" className="font-semibold text-[14px] whitespace-nowrap">Green Campus <span className="opacity-60">·</span> BMS</Link>
      <BuildingSwitcher />
      <button
        type="button"
        onClick={onSearch}
        aria-label="Search rooms, devices, sensors (Ctrl+K)"
        className="h-7 w-[260px] max-w-[26vw] px-2.5 inline-flex items-center gap-2 rounded-[4px] bg-chrome-ink/10 hover:bg-chrome-ink/15 text-xs opacity-90"
      >
        <Search size={13} aria-hidden />
        <span className="opacity-75">Search rooms, devices, sensors</span>
        <kbd className="ml-auto num text-[10.5px] opacity-60">Ctrl+K</kbd>
      </button>
      <div className="ml-auto flex items-center gap-4">
        {o ? (
          <>
            <span className="inline-flex items-center gap-1.5 text-xs whitespace-nowrap">
              <span className="num">{o.gateway.id}</span>
              <Dot tone={gatewayTone} />
              <span>{o.gateway.status.toLowerCase()}</span>
              <span className="num opacity-70">seen {ago(o.gateway.last_seen_s)} ago</span>
            </span>
            <Stat label="Sensors">{o.sensors.online}/{o.sensors.total}</Stat>
            <Stat label="Relays" warn={o.relays.mismatch > 0}>
              {o.relays.ok}/{o.relays.total}{o.relays.mismatch > 0 && ` · ${o.relays.mismatch} mismatch`}
            </Stat>
            <Stat label="Alarms" warn={o.alarms.unacked > 0}>{o.alarms.open} open</Stat>
          </>
        ) : (
          <span className="text-xs opacity-70">No live status</span>
        )}
        <span className="text-[10.5px] font-semibold tracking-wide uppercase border border-chrome-ink/40 rounded-[3px] px-1.5 py-0.5" title="Telemetry and relays are simulated until hardware is installed">
          Simulated
        </span>
        <Link to="/" className="text-xs underline underline-offset-4 opacity-85 hover:opacity-100">Styles</Link>
        <Clock />
      </div>
    </header>
  );
};
