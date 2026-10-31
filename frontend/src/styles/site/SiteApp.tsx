import React, { useCallback, useEffect, useState } from 'react';
import { Navigate, NavLink, Route, Routes } from 'react-router-dom';
import {
  Map as MapIcon, DoorOpen, Cpu, Bell, CalendarClock, CalendarPlus, Calculator, LayoutGrid, FileBarChart, Settings as Cog, ArrowLeft, Search,
} from 'lucide-react';
import { ThemeProvider } from '../../components/layout/ThemeProvider';
import { CommandPalette } from '../../components/layout/CommandPalette';
import { StyleProvider, usePaths } from '../StyleContext';
import { ExtraClassBooking } from '../../pages/ExtraClassBooking';
import { Timetable } from '../../pages/Timetable';
import { SavingsCalculator } from '../../pages/SavingsCalculator';
import { FloorMaps } from '../../pages/FloorMaps';
import { Reports } from '../../pages/Reports';
import { Settings } from '../../pages/Settings';
import { SiteData, useSite } from './data';
import { MapView } from './MapView';
import { AlarmsView, DevicesView, RoomsView } from './Views';
import { Notice } from './ui';

const NAV = [
  { to: '/', label: 'Site map', icon: MapIcon, end: true },
  { to: '/rooms', label: 'Rooms', icon: DoorOpen },
  { to: '/devices', label: 'Devices', icon: Cpu },
  { to: '/alarms', label: 'Alarms', icon: Bell, badge: true },
  { to: '/timetable', label: 'Schedules', icon: CalendarClock },
  { to: '/book', label: 'Bookings', icon: CalendarPlus },
  { to: '/savings', label: 'Energy & savings', icon: Calculator },
  { to: '/floors', label: 'Inventory', icon: LayoutGrid },
  { to: '/reports', label: 'Reports', icon: FileBarChart },
  { to: '/settings', label: 'Settings', icon: Cog },
];

const LeftNav: React.FC = () => {
  const p = usePaths();
  const { alarms } = useSite();
  const open = alarms.filter(a => !a.acked).length;
  return (
    <nav aria-label="Site navigation" className="w-[200px] shrink-0 bg-chrome-rail border-r border-panel-seam flex flex-col">
      <div className="px-4 h-14 flex items-center border-b border-panel-seam">
        <span className="text-[15px] font-semibold">Green Campus</span>
      </div>
      <ul className="p-2 space-y-0.5 flex-1">
        {NAV.map(n => (
          <li key={n.to}>
            <NavLink
              to={p(n.to)} end={n.end}
              className={({ isActive }) => `flex items-center gap-2.5 rounded-[6px] px-2.5 py-1.5 text-[13px] ${isActive ? 'bg-chrome-rail-active text-chrome-rail-active-ink font-semibold' : 'text-chrome-rail-ink hover:bg-chrome-rail-active hover:text-chrome-rail-active-ink'}`}
            >
              <n.icon className="w-4 h-4 shrink-0" strokeWidth={1.7} aria-hidden />
              <span className="flex-1">{n.label}</span>
              {n.badge && open > 0 && <span className="num text-[11px] font-semibold rounded-full px-1.5 bg-panel-wire text-panel-ink" aria-label={`${open} unacknowledged`}>{open}</span>}
            </NavLink>
          </li>
        ))}
      </ul>
      <div className="p-2 border-t border-panel-seam">
        <NavLink to="/" className="flex items-center gap-2.5 rounded-[6px] px-2.5 py-1.5 text-[13px] text-chrome-rail-ink hover:bg-chrome-rail-active hover:text-chrome-rail-active-ink">
          <ArrowLeft className="w-4 h-4" strokeWidth={1.7} aria-hidden /> All styles
        </NavLink>
      </div>
    </nav>
  );
};

const Stat: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="min-w-0">
    <div className="text-[11px] text-panel-muted leading-4">{label}</div>
    <div className="text-[17px] font-semibold num leading-6 whitespace-nowrap">{children}</div>
  </div>
);

const Clock: React.FC = () => {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t); }, []);
  return (
    <time className="num font-mono text-xs text-panel-muted" dateTime={now.toISOString()}>
      {now.toLocaleDateString('en-GB', { weekday: 'short' })} {now.toLocaleTimeString('en-GB')}
    </time>
  );
};

const Header: React.FC<{ onPalette: () => void }> = ({ onPalette }) => {
  const { buildings, floorId, setFloorId, overview, floorIsPilot } = useSite();
  const ov = overview;
  const dash = '--';
  return (
    <header className="h-14 shrink-0 flex items-center gap-8 px-4 border-b border-panel-seam bg-chrome">
      <label className="flex items-center">
        <span className="sr-only">Site and floor</span>
        <select
          value={floorId ?? ''} onChange={e => setFloorId(Number(e.target.value))}
          className="bg-transparent text-[15px] font-semibold border border-panel-wire rounded-[6px] px-2 py-1 max-w-[260px]"
        >
          {buildings.map(b => (
            <optgroup key={b.id} label={b.name}>
              {b.floors.map(f => (
                <option key={f.id} value={f.id}>{b.name} · {f.name}{f.is_pilot ? '' : ' (not instrumented)'}</option>
              ))}
            </optgroup>
          ))}
        </select>
      </label>
      {floorIsPilot || !floorId ? (
        <>
          <Stat label="Load"><span>{ov ? ov.load_kw.toFixed(1) : dash}</span> <span className="text-[13px] font-medium">kW</span></Stat>
          <Stat label="Unoccupied & powered">
            <span className={ov && ov.unoccupied_powered_rooms > 0 ? 'text-waste' : ''}>
              {ov ? `${ov.unoccupied_powered_rooms} rooms · ${ov.waste_kw.toFixed(1)} kW` : dash}
            </span>
          </Stat>
          <Stat label="Devices online">{ov ? `${ov.sensors.online + ov.relays.ok + ov.meters.ok} / ${ov.sensors.total + ov.relays.total + ov.meters.total}` : dash}</Stat>
          <Stat label="Open alarms">
            {ov ? (
              <>
                <span className={ov.alarms.p1 > 0 ? 'text-lamp-on' : ''}>{ov.alarms.p1} P1</span>
                <span> · {Math.max(0, ov.alarms.open - ov.alarms.p1)} other</span>
              </>
            ) : dash}
          </Stat>
        </>
      ) : <span className="text-[13px] text-panel-muted">Not instrumented</span>}
      <div className="ml-auto flex items-center gap-4">
        <span className="text-[11px] uppercase tracking-[0.08em] border border-panel-wire rounded-[4px] px-1.5 py-0.5 text-panel-muted" title="Telemetry is simulated until hardware is installed">Simulated</span>
        <button type="button" onClick={onPalette} aria-label="Open command palette (Ctrl+K)" className="flex items-center gap-1.5 text-xs text-panel-muted border border-panel-wire rounded-[6px] px-2 py-1 hover:bg-panel-seam">
          <Search className="w-3.5 h-3.5" strokeWidth={1.7} aria-hidden /> <span className="font-mono">Ctrl K</span>
        </button>
        <Clock />
      </div>
    </header>
  );
};

const Shell: React.FC = () => {
  const { offline, error } = useSite();
  const [palette, setPalette] = useState(false);
  const close = useCallback(() => setPalette(false), []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setPalette(true); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  const embed = (el: React.ReactNode) => <div className="flex-1 min-h-0 overflow-auto">{el}</div>;
  return (
    <div className="h-screen flex bg-panel-ground text-panel-ink">
      <LeftNav />
      <div className="flex-1 min-w-0 flex flex-col">
        <Header onPalette={() => setPalette(true)} />
        {offline && (
          <div className="px-4 pt-3"><Notice tone="error">Backend offline — start uvicorn in backend/. Showing no data until it responds.</Notice></div>
        )}
        {!offline && error && <div className="px-4 pt-3"><Notice tone="error">{error}</Notice></div>}
        <main className="flex-1 min-h-0 flex flex-col">
          <Routes>
            <Route index element={<MapView />} />
            <Route path="rooms" element={<RoomsView />} />
            <Route path="classrooms" element={<Navigate to="../rooms" replace />} />
            <Route path="devices" element={<DevicesView />} />
            <Route path="alarms" element={<AlarmsView />} />
            <Route path="alerts" element={<Navigate to="../alarms" replace />} />
            <Route path="timetable" element={embed(<Timetable />)} />
            <Route path="book" element={embed(<ExtraClassBooking />)} />
            <Route path="savings" element={embed(<SavingsCalculator />)} />
            <Route path="floors" element={embed(<FloorMaps />)} />
            <Route path="reports" element={embed(<Reports />)} />
            <Route path="settings" element={embed(<Settings />)} />
            <Route path="*" element={<Navigate to="." replace />} />
          </Routes>
        </main>
      </div>
      <CommandPalette open={palette} onClose={close} />
    </div>
  );
};

export const SiteApp: React.FC = () => (
  <StyleProvider id="site">
    <ThemeProvider lockedTheme="site">
      <SiteData>
        <Shell />
      </SiteData>
    </ThemeProvider>
  </StyleProvider>
);

export default SiteApp;
