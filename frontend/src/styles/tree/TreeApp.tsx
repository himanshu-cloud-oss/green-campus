import React, { useEffect, useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { ThemeProvider } from '../../components/layout/ThemeProvider';
import { CommandPalette } from '../../components/layout/CommandPalette';
import { StyleProvider } from '../StyleContext';
import { ExtraClassBooking } from '../../pages/ExtraClassBooking';
import { Timetable } from '../../pages/Timetable';
import { FloorMaps } from '../../pages/FloorMaps';
import { AlertsEvents } from '../../pages/AlertsEvents';
import { SavingsCalculator } from '../../pages/SavingsCalculator';
import { Reports } from '../../pages/Reports';
import { Settings } from '../../pages/Settings';
import { ClassroomMonitoring } from '../../pages/ClassroomMonitoring';
import { TreeData, useTree } from './data';
import { TopBar } from './TopBar';
import { ResourceTree } from './ResourceTree';
import { Dock } from './Dock';
import { BuildingView } from './BuildingView';
import { FloorView } from './FloorView';
import { RoomView } from './RoomView';
import { GatewayView } from './GatewayView';

const Shell: React.FC = () => {
  const { offline } = useTree();
  const [palette, setPalette] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setPalette(true); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="fixed inset-0 flex flex-col bg-panel-ground text-panel-ink text-[13px] overflow-hidden">
      <TopBar onSearch={() => setPalette(true)} />
      <div className="flex-1 min-h-0 flex overflow-hidden">
        <ResourceTree />
        <main className="flex-1 min-w-0 min-h-0 overflow-y-auto" aria-label="Object view">
          {offline && (
            <div role="alert" className="mx-4 mt-3 px-3 py-2 border border-waste rounded-[4px] bg-waste-field text-[13px]">
              <b>Backend offline</b> — start uvicorn in backend/. Live data will appear when it responds.
            </div>
          )}
          <Routes>
            <Route index element={<BuildingView />} />
            <Route path="floor/:floorId/:tab?" element={<FloorView />} />
            <Route path="room/:spaceId/:tab?" element={<RoomView />} />
            <Route path="gateway/:floorId" element={<GatewayView />} />
            <Route path="book" element={<ExtraClassBooking />} />
            <Route path="timetable" element={<Timetable />} />
            <Route path="savings" element={<SavingsCalculator />} />
            <Route path="floors" element={<FloorMaps />} />
            <Route path="alerts" element={<AlertsEvents />} />
            <Route path="reports" element={<Reports />} />
            <Route path="settings" element={<Settings />} />
            <Route path="classrooms" element={<ClassroomMonitoring />} />
            <Route path="*" element={<Navigate to="/tree" replace />} />
          </Routes>
        </main>
      </div>
      <Dock />
      <CommandPalette open={palette} onClose={() => setPalette(false)} />
    </div>
  );
};

export const TreeApp: React.FC = () => (
  <StyleProvider id="tree">
    <ThemeProvider lockedTheme="tree">
      <TreeData>
        <Shell />
      </TreeData>
    </ThemeProvider>
  </StyleProvider>
);

export default TreeApp;
