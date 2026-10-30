import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopNav } from './TopNav';
import { CommandPalette } from './CommandPalette';
import { NAV_ITEMS } from './navItems';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const navigate = useNavigate();
  const closePalette = useCallback(() => setPaletteOpen(false), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen(true);
        return;
      }
      const t = e.target as HTMLElement;
      const typing = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable);
      if (typing || e.ctrlKey || e.metaKey || e.altKey) return;
      const item = NAV_ITEMS.find(n => n.key === e.key);
      if (item) navigate(item.to);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [navigate]);

  return (
    <div className="min-h-screen bg-panel-ground text-panel-ink">
      <Sidebar />
      <div className="pl-14 min-h-screen flex flex-col">
        <TopNav onOpenPalette={() => setPaletteOpen(true)} />
        <main className="flex-1 min-w-0">{children}</main>
      </div>
      <CommandPalette open={paletteOpen} onClose={closePalette} />
    </div>
  );
};
