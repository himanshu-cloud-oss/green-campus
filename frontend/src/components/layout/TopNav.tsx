import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Moon, Search, Sun } from 'lucide-react';
import { useTheme } from '../../theme';
import { useLiveClock } from '../../hooks/useLiveClock';
import { apiClient } from '../../services/api';
import { NAV_ITEMS } from './navItems';

export const TopNav: React.FC<{ onOpenPalette: () => void }> = ({ onOpenPalette }) => {
  const clock = useLiveClock();
  const { pathname } = useLocation();
  const [online, setOnline] = useState<boolean | null>(null);
  const { name, toggle } = useTheme();

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
    <header className="h-10 border-b border-black/10 flex items-center gap-4 px-4 bg-chrome text-chrome-ink sticky top-0 z-20">
      <div className="flex items-baseline gap-2 min-w-0">
        <span className="hidden md:inline text-[13px] font-semibold whitespace-nowrap">Green Campus AI</span>
        <span className="hidden md:inline opacity-50">/</span>
        <span className="text-[13px] opacity-75 truncate">{page?.name ?? ''}</span>
      </div>

      <button
        onClick={onOpenPalette}
        aria-label="Open command palette"
        className="ml-auto flex items-center gap-2 h-7 px-2.5 md:w-64 max-w-[40vw] border border-chrome-ink/25 rounded-[3px] text-xs text-chrome-ink/75 hover:border-chrome-ink/50 snap"
      >
        <Search className="w-3.5 h-3.5" strokeWidth={1.6} />
        <span className="hidden md:inline truncate">Jump to room, page or action</span>
        <kbd className="hidden md:inline ml-auto whitespace-nowrap num text-2xs opacity-70 border border-chrome-ink/25 px-1 rounded-[2px]">Ctrl K</kbd>
      </button>

      <span className="hidden md:inline text-2xs font-semibold uppercase opacity-80 border border-chrome-ink/30 px-1.5 py-0.5 rounded-[2px]">
        Simulated
      </span>

      <span className="flex items-center gap-1.5 text-xs opacity-80" title="Backend connection">
        <span
          className={`w-2 h-2 rounded-full ${
            online === null ? 'bg-chrome-ink/30' : online ? 'bg-chrome-ink' : 'bg-lamp-on'
          }`}
        />
        <span className="hidden sm:inline">{online === false ? 'Backend offline' : 'Backend'}</span>
      </span>

      <div role="group" aria-label="Colour theme" className="flex rounded-[3px] border border-chrome-ink/25 overflow-hidden text-xs">
        {(['light', 'dark'] as const).map(m => (
          <button
            key={m}
            onClick={() => name !== m && toggle()}
            aria-pressed={name === m}
            title={m === 'light' ? 'Light theme' : 'Dark theme'}
            className={`flex items-center gap-1 px-2 h-7 snap ${name === m ? 'bg-chrome-ink/20 font-semibold' : 'opacity-70 hover:opacity-100'}`}
          >
            {m === 'light' ? <Sun className="w-3.5 h-3.5" strokeWidth={1.8} /> : <Moon className="w-3.5 h-3.5" strokeWidth={1.8} />}
            <span className="hidden lg:inline">{m === 'light' ? 'Light' : 'Dark'}</span>
          </button>
        ))}
      </div>

      <span className="num text-xs whitespace-nowrap">
        <span className="hidden sm:inline">{clock.weekdayShort} </span>{clock.time}
      </span>
    </header>
  );
};
