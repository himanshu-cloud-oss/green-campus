import React, { useEffect, useRef, useState } from 'react';
import { hw, ago } from '../../services/hw';
import { STATE_LABEL, RoomState } from '../../services/pilot';
import { useSite } from './data';
import { Btn, Dot, Empty, fmtTime, Notice, PriChip, SectionTitle, Td, Th, kw } from './ui';
import { Inspector } from './Inspector';

const TILE_BORDER = { ok: 'border-panel-seam', warn: 'border-waste', fault: 'border-lamp-on', offline: 'border-panel-wire' } as const;

const FloorPlan: React.FC = () => {
  const { floor, overview, readingOf, healthOf, details, channels, selectedId, select } = useSite();
  const box = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 900, h: 500 });
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    setSize({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, [floor]);
  const gap = 6;
  const gwH = 28;
  const maxY = floor ? Math.max(...floor.spaces.map(s => s.map_y + s.map_h), 1) : 1;
  const cell = floor ? Math.max(36, Math.floor(Math.min(size.w / floor.map_width, (size.h - gwH) / maxY))) : 36;
  const gw = overview?.gateway;
  if (!floor) return <Empty>No floor plan available.</Empty>;

  return (
    <div ref={box} className="w-full h-full">
      <div className="relative" style={{ width: floor.map_width * cell, height: maxY * cell + gwH }}>
        {floor.spaces.map(s => {
          const r = readingOf(s.id);
          const d = details[s.id];
          const rows = channels.filter(c => c.space_id === s.id);
          const chs = d?.relay_bank.channels ?? [];
          const onCount = chs.length ? chs.filter(c => c.command === 'ON').length : rows.filter(c => c.command === 'ON').length;
          const total = chs.length || rows.length;
          const health = healthOf(s.id);
          const sel = selectedId === s.id;
          const h = s.map_h * cell - gap;
          const state = d?.label ?? r?.label ?? (r ? STATE_LABEL[r.state as RoomState] : '--');
          const small = h < 96;
          const kwv = kw(r?.kw ?? d?.kw);
          const hwLine = (
            <>
              {total > 0 ? <span className="num">relays {onCount}/{total}</span> : 'no relays'}
              {d && d.sensors.some(x => x.type === 'OCCUPANCY') ? ' · PIR' : ''}{d && d.sensors.some(x => x.type === 'POWER') ? ' · CT' : ''}
            </>
          );
          return (
            <button
              key={s.id} type="button" onClick={() => select(sel ? null : s.id)}
              aria-pressed={sel}
              aria-label={`${s.code} ${s.name}, ${state}, ${kwv} kilowatts`}
              className={`absolute text-left rounded-[6px] border bg-panel-raised px-2.5 py-2 flex flex-col overflow-hidden hover:bg-panel-seam focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent ${TILE_BORDER[health]} ${sel ? 'outline outline-2 outline-accent -outline-offset-1' : ''}`}
              style={{ left: s.map_x * cell, top: s.map_y * cell, width: s.map_w * cell - gap, height: h }}
            >
              <span className="flex items-center gap-1.5 min-w-0">
                <Dot health={health} />
                <span className="font-mono text-[13px] font-semibold truncate">{s.code}</span>
                {small && <span className="num font-mono text-xs ml-auto shrink-0">{kwv} kW</span>}
              </span>
              <span className="text-xs text-panel-muted mt-1 truncate" title={state}>{state}</span>
              {!small && <span className="num font-mono text-[20px] font-semibold leading-7 mt-1">{kwv}<span className="text-xs font-normal text-panel-muted"> kW</span></span>}
              {h >= 60 && <span className="text-[11px] text-panel-muted truncate mt-auto">{hwLine}</span>}
            </button>
          );
        })}
        {gw && (
          <div className="absolute flex items-center gap-2 text-[11px] text-panel-muted" style={{ left: 0, top: maxY * cell + 6 }}>
            <span className={`inline-block w-5 h-3 rounded-[2px] ${gw.status === 'ONLINE' || gw.status === 'OK' ? 'bg-accent' : 'bg-panel-wire'}`} aria-hidden />
            <span><span className="font-mono">{gw.id}</span> gateway · {gw.status.toLowerCase()} · seen <span className="num">{ago(gw.last_seen_s)}</span> ago</span>
          </div>
        )}
      </div>
    </div>
  );
};

export const AlarmTable: React.FC<{ compact?: boolean }> = () => {
  const { alarms, spaceById, select, refresh } = useSite();
  const [busy, setBusy] = useState<string | null>(null);
  const ack = async (key: string) => {
    setBusy(key);
    try { await hw.ack(key); } finally { setBusy(null); refresh(); }
  };
  const rows = [...alarms].sort((a, b) => Number(a.acked) - Number(b.acked) || a.priority.localeCompare(b.priority) || b.time.localeCompare(a.time));
  return (
    <section aria-label="Alarms" className="border-t border-panel-seam bg-panel-ground px-4 py-3 max-h-[260px] overflow-y-auto shrink-0">
      <SectionTitle>Alarms</SectionTitle>
      {rows.length === 0 ? <p className="text-[13px] text-panel-muted py-2">No alarms on this floor.</p> : (
        <table className="w-full border-collapse">
          <thead><tr><Th>Pri</Th><Th>Time</Th><Th>Object</Th><Th className="w-full">Message</Th><Th><span className="sr-only">Action</span></Th></tr></thead>
          <tbody>
            {rows.map(a => (
              <tr key={a.key} className={a.acked ? 'opacity-50' : ''}>
                <Td><PriChip priority={a.priority} /></Td>
                <Td className="num font-mono">{fmtTime(a.time)}</Td>
                <Td className="font-mono">
                  {a.space_id != null && spaceById(a.space_id)
                    ? <button type="button" className="underline decoration-panel-wire underline-offset-2 hover:text-accent" onClick={() => select(a.space_id)}>{a.object}</button>
                    : a.object}
                </Td>
                <Td className="text-[13px]">{a.message}</Td>
                <Td className="text-right">
                  <Btn small disabled={a.acked || busy === a.key} aria-label={`Acknowledge alarm ${a.object}: ${a.message}`} onClick={() => ack(a.key)}>
                    {a.acked ? 'Acked' : 'Ack'}
                  </Btn>
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
};

export const MapView: React.FC = () => {
  const { floorIsPilot, floorName, loading, floor } = useSite();
  return (
    <div className="flex flex-1 min-h-0">
      <div className="flex-1 min-w-0 flex flex-col">
        <div className="flex-1 min-h-0 overflow-auto p-4 flex flex-col">
          <SectionTitle right={floorIsPilot ? <span className="text-[11px] text-panel-muted">Live · refreshes every 10 s</span> : undefined}>
            {floorName || 'Floor'} {floorIsPilot ? '· live' : ''}
          </SectionTitle>
          {!floorIsPilot && !loading && (
            <Notice>This floor is not instrumented. Relays, occupancy sensors and CT meters are installed on the pilot floor only.</Notice>
          )}
          {floorIsPilot && loading && !floor && <p className="text-[13px] text-panel-muted">Loading floor plan...</p>}
          {floorIsPilot && floor && <div className="relative flex-1 min-h-[320px]"><div className="absolute inset-0"><FloorPlan /></div></div>}
        </div>
        {floorIsPilot && <AlarmTable />}
      </div>
      {floorIsPilot && <Inspector />}
    </div>
  );
};
