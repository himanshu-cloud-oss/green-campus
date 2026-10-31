import React, { createContext, useCallback, useContext, useMemo } from 'react';
import type { StyleId } from './registry';
import { getStyle } from './registry';

export interface StyleState { id: StyleId; base: string }

const StyleContext = createContext<StyleState>({ id: 'console', base: '/console' });

export const StyleProvider: React.FC<{ id: StyleId; children: React.ReactNode }> = ({ id, children }) => {
  const value = useMemo(() => ({ id, base: getStyle(id).base }), [id]);
  return <StyleContext.Provider value={value}>{children}</StyleContext.Provider>;
};

export const useStyle = () => useContext(StyleContext);

/** p('/book') -> '/console/book'; p('/') -> '/console'; p('/?room=X') -> '/console?room=X'. */
export const usePaths = () => {
  const { base } = useStyle();
  return useCallback((path: string) => {
    if (path === '/' || path === '') return base;
    if (path.startsWith('/?')) return `${base}${path.slice(1)}`;
    return `${base}${path.startsWith('/') ? path : `/${path}`}`;
  }, [base]);
};
