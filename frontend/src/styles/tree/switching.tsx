import React, { useCallback, useRef, useState } from 'react';
import type { AxiosError } from 'axios';
import { hw, HwTask, OnOff } from '../../services/hw';
import { errorMessage } from '../../services/pilot';
import { useTree } from './data';
import { Btn, Dot } from './ui';

export interface SwitchGroup {
  spaceId: number;
  room: string;
  /** Channels with a label; omit to address every channel of the room. */
  items?: { ch: string; load: string }[];
}

interface Outcome { group: SwitchGroup; task?: HwTask; blocked?: string; error?: string }
type Phase = 'idle' | 'confirm' | 'running' | 'done';

const describe = (g: SwitchGroup) =>
  g.items ? `${g.room} ${g.items.map(i => i.ch).join(', ')}` : `${g.room} (all channels)`;

/**
 * Inline confirm-then-execute flow for relay commands. Render `bar` where the confirmation should appear;
 * call `request(state, groups)` from any button. Interlock refusals (409) offer a forced retry.
 */
export function useSwitcher() {
  const { refresh } = useTree();
  const [phase, setPhase] = useState<Phase>('idle');
  const [state, setState] = useState<OnOff>('OFF');
  const [groups, setGroups] = useState<SwitchGroup[]>([]);
  const [outcomes, setOutcomes] = useState<Outcome[]>([]);
  const running = useRef(false);

  const request = useCallback((s: OnOff, g: SwitchGroup[]) => {
    if (g.length === 0) return;
    setState(s); setGroups(g); setOutcomes([]); setPhase('confirm');
  }, []);

  const run = useCallback(async (targets: SwitchGroup[], force: boolean, keep: Outcome[]) => {
    if (running.current) return;
    running.current = true;
    setPhase('running');
    const res: Outcome[] = [...keep];
    for (const g of targets) {
      try {
        const task = await hw.switch(g.spaceId, state, g.items?.map(i => i.ch), force);
        res.push({ group: g, task });
      } catch (e) {
        const ax = e as AxiosError<{ detail?: string }>;
        if (ax.response?.status === 409) {
          res.push({ group: g, blocked: typeof ax.response.data?.detail === 'string' ? ax.response.data.detail : 'Interlock active' });
        } else {
          res.push({ group: g, error: errorMessage(e) });
        }
      }
    }
    running.current = false;
    setOutcomes(res);
    setPhase('done');
    refresh();
  }, [state, refresh]);

  const cancel = useCallback(() => { setPhase('idle'); setOutcomes([]); }, []);

  let bar: React.ReactNode = null;
  if (phase !== 'idle') {
    const blocked = outcomes.filter(o => o.blocked);
    const chCount = groups.reduce((n, g) => n + (g.items?.length ?? 0), 0);
    bar = (
      <div role="alertdialog" aria-live="polite" aria-label="Confirm relay command" className="mx-4 mt-2 border border-accent bg-panel-raised rounded-[4px] text-[13px]">
        {phase === 'confirm' && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-3 py-2">
            <span>
              Switch <b className="num">{state}</b>{' '}
              {groups.length === 1 ? <>in <b className="num">{groups[0].room}</b>: </> : <>{groups.length} rooms{chCount ? `, ${chCount} channels` : ''}: </>}
              <span className="num">{groups.map(describe).join(' · ')}</span>
              {groups.length === 1 && groups[0].items && <span className="text-panel-muted"> ({groups[0].items.map(i => i.load).join(', ')})</span>}
              ?
            </span>
            <span className="ml-auto flex gap-2">
              <Btn small kind="primary" onClick={() => run(groups, false, [])}>Confirm</Btn>
              <Btn small onClick={cancel}>Cancel</Btn>
            </span>
          </div>
        )}
        {phase === 'running' && <div className="px-3 py-2 text-panel-muted" role="status">Sending command...</div>}
        {phase === 'done' && (
          <div className="px-3 py-2 space-y-1">
            {outcomes.map(o => (
              <div key={o.group.room} className="flex items-center gap-2">
                <Dot tone={o.task ? (o.task.status === 'OK' ? 'ok' : 'warn') : o.blocked ? 'warn' : 'bad'} />
                <span className="num font-semibold">{o.group.room}</span>
                <span>
                  {o.task ? `${o.task.status} · ${o.task.result}` : o.blocked ? `Blocked: ${o.blocked}` : `Failed: ${o.error}`}
                </span>
              </div>
            ))}
            <div className="flex gap-2 pt-1">
              {blocked.length > 0 && (
                <Btn small onClick={() => run(blocked.map(o => o.group), true, outcomes.filter(o => !o.blocked))}>Override interlock</Btn>
              )}
              <Btn small onClick={cancel}>Dismiss</Btn>
            </div>
          </div>
        )}
      </div>
    );
  }
  return { request, bar, busy: phase === 'running' || phase === 'confirm' };
}
