import React from 'react';
import { Area, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { SeriesPoint } from '../../services/pilot';

const hhmm = (iso: string) => iso.slice(11, 16);

interface Props {
  points: SeriesPoint[];
  at: string | null;
  onPick: (iso: string) => void;
  height?: number;
}

const RibbonTooltip: React.FC<{ active?: boolean; payload?: { payload: SeriesPoint }[] }> = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="bg-panel-raised border border-panel-wire px-2.5 py-1.5 text-xs rounded-[3px]">
      <div className="num text-panel-muted">{hhmm(p.t)} · {p.temp_c.toFixed(1)} °C</div>
      <div className="num">Floor <span className="text-panel-ink font-semibold">{p.kw.toFixed(2)} kW</span></div>
      <div className="num">Waste <span className="text-waste font-semibold">{p.waste_kw.toFixed(2)} kW</span></div>
      <div className="text-panel-muted mt-0.5">Click to replay this moment</div>
    </div>
  );
};

/** Today's incomer kW with the waste share shaded. Clicking a point replays the floor at that time. */
export const LoadRibbon: React.FC<Props> = ({ points, at, onPick, height = 132 }) => {
  const atKey = at ? at.slice(0, 15) : null;
  const match = atKey ? points.find(p => p.t.slice(0, 15) === atKey)?.t : undefined;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart
        data={points}
        margin={{ top: 6, right: 8, bottom: 0, left: -18 }}
        onClick={(e: { activePayload?: { payload: SeriesPoint }[] } | null) => {
          const p = e?.activePayload?.[0]?.payload;
          if (p) onPick(p.t);
        }}
        style={{ cursor: 'crosshair' }}
      >
        <XAxis
          dataKey="t"
          tickFormatter={hhmm}
          interval={Math.max(1, Math.floor(points.length / 8))}
          tick={{ fill: '#7D8694', fontSize: 10.5, fontFamily: 'JetBrains Mono' }}
          axisLine={{ stroke: '#222833' }}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: '#7D8694', fontSize: 10.5, fontFamily: 'JetBrains Mono' }}
          axisLine={false}
          tickLine={false}
          width={46}
          tickFormatter={v => `${v}`}
        />
        <Tooltip content={<RibbonTooltip />} cursor={{ stroke: '#7D8694', strokeDasharray: '2 3' }} isAnimationActive={false} />
        <Area dataKey="waste_kw" type="stepAfter" stroke="none" fill="#C27A12" fillOpacity={0.55} isAnimationActive={false} />
        <Line dataKey="kw" type="monotone" stroke="#D9DEE5" strokeWidth={2} dot={false} isAnimationActive={false} activeDot={{ r: 4, fill: '#D9DEE5', stroke: '#0E1116', strokeWidth: 2 }} />
        {match && <ReferenceLine x={match} stroke="#D9DEE5" strokeWidth={1.5} strokeDasharray="3 3" />}
      </ComposedChart>
    </ResponsiveContainer>
  );
};
