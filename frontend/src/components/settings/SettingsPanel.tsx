import React from 'react';
import { Link } from 'react-router-dom';
import { Check } from 'lucide-react';
import { useSettings } from '../../hooks/useSettings';
import { Setting } from '../../types';

interface KeyInfo {
  label: string;
  unit?: string;
  /** What reads this value today. Absent = nothing in the backend reads it. */
  usedBy?: string;
  options?: { value: string; label: string }[];
}

/** Checked against the backend: only booking_service and simulation_service read settings from the database. */
const KEYS: Record<string, KeyInfo> = {
  tariff_per_kwh: { label: 'Energy charge', unit: '₹/kWh', usedBy: 'Cost of each slot when booking an extra class' },
  no_show_countdown_seconds: { label: 'No-show cut-off delay', unit: 's', usedBy: 'Countdown before a no-show test cuts power (Alerts)' },
  tariff_category: { label: 'Tariff category' },
  grid_emission_factor: { label: 'Grid emission factor', unit: 'kg CO₂/kWh' },
  demo_mode: { label: 'Demo mode', options: [{ value: 'true', label: 'On' }, { value: 'false', label: 'Off' }] },
  classroom_load_kw: { label: 'Classroom load', unit: 'kW' },
  ac_load_kw: { label: 'AC load', unit: 'kW' },
  fan_load_kw: { label: 'Fan load', unit: 'kW' },
  lights_load_kw: { label: 'Lighting load', unit: 'kW' },
};

const Row: React.FC<{ s: Setting; value: string; dirty: boolean; onChange: (v: string) => void }> = ({ s, value, dirty, onChange }) => {
  const info = KEYS[s.key] ?? { label: s.description || s.key };
  const id = `setting-${s.key}`;
  return (
    <li className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_240px] lg:grid-cols-[240px_240px_minmax(0,1fr)] gap-x-4 gap-y-1.5 items-center px-4 py-2.5 border-t border-panel-seam">
      <label htmlFor={id} className="min-w-0">
        <span className="block text-[13px]">{info.label}{dirty && <span className="text-panel-muted"> · edited</span>}</span>
        <span className="block num text-[11px] text-panel-muted">{s.key}</span>
      </label>
      <div className="flex items-center gap-2">
        {info.options ? (
          <select id={id} className="field" value={value} onChange={e => onChange(e.target.value)}>
            {info.options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        ) : (
          <input id={id} className={`field ${info.unit ? 'num text-right' : ''}`} value={value} onChange={e => onChange(e.target.value)} />
        )}
        {info.unit && <span className="text-xs text-panel-muted whitespace-nowrap w-24 shrink-0">{info.unit}</span>}
      </div>
      <p className="sm:col-span-2 lg:col-span-1 text-xs text-panel-muted">{info.usedBy ?? s.description}</p>
    </li>
  );
};

export const SettingsPanel: React.FC = () => {
  const { settings, valueOf, edit, discard, changed, isLoading, isSaving, error, savedAt, save } = useSettings();
  const inUse = settings.filter(s => KEYS[s.key]?.usedBy);
  const unused = settings.filter(s => !KEYS[s.key]?.usedBy);
  const dirtyKeys = new Set(changed.map(c => c.key));

  if (isLoading && settings.length === 0) {
    return <div className="border border-panel-seam bg-panel-raised/40 h-64" aria-busy="true" aria-label="Loading settings" />;
  }
  if (settings.length === 0) {
    return (
      <p className="border border-panel-seam px-4 py-6 text-[13px] text-panel-muted">
        {error ? `${error} Settings can't be read until the backend answers.` : 'No settings are stored.'}
      </p>
    );
  }

  return (
    <form
      onSubmit={e => {
        e.preventDefault();
        save();
      }}
      className="space-y-4"
    >
      <section className="border border-panel-seam" aria-label="Settings the backend reads">
        <h2 className="section-title px-4 pt-2.5 pb-2">Read by the backend · {inUse.length}</h2>
        <ul>{inUse.map(s => <Row key={s.key} s={s} value={valueOf(s.key)} dirty={dirtyKeys.has(s.key)} onChange={v => edit(s.key, v)} />)}</ul>
      </section>

      <section className="border border-panel-seam" aria-label="Stored but not read">
        <div className="px-4 pt-2.5 pb-2">
          <h2 className="section-title">Stored, not read yet · {unused.length}</h2>
          <p className="text-xs text-panel-muted mt-0.5 max-w-2xl">
            Kept from the first version. Nothing uses them today: device loads come from{' '}
            <Link to="/floors" className="text-panel-ink underline underline-offset-4">Floor maps</Link>, and the{' '}
            <Link to="/savings" className="text-panel-ink underline underline-offset-4">Savings model</Link> takes its own tariff and emission inputs.
          </p>
        </div>
        <ul>{unused.map(s => <Row key={s.key} s={s} value={valueOf(s.key)} dirty={dirtyKeys.has(s.key)} onChange={v => edit(s.key, v)} />)}</ul>
      </section>

      <div className="sticky bottom-0 flex flex-wrap items-center gap-3 border border-panel-seam bg-panel-ground px-4 py-2.5">
        <span className="text-xs text-panel-muted">
          {changed.length > 0
            ? <><span className="num">{changed.length}</span> unsaved {changed.length === 1 ? 'change' : 'changes'}</>
            : savedAt ? <span className="flex items-center gap-1"><Check className="w-3 h-3" strokeWidth={1.6} />Saved at <span className="num">{savedAt}</span>, each change is in the change log</span>
            : 'No changes'}
        </span>
        {error && <span className="text-xs text-lamp-on">{error}</span>}
        <span className="ml-auto flex items-center gap-3">
          <button type="button" onClick={discard} disabled={changed.length === 0 || isSaving} className="text-xs text-panel-muted hover:text-panel-ink disabled:opacity-40 snap">
            Discard
          </button>
          <button
            type="submit"
            disabled={changed.length === 0 || isSaving}
            className="bg-panel-ink text-panel-ground text-xs font-semibold px-3 py-1.5 rounded-[3px] hover:bg-white snap disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isSaving ? 'Saving…' : 'Save changes'}
          </button>
        </span>
      </div>
    </form>
  );
};
