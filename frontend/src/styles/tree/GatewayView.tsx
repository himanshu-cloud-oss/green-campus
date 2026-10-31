import React from 'react';
import { ago } from '../../services/hw';
import { errorMessage } from '../../services/pilot';
import { useTree } from './data';
import { useFloorSpaces } from './FloorView';
import { SensorTable } from './tables';
import { Dot, Empty, ErrorNote, KV, Loading, ObjectHeader, Panel } from './ui';

export const GatewayView: React.FC = () => {
  const { overview: o, gatewayTone, building, pilotFloor, errors } = useTree();
  const spaces = useFloorSpaces();
  const rows = (spaces.data ?? []).flatMap(s => s.sensors.map(sensor => ({ room: s.space.code, spaceId: s.space.id, sensor })));
  const banks = (spaces.data ?? []).filter(s => s.relay_bank.channels.length > 0).length;
  const channelCount = (spaces.data ?? []).reduce((n, s) => n + s.relay_bank.channels.length, 0);

  return (
    <div>
      <ObjectHeader
        crumbs={building ? `${building.name} / ${pilotFloor?.name ?? 'Floor'}` : undefined}
        title={<>Gateway <span className="num">{o?.gateway.id ?? ''}</span></>}
        status={o ? <><Dot tone={gatewayTone} /><span>{o.gateway.status.toLowerCase()} · last seen <span className="num">{ago(o.gateway.last_seen_s)}</span> ago · simulated</span></> : undefined}
      />
      <div className="p-4 space-y-4">
        {errors.overview && !o ? <ErrorNote message={`Gateway status unavailable: ${errors.overview}`} /> : !o ? <Loading what="gateway" /> : (
          <Panel title="Status" flush>
            <KV rows={[
              ['Gateway ID', <span className="num">{o.gateway.id}</span>],
              ['State', <span className="inline-flex items-center gap-1.5"><Dot tone={gatewayTone} />{o.gateway.status.toLowerCase()}</span>],
              ['Last seen', <span className="num">{ago(o.gateway.last_seen_s)} ago</span>],
              ['Sensors online', <span className="num">{o.sensors.online} of {o.sensors.total}</span>],
              ['Relay banks', <span className="num">{spaces.data ? `${banks} banks, ${channelCount} channels` : '-'}</span>],
              ['Relays confirmed', <span className="num">{o.relays.ok} of {o.relays.total}{o.relays.mismatch ? ` · ${o.relays.mismatch} mismatch` : ''}</span>],
              ['Power meters', <span className="num">{o.meters.ok} of {o.meters.total} reporting</span>],
            ]} />
          </Panel>
        )}
        <Panel title="Connected sensors" flush>
          {spaces.error && !spaces.data ? <ErrorNote message={`Sensor list unavailable: ${errorMessage(spaces.error)}`} />
            : !spaces.data ? <Loading what="sensors" />
            : rows.length === 0 ? <Empty>No sensors are connected to this gateway.</Empty>
            : <div className="overflow-x-auto"><SensorTable rows={rows} /></div>}
        </Panel>
      </div>
    </div>
  );
};
