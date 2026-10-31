import React from 'react';
import { Power, Undo2 } from 'lucide-react';
import { Classroom, RoomStatus } from '../../types';
import { SpaceReading, STATE_LABEL } from '../../services/pilot';

export type Switch = 'ac_on' | 'fan_on' | 'lights_on';

const STATUS_LABEL: Record<RoomStatus, string> = {
  OCCUPIED: 'In class',
  BOOKED_EXTRA_CLASS: 'Extra class',
  VACANT: 'Free period',
  LUNCH: 'Lunch break',
  AFTER_HOURS: 'After hours',
};

const SWITCHES: { key: Switch; label: string }[] = [
  { key: 'ac_on', label: 'AC' },
  { key: 'fan_on', label: 'Fans' },
  { key: 'lights_on', label: 'Lights' },
];

const fmt = (n: number) => n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

interface Props {
  room: Classroom;
  /** The same simulated reading Overview shows for this room at this moment. */
  reading?: SpaceReading;
  live: boolean;
  busy: boolean;
  onSwitch: (key: Switch, on: boolean) => void;
  onTrip: () => void;
  onRelease: () => void;
}

/** Column template shared by the header row and every room row (lg and up). */
export const ROOM_GRID =
  'grid-cols-[10px_minmax(0,1fr)_auto] lg:grid-cols-[10px_76px_112px_minmax(0,1fr)_178px_60px_132px]';

export const RoomRow: React.FC<Props> = ({ room, reading, live, busy, onSwitch, onTrip, onRelease }) => {
  const s = room.current_status;
  const kw = reading?.kw ?? s?.energy_draw_kw ?? 0;
  const wasteKw = reading ? reading.waste_kw : s?.waste_detected ? kw : 0;
  const tripped = !!reading?.cut_armed;
  const stateLabel = reading ? STATE_LABEL[reading.state] : s ? STATUS_LABEL[s.status] : '—';
  const entry = s?.timetable_entry;
  const booking = s?.active_booking;
  const lamp = tripped ? 'bg-lamp-off' : kw > 0.05 ? 'bg-lamp-on' : 'bg-panel-wire';
  const ds = room.device_state;
  const canSwitch = live && !busy && !!ds;

  return (
    <li className={`grid ${ROOM_GRID} items-center gap-x-3 gap-y-1.5 px-4 py-2.5 border-t border-panel-seam`}>
      <span
        className={`order-1 w-2 h-2 rounded-full ${lamp}`}
        title={tripped ? 'Tripped' : kw > 0.05 ? 'Energised' : 'Off'}
        aria-hidden
      />

      <div className="order-2 min-w-0">
        <div className="num text-[13px] font-semibold">{room.name}</div>
        <div className="text-[11px] text-panel-muted">
          <span className="num">{room.capacity}</span> seats<span className="lg:hidden"> · {stateLabel}</span>
        </div>
      </div>

      <div className="hidden lg:block lg:order-3 text-xs">
        {stateLabel}
        {tripped && <div className="text-2xs font-semibold uppercase text-lamp-off">Tripped</div>}
      </div>

      <div className="order-4 col-span-full lg:col-span-1 min-w-0 text-xs">
        {booking ? (
          <>
            <div className="truncate">Extra class · {booking.subject || 'untitled'}</div>
            <div className="text-[11px] text-panel-muted truncate">
              <span className="num">{booking.start_time?.slice(0, 5)}–{booking.end_time?.slice(0, 5)}</span>
              {booking.expected_students ? <> · ~<span className="num">{booking.expected_students}</span> students</> : null}
            </div>
          </>
        ) : entry ? (
          <>
            <div className="truncate">{entry.subject}</div>
            <div className="text-[11px] text-panel-muted truncate">
              {entry.teacher}{entry.section ? ` · ${entry.section}` : ''} · <span className="num">{entry.start_time}–{entry.end_time}</span>
            </div>
          </>
        ) : (
          <div className="text-panel-muted">No class scheduled</div>
        )}
        {wasteKw > 0 && (
          <div className="text-[11px] text-waste truncate">
            {reading?.state_since ? <>Empty since <span className="num">{reading.state_since}</span>, drawing power</> : s?.waste_reason ?? 'Drawing power while empty'}
          </div>
        )}
      </div>

      <div className={`order-3 lg:order-6 num text-[13px] font-semibold text-right ${wasteKw > 0 ? 'text-waste' : ''}`}>
        {fmt(kw)}
        <span className="lg:hidden font-sans text-[11px] font-medium text-panel-muted"> kW</span>
      </div>

      {/* Mobile: one row of switches + action. Desktop: two grid cells. */}
      <div className="order-5 col-span-full flex items-center justify-between gap-3 lg:contents">
        <div className="lg:order-5 flex gap-1" role="group" aria-label={`${room.name} switches`}>
          {SWITCHES.map(sw => {
            const on = !!ds?.[sw.key];
            return (
              <button
                key={sw.key}
                aria-pressed={on}
                disabled={!canSwitch}
                onClick={() => onSwitch(sw.key, !on)}
                title={live ? `Switch ${sw.label.toLowerCase()} ${on ? 'off' : 'on'} for today (simulated)` : 'Return to live to switch'}
                className={`text-xs px-2.5 py-1 rounded-[3px] border snap disabled:cursor-not-allowed disabled:opacity-50 ${
                  on ? 'border-accent bg-accent/10 text-accent font-semibold' : 'border-panel-seam text-panel-muted hover:border-panel-wire'
                }`}
              >
                {sw.label}
              </button>
            );
          })}
        </div>

        <div className="lg:order-7 flex justify-end">
          {tripped ? (
            <button
              disabled={!live || busy}
              onClick={onRelease}
              className="flex items-center gap-1.5 border border-panel-wire hover:border-accent hover:text-accent text-xs px-2.5 py-1 rounded-[3px] snap disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Undo2 className="w-3 h-3" strokeWidth={1.6} /> Release trip
            </button>
          ) : (
            <button
              disabled={!live || busy || !reading}
              onClick={onTrip}
              title={live ? `Switch off ${room.name}'s controllable loads while it is empty today` : 'Return to live to trip'}
              className="flex items-center gap-1.5 border border-panel-wire hover:border-accent hover:text-accent text-[11px] font-semibold tracking-[0.1em] px-2.5 py-1 rounded-[3px] snap disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Power className="w-3 h-3" strokeWidth={1.6} /> TRIP
            </button>
          )}
        </div>
      </div>
    </li>
  );
};
