import React from 'react';
import { SettingsPanel } from '../components/settings/SettingsPanel';
import { Settings as SettingsIcon } from 'lucide-react';

export const Settings: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <SettingsIcon className="w-6 h-6 text-cyan-400" />
            <span>Building System Configuration & Parameters</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Global constants for electricity tariffs, carbon emission factors, HVAC load metrics, and simulator controls.
          </p>
        </div>
      </div>

      {/* Main Settings Panel */}
      <SettingsPanel />
    </div>
  );
};
