import React, { useCallback, useMemo, useState } from 'react';
import { applyTheme, initialTheme, PALETTES, saveTheme, ThemeContext, ThemeName } from '../../theme';

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [name, setName] = useState<ThemeName>(initialTheme);
  const toggle = useCallback(() => {
    setName(prev => {
      const next: ThemeName = prev === 'light' ? 'dark' : 'light';
      applyTheme(next);
      saveTheme(next);
      return next;
    });
  }, []);
  const value = useMemo(() => ({ name, p: PALETTES[name], toggle }), [name, toggle]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};
