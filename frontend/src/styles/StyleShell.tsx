import React from 'react';
import { Route, Routes, Navigate } from 'react-router-dom';
import { Layout } from '../components/layout/Layout';
import { ThemeProvider } from '../components/layout/ThemeProvider';
import { StyleProvider } from './StyleContext';
import { getStyle, StyleId } from './registry';
import { Overview } from '../pages/Overview';
import { ClassroomMonitoring } from '../pages/ClassroomMonitoring';
import { ExtraClassBooking } from '../pages/ExtraClassBooking';
import { Timetable } from '../pages/Timetable';
import { FloorMaps } from '../pages/FloorMaps';
import { AlertsEvents } from '../pages/AlertsEvents';
import { SavingsCalculator } from '../pages/SavingsCalculator';
import { Reports } from '../pages/Reports';
import { Settings } from '../pages/Settings';

/** The shared rail + top bar + pages console, themed per style. Mounted at `<base>/*`. */
export const StyleShell: React.FC<{ id: StyleId }> = ({ id }) => (
  <StyleProvider id={id}>
    <ThemeProvider lockedTheme={getStyle(id).theme}>
      <Layout>
        <Routes>
          <Route index element={<Overview />} />
          <Route path="classrooms" element={<ClassroomMonitoring />} />
          <Route path="book" element={<ExtraClassBooking />} />
          <Route path="timetable" element={<Timetable />} />
          <Route path="floors" element={<FloorMaps />} />
          <Route path="savings" element={<SavingsCalculator />} />
          <Route path="alerts" element={<AlertsEvents />} />
          <Route path="reports" element={<Reports />} />
          <Route path="settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="." replace />} />
        </Routes>
      </Layout>
    </ThemeProvider>
  </StyleProvider>
);
