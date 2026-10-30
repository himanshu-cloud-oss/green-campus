import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { RotateCcw } from 'lucide-react';
import { Category, CATEGORY_LABEL, errorMessage, Floor, pilot, SavingsParams, SavingsResult } from '../services/pilot';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const CONTROL_CATS: Category[] = ['HVAC', 'FAN', 'LIGHTING', 'AV'];
const STRATEGY_LABEL: Record<string, string> = {
  vacant_periods: 'Free periods',
  lunch: 'Lunch break',
  no_show: 'Classes not held',
  after_hours: 'After hours',
  ac_setpoint: 'AC setpoint',
  bldc_fans: 'BLDC fans',
};
const inr = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;
const kwh = (n: number) => Math.round(n).toLocaleString('en-IN');

const Section: React.FC<{ title: string; children: React.ReactNode; note?: string }> = ({ title, children, note }) => (
  <fieldset className="border-t border-panel-seam px-4 py-3 space-y-2">
    <legend className="sr-only">{title}</legend>
    <div className="section-title">{title}</div>
    {children}
    {note && <p className="text-[11px] text-panel-muted leading-snug">{note}</p>}
  </fieldset>
);

const NumField: React.FC<{ label: string; value: number; onChange: (v: number) => void; step?: number; min?: number; max?: number; unit?: string }> = ({ label, value, onChange, step = 1, min = 0, max, unit }) => (
  <label className="grid grid-cols-[minmax(0,1fr)_76px_58px] items-center gap-2 text-[13px]">
    <span className="leading-tight">{label}</span>
    <input type="number" step={step} min={min} max={max} value={value} onChange={e => onChange(Number(e.target.value))} className="field num text-right" />
    <span className="text-[11px] text-panel-muted">{unit}</span>
  </label>
);

const Toggle: React.FC<{ label: string; checked: boolean; onChange: (v: boolean) => void; hint?: string }> = ({ label, checked, onChange, hint }) => (
  <label className="flex items-start gap-2 text-[13px] cursor-pointer">
    <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} className="accent-[#D9DEE5] mt-0.5" />
    <span>{label}{hint && <span className="block text-[11px] text-panel-muted">{hint}</span>}</span>
  </label>
);

const BarList: React.FC<{ rows: { label: string; value: number }[]; total: number }> = ({ rows, total }) => {
  const max = Math.max(1, ...rows.map(r => r.value));
  return (
    <ul className="space-y-1.5">
      {rows.map(r => (
        <li key={r.label} className="grid grid-cols-[120px_minmax(0,1fr)_88px] items-center gap-3 text-[13px]" title={`${r.label}: ${kwh(r.value)} kWh/yr`}>
          <span className="truncate">{r.label}</span>
          <span className="h-2.5 bg-panel-seam">
            <span className="block h-full bg-chart-saved" style={{ width: `${(r.value / max) * 100}%` }} />
          </span>
          <span className="num text-right">{kwh(r.value)}<span className="text-panel-muted text-xs"> · {total ? Math.round((r.value / total) * 100) : 0}%</span></span>
        </li>
      ))}
    </ul>
  );
};

const MonthTooltip: React.FC<{ active?: boolean; payload?: { payload: SavingsResult['by_month'][number] }[] }> = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const m = payload[0].payload;
  return (
    <div className="bg-panel-raised border border-panel-wire px-2.5 py-1.5 text-xs rounded-[3px] num space-y-0.5">
      <div className="text-panel-muted">{m.month} · {m.teaching_days} teaching days · diesel {m.dg_share_pct}%</div>
      <div>Baseline {kwh(m.baseline_kwh)} kWh</div>
      <div>Saved <span className="font-semibold">{kwh(m.saved_kwh)} kWh</span> · {inr(m.cost_saved_inr)} · {Math.round(m.co2_saved_kg)} kg CO₂</div>
    </div>
  );
};

export const SavingsCalculator: React.FC = () => {
  const [params, setParams] = useState<SavingsParams | null>(null);
  const [defaults, setDefaults] = useState<SavingsParams | null>(null);
  const [floor, setFloor] = useState<Floor | null>(null);
  const [result, setResult] = useState<SavingsResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reqId = useRef(0);

  useEffect(() => {
    pilot.savingsDefaults().then(d => { setDefaults(d); setParams(d); }).catch(e => setError(errorMessage(e)));
    pilot.floors().then(fs => setFloor(fs.find(f => f.is_pilot) ?? fs[0] ?? null)).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!params) return;
    const id = ++reqId.current;
    setLoading(true);
    const t = setTimeout(() => {
      pilot.savingsModel(params)
        .then(r => { if (id === reqId.current) { setResult(r); setError(null); } })
        .catch(e => id === reqId.current && setError(errorMessage(e)))
        .finally(() => id === reqId.current && setLoading(false));
    }, 350);
    return () => clearTimeout(t);
  }, [params]);

  const set = <K extends keyof SavingsParams>(k: K, v: SavingsParams[K]) => setParams(p => (p ? { ...p, [k]: v } : p));
  const spaces = floor?.spaces ?? [];
  const selectedSpaces = params?.space_ids ?? spaces.map(s => s.id);

  const strategyRows = useMemo(
    () => Object.entries(result?.by_strategy ?? {}).filter(([, v]) => v > 0).map(([k, v]) => ({ label: STRATEGY_LABEL[k] ?? k, value: v })).sort((a, b) => b.value - a.value),
    [result]
  );
  const categoryRows = useMemo(
    () => Object.entries(result?.by_category ?? {}).map(([k, v]) => ({ label: CATEGORY_LABEL[k as Category] ?? k, value: v })),
    [result]
  );

  if (!params) return <div className="p-8 text-sm text-panel-muted">{error ?? 'Loading the savings model…'}</div>;
  const a = result?.annual;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[380px_minmax(0,1fr)] min-h-[calc(100vh-40px)]">
      {/* Settings */}
      <aside className="border-b lg:border-b-0 lg:border-r border-panel-seam lg:h-[calc(100vh-40px)] lg:overflow-y-auto" aria-label="Model settings">
        <div className="px-4 py-3 flex items-start justify-between">
          <div>
            <h1 className="text-[17px] font-semibold">Savings model</h1>
            <p className="text-xs text-panel-muted">A year of the pilot floor, baseline vs automated. Uses the real timetable, inventory and 2024–25 supply mix.</p>
          </div>
          <button onClick={() => defaults && setParams(defaults)} title="Reset all settings" className="text-panel-muted hover:text-panel-ink p-1"><RotateCcw className="w-4 h-4" /></button>
        </div>

        <Section title="Spaces controlled">
          <div className="grid grid-cols-3 gap-1.5">
            {spaces.map(s => {
              const on = selectedSpaces.includes(s.id);
              return (
                <button key={s.id} type="button" aria-pressed={on}
                  onClick={() => set('space_ids', on ? selectedSpaces.filter(i => i !== s.id) : [...selectedSpaces, s.id])}
                  className={`num text-xs py-1 border rounded-[3px] snap ${on ? 'border-panel-ink bg-panel-seam' : 'border-panel-seam text-panel-muted'}`}>
                  {s.code}
                </button>
              );
            })}
          </div>
        </Section>

        <Section title="Loads automation may switch">
          <div className="grid grid-cols-2 gap-1.5">
            {CONTROL_CATS.map(c => (
              <Toggle key={c} label={CATEGORY_LABEL[c]} checked={params.categories.includes(c)}
                onChange={v => set('categories', v ? [...params.categories, c] : params.categories.filter(x => x !== c))} />
            ))}
          </div>
        </Section>

        <Section title="Switch off when empty" note="Baseline behaviour (how often people leave things on) comes from the same model that drives live telemetry.">
          <Toggle label="During free periods" checked={params.vacant_periods} onChange={v => set('vacant_periods', v)} />
          <Toggle label="During lunch" checked={params.lunch} onChange={v => set('lunch', v)} />
          <Toggle label="When a scheduled class isn't held" checked={params.no_show} onChange={v => set('no_show', v)} />
          <Toggle label="After hours and at night" checked={params.after_hours} onChange={v => set('after_hours', v)} />
          <NumField label="Reaction delay" value={params.grace_minutes} min={0} max={30} onChange={v => set('grace_minutes', v)} unit="min" />
          <NumField label="Periods where the class isn't held" value={Math.round(params.no_show_rate * 100)} min={0} max={50} onChange={v => set('no_show_rate', v / 100)} unit="%" />
        </Section>

        <Section title="Efficiency upgrades" note="Rule of thumb: each °C higher on the AC saves about 6% of its energy (BEE recommends a 24 °C default).">
          <NumField label="Raise AC setpoint by" value={params.ac_setpoint_raise_c} step={0.5} min={0} max={4} onChange={v => set('ac_setpoint_raise_c', v)} unit="°C" />
          <NumField label="AC saving per °C" value={Math.round(params.ac_saving_per_degree * 100)} min={0} max={15} onChange={v => set('ac_saving_per_degree', v / 100)} unit="%" />
          <Toggle label="Replace ceiling fans with BLDC (75 W → 28 W)" checked={params.bldc_fan_retrofit} onChange={v => set('bldc_fan_retrofit', v)} />
        </Section>

        <Section title="Academic calendar · teaching days per month" note="Other days are modelled as closed (weekends, holidays, vacations).">
          <div className="grid grid-cols-6 gap-1.5">
            {MONTHS.map((m, i) => (
              <label key={m} className="text-[11px] text-panel-muted text-center">{m}
                <input type="number" min={0} max={31} value={params.teaching_days[i]} aria-label={`Teaching days in ${m}`}
                  onChange={e => set('teaching_days', params.teaching_days.map((d, j) => (j === i ? Number(e.target.value) : d)))}
                  className="field num text-center px-1 mt-0.5" />
              </label>
            ))}
          </div>
        </Section>

        <Section title="Tariff · DHBVN commercial (placeholders)" note="Copy the actual rates from a recent DHBVN bill. Fixed/demand charges don't change with these savings, so they're left out.">
          <NumField label="Energy charge" value={params.energy_charge_inr_kwh} step={0.05} onChange={v => set('energy_charge_inr_kwh', v)} unit="₹/kWh" />
          <NumField label="FSA, duty and other per-unit" value={params.surcharges_inr_kwh} step={0.05} onChange={v => set('surcharges_inr_kwh', v)} unit="₹/kWh" />
          <Toggle label="Use the real grid / diesel mix per month" hint="From the campus bill, Jul 2024–Jun 2025" checked={params.use_real_supply_mix} onChange={v => set('use_real_supply_mix', v)} />
          <NumField label="Diesel price" value={params.diesel_inr_per_litre} onChange={v => set('diesel_inr_per_litre', v)} unit="₹/L" />
          <NumField label="Generator output" value={params.dg_kwh_per_litre} step={0.1} onChange={v => set('dg_kwh_per_litre', v)} unit="kWh/L" />
        </Section>

        <Section title="Emissions" note="Grid factor: check the latest CEA CO₂ baseline database. Solar output isn't reduced by saving, so it carries no credit.">
          <NumField label="Grid" value={params.grid_emission_kg_kwh} step={0.01} onChange={v => set('grid_emission_kg_kwh', v)} unit="kg/kWh" />
          <NumField label="Diesel" value={params.diesel_kg_co2_per_litre} step={0.01} onChange={v => set('diesel_kg_co2_per_litre', v)} unit="kg/L" />
        </Section>

        <Section title="Investment">
          <NumField label="Sensors + relays per room" value={params.hardware_inr_per_room} step={500} onChange={v => set('hardware_inr_per_room', v)} unit="₹" />
          <NumField label="BLDC fan, installed" value={params.bldc_inr_per_fan} step={100} onChange={v => set('bldc_inr_per_fan', v)} unit="₹/fan" />
        </Section>
      </aside>

      {/* Results */}
      <div className="min-w-0" aria-busy={loading}>
        <div className={`flex flex-wrap border-b border-panel-seam snap ${loading ? 'opacity-60' : ''}`}>
          {[
            ['Saved per year', a ? kwh(a.saved_kwh) : '—', 'kWh'],
            ['Of floor energy', a ? `${a.saved_pct}` : '—', '%'],
            ['Money', a ? inr(a.cost_saved_inr) : '—', '/yr'],
            ['CO₂ avoided', a ? (a.co2_saved_kg / 1000).toFixed(2) : '—', 't/yr'],
            ['Investment', a ? inr(a.capex_inr) : '—', ''],
            ['Payback', a?.payback_years != null ? `${a.payback_years}` : '—', 'years'],
          ].map(([l, v, u]) => (
            <div key={l} className="px-5 py-2.5 border-r border-panel-seam">
              <div className="section-title">{l}</div>
              <div className="num text-[22px] leading-7 font-semibold">{v}<span className="font-sans text-xs text-panel-muted ml-1">{u}</span></div>
            </div>
          ))}
          {error && <p className="px-5 py-3 text-xs text-lamp-on self-center">{error}</p>}
        </div>

        {result && (
          <div className="p-4 space-y-6">
            <section aria-label="Energy by month">
              <div className="flex items-center gap-4 mb-1">
                <h2 className="section-title">By month · kWh</h2>
                <span className="flex items-center gap-1.5 text-xs text-panel-muted"><span className="w-3 h-2.5 bg-chart-base" />Baseline</span>
                <span className="flex items-center gap-1.5 text-xs text-panel-muted"><span className="w-3 h-2.5 bg-chart-saved" />Saved</span>
                <span className="ml-auto text-xs text-panel-muted">Baseline {kwh(result.annual.baseline_kwh)} kWh/yr · simulated</span>
              </div>
              <ResponsiveContainer width="100%" height={230}>
                <BarChart data={result.by_month} barGap={2} barCategoryGap="22%" margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
                  <CartesianGrid vertical={false} stroke="#1A1F27" />
                  <XAxis dataKey="month" tick={{ fill: '#7D8694', fontSize: 11 }} axisLine={{ stroke: '#222833' }} tickLine={false} />
                  <YAxis tick={{ fill: '#7D8694', fontSize: 10.5, fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} width={52} />
                  <Tooltip content={<MonthTooltip />} cursor={{ fill: 'rgba(217,222,229,0.05)' }} isAnimationActive={false} />
                  <Bar dataKey="baseline_kwh" fill="#5E86C2" radius={[4, 4, 0, 0]} isAnimationActive={false} />
                  <Bar dataKey="saved_kwh" fill="#C27A12" radius={[4, 4, 0, 0]} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            </section>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <section aria-label="Savings by measure">
                <h2 className="section-title mb-2">Where the savings come from · kWh/yr</h2>
                {strategyRows.length ? <BarList rows={strategyRows} total={result.annual.saved_kwh} /> : <p className="text-[13px] text-panel-muted">Turn on at least one measure.</p>}
              </section>
              <section aria-label="Savings by load type">
                <h2 className="section-title mb-2">By load type · kWh/yr</h2>
                {categoryRows.length ? <BarList rows={categoryRows} total={result.annual.saved_kwh} /> : <p className="text-[13px] text-panel-muted">Nothing saved with these settings.</p>}
              </section>
            </div>

            <section aria-label="Savings by space">
              <h2 className="section-title mb-2">By space</h2>
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="text-left text-panel-muted"><th className="font-medium py-1.5">Space</th><th className="font-medium py-1.5 text-right">Baseline kWh/yr</th><th className="font-medium py-1.5 text-right">Saved kWh/yr</th><th className="font-medium py-1.5 text-right">Saved %</th></tr>
                </thead>
                <tbody>
                  {result.by_space.map(s => (
                    <tr key={s.code} className="border-t border-panel-seam">
                      <td className="py-1.5 num">{s.code}</td>
                      <td className="py-1.5 num text-right">{kwh(s.baseline_kwh)}</td>
                      <td className="py-1.5 num text-right">{kwh(s.saved_kwh)}</td>
                      <td className="py-1.5 num text-right">{s.baseline_kwh ? Math.round((s.saved_kwh / s.baseline_kwh) * 100) : 0}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            <p className="text-[11px] text-panel-muted max-w-3xl">
              Simulated from estimated device ratings and a behaviour model; replace ratings in Floor maps as specs arrive. Money and CO₂ use each month's grid/diesel split from the real 2024–25 campus bill.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
