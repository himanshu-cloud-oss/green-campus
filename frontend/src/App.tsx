import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Gallery } from './gallery/Gallery';
import { StyleShell } from './styles/StyleShell';
import { TreeApp } from './styles/tree/TreeApp';
import { SiteApp } from './styles/site/SiteApp';

const LEGACY = ['book', 'floors', 'savings', 'classrooms', 'timetable', 'alerts', 'reports', 'settings'];

export const App: React.FC = () => (
  <Router>
    <Routes>
      <Route path="/" element={<Gallery />} />
      <Route path="/night/*" element={<StyleShell id="night" />} />
      <Route path="/console/*" element={<StyleShell id="console" />} />
      <Route path="/tree/*" element={<TreeApp />} />
      <Route path="/site/*" element={<SiteApp />} />
      {LEGACY.map(r => (
        <Route key={r} path={`/${r}`} element={<Navigate to={`/console/${r}`} replace />} />
      ))}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  </Router>
);

export default App;
