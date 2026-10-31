import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Trash2, Check } from 'lucide-react';
import { alpha, categoryColor, kindColor, useTheme } from '../theme';
import { CategoryChip } from '../components/ui/CategoryChip';
import {
  Asset,
  Category,
  CATEGORY_LABEL,
  DeviceType,
  errorMessage,
  Floor,
  pilot,
  Space,
  SpaceKind,
} from '../services/pilot';

const KINDS: SpaceKind[] = ['CLASSROOM', 'LAB', 'STAFF_ROOM', 'CORRIDOR', 'WASHROOM', 'COMMON', 'OTHER'];
const KIND_LABEL: Record<SpaceKind, string> = {
  CLASSROOM: 'Classroom', LAB: 'Lab', STAFF_ROOM: 'Staff room', CORRIDOR: 'Corridor',
  WASHROOM: 'Washroom', COMMON: 'Common area', OTHER: 'Other',
};
const CATEGORIES = Object.keys(CATEGORY_LABEL) as Category[];
const CELL = 40;

/** Inline number/text input that saves on blur or Enter, only when the value changed. */
const Cell: React.FC<{
  value: string | number | null;
  onSave: (v: string) => Promise<void> | void;
  type?: 'text' | 'number';
  className?: string;
  label: string;
  min?: number;
}> = ({ value, onSave, type = 'text', className = '', label, min }) => {
  const [v, setV] = useState(value ?? '');
  useEffect(() => setV(value ?? ''), [value]);
  const commit = () => {
    if (String(v) !== String(value ?? '')) onSave(String(v));
  };
  return (
    <input
      aria-label={label}
      type={type}
      min={min}
      value={v}
      onChange={e => setV(e.target.value)}
      onBlur={commit}
      onKeyDown={e => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
      className={`bg-transparent border border-transparent hover:border-panel-seam focus:border-panel-ink focus:bg-panel-ground rounded-[2px] px-1.5 py-1 w-full focus:outline-none ${type === 'number' ? 'num text-right' : ''} ${className}`}
    />
  );
};

export const FloorMaps: React.FC = () => {
  const { p } = useTheme();
  const [floors, setFloors] = useState<Floor[]>([]);
  const [types, setTypes] = useState<DeviceType[]>([]);
  const [floorId, setFloorId] = useState<number | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      const fs = await pilot.floors();
      setFloors(fs);
      setFloorId(id => id ?? fs.find(f => f.is_pilot)?.id ?? fs[0]?.id ?? null);
      setError(null);
    } catch (e) {
      setError(errorMessage(e));
    }
  }, []);

  useEffect(() => {
    reload();
    pilot.deviceTypes().then(setTypes).catch(() => undefined);
  }, [reload]);

  const floor = floors.find(f => f.id === floorId) ?? null;
  const space = floor?.spaces.find(s => s.id === selectedId) ?? null;

  const run = async (label: string, fn: () => Promise<unknown>) => {
    try {
      await fn();
      await reload();
      setSaved(label);
      setError(null);
      setTimeout(() => setSaved(null), 1800);
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  const totals = useMemo(() => {
    if (!floor) return { devices: 0, estimated: 0 };
    const all = floor.spaces.flatMap(s => s.assets);
    return { devices: all.reduce((n, a) => n + a.quantity, 0), estimated: all.filter(a => a.spec_status !== 'VERIFIED').length, groups: all.length };
  }, [floor]);

  if (!floor) {
    return <div className="p-8 text-sm text-panel-muted">{error ?? 'Loading floors…'}</div>;
  }

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-end gap-x-8 gap-y-2">
        <div>
          <h1 className="text-[17px] font-semibold">{floor.building} · {floor.name}</h1>
          <p className="text-xs text-panel-muted">Rooms, common areas and every power-consuming device. All loads in the app come from here.</p>
        </div>
        {floors.length > 1 && (
          <div className="flex border border-panel-seam rounded-[3px]" role="tablist">
            {floors.map(f => (
              <button key={f.id} role="tab" aria-selected={f.id === floorId} onClick={() => { setFloorId(f.id); setSelectedId(null); }}
                className={`px-3 py-1 text-xs ${f.id === floorId ? 'bg-accent/10 text-accent font-semibold' : 'text-panel-muted'}`}>{f.name}</button>
            ))}
          </div>
        )}
        <dl className="flex gap-6 text-xs">
          <div><dt className="section-title">Connected</dt><dd className="num text-[15px] font-semibold">{floor.connected_kw.toFixed(2)} kW</dd></div>
          <div><dt className="section-title">Spaces</dt><dd className="num text-[15px] font-semibold">{floor.spaces.length}</dd></div>
          <div><dt className="section-title">Devices</dt><dd className="num text-[15px] font-semibold">{totals.devices}</dd></div>
          <div><dt className="section-title">Specs to verify</dt><dd className={`num text-[15px] font-semibold ${totals.estimated ? 'underline decoration-dashed underline-offset-4' : ''}`}>{totals.estimated} groups</dd></div>
        </dl>
        <div className="ml-auto flex items-center gap-3">
          {saved && <span className="text-xs text-panel-muted flex items-center gap-1"><Check className="w-3 h-3" />{saved}</span>}
          {error && <span className="text-xs text-lamp-on max-w-sm">{error}</span>}
          <button onClick={() => { setAdding(true); setSelectedId(null); }} className="flex items-center gap-1.5 bg-accent text-accent-on text-xs font-semibold px-3 py-1.5 rounded-[3px] hover:bg-accent-hover snap">
            <Plus className="w-3.5 h-3.5" /> Add space
          </button>
        </div>
      </div>

      {/* Floor plan + legend */}
      <div className="flex flex-col xl:flex-row gap-4 items-start">
      <div className="border border-panel-seam overflow-x-auto max-w-full bg-[length:20px_20px]" style={{ backgroundImage: 'linear-gradient(rgb(var(--c-grid)) 1px,transparent 1px),linear-gradient(90deg,rgb(var(--c-grid)) 1px,transparent 1px)' }}>
        <div className="relative mx-auto" style={{ width: floor.map_width * CELL, height: floor.map_height * CELL }} aria-label="Floor plan">
          {floor.spaces.map(s => {
            const sel = s.id === selectedId;
            const kc = kindColor(p, s.kind);
            return (
              <button
                key={s.id}
                onClick={() => { setSelectedId(s.id); setAdding(false); }}
                className={`absolute text-left p-2 snap ${sel ? 'z-10' : 'hover:brightness-[0.97]'}`}
                style={{
                  left: s.map_x * CELL, top: s.map_y * CELL, width: s.map_w * CELL, height: s.map_h * CELL,
                  background: `linear-gradient(${alpha(kc, p.tint)}, ${alpha(kc, p.tint)}), ${p.raised}`,
                  border: sel ? `2px solid ${p.accent}` : `1px solid ${alpha(kc, 0.45)}`,
                }}
              >
                <div className="num text-[13px] font-semibold">{s.code}</div>
                <div className="text-[11px] font-semibold truncate" style={{ color: kc }}>{KIND_LABEL[s.kind]}{s.capacity ? ` · ${s.capacity} seats` : ''}</div>
                {s.map_h >= 2 && (
                  <div className="num text-xs mt-1 whitespace-nowrap">{s.connected_kw.toFixed(2)} kW{s.map_w >= 4 && <span className="text-panel-muted"> · {s.assets.reduce((n, a) => n + a.quantity, 0)} dev</span>}</div>
                )}
                {s.estimated_count > 0 && s.map_h >= 3 && (
                  <div className="text-[10.5px] text-panel-muted underline decoration-dashed underline-offset-2 mt-0.5">{s.estimated_count} estimated</div>
                )}
              </button>
            );
          })}
        </div>
      </div>
      <PlanLegend />
      </div>

      {adding && <AddSpace floor={floor} onCancel={() => setAdding(false)} onCreate={body => run('Space added', async () => {
        const created = await pilot.createSpace(floor.id, body);
        setAdding(false);
        setSelectedId(created.id);
      })} />}

      {!space && !adding && <SpecQueue floor={floor} run={run} onOpen={id => setSelectedId(id)} />}

      {space && (
        <div className="grid grid-cols-1 lg:grid-cols-[300px_minmax(0,1fr)] gap-4">
          <SpaceForm key={space.id} space={space} onSave={(body, label) => run(label, () => pilot.updateSpace(space.id, body))}
            onDelete={() => run('Space removed', async () => { await pilot.deleteSpace(space.id); setSelectedId(null); })} />
          <DeviceTable space={space} types={types} run={run} />
        </div>
      )}
    </div>
  );
};

const SpaceForm: React.FC<{
  space: Space;
  onSave: (body: Partial<Space>, label: string) => void;
  onDelete: () => void;
}> = ({ space, onSave, onDelete }) => {
  const save = (field: keyof Space, raw: string | boolean, numeric = false) => {
    const value = numeric ? (raw === '' ? null : Number(raw)) : raw;
    onSave({ [field]: value } as Partial<Space>, `${space.code} saved`);
  };
  return (
    <section className="border border-panel-seam p-3 space-y-3 self-start" aria-label={`${space.code} details`}>
      <div className="flex items-baseline justify-between">
        <h2 className="num text-[15px] font-semibold">{space.code}</h2>
        <span className="num text-xs text-panel-muted">{space.connected_kw.toFixed(2)} kW connected</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <label className="col-span-2"><span className="label">Name</span><Cell label="Name" value={space.name} onSave={v => save('name', v)} className="field" /></label>
        <label><span className="label">Code</span><Cell label="Code" value={space.code} onSave={v => save('code', v)} className="field" /></label>
        <label><span className="label">Seats</span><Cell label="Seats" type="number" min={0} value={space.capacity} onSave={v => save('capacity', v, true)} className="field" /></label>
        <label className="col-span-2"><span className="label">Type</span>
          <select className="field" value={space.kind} onChange={e => save('kind', e.target.value)}>
            {KINDS.map(k => <option key={k} value={k}>{KIND_LABEL[k]}</option>)}
          </select>
        </label>
        <label className="col-span-2 flex items-center gap-2 text-[13px]">
          <input type="checkbox" checked={space.bookable} onChange={e => save('bookable', e.target.checked)} className="accent-accent" />
          Can be booked for extra classes
        </label>
      </div>
      <fieldset>
        <legend className="label">Position on plan (grid cells)</legend>
        <div className="grid grid-cols-4 gap-1.5">
          {(['map_x', 'map_y', 'map_w', 'map_h'] as const).map(k => (
            <label key={k} className="text-[11px] text-panel-muted">{{ map_x: 'X', map_y: 'Y', map_w: 'W', map_h: 'H' }[k]}
              <Cell label={k} type="number" min={k.endsWith('w') || k.endsWith('h') ? 1 : 0} value={space[k]} onSave={v => save(k, v, true)} className="field" />
            </label>
          ))}
        </div>
      </fieldset>
      <label className="block"><span className="label">Notes</span><Cell label="Notes" value={space.notes} onSave={v => save('notes', v)} className="field" /></label>
      {space.classroom_id ? (
        <p className="text-[11px] text-panel-muted">Linked to the timetable and bookings, so it can't be deleted. Untick "can be booked" to retire it.</p>
      ) : (
        <button onClick={onDelete} className="flex items-center gap-1.5 text-xs text-lamp-on hover:underline underline-offset-4"><Trash2 className="w-3.5 h-3.5" />Remove space</button>
      )}
    </section>
  );
};

const DeviceTable: React.FC<{
  space: Space;
  types: DeviceType[];
  run: (label: string, fn: () => Promise<unknown>) => Promise<void>;
}> = ({ space, types, run }) => {
  const { p } = useTheme();
  const [newType, setNewType] = useState('LED_PANEL');
  const [newQty, setNewQty] = useState(1);
  const upd = (a: Asset, body: Partial<Asset>) => run(`${a.name} saved`, () => pilot.updateAsset(a.id, body));
  const num = (s: string) => (s === '' ? 0 : Number(s));
  const total = space.assets.reduce((n, a) => n + a.total_rated_kw, 0);
  const t = types.find(x => x.key === newType);

  return (
    <section className="border border-panel-seam min-w-0" aria-label={`Devices in ${space.code}`}>
      <div className="overflow-x-auto">
        <table className="w-full text-[13px] min-w-[860px]">
          <thead>
            <tr className="text-left text-panel-muted border-b border-panel-seam">
              <th className="font-medium px-2 py-2 w-[26%]">Device</th>
              <th className="font-medium px-2 py-2">Type</th>
              <th className="font-medium px-2 py-2 text-right w-16">Qty</th>
              <th className="font-medium px-2 py-2 text-right w-24">Rated W</th>
              <th className="font-medium px-2 py-2 text-right w-24">Standby W</th>
              <th className="font-medium px-2 py-2 text-center">Switchable</th>
              <th className="font-medium px-2 py-2">Spec</th>
              <th className="font-medium px-2 py-2 text-right">kW</th>
              <th className="px-2 py-2 w-8"><span className="sr-only">Remove</span></th>
            </tr>
          </thead>
          <tbody>
            {space.assets.length === 0 && (
              <tr><td colSpan={9} className="px-3 py-6 text-panel-muted">No devices yet. Add lights, fans, ACs or boards below; typical ratings fill in automatically.</td></tr>
            )}
            {space.assets.map(a => (
              <tr key={a.id} className="border-b border-panel-seam hover:bg-panel-raised/60">
                <td className="px-1 py-0.5"><Cell label="Device name" value={a.name} onSave={v => upd(a, { name: v })} /></td>
                <td className="px-1 py-0.5">
                  <span className="inline-flex items-center gap-1 rounded-full pl-2" style={{ background: alpha(categoryColor(p, a.category), 0.14) }}>
                  <span className="w-[7px] h-[7px] rounded-full" style={{ background: categoryColor(p, a.category) }} aria-hidden />
                  <select aria-label="Category" value={a.category} onChange={e => upd(a, { category: e.target.value as Category })}
                    className="bg-transparent border border-transparent rounded-full pl-0.5 pr-1 py-0.5 text-[12px] font-semibold focus:outline-none focus:border-accent">
                    {CATEGORIES.map(c => <option key={c} value={c} className="bg-panel-raised">{CATEGORY_LABEL[c]}</option>)}
                  </select>
                  </span>
                </td>
                <td className="px-1 py-0.5"><Cell label="Quantity" type="number" min={0} value={a.quantity} onSave={v => upd(a, { quantity: num(v) })} /></td>
                <td className="px-1 py-0.5"><Cell label="Rated watts" type="number" min={0} value={a.rated_power_w} onSave={v => upd(a, { rated_power_w: num(v) })} /></td>
                <td className="px-1 py-0.5"><Cell label="Standby watts" type="number" min={0} value={a.standby_power_w} onSave={v => upd(a, { standby_power_w: num(v) })} /></td>
                <td className="px-2 py-0.5 text-center">
                  <input type="checkbox" aria-label="Switchable" checked={a.controllable} onChange={e => upd(a, { controllable: e.target.checked })} className="accent-accent" />
                </td>
                <td className="px-2 py-0.5">
                  <button
                    onClick={() => upd(a, { spec_status: a.spec_status === 'VERIFIED' ? 'ESTIMATED' : 'VERIFIED' })}
                    className={`text-[11px] font-semibold tracking-[0.08em] px-1.5 py-0.5 border rounded-[2px] snap ${a.spec_status === 'VERIFIED' ? 'border-panel-wire text-panel-ink' : 'border-dashed border-panel-wire text-panel-muted'}`}
                    title="Toggle once the real rating is confirmed from the nameplate or datasheet"
                  >
                    {a.spec_status === 'VERIFIED' ? 'VERIFIED' : 'ESTIMATED'}
                  </button>
                </td>
                <td className="px-2 py-0.5 text-right num">{a.total_rated_kw.toFixed(2)}</td>
                <td className="px-2 py-0.5">
                  <button aria-label={`Remove ${a.name}`} onClick={() => run('Device removed', () => pilot.deleteAsset(a.id))} className="text-panel-muted hover:text-lamp-on">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={7} className="px-2 py-2 text-xs text-panel-muted">Connected load (all devices at rated power)</td>
              <td className="px-2 py-2 text-right num font-semibold">{total.toFixed(2)}</td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>
      <form
        className="flex flex-wrap items-end gap-2 border-t border-panel-seam p-2"
        onSubmit={e => {
          e.preventDefault();
          run('Device added', () => pilot.createAsset(space.id, { device_type: newType, quantity: newQty }));
        }}
      >
        <label className="min-w-[220px]"><span className="label">Add device</span>
          <select className="field" value={newType} onChange={e => setNewType(e.target.value)}>
            {types.map(x => <option key={x.key} value={x.key}>{x.name} · {x.rated_w} W</option>)}
          </select>
        </label>
        <label className="w-20"><span className="label">Qty</span>
          <input type="number" min={1} className="field num" value={newQty} onChange={e => setNewQty(Math.max(1, Number(e.target.value)))} />
        </label>
        <button type="submit" className="flex items-center gap-1.5 border border-panel-wire hover:border-accent hover:text-accent text-xs font-semibold px-3 py-1.5 rounded-[3px] snap">
          <Plus className="w-3.5 h-3.5" /> Add
        </button>
        {t && <span className="text-xs text-panel-muted pb-1.5">{CATEGORY_LABEL[t.category]} · typical {t.rated_w} W, standby {t.standby_w} W · marked estimated until verified</span>}
      </form>
    </section>
  );
};

const AddSpace: React.FC<{ floor: Floor; onCancel: () => void; onCreate: (body: Partial<Space>) => void }> = ({ floor, onCancel, onCreate }) => {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [kind, setKind] = useState<SpaceKind>('CLASSROOM');
  const [capacity, setCapacity] = useState(60);
  return (
    <form
      className="border border-panel-seam p-3 flex flex-wrap items-end gap-3"
      onSubmit={e => {
        e.preventDefault();
        if (!code.trim()) return;
        const isRoom = kind === 'CLASSROOM' || kind === 'LAB';
        onCreate({ code: code.trim(), name: name.trim() || code.trim(), kind, capacity: isRoom || kind === 'STAFF_ROOM' ? capacity : null, bookable: isRoom, map_x: 0, map_y: floor.map_height - 3, map_w: 4, map_h: 3 });
      }}
    >
      <label className="w-28"><span className="label">Code</span><input required autoFocus className="field num" placeholder="LS-11" value={code} onChange={e => setCode(e.target.value)} /></label>
      <label className="w-56"><span className="label">Name</span><input className="field" placeholder="Classroom LS-11" value={name} onChange={e => setName(e.target.value)} /></label>
      <label className="w-40"><span className="label">Type</span>
        <select className="field" value={kind} onChange={e => setKind(e.target.value as SpaceKind)}>{KINDS.map(k => <option key={k} value={k}>{KIND_LABEL[k]}</option>)}</select>
      </label>
      <label className="w-24"><span className="label">Seats</span><input type="number" min={0} className="field num" value={capacity} onChange={e => setCapacity(Number(e.target.value))} /></label>
      <button type="submit" className="bg-accent text-accent-on text-xs font-semibold px-3 py-1.5 rounded-[3px] hover:bg-accent-hover">Create</button>
      <button type="button" onClick={onCancel} className="text-xs text-panel-muted hover:text-panel-ink px-2 py-1.5">Cancel</button>
      <p className="w-full text-[11px] text-panel-muted">Classrooms and labs join the timetable and can be booked. Place it on the plan afterwards with the position fields.</p>
    </form>
  );
};

/** Every device group still on an estimated rating, biggest connected load first, editable in place. */
const SpecQueue: React.FC<{
  floor: Floor;
  run: (label: string, fn: () => Promise<unknown>) => Promise<void>;
  onOpen: (spaceId: number) => void;
}> = ({ floor, run, onOpen }) => {
  const rows = floor.spaces
    .flatMap(s => s.assets.filter(a => a.spec_status !== 'VERIFIED').map(a => ({ a, s })))
    .sort((x, y) => y.a.total_rated_kw - x.a.total_rated_kw);
  const num = (v: string) => (v === '' ? 0 : Number(v));
  if (rows.length === 0) {
    return <p className="text-[13px] text-panel-muted">Every device rating on this floor is verified. Select a space on the plan to edit it.</p>;
  }
  return (
    <section className="border border-panel-seam" aria-label="Ratings to verify">
      <div className="flex items-baseline gap-4 px-3 py-2 border-b border-panel-seam">
        <h2 className="section-title">Ratings to verify · {rows.length} device groups</h2>
        <span className="text-xs text-panel-muted">Largest connected load first. Copy the nameplate or datasheet value, then mark it verified. Select a space on the plan to edit everything in it.</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-[13px] min-w-[760px]">
          <thead>
            <tr className="text-left text-panel-muted border-b border-panel-seam">
              <th className="font-medium px-3 py-2 w-20">Space</th>
              <th className="font-medium px-2 py-2">Device</th>
              <th className="font-medium px-2 py-2 text-right w-16">Qty</th>
              <th className="font-medium px-2 py-2 text-right w-24">Rated W</th>
              <th className="font-medium px-2 py-2 text-right w-24">Standby W</th>
              <th className="font-medium px-2 py-2 text-right w-20">kW</th>
              <th className="px-3 py-2 w-36"><span className="sr-only">Verify</span></th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ a, s }) => (
              <tr key={a.id} className="border-b border-panel-seam hover:bg-panel-raised/60">
                <td className="px-3 py-1"><button onClick={() => onOpen(s.id)} className="num font-semibold hover:underline underline-offset-4">{s.code}</button></td>
                <td className="px-2 py-1"><span className="mr-2">{a.name}</span><CategoryChip category={a.category} /></td>
                <td className="px-2 py-1 text-right num">{a.quantity}</td>
                <td className="px-1 py-0.5"><Cell className="!border-panel-seam" label={`Rated watts, ${a.name} in ${s.code}`} type="number" min={0} value={a.rated_power_w} onSave={v => run(`${a.name} saved`, () => pilot.updateAsset(a.id, { rated_power_w: num(v) }))} /></td>
                <td className="px-1 py-0.5"><Cell className="!border-panel-seam" label={`Standby watts, ${a.name} in ${s.code}`} type="number" min={0} value={a.standby_power_w} onSave={v => run(`${a.name} saved`, () => pilot.updateAsset(a.id, { standby_power_w: num(v) }))} /></td>
                <td className="px-2 py-1 text-right num">{a.total_rated_kw.toFixed(2)}</td>
                <td className="px-3 py-1 text-right">
                  <button onClick={() => run(`${a.name} verified`, () => pilot.updateAsset(a.id, { spec_status: 'VERIFIED' }))}
                    className="flex items-center gap-1 ml-auto whitespace-nowrap text-xs border border-panel-wire hover:border-accent hover:text-accent px-2 py-1 rounded-[3px] snap">
                    <Check className="w-3 h-3" /> Mark verified
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
};

/** Key for room tints and load-type colours used on this page. */
const PlanLegend: React.FC = () => {
  const { p } = useTheme();
  const kinds: [string, string][] = [['CLASSROOM', 'Classroom'], ['STAFF_ROOM', 'Staff room'], ['CORRIDOR', 'Corridor, washroom, stairs']];
  return (
    <aside className="text-xs space-y-3 shrink-0" aria-label="Legend">
      <div className="space-y-1.5">
        <div className="section-title">Room types</div>
        {kinds.map(([k, l]) => (
          <div key={k} className="flex items-center gap-2">
            <span className="w-4 h-3 rounded-[2px]" style={{ background: alpha(kindColor(p, k), 0.35), border: `1px solid ${alpha(kindColor(p, k), 0.6)}` }} />
            {l}
          </div>
        ))}
      </div>
      <div className="space-y-1.5">
        <div className="section-title">Load types</div>
        {(['HVAC', 'FAN', 'LIGHTING', 'AV', 'IT'] as const).map(c => <div key={c}><CategoryChip category={c} /></div>)}
      </div>
    </aside>
  );
};
