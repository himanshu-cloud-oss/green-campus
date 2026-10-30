import React from 'react';
import { ReportPage } from '../components/reports/ReportPage';

export const Reports: React.FC = () => (
  <div className="p-4 space-y-4">
    <div>
      <h1 className="text-[17px] font-semibold">Reports</h1>
      <p className="text-xs text-panel-muted max-w-xl">
        Records to export. Each report says whether its numbers are real (bills, bookings, the change log) or simulated (floor energy).
      </p>
    </div>
    <ReportPage />
  </div>
);
