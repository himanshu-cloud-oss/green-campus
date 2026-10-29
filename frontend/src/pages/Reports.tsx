import React from 'react';
import { ReportPage } from '../components/reports/ReportPage';
import { FileBarChart, Printer } from 'lucide-react';
import { Button } from '../components/ui/Button';

export const Reports: React.FC = () => {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <FileBarChart className="w-6 h-6 text-cyan-400" />
            <span>Reports, Compliance & Data Export</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Comprehensive compliance reporting, audit trail verification, and multi-format CSV data export for institutional audits.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={handlePrint}
            icon={<Printer className="w-3.5 h-3.5" />}
          >
            Print Executive Summary
          </Button>
        </div>
      </div>

      {/* Main Report Page Component */}
      <ReportPage />
    </div>
  );
};
