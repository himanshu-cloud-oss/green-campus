import React from 'react';
import { SettingsPanel } from '../components/settings/SettingsPanel';

export const Settings: React.FC = () => (
  <div className="p-4 space-y-4">
    <div>
      <h1 className="text-[17px] font-semibold">Settings</h1>
      <p className="text-xs text-panel-muted max-w-xl">
        Constants stored in the backend. Only the first group changes anything today; edits are saved one key at a time and recorded in the change log.
      </p>
    </div>
    <SettingsPanel />
  </div>
);
