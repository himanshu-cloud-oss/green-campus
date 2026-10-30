import React from 'react';
import { Category, CATEGORY_LABEL, LiveSnapshot, SpaceReading, STATE_LABEL } from '../../services/pilot';

const INK = '#D9DEE5';
const MUTED = '#7D8694';
const WIRE = '#3A414D';
const WASTE = '#F5A524';
const LAMP_ON = '#E5484D';
const LAMP_OFF = '#3DD68C';

const ROOM_BRANCHES: Category[] = ['HVAC', 'FAN', 'LIGHTING', 'AV'];
const STAFF_BRANCHES: Category[] = ['HVAC', 'FAN', 'LIGHTING', 'IT'];
const SERVICE_KINDS = new Set(['CORRIDOR', 'WASHROOM', 'COMMON']);

const BUS_Y = 176;
const ROOM_W = 108;
const SVC_W = 72;
const LEFT = 104;

function feederStyle(s: SpaceReading) {
  const live = s.kw > 0.05;
  const wasting = s.waste_kw > 0;
  const tripped = s.cut_armed && !live;
  return {
    live,
    wasting,
    tripped,
    color: wasting ? WASTE : live ? INK : WIRE,
    width: live ? 1.4 + Math.min(s.kw, 6) * 0.7 : 1.4,
    flow: `${Math.max(0.35, 2.4 - s.kw * 0.35).toFixed(2)}s`,
  };
}

function branchCounts(s: SpaceReading, cats: Category[]) {
  return cats.map(c => {
    const items = s.assets.filter(a => a.category === c);
    return { cat: c, on: items.reduce((n, a) => n + a.on_count, 0), total: items.reduce((n, a) => n + a.quantity, 0) };
  });
}

interface Props {
  snapshot: LiveSnapshot;
  selected: string | null;
  onSelect: (code: string) => void;
}

/**
 * The floor as a single-line diagram: transformer, meter, main breaker, 415 V bus,
 * and one feeder per space. Line weight follows kW; amber marks power into an empty room;
 * panel lamps follow the Indian convention (red energised, green tripped).
 */
export const SingleLineDiagram: React.FC<Props> = ({ snapshot, selected, onSelect }) => {
  const rooms = snapshot.spaces.filter(s => !SERVICE_KINDS.has(s.kind));
  const services = snapshot.spaces.filter(s => SERVICE_KINDS.has(s.kind));
  const width = LEFT + rooms.length * ROOM_W + 24 + services.length * SVC_W + 20;
  const height = 524;

  let x = LEFT + ROOM_W / 2;
  const placed: { s: SpaceReading; x: number; service: boolean }[] = [];
  rooms.forEach(s => {
    placed.push({ s, x, service: false });
    x += ROOM_W;
  });
  x += 24 - ROOM_W / 2 + SVC_W / 2;
  services.forEach(s => {
    placed.push({ s, x, service: true });
    x += SVC_W;
  });

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full min-w-[880px] h-auto select-none"
      role="img"
      aria-label={`Single-line diagram of ${snapshot.floor?.name ?? 'the floor'}: ${snapshot.total_kw.toFixed(1)} kW total, ${snapshot.waste_kw.toFixed(1)} kW into empty rooms`}
      fontFamily="Archivo, sans-serif"
    >
      <defs>
        <pattern id="sld-grid" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M20 0H0V20" fill="none" stroke="#151A21" strokeWidth="1" />
        </pattern>
      </defs>
      <rect width={width} height={height} fill="url(#sld-grid)" />

      {/* Incomer: transformer, energy meter, main breaker */}
      <g stroke={INK} fill="none" strokeWidth="1.5">
        <circle cx="44" cy="34" r="13" />
        <circle cx="44" cy="52" r="13" />
        <line x1="44" y1="65" x2="44" y2="88" />
        <circle cx="44" cy="102" r="14" />
        <line x1="44" y1="116" x2="44" y2="134" />
        <rect x="35" y="134" width="18" height="18" />
        <line x1="35" y1="134" x2="53" y2="152" />
        <line x1="53" y1="134" x2="35" y2="152" />
        <line x1="44" y1="152" x2="44" y2={BUS_Y} />
      </g>
      <text x="64" y="48" fill={MUTED} fontSize="11">11 kV / 415 V</text>
      <text x="36" y="106" fill={INK} fontSize="9" fontFamily="JetBrains Mono">kWh</text>
      <text x="64" y="147" fill={MUTED} fontSize="11">Main MCCB</text>
      <text x="64" y="161" fill={INK} fontSize="12" fontFamily="JetBrains Mono">{snapshot.total_kw.toFixed(2)} kW</text>

      {/* 415 V bus */}
      <rect x="24" y={BUS_Y} width={width - 40} height="6" fill={INK} />
      <text x={width - 20} y={BUS_Y - 8} fill={MUTED} fontSize="11" textAnchor="end">
        415 V bus · {snapshot.floor?.building} {snapshot.floor?.name}
      </text>

      {placed.map(({ s, x: fx, service }) => {
        const st = feederStyle(s);
        const isSel = selected === s.code;
        const tagW = service ? 64 : 96;
        const dropTo = service ? 382 : 342;
        const cats = s.kind === 'STAFF_ROOM' ? STAFF_BRANCHES : ROOM_BRANCHES;
        const branches = service ? [] : branchCounts(s, cats);
        return (
          <g
            key={s.space_id}
            role="button"
            tabIndex={0}
            aria-label={`${s.code}: ${STATE_LABEL[s.state]}, ${s.kw.toFixed(2)} kW${st.wasting ? ', power into an empty room' : ''}`}
            onClick={() => onSelect(s.code)}
            onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && onSelect(s.code)}
            className="cursor-pointer focus:outline-none"
          >
            {/* hit target */}
            <rect x={fx - tagW / 2 - 6} y={BUS_Y + 6} width={tagW + 12} height={height - BUS_Y - 10} fill="transparent" />

            {/* feeder drop */}
            <line
              x1={fx} y1={BUS_Y + 6} x2={fx} y2={dropTo}
              stroke={st.color}
              strokeWidth={st.width}
              className={st.live ? 'flow' : undefined}
              style={st.live ? ({ ['--flow' as string]: st.flow } as React.CSSProperties) : { strokeDasharray: st.tripped ? '4 4' : undefined }}
            />
            {/* panel lamp */}
            <circle cx={fx} cy={BUS_Y + 30} r="4.5" fill={st.live ? LAMP_ON : LAMP_OFF} />
            {/* breaker: closed when live, open when tripped */}
            <rect x={fx - 12} y={BUS_Y + 44} width="24" height="32" fill="#0E1116" />
            {st.live || !st.tripped ? (
              <path d={`M${fx - 8} ${BUS_Y + 58} L${fx} ${BUS_Y + 58} L${fx + 9} ${BUS_Y + 46} M${fx} ${BUS_Y + 72} L${fx} ${BUS_Y + 80}`} stroke={st.color === WIRE ? MUTED : st.color} strokeWidth="2" fill="none" />
            ) : (
              <path d={`M${fx - 8} ${BUS_Y + 58} L${fx} ${BUS_Y + 58} L${fx - 6} ${BUS_Y + 42} M${fx} ${BUS_Y + 72} L${fx} ${BUS_Y + 80}`} stroke={LAMP_OFF} strokeWidth="2" fill="none" />
            )}
            {st.tripped && (
              <text x={fx} y={BUS_Y + 96} fill={LAMP_OFF} fontSize="9" fontFamily="JetBrains Mono" textAnchor="middle">TRIPPED</text>
            )}

            {/* category branches */}
            {branches.length > 0 && (
              <g>
                <line x1={fx - 39} y1={dropTo} x2={fx + 39} y2={dropTo} stroke={st.color} strokeWidth="2" />
                {branches.map((b, i) => {
                  const bx = fx - 39 + i * 26;
                  const on = b.on > 0;
                  return (
                    <g key={b.cat}>
                      <line x1={bx} y1={dropTo} x2={bx} y2={dropTo + 22} stroke={on ? st.color : WIRE} strokeWidth="2" />
                      <text x={bx} y={dropTo + 36} fill={MUTED} fontSize="10" textAnchor="middle" fontFamily="JetBrains Mono">
                        {({ HVAC: 'AC', FAN: 'FN', LIGHTING: 'LT', AV: 'AV', IT: 'IT' } as Record<string, string>)[b.cat] ?? b.cat.slice(0, 2)}
                      </text>
                      <text x={bx} y={dropTo + 48} fill={on ? INK : MUTED} fontSize="10" textAnchor="middle" fontFamily="JetBrains Mono">
                        {b.on}/{b.total}
                      </text>
                    </g>
                  );
                })}
              </g>
            )}

            {/* room tag */}
            <rect
              x={fx - tagW / 2} y={service ? 400 : 410} width={tagW} height={service ? 52 : 70}
              fill={st.wasting ? '#191307' : '#141920'}
              stroke={isSel ? INK : st.wasting ? WASTE : WIRE}
              strokeWidth={isSel ? 2 : 1}
            />
            <text x={fx - tagW / 2 + 8} y={service ? 420 : 431} fill={INK} fontSize="14" fontWeight="600" fontFamily="JetBrains Mono">{s.code}</text>
            {!service && (
              <text x={fx - tagW / 2 + 8} y={448} fill={MUTED} fontSize="11.5">
                {STATE_LABEL[s.state]}{s.headcount ? ` · ${s.headcount}` : ''}
              </text>
            )}
            <text
              x={fx - tagW / 2 + 8} y={service ? 440 : 467}
              fill={st.wasting ? WASTE : st.live ? INK : MUTED}
              fontSize="13" fontWeight="600" fontFamily="JetBrains Mono"
            >
              {s.kw.toFixed(2)} kW
            </text>
          </g>
        );
      })}

      {/* legend */}
      <g fontSize="12" fill={MUTED} transform={`translate(24, ${height - 14})`}>
        <circle cx="4" cy="-4" r="4" fill={LAMP_ON} />
        <text x="14" y="0">Energised</text>
        <circle cx="94" cy="-4" r="4" fill={LAMP_OFF} />
        <text x="104" y="0">Tripped</text>
        <line x1="176" y1="-4" x2="206" y2="-4" stroke={WASTE} strokeWidth="3" strokeDasharray="7 5" />
        <text x="214" y="0">Power into an empty room</text>
        <text x="410" y="0">Line weight = kW · branch counts = devices on / installed</text>
      </g>
    </svg>
  );
};
