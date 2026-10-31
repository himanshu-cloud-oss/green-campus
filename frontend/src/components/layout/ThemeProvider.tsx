import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { applyTheme, initialTheme, PALETTES, saveTheme, ThemeContext, ThemeName } from '../../theme';
import { useStyle } from '../../styles/StyleContext';

interface Props {
  children: React.ReactNode;
  /** Fix the theme; the light/dark switch is hidden. */
  lockedTheme?: ThemeName;
  /** localStorage key for the chosen theme. Default: gc-theme-<styleId>. */
  storageKey?: string;
}

export const ThemeProvider: React.FC<Props> = ({ children, lockedTheme, storageKey }) => {
  const { id } = useStyle();
  const key = storageKey ?? `gc-theme-${id}`;
  const [name, setName] = useState<ThemeName>(() => lockedTheme ?? initialTheme(key));

  // Apply on mount (and if the lock changes); each style owns the theme while mounted.
  useEffect(() => {
    applyTheme(lockedTheme ?? name);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lockedTheme]);

  const toggle = useCallback(() => {
    if (lockedTheme) return;
    setName(prev => {
      const next: ThemeName = prev === 'light' ? 'dark' : 'light';
      applyTheme(next);
      saveTheme(next, key);
      return next;
    });
  }, [lockedTheme, key]);

  const active = lockedTheme ?? name;
  const value = useMemo(() => ({ name: active, p: PALETTES[active], toggle, locked: !!lockedTheme }), [active, toggle, lockedTheme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};
