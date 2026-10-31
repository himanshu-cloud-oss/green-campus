import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ago, hw, HwAlarm, HwSensor } from '../../services/hw';
import { errorMessage } from '../../services/pilot';
import { useTree } from './data';
import { Btn, Dot, PriorityChip, TD, TDR, TH, THR, Tone, hhmmss } from './ui';

export const AlarmTable: React.FC<{ alarms: HwAlarm[]; compact?: boolean }> = ({ alarms, compact }) => {
  const { refresh, spaceById } = useTree();
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const rows = useMemo(
    () => [...alarms].sort((a, b) => Number(a.acked) - Number(b.acked) || a.priority.localeCompare(b.priority) || b.time.localeCompare(a.time)),
    [alarms],
  );
  const ack = async (key: string) => {
    setBusy(key); setErr(null);
    try { await hw.ack(key); refresh(); } catch (e) { setErr(errorMessage(e)); } finally { setBusy(null); }
  };
  return (
    <>
      {err && <div className="px-3 py-2 text-[13px] bg-waste-field border-b border-panel-seam" role="alert">Acknowledge failed: {err}</div>}
      <table className="w-full text-[13px]">
        <thead className="sticky top-0">
          <tr>
            <th className={`${TH} w-[64px]`}>Priority</th>
            <th className={`${TH} w-[100px]`}>Time</th>
            <th className={TH}>Object</th>
            <th className={TH}>Message</th>
            <th className={`${TH} w-[190px]`}>Acknowledged</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(a => {
            const sp = a.space_id != null ? spaceById(a.space_id) : undefined;
            return (
              <tr key={a.key} className={`hover:bg-panel-ground ${a.acked ? 'opacity-55' : ''}`}>
                <td className={`${TD} ${compact ? 'h-8' : ''}`}><PriorityChip priority={a.priority} /></td>
                <td className={`${TD} num`}>{hhmmss(a.time)}</td>
                <td className={`${TD} num`}>{sp ? <Link to={`/tree/room/${sp.id}`} className="text-accent hover:underline">{a.object}</Link> : a.object}</td>
                <td className={TD}>{a.message}</td>
                <td className={TD}>
                  {a.acked
                    ? <span className="text-xs text-panel-muted">{a.acked_by ?? 'user'}{a.acked_at ? ` · ${hhmmss(a.acked_at)}` : ''}</span>
                    : <Btn small disabled={busy === a.key} onClick={() => ack(a.key)} aria-label={`Acknowledge alarm ${a.object}: ${a.message}`}>{busy === a.key ? 'Acknowledging...' : 'Ack'}</Btn>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </>
  );
};

const SENSOR_TONE: Record<HwSensor['status'], Tone> = { ONLINE: 'ok', LOW_BATTERY: 'warn', STALE: 'idle' };
const SENSOR_TEXT: Record<HwSensor['status'], string> = { ONLINE: 'Online', LOW_BATTERY: 'Low battery', STALE: 'Stale' };

export interface SensorRow { room: string; spaceId: number; sensor: HwSensor }

export const SensorTable: React.FC<{ rows: SensorRow[]; showRoom?: boolean }> = ({ rows, showRoom = true }) => (
  <table className="w-full text-[13px]">
    <thead>
      <tr>
        <th className={TH}>Sensor</th>
        <th className={TH}>Type</th>
        {showRoom && <th className={TH}>Room</th>}
        <th className={TH}>Reading</th>
        <th className={THR}>Battery</th>
        <th className={THR}>Last seen</th>
        <th className={TH}>Status</th>
      </tr>
    </thead>
    <tbody>
      {rows.map(({ room, spaceId, sensor: s }) => (
        <tr key={s.id} className="hover:bg-panel-ground">
          <td className={`${TD} num`}>{s.id}</td>
          <td className={TD}>{s.type === 'OCCUPANCY' ? 'PIR occupancy' : 'CT power meter'}</td>
          {showRoom && <td className={`${TD} num`}><Link to={`/tree/room/${spaceId}`} className="text-accent hover:underline">{room}</Link></td>}
          <td className={`${TD} num`}>{s.reading}{s.amps != null ? ` · ${s.amps.toFixed(1)} A` : ''}</td>
          <td className={TDR}>{s.battery_pct != null ? `${s.battery_pct}%` : '-'}</td>
          <td className={TDR}>{ago(s.last_seen_s)} ago</td>
          <td className={TD}><span className="inline-flex items-center gap-1.5"><Dot tone={SENSOR_TONE[s.status]} />{SENSOR_TEXT[s.status]}</span></td>
        </tr>
      ))}
    </tbody>
  </table>
);
