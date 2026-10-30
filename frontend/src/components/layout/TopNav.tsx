import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Search } from 'lucide-react';
import { useLiveClock } from '../../hooks/useLiveClock';
import { apiClient } from '../../services/api';
import { NAV_ITEMS } from './navItems';

export const TopNav: React.FC<{ onOpenPalette: () => void }> = ({ onOpenPalette }) => {
  const clock = useLiveClock();
  const { pathname } = useLocation();
  const [online, setOnline] = useState<boolean | null>(null);

  useEffect(() => {
    let alive = true;
    const check = () =>
      apiClient
        .get('/api/health', { timeout: 4000 })
        .then(() => alive && setOnline(true))
        .catch(() => alive && setOnline(false));
    check();
    const id = setInterval(check, 30000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  const page = NAV_ITEMS.find(n => (n.to === '/' ? pathname === '/' : pathname.startsWith(n.to)));

  return (
    <header className="h-10 border-b border-panel-seam flex items-center gap-4 px-4 bg-panel-ground sticky top-0 z-20">
      <div className="flex items-baseline gap-2 min-w-0">
        <span className="hidden md:inline text-[13px] font-semibold text-panel-ink whitespace-nowrap">Green Campus AI</span>
        <span className="hidden md:inline text-panel-muted">/</span>
        <span className="text-[13px] text-panel-muted truncate">{page?.name ?? ''}</span>
      </div>

      <button
        onClick={onOpenPalette}
        aria-label="Open command palette"
        className="ml-auto flex items-center gap-2 h-7 px-2.5 md:w-64 max-w-[40vw] border border-panel-seam rounded-[3px] text-xs text-panel-muted hover:border-panel-wire snap"
      >
        <Search className="w-3.5 h-3.5" strokeWidth={1.6} />
        <span className="hidden md:inline truncate">Jump to room, page or action</span>
        <kbd className="hidden md:inline ml-auto whitespace-nowrap num text-2xs text-panel-muted border border-panel-seam px-1 rounded-[2px]">Ctrl K</kbd>
      </button>

      <span className="hidden md:inline text-2xs font-semibold uppercase text-panel-muted border border-panel-wire px-1.5 py-0.5 rounded-[2px]">
        Simulated
      </span>

      <span className="flex items-center gap-1.5 text-xs text-panel-muted" title="Backend connection">
        <span
          className={`w-2 h-2 rounded-full ${
            online === null ? 'bg-panel-wire' : online ? 'bg-panel-ink' : 'bg-lamp-on'
          }`}
        />
        <span className="hidden sm:inline">{online === false ? 'Backend offline' : 'Backend'}</span>
      </span>

      <span className="num text-xs text-panel-ink whitespace-nowrap">
        <span className="hidden sm:inline">{clock.weekdayShort} </span>{clock.time}
      </span>
    </header>
  );
};
