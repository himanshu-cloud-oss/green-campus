import React from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { useTree } from './data';
import { Dot, Empty, ErrorNote, Loading, ObjectHeader, Panel, TD, TDR, TH, THR } from './ui';

export const BuildingView: React.FC = () => {
  const { building, pilotFloor, overview: o, errors, loading, spaces, gatewayTone } = useTree();
  const [params] = useSearchParams();

  // The shared command palette links to "?room=CODE".
  const code = params.get('room');
  const target = code ? spaces.find(s => s.code === code) : undefined;
  if (target) return <Navigate to={`/tree/room/${target.id}`} replace />;

  const floors = building ? [...building.floors].sort((a, b) => b.level - a.level) : [];
  const totalKw = floors.reduce((n, f) => n + f.connected_kw, 0);
  const totalSpaces = floors.reduce((n, f) => n + f.spaces_count, 0);

  return (
    <div>
      <ObjectHeader
        title={building?.name ?? 'Building'}
        crumbs="Campus"
        status={building ? (
          <>
            <Dot tone={pilotFloor ? gatewayTone : 'idle'} />
            <span>{floors.length} floors · {floors.filter(f => f.is_pilot).length} instrumented{o ? ` · ${o.alarms.open} open alarms` : ''}</span>
          </>
        ) : undefined}
      />
      <div className="p-4">
        <Panel title="Floors" flush>
          {errors.inventory && !building ? <ErrorNote message={`Building data unavailable: ${errors.inventory}`} />
            : loading && !building ? <Loading what="building" />
            : !building ? <Empty>No building is configured.</Empty>
            : floors.length === 0 ? <Empty>This building has no floors yet.</Empty>
            : (
              <table className="w-full text-[13px]">
                <thead>
                  <tr>
                    <th className={TH}>Floor</th><th className={THR}>Level</th><th className={THR}>Spaces</th>
                    <th className={THR}>Connected kW</th><th className={TH}>Instrumented</th><th className={THR}>Live load</th>
                  </tr>
                </thead>
                <tbody>
                  {floors.map(f => {
                    const live = f.is_pilot && pilotFloor?.id === f.id;
                    return (
                      <tr key={f.id} className="hover:bg-panel-ground">
                        <td className={TD}><Link className="text-accent hover:underline font-semibold" to={`/tree/floor/${f.id}`}>{f.name}</Link>{f.is_pilot && <span className="text-xs text-panel-muted"> (pilot)</span>}</td>
                        <td className={TDR}>{f.level}</td>
                        <td className={TDR}>{f.spaces_count}</td>
                        <td className={TDR}>{f.connected_kw.toFixed(1)}</td>
                        <td className={TD}>{live ? 'Yes' : 'No'}</td>
                        <td className={TDR}>{live && o ? `${o.load_kw.toFixed(2)} kW` : '-'}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-panel-ground font-semibold">
                    <td className={TD}>Total</td><td className={TD} /><td className={TDR}>{totalSpaces}</td><td className={TDR}>{totalKw.toFixed(1)}</td><td className={TD} /><td className={TDR}>{o ? `${o.load_kw.toFixed(2)} kW` : '-'}</td>
                  </tr>
                </tfoot>
              </table>
            )}
        </Panel>
      </div>
    </div>
  );
};
