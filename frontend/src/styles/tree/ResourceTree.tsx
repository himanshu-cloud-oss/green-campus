import React, { useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useTree } from './data';
import { Dot, Tone, shortName } from './ui';

interface TNode {
  id: string;
  label: string;
  sub?: string;
  to: string;
  depth: number;
  tone?: Tone;
  parent?: string;
  expandable?: boolean;
  heading?: boolean;
  badge?: number;
}

const OPS: { to: string; label: string }[] = [
  { to: '/tree/book', label: 'Bookings' },
  { to: '/tree/timetable', label: 'Timetable' },
  { to: '/tree/savings', label: 'Savings model' },
  { to: '/tree/floors', label: 'Floor maps & inventory' },
  { to: '/tree/alerts', label: 'Alarms & events' },
  { to: '/tree/reports', label: 'Reports' },
  { to: '/tree/settings', label: 'Settings' },
];

export const ResourceTree: React.FC = () => {
  const { building, pilotFloor, spaces, overview, health, gatewayTone, alarms, loading, errors } = useTree();
  const loc = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());

  const floorTone: Tone = useMemo(() => {
    if (!overview) return 'idle';
    if (overview.alarms.p1 > 0 || overview.relays.mismatch > 0) return 'bad';
    if (overview.unoccupied_powered_rooms > 0) return 'warn';
    return 'ok';
  }, [overview]);

  const nodes = useMemo<TNode[]>(() => {
    const out: TNode[] = [];
    if (building) {
      out.push({ id: 'b', label: building.name, to: '/tree', depth: 0, tone: pilotFloor ? floorTone : 'idle', expandable: true });
      const floors = [...building.floors].sort((a, b) => Number(b.is_pilot) - Number(a.is_pilot) || a.level - b.level);
      for (const f of floors) {
        const live = f.is_pilot && pilotFloor?.id === f.id;
        out.push({
          id: `f${f.id}`, label: f.name + (f.is_pilot ? ' (pilot)' : ''), sub: live ? undefined : 'not instrumented',
          to: `/tree/floor/${f.id}`, depth: 1, parent: 'b', expandable: live, tone: live ? floorTone : 'idle',
        });
        if (live) {
          out.push({ id: `gw${f.id}`, label: `${overview?.gateway.id ?? 'Gateway'} gateway`, to: `/tree/gateway/${f.id}`, depth: 2, parent: `f${f.id}`, tone: gatewayTone });
          for (const s of spaces) {
            out.push({ id: `r${s.id}`, label: `${s.code}  ${shortName(s.code, s.name)}`.trim(), to: `/tree/room/${s.id}`, depth: 2, parent: `f${f.id}`, tone: health(s.id).tone });
          }
        }
      }
    }
    out.push({ id: 'ops', label: 'Operations', to: '', depth: 0, expandable: true, heading: true });
    for (const o of OPS) {
      out.push({ id: o.to, label: o.label, to: o.to, depth: 1, parent: 'ops', badge: o.to === '/tree/alerts' ? (alarms ?? []).filter(a => !a.acked).length : undefined });
    }
    return out;
  }, [building, pilotFloor, spaces, overview, health, gatewayTone, floorTone, alarms]);

  const visible = useMemo(() => {
    const hidden = new Set<string>();
    return nodes.filter(n => {
      if (n.parent && (collapsed.has(n.parent) || hidden.has(n.parent))) { hidden.add(n.id); return false; }
      return true;
    });
  }, [nodes, collapsed]);

  const selectedId = useMemo(() => {
    let best: TNode | null = null;
    for (const n of nodes) {
      if (!n.to) continue;
      const hit = n.to === '/tree' ? loc.pathname.replace(/\/$/, '') === '/tree' : loc.pathname === n.to || loc.pathname.startsWith(n.to + '/');
      if (hit && (!best || n.to.length > best.to.length)) best = n;
    }
    return best?.id ?? null;
  }, [nodes, loc.pathname]);

  const toggle = (id: string) => setCollapsed(prev => { const s = new Set(prev); if (s.has(id)) s.delete(id); else s.add(id); return s; });

  const onKeyDown = (e: React.KeyboardEvent) => {
    const idx = Math.max(0, visible.findIndex(n => n.id === selectedId));
    const cur = visible[idx];
    if (!cur) return;
    const go = (n?: TNode) => { if (n?.to) navigate(n.to); };
    if (e.key === 'ArrowDown') { e.preventDefault(); go(visible.slice(idx + 1).find(n => n.to)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); go([...visible.slice(0, idx)].reverse().find(n => n.to)); }
    else if (e.key === 'ArrowRight') {
      e.preventDefault();
      if (cur.expandable && collapsed.has(cur.id)) toggle(cur.id);
      else go(visible[idx + 1]?.parent === cur.id ? visible[idx + 1] : undefined);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      if (cur.expandable && !collapsed.has(cur.id)) toggle(cur.id);
      else go(visible.find(n => n.id === cur.parent));
    }
  };

  return (
    <nav aria-label="Resource tree" className="w-[260px] shrink-0 bg-chrome-rail border-r border-panel-seam overflow-y-auto text-[13px] pb-4">
      <div className="px-3 pt-3 pb-1.5 text-[11px] font-semibold tracking-[0.08em] uppercase text-chrome-rail-ink/80">Resource tree</div>
      {loading && !building && <div className="px-3 py-2 text-xs text-panel-muted" role="status">Loading buildings...</div>}
      {!loading && !building && <div className="px-3 py-2 text-xs text-panel-muted">{errors.inventory ? 'Inventory unavailable.' : 'No buildings defined.'}</div>}
      <div role="tree" aria-label="Site hierarchy" tabIndex={0} onKeyDown={onKeyDown} className="outline-none focus-visible:ring-2 focus-visible:ring-accent ring-inset">
        {visible.map(n => {
          const sel = n.id === selectedId;
          const open = !collapsed.has(n.id);
          if (n.heading) {
            return (
              <div key={n.id} role="treeitem" aria-expanded={open} aria-selected={false} className="mt-3 px-3 pb-1.5 flex items-center gap-1 text-[11px] font-semibold tracking-[0.08em] uppercase text-chrome-rail-ink/80">
                <button type="button" aria-label={`${open ? 'Collapse' : 'Expand'} ${n.label}`} onClick={() => toggle(n.id)} className="p-0.5 -ml-1 rounded-[3px] hover:bg-panel-grid">
                  {open ? <ChevronDown size={12} aria-hidden /> : <ChevronRight size={12} aria-hidden />}
                </button>
                {n.label}
              </div>
            );
          }
          return (
            <div
              key={n.id}
              role="treeitem"
              aria-selected={sel}
              aria-expanded={n.expandable ? open : undefined}
              aria-level={n.depth + 1}
              className={`flex items-center h-7 pr-2 ${sel ? 'bg-chrome-rail-active text-chrome-rail-active-ink' : 'text-chrome-rail-ink hover:bg-panel-grid'}`}
              style={{ paddingLeft: 8 + n.depth * 16 }}
            >
              {n.expandable ? (
                <button type="button" tabIndex={-1} aria-label={`${open ? 'Collapse' : 'Expand'} ${n.label}`} onClick={() => toggle(n.id)} className="w-4 h-5 flex items-center justify-center shrink-0 rounded-[3px] hover:bg-panel-ink/10">
                  {open ? <ChevronDown size={12} aria-hidden /> : <ChevronRight size={12} aria-hidden />}
                </button>
              ) : <span className="w-4 shrink-0" />}
              {n.tone && <Dot tone={n.tone} className="mx-1.5" />}
              <Link to={n.to} tabIndex={-1} className={`flex-1 min-w-0 truncate ${n.depth === 0 ? 'font-semibold' : ''} ${n.tone ? '' : 'ml-1'}`} title={n.sub ? `${n.label} (${n.sub})` : n.label}>
                {n.label}
              </Link>
              {n.badge ? <span className="num text-[11px] px-1.5 rounded-full bg-waste text-accent-on">{n.badge}</span> : null}
              {n.sub && <span className={`text-[11px] ml-1 shrink-0 ${sel ? 'opacity-80' : 'text-panel-muted'}`}>{n.sub}</span>}
            </div>
          );
        })}
      </div>
    </nav>
  );
};
