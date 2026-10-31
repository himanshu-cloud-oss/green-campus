import React, { useEffect, useMemo, useState } from 'react';
import { ExportButtons } from './ExportButtons';
import { Badge } from '../ui/Badge';
import { api } from '../../services/api';
import { DayEnergy, errorMessage, pilot } from '../../services/pilot';
import { AuditEntry, ExtraClassBooking, MonthlyEnergyRecord } from '../../types';
import { formatDateTime, formatNumberWithCommas as n0 } from '../../utils/formatters';

type Tab = 'bills' | 'floor' | 'bookings' | 'log';
const TABS: { id: Tab; label: string }[] = [
  { id: 'bills', label: 'Campus bills' },
  { id: 'floor', label: 'Floor energy · 30 days' },
  { id: 'bookings', label: 'Extra classes' },
  { id: 'log', label: 'Change log' },
];

const th = 'font-medium px-3 py-1.5 first:pl-4 last:pr-4';
const td = 'px-3 py-2 first:pl-4 last:pr-4';

/** Heading row of a report: what it is, where the numbers come from, and the export. */
const Head: React.FC<{ title: string; source: React.ReactNode; tag: string; children?: React.ReactNode }> = ({ title, source, tag, children }) => (
  <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2.5 border-b border-panel-seam">
    <h2 className="section-title">{title}</h2>
    <Badge variant={tag === 'Real' ? 'neutral' : 'quiet'}>{tag}</Badge>
    <span className="text-xs text-panel-muted">{source}</span>
    <span className="ml-auto">{children}</span>
  </div>
);

const Empty: React.FC<{ error: string | null; text: string }> = ({ error, text }) => (
  <p className="px-4 py-6 text-[13px] text-panel-muted">{error ? `${error} Nothing to show until the backend answers.` : text}</p>
);

export const ReportPage: React.FC = () => {
  const [tab, setTab] = useState<Tab>('bills');
  const [bills, setBills] = useState<MonthlyEnergyRecord[]>([]);
  const [days, setDays] = useState<DayEnergy[]>([]);
  const [bookings, setBookings] = useState<ExtraClassBooking[]>([]);
  const [log, setLog] = useState<AuditEntry[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fail = (e: unknown) => setError(errorMessage(e));
    api.getMonthlyEnergy().then(setBills).catch(fail);
    pilot.daily(30).then(r => setDays([...r.days].reverse())).catch(fail);
    api.getBookings().then(b => setBookings([...b].sort((x, y) => (y.date + y.start_time).localeCompare(x.date + x.start_time)))).catch(fail);
    api.getAuditLog(200).then(setLog).catch(fail);
  }, []);

  const billMax = useMemo(() => Math.max(1, ...bills.map(b => b.total_kwh)), [bills]);
  const billTotal = useMemo(() => bills.reduce((s, b) => s + b.total_kwh, 0), [bills]);
  const dayMax = useMemo(() => Math.max(1, ...days.map(d => d.kwh)), [days]);
  const dayTotals = useMemo(() => days.reduce((s, d) => ({ kwh: s.kwh + d.kwh, waste: s.waste + d.waste_kwh }), { kwh: 0, waste: 0 }), [days]);

  return (
    <section className="border border-panel-seam">
      <div className="flex flex-wrap gap-1 px-4 py-2.5 border-b border-panel-seam" role="tablist" aria-label="Reports">
        {TABS.map(t => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`text-xs px-2.5 py-1 rounded-[3px] border snap ${
              tab === t.id ? 'border-accent bg-accent/10 text-accent font-semibold' : 'border-panel-seam text-panel-muted hover:border-panel-wire'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'bills' && (
        <div role="tabpanel">
          <Head title={`Campus electricity · ${bills.length} months`} tag="Real" source="Monthly bills for the whole campus. Not a measurement of L Block or this floor.">
            <ExportButtons
              filename="campus_monthly_energy"
              data={bills.map(b => ({ Month: b.month_label, 'Grid kWh': b.grid_kwh, 'Diesel generator kWh': b.generator_kwh, 'Solar kWh': b.solar_kwh, 'Total kWh': b.total_kwh }))}
            />
          </Head>
          {bills.length === 0 ? <Empty error={error} text="No billing months are loaded." /> : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs min-w-[760px]">
                <thead>
                  <tr className="text-left text-[11px] text-panel-muted">
                    <th className={th}>Month</th>
                    <th className={`${th} text-right`}>Grid kWh</th>
                    <th className={`${th} text-right`}>Diesel kWh</th>
                    <th className={`${th} text-right`}>Solar kWh</th>
                    <th className={`${th} text-right`}>Total kWh</th>
                    <th className={`${th} text-right`}>vs prev.</th>
                    <th className={`${th} w-[28%]`}>Supply mix</th>
                  </tr>
                </thead>
                <tbody className="num">
                  {bills.map(b => (
                    <tr key={b.id} className="border-t border-panel-seam">
                      <td className={`${td} font-sans`}>{b.month_label}</td>
                      <td className={`${td} text-right`}>{n0(b.grid_kwh)}</td>
                      <td className={`${td} text-right`}>{n0(b.generator_kwh)}</td>
                      <td className={`${td} text-right`}>{n0(b.solar_kwh)}</td>
                      <td className={`${td} text-right font-semibold`}>{n0(b.total_kwh)}</td>
                      <td className={`${td} text-right text-panel-muted`}>
                        {b.mom_change_pct === undefined ? '—' : `${b.mom_change_pct > 0 ? '+' : ''}${b.mom_change_pct.toFixed(1)}%`}
                      </td>
                      <td className={td}>
                        <div className="flex h-2.5" style={{ width: `${(b.total_kwh / billMax) * 100}%` }} aria-hidden>
                          <span className="bg-panel-ink" style={{ flex: b.grid_kwh }} />
                          <span className="bg-panel-muted" style={{ flex: b.generator_kwh }} />
                          <span className="bg-panel-wire" style={{ flex: b.solar_kwh }} />
                        </div>
                      </td>
                    </tr>
                  ))}
                  <tr className="border-t border-panel-wire">
                    <td className={`${td} font-sans text-panel-muted`}>Total</td>
                    <td className={`${td} text-right`}>{n0(bills.reduce((s, b) => s + b.grid_kwh, 0))}</td>
                    <td className={`${td} text-right`}>{n0(bills.reduce((s, b) => s + b.generator_kwh, 0))}</td>
                    <td className={`${td} text-right`}>{n0(bills.reduce((s, b) => s + b.solar_kwh, 0))}</td>
                    <td className={`${td} text-right font-semibold`}>{n0(billTotal)}</td>
                    <td className={td} />
                    <td className={td}>
                      <span className="flex flex-wrap gap-3 font-sans text-[11px] text-panel-muted">
                        <span className="flex items-center gap-1"><span className="w-3 h-2.5 bg-panel-ink" />Grid</span>
                        <span className="flex items-center gap-1"><span className="w-3 h-2.5 bg-panel-muted" />Diesel</span>
                        <span className="flex items-center gap-1"><span className="w-3 h-2.5 bg-panel-wire" />Solar</span>
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'floor' && (
        <div role="tabpanel">
          <Head title="L Block 2nd floor · daily kWh" tag="Simulated" source="Modelled from the device inventory, timetable and bookings. No meter is fitted.">
            <ExportButtons
              filename="floor_daily_energy_simulated"
              data={days.map(d => ({ Date: d.date, 'kWh (simulated)': d.kwh, 'Into empty rooms kWh (simulated)': d.waste_kwh }))}
            />
          </Head>
          {days.length === 0 ? <Empty error={error} text="No days modelled yet." /> : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs min-w-[600px]">
                <thead>
                  <tr className="text-left text-[11px] text-panel-muted">
                    <th className={th}>Day</th>
                    <th className={`${th} text-right`}>kWh</th>
                    <th className={`${th} text-right`}>Into empty rooms</th>
                    <th className={`${th} text-right`}>Share</th>
                    <th className={`${th} w-[36%]`}>
                      <span className="flex gap-3">
                        <span className="flex items-center gap-1"><span className="w-3 h-2.5 bg-panel-wire" />Used</span>
                        <span className="flex items-center gap-1"><span className="w-3 h-2.5 bg-chart-saved" />Into empty rooms</span>
                      </span>
                    </th>
                  </tr>
                </thead>
                <tbody className="num">
                  {days.map(d => {
                    const wk = new Date(`${d.date}T12:00:00`).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
                    return (
                      <tr key={d.date} className="border-t border-panel-seam">
                        <td className={`${td} font-sans`}>{wk}</td>
                        <td className={`${td} text-right`}>{d.kwh.toFixed(1)}</td>
                        <td className={`${td} text-right ${d.waste_kwh > 0 ? 'text-waste' : 'text-panel-muted'}`}>{d.waste_kwh.toFixed(1)}</td>
                        <td className={`${td} text-right text-panel-muted`}>{d.kwh ? `${((d.waste_kwh / d.kwh) * 100).toFixed(0)}%` : '—'}</td>
                        <td className={td}>
                          <div className="flex h-2.5" style={{ width: `${(d.kwh / dayMax) * 100}%` }} aria-hidden>
                            <span className="bg-panel-wire" style={{ flex: Math.max(0, d.kwh - d.waste_kwh) }} />
                            <span className="bg-chart-saved" style={{ flex: d.waste_kwh }} />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  <tr className="border-t border-panel-wire">
                    <td className={`${td} font-sans text-panel-muted`}>{days.length} days</td>
                    <td className={`${td} text-right font-semibold`}>{dayTotals.kwh.toFixed(1)}</td>
                    <td className={`${td} text-right font-semibold text-waste`}>{dayTotals.waste.toFixed(1)}</td>
                    <td className={`${td} text-right text-panel-muted`}>{dayTotals.kwh ? `${((dayTotals.waste / dayTotals.kwh) * 100).toFixed(0)}%` : '—'}</td>
                    <td className={td} />
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'bookings' && (
        <div role="tabpanel">
          <Head title={`Extra classes · ${bookings.length}`} tag="Real" source="Every booking made from this console, newest first.">
            <ExportButtons
              filename="extra_class_bookings"
              data={bookings.map(b => ({ Room: b.classroom_name, Date: b.date, Start: b.start_time, End: b.end_time, Subject: b.subject, Students: b.expected_students, Status: b.status, 'Booked at': b.created_at }))}
            />
          </Head>
          {bookings.length === 0 ? <Empty error={error} text="No extra classes have been booked." /> : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs min-w-[720px]">
                <thead>
                  <tr className="text-left text-[11px] text-panel-muted">
                    <th className={th}>Room</th>
                    <th className={th}>Date</th>
                    <th className={th}>Time</th>
                    <th className={th}>Subject</th>
                    <th className={`${th} text-right`}>Students</th>
                    <th className={th}>Status</th>
                    <th className={th}>Booked</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.map(b => (
                    <tr key={b.id} className={`border-t border-panel-seam ${b.status === 'ACTIVE' ? '' : 'text-panel-muted'}`}>
                      <td className={`${td} num font-semibold`}>{b.classroom_name}</td>
                      <td className={`${td} num`}>{b.date}</td>
                      <td className={`${td} num`}>{b.start_time}–{b.end_time}</td>
                      <td className={td}>{b.subject || '—'}</td>
                      <td className={`${td} num text-right`}>{b.expected_students ?? '—'}</td>
                      <td className={td}><Badge variant={b.status === 'ACTIVE' ? 'neutral' : 'quiet'}>{b.status === 'ACTIVE' ? 'Active' : 'Cancelled'}</Badge></td>
                      <td className={`${td} text-panel-muted`}>{formatDateTime(b.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'log' && (
        <div role="tabpanel">
          <Head title={`Change log · latest ${log.length}`} tag="Real" source="Bookings, switch overrides, settings and no-show tests, as recorded by the backend.">
            <ExportButtons
              filename="change_log"
              data={log.map(a => ({ When: a.created_at, Entity: a.entity_type, 'Entity ID': a.entity_id, Action: a.action, By: a.actor, Details: JSON.stringify(a.details) }))}
            />
          </Head>
          {log.length === 0 ? <Empty error={error} text="Nothing has been recorded yet." /> : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs min-w-[760px]">
                <thead>
                  <tr className="text-left text-[11px] text-panel-muted">
                    <th className={th}>When</th>
                    <th className={th}>What</th>
                    <th className={th}>ID</th>
                    <th className={th}>By</th>
                    <th className={`${th} w-[40%]`}>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {log.map(a => (
                    <tr key={a.id} className="border-t border-panel-seam align-top">
                      <td className={`${td} text-panel-muted whitespace-nowrap`}>{formatDateTime(a.created_at)}</td>
                      <td className={td}>{a.entity_type.toLowerCase().replace(/_/g, ' ')} · {a.action.toLowerCase().replace(/_/g, ' ')}</td>
                      <td className={`${td} num`}>{a.entity_id || '—'}</td>
                      <td className={`${td} text-panel-muted`}>{a.actor}</td>
                      <td className={`${td} num text-[11px] text-panel-muted`}>
                        <span className="line-clamp-2 break-all">
                          {Object.entries(a.details).map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : String(v)}`).join(' · ') || '—'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </section>
  );
};
