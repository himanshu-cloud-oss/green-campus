import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { Overview } from './pages/Overview';
import { ClassroomMonitoring } from './pages/ClassroomMonitoring';
import { ExtraClassBooking } from './pages/ExtraClassBooking';
import { Timetable } from './pages/Timetable';
import { FloorMaps } from './pages/FloorMaps';
import { AlertsEvents } from './pages/AlertsEvents';
import { SavingsCalculator } from './pages/SavingsCalculator';
import { Reports } from './pages/Reports';
import { Settings } from './pages/Settings';

export const App: React.FC = () => (
  <Router>
    <Layout>
      <Routes>
        <Route path="/" element={<Overview />} />
        <Route path="/classrooms" element={<ClassroomMonitoring />} />
        <Route path="/book" element={<ExtraClassBooking />} />
        <Route path="/timetable" element={<Timetable />} />
        <Route path="/floors" element={<FloorMaps />} />
        <Route path="/savings" element={<SavingsCalculator />} />
        <Route path="/alerts" element={<AlertsEvents />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  </Router>
);

export default App;
