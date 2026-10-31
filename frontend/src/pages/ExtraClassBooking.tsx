import React, { useCallback, useEffect, useState } from 'react';
import { ArrowRightLeft, X } from 'lucide-react';
import { RoomDayStrip } from '../components/panel/RoomDayStrip';
import {
  AutoBookingRequest,
  AutoBookingResult,
  BookingRecord,
  errorMessage,
  pilot,
  SlotOption,
} from '../services/pilot';

const isoDate = (d: Date) => d.toLocaleDateString('en-CA');
const nextWorkday = () => {
  const d = new Date();
  const now = d.getHours() * 60 + d.getMinutes();
  if (now > 16 * 60) d.setDate(d.getDate() + 1);
  while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1);
  return isoDate(d);
};
const dayLabel = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });

const NEEDS = [
  { key: 'SMARTBOARD', label: 'Smartboard' },
  { key: 'PROJECTOR', label: 'Projector' },
  { key: 'HVAC', label: 'AC' },
  { key: 'PA_SYSTEM', label: 'PA system' },
];
const DURATIONS = [50, 100, 150];

export const ExtraClassBooking: React.FC = () => {
  const [req, setReq] = useState<AutoBookingRequest>({
    subject: '',
    expected_students: 40,
    date: nextWorkday(),
    search_days: 3,
    window_start: '08:10',
    window_end: '18:30',
    duration_minutes: 50,
    needs: [],
    align_to_periods: true,
    allow_lunch: false,
    include_weekends: false,
    auto_book: true,
    requested_by: '',
    notes: '',
  });
  const [result, setResult] = useState<AutoBookingResult | null>(null);
  const [booked, setBooked] = useState<BookingRecord | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [upcoming, setUpcoming] = useState<BookingRecord[]>([]);
  const [rooms, setRooms] = useState<Record<number, string>>({});
  const [bookable, setBookable] = useState<{ code: string; classroomId: number; capacity: number | null }[]>([]);

  const loadUpcoming = useCallback(() => {
    pilot.bookings({ status: 'ACTIVE' })
      .then(bs => setUpcoming(bs.filter(b => b.date >= isoDate(new Date())).sort((a, b) => (a.date + a.start_time).localeCompare(b.date + b.start_time))))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    loadUpcoming();
    pilot.floors().then(fs => {
      const map: Record<number, string> = {};
      const list: { code: string; classroomId: number; capacity: number | null }[] = [];
      fs.forEach(f => f.spaces.forEach(s => {
        if (s.classroom_id) map[s.classroom_id] = s.code;
        if (s.classroom_id && s.bookable) list.push({ code: s.code, classroomId: s.classroom_id, capacity: s.capacity });
      }));
      setRooms(map);
      setBookable(list.sort((a, b) => a.code.localeCompare(b.code)));
    }).catch(() => undefined);
  }, [loadUpcoming]);

  const set = <K extends keyof AutoBookingRequest>(k: K, v: AutoBookingRequest[K]) => setReq(r => ({ ...r, [k]: v }));

  const submit = async (autoBook: boolean) => {
    if (!req.subject.trim()) {
      setError('Give the class a subject so it shows up correctly on the timetable.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const r = await pilot.autoBook({ ...req, subject: req.subject.trim(), auto_book: autoBook });
      setResult(r);
      setBooked(r.booked);
      loadUpcoming();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const take = async (slot: SlotOption) => {
    setBusy(true);
    setError(null);
    try {
      if (booked) await pilot.cancelBooking(booked.id);
      const b = await pilot.bookSlot(slot, req);
      setBooked(b);
      setResult(r => (r ? { ...r, chosen: slot, alternatives: [...(r.chosen ? [r.chosen] : []), ...r.alternatives.filter(a => a !== slot)] } : r));
      loadUpcoming();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const cancel = async (id: number) => {
    await pilot.cancelBooking(id).catch(e => setError(errorMessage(e)));
    if (booked?.id === id) setBooked(null);
    loadUpcoming();
  };

  const chosen = result?.chosen ?? null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[360px_minmax(0,1fr)] min-h-[calc(100vh-40px)]">
      {/* Request */}
      <form
        className="border-b lg:border-b-0 lg:border-r border-panel-seam p-4 space-y-3"
        onSubmit={e => { e.preventDefault(); submit(true); }}
        aria-label="Extra class request"
      >
        <div>
          <h1 className="text-[17px] font-semibold">Book an extra class</h1>
          <p className="text-xs text-panel-muted mt-0.5">Describe the class. The system finds every free room and slot and books the one that costs the least energy to run.</p>
        </div>
        <label className="block"><span className="label">Subject</span>
          <input className="field" placeholder="e.g. Remedial DSA, Guest lecture" value={req.subject} onChange={e => set('subject', e.target.value)} />
        </label>
        <div className="grid grid-cols-2 gap-2">
          <label><span className="label">Students</span>
            <input type="number" min={1} max={500} className="field num" value={req.expected_students} onChange={e => set('expected_students', Number(e.target.value))} />
          </label>
          <label><span className="label">Requested by</span>
            <input className="field" placeholder="Faculty name" value={req.requested_by} onChange={e => set('requested_by', e.target.value)} />
          </label>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <label><span className="label">Earliest date</span>
            <input type="date" min={isoDate(new Date())} className="field num" value={req.date} onChange={e => set('date', e.target.value)} />
          </label>
          <label><span className="label">Search ahead</span>
            <select className="field" value={req.search_days} onChange={e => set('search_days', Number(e.target.value))}>
              {[1, 3, 5, 7, 14].map(n => <option key={n} value={n}>{n === 1 ? 'That day only' : `${n} working days`}</option>)}
            </select>
          </label>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <label><span className="label">Not before</span>
            <input type="time" className="field num" value={req.window_start} onChange={e => set('window_start', e.target.value)} />
          </label>
          <label><span className="label">Finish by</span>
            <input type="time" className="field num" value={req.window_end} onChange={e => set('window_end', e.target.value)} />
          </label>
        </div>
        <fieldset>
          <legend className="label">Duration</legend>
          <div className="grid grid-cols-3 gap-1.5">
            {DURATIONS.map(d => (
              <button type="button" key={d} onClick={() => set('duration_minutes', d)} aria-pressed={req.duration_minutes === d}
                className={`whitespace-nowrap num text-xs py-1.5 border rounded-[3px] snap ${req.duration_minutes === d ? 'border-accent bg-accent/10 text-accent font-semibold' : 'border-panel-seam text-panel-muted hover:border-panel-wire'}`}>
                {d} min
              </button>
            ))}
          </div>
          <label className="flex items-center gap-2 mt-1.5 text-xs text-panel-muted whitespace-nowrap">
            Other length
            <input type="number" min={10} max={300} step={10} className="field num w-20" value={req.duration_minutes} onChange={e => set('duration_minutes', Number(e.target.value))} />
            min
          </label>
        </fieldset>
        <fieldset>
          <legend className="label">Room needs</legend>
          <div className="flex flex-wrap gap-1.5">
            {NEEDS.map(n => {
              const on = req.needs.includes(n.key);
              return (
                <button type="button" key={n.key} aria-pressed={on}
                  onClick={() => set('needs', on ? req.needs.filter(x => x !== n.key) : [...req.needs, n.key])}
                  className={`text-xs px-2.5 py-1 border rounded-[3px] snap ${on ? 'border-accent bg-accent/10 text-accent font-semibold' : 'border-panel-seam text-panel-muted hover:border-panel-wire'}`}>
                  {n.label}
                </button>
              );
            })}
          </div>
        </fieldset>
        <fieldset className="space-y-1.5 text-[13px]">
          <legend className="label">Rules</legend>
          <label className="flex items-center gap-2"><input type="checkbox" className="accent-accent" checked={req.align_to_periods} onChange={e => set('align_to_periods', e.target.checked)} />Start on period boundaries</label>
          <label className="flex items-center gap-2"><input type="checkbox" className="accent-accent" checked={req.allow_lunch} onChange={e => set('allow_lunch', e.target.checked)} />Allow the lunch break</label>
          <label className="flex items-center gap-2"><input type="checkbox" className="accent-accent" checked={req.include_weekends} onChange={e => set('include_weekends', e.target.checked)} />Include Saturday and Sunday</label>
        </fieldset>
        <label className="block"><span className="label">Notes</span>
          <input className="field" placeholder="Optional" value={req.notes} onChange={e => set('notes', e.target.value)} />
        </label>
        {error && <p className="text-xs text-lamp-on" role="alert">{error}</p>}
        <div className="flex gap-2 pt-1">
          <button type="submit" disabled={busy} className="flex-1 bg-accent text-accent-on text-[13px] font-semibold py-2 rounded-[3px] hover:bg-accent-hover disabled:opacity-50 snap">
            {busy ? 'Searching…' : 'Find and book'}
          </button>
          <button type="button" disabled={busy} onClick={() => submit(false)} className="border border-panel-wire hover:border-accent hover:text-accent text-[13px] px-3 rounded-[3px] snap disabled:opacity-50">
            Only suggest
          </button>
        </div>
      </form>

      {/* Result */}
      <div className="min-w-0">
        {!result ? (
          <div className="p-6 max-w-xl text-[13px] text-panel-muted space-y-2">
            <p className="text-panel-ink">How the room is chosen</p>
            <p>Every free room and slot that fits the students and equipment is scored by modelled energy:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>the room's expected draw while in use (smaller rooms draw less),</li>
              <li>pre-cooling, which is skipped when a class ends in that room just before,</li>
              <li>corridor and washroom loads kept on if the class runs past floor hours.</li>
            </ul>
            <p>Earlier slots and tighter fits win ties.</p>
          </div>
        ) : !chosen ? (
          <div className="p-6 text-[13px] space-y-2">
            <p className="text-panel-ink font-semibold">{result.message}</p>
            {result.rejected_rooms.length > 0 && <RejectedRooms rooms={result.rejected_rooms} />}
          </div>
        ) : (
          <>
            <section className="border-b border-panel-seam p-4" aria-live="polite">
              <div className="section-title mb-1">{booked ? 'Booked' : 'Best option (not booked yet)'}</div>
              <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1">
                <span className="num text-[28px] font-semibold">{chosen.room}</span>
                <span className="num text-[17px]">{dayLabel(chosen.date)} · {chosen.start_time}–{chosen.end_time}</span>
                <span className="num text-[15px] text-panel-muted">{chosen.capacity} seats · {chosen.empty_seats} spare</span>
                <span className="num text-[15px]">{chosen.est_kwh.toFixed(2)} kWh · ₹{chosen.est_cost_inr.toFixed(0)}</span>
              </div>
              <div className="flex flex-wrap gap-x-6 gap-y-1 mt-2 text-xs text-panel-muted num">
                <span>In use {chosen.breakdown.session_kwh.toFixed(2)} kWh</span>
                <span>Pre-cool {chosen.breakdown.precool_kwh.toFixed(2)} kWh</span>
                <span>After-hours common areas {chosen.breakdown.after_hours_kwh.toFixed(2)} kWh</span>
              </div>
              {chosen.reasons.length > 0 && (
                <ul className="mt-2 text-[13px] space-y-0.5">
                  {chosen.reasons.map(r => <li key={r}>· {r}</li>)}
                </ul>
              )}
              <div className="mt-3 flex gap-2">
                {!booked && (
                  <button onClick={() => take(chosen)} disabled={busy} className="bg-accent text-accent-on text-xs font-semibold px-3 py-1.5 rounded-[3px] hover:bg-accent-hover">Book this</button>
                )}
                {booked && (
                  <button onClick={() => cancel(booked.id)} className="flex items-center gap-1 text-xs text-panel-muted hover:text-lamp-on border border-panel-seam px-3 py-1.5 rounded-[3px]"><X className="w-3 h-3" />Cancel booking</button>
                )}
              </div>
            </section>

            <section className="p-4 border-b border-panel-seam" aria-label="Rooms that day">
              <h2 className="section-title mb-2">{dayLabel(chosen.date)} · every bookable room</h2>
              <RoomDayStrip date={chosen.date} rooms={bookable} chosen={chosen} alternatives={result.alternatives} />
            </section>

            <section className="p-4 border-b border-panel-seam">
              <h2 className="section-title mb-2">Alternatives · {result.total_options} options found across {result.days_searched.length} day{result.days_searched.length === 1 ? '' : 's'}</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-[13px] min-w-[640px]">
                  <thead>
                    <tr className="text-left text-panel-muted">
                      <th className="font-medium py-1.5">Room</th><th className="font-medium py-1.5">When</th>
                      <th className="font-medium py-1.5 text-right">Seats</th><th className="font-medium py-1.5 text-right">kWh</th>
                      <th className="font-medium py-1.5 text-right">₹</th><th className="font-medium py-1.5 pl-4">Why</th><th />
                    </tr>
                  </thead>
                  <tbody>
                    {result.alternatives.map(a => (
                      <tr key={`${a.room}-${a.date}-${a.start_time}`} className="border-t border-panel-seam">
                        <td className="py-2 num font-semibold">{a.room}</td>
                        <td className="py-2 num">{dayLabel(a.date)} {a.start_time}–{a.end_time}</td>
                        <td className="py-2 num text-right">{a.capacity}</td>
                        <td className="py-2 num text-right">{a.est_kwh.toFixed(2)}</td>
                        <td className="py-2 num text-right">{a.est_cost_inr.toFixed(0)}</td>
                        <td className="py-2 pl-4 text-xs text-panel-muted">{a.reasons[0] ?? '—'}</td>
                        <td className="py-2 text-right">
                          <button disabled={busy} onClick={() => take(a)} className="flex items-center gap-1 ml-auto text-xs border border-panel-seam hover:border-accent hover:text-accent px-2 py-1 rounded-[3px] snap">
                            <ArrowRightLeft className="w-3 h-3" />{booked ? 'Switch to this' : 'Book this'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {result.rejected_rooms.length > 0 && <RejectedRooms rooms={result.rejected_rooms} />}
            </section>
          </>
        )}

        <section className="p-4">
          <h2 className="section-title mb-2">Upcoming extra classes</h2>
          {upcoming.length === 0 ? (
            <p className="text-[13px] text-panel-muted">Nothing booked from today onward.</p>
          ) : (
            <table className="w-full text-[13px]">
              <tbody>
                {upcoming.map(b => (
                  <tr key={b.id} className="border-t border-panel-seam">
                    <td className="py-2 num w-28">{dayLabel(b.date)}</td>
                    <td className="py-2 num w-28">{b.start_time.slice(0, 5)}–{b.end_time.slice(0, 5)}</td>
                    <td className="py-2 num font-semibold w-20">{rooms[b.classroom_id] ?? `#${b.classroom_id}`}</td>
                    <td className="py-2">{b.subject}<span className="text-panel-muted"> · {b.expected_students} students{b.requested_by ? ` · ${b.requested_by}` : ''}</span></td>
                    <td className="py-2 text-xs text-panel-muted">{b.source === 'AUTO' ? 'auto' : 'manual'}</td>
                    <td className="py-2 text-right"><button onClick={() => cancel(b.id)} className="text-xs text-panel-muted hover:text-lamp-on">Cancel</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </div>
  );
};

const RejectedRooms: React.FC<{ rooms: { room: string; reason: string }[] }> = ({ rooms }) => (
  <p className="mt-3 text-xs text-panel-muted">
    Not considered: {rooms.map(r => `${r.room} (${r.reason})`).join(', ')}.
  </p>
);
