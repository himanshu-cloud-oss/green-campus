import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CornerDownLeft } from 'lucide-react';
import { NAV_ITEMS } from './navItems';
import { usePaths } from '../../styles/StyleContext';
import { pilot, LiveSnapshot } from '../../services/pilot';

interface Command {
  id: string;
  label: string;
  hint: string;
  run: () => void | Promise<void>;
}

/** Ctrl+K: jump to any page or room, or trip a wasting feeder, from the keyboard. */
export const CommandPalette: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const navigate = useNavigate();
  const p = usePaths();
  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState(0);
  const [live, setLive] = useState<LiveSnapshot | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (open && !d.open) {
      d.showModal();
      setQuery('');
      setCursor(0);
      setDone(null);
      pilot.live().then(setLive).catch(() => setLive(null));
    } else if (!open && d.open) {
      d.close();
    }
  }, [open]);

  const commands = useMemo<Command[]>(() => {
    const go = (to: string) => () => {
      navigate(to);
      onClose();
    };
    const list: Command[] = NAV_ITEMS.map(n => ({ id: `nav-${n.to}`, label: n.name, hint: `Page · ${n.key}`, run: go(p(n.to)) }));
    for (const s of live?.spaces ?? []) {
      list.push({ id: `room-${s.code}`, label: `${s.code} · ${s.name}`, hint: 'Show on floor panel', run: go(p(`/?room=${s.code}`)) });
      if (s.waste_kw > 0 && !s.cut_armed) {
        list.push({
          id: `trip-${s.code}`,
          label: `Trip ${s.code}`,
          hint: `${s.waste_kw.toFixed(2)} kW into an empty room`,
          run: async () => {
            await pilot.cut(s.space_id);
            setDone(`${s.code} tripped`);
            window.dispatchEvent(new Event('gc:refresh'));
            setTimeout(onClose, 600);
          },
        });
      }
    }
    list.push({ id: 'book', label: 'Book an extra class', hint: 'Auto-pick room and slot', run: go(p('/book')) });
    return list;
  }, [live, navigate, onClose, p]);

  const q = query.trim().toLowerCase();
  const results = q ? commands.filter(c => `${c.label} ${c.hint}`.toLowerCase().includes(q)) : commands;
  const safeCursor = Math.min(cursor, Math.max(0, results.length - 1));

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setCursor(c => Math.min(c + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setCursor(c => Math.max(c - 1, 0));
    } else if (e.key === 'Enter' && results[safeCursor]) {
      e.preventDefault();
      results[safeCursor].run();
    }
  };

  return (
    <dialog
      ref={dialog}
      onClose={onClose}
      onClick={e => e.target === dialog.current && onClose()}
      className="backdrop:bg-black/60 bg-panel-raised text-panel-ink border border-panel-wire rounded p-0 w-[560px] max-w-[92vw] mt-[12vh] shadow-[0_24px_60px_-12px_rgba(0,0,0,0.7)]"
    >
      <input
        autoFocus
        value={query}
        onChange={e => {
          setQuery(e.target.value);
          setCursor(0);
        }}
        onKeyDown={onKey}
        placeholder="Type a room (LS-08), a page, or “trip”"
        aria-label="Command"
        className="w-full bg-transparent px-4 py-3 text-sm border-b border-panel-seam focus:outline-none"
      />
      <ul role="listbox" className="max-h-[50vh] overflow-y-auto py-1">
        {results.length === 0 && <li className="px-4 py-6 text-sm text-panel-muted">No match. Try a room code like LS-09.</li>}
        {results.map((c, i) => (
          <li
            key={c.id}
            role="option"
            aria-selected={i === safeCursor}
            onMouseEnter={() => setCursor(i)}
            onClick={() => c.run()}
            className={`flex items-center gap-3 px-4 py-2 cursor-pointer text-[13px] ${
              i === safeCursor ? 'bg-panel-seam' : ''
            } ${c.id.startsWith('trip-') ? 'text-waste' : ''}`}
          >
            <span className="flex-1 truncate">{c.label}</span>
            <span className="text-xs text-panel-muted truncate">{c.hint}</span>
            {i === safeCursor && <CornerDownLeft className="w-3.5 h-3.5 text-panel-muted" strokeWidth={1.6} />}
          </li>
        ))}
      </ul>
      {done && <div className="px-4 py-2 border-t border-panel-seam text-xs text-lamp-off">{done}</div>}
    </dialog>
  );
};
