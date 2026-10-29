import React, { useState } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { useSettings } from '../../hooks/useSettings';
import { RotateCcw, Save, CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react';

export const SettingsPanel: React.FC = () => {
  const {
    settings,
    isLoading,
    isSaving,
    error,
    successMessage,
    updateSettingValue,
    saveSettings,
    resetToDefaults,
  } = useSettings();

  const [confirmReset, setConfirmReset] = useState<boolean>(false);

  // Group settings by category
  const categories = [
    { id: 'tariffs', title: 'Energy Tariffs & Utility Rates' },
    { id: 'emissions', title: 'Carbon & Emission Factors' },
    { id: 'loads', title: 'Classroom Device Connected Loads' },
    { id: 'system', title: 'Automation & Cutoff Rules' },
    { id: 'demo', title: 'Simulator & Demonstration Controls' },
  ];

  const getSettingsByCategory = (category: string) => {
    return settings.filter(s => s.category === category || (!s.category && category === 'system'));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveSettings();
  };

  const handleReset = async () => {
    await resetToDefaults();
    setConfirmReset(false);
  };

  if (isLoading && settings.length === 0) {
    return (
      <Card>
        <div className="text-center py-8 text-slate-400">Loading system parameters...</div>
      </Card>
    );
  }

  return (
    <form onSubmit={handleSave} className="space-y-6">
      {/* Top Banner & Status Messages */}
      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-sm flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span className="font-semibold">{successMessage}</span>
          </div>
          <span className="text-xs text-emerald-400 font-mono">Synced to BMS Database</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-sm flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Categories */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {categories.map(cat => {
          const items = getSettingsByCategory(cat.id);
          if (items.length === 0) return null;

          return (
            <Card key={cat.id} className="space-y-4">
              <h3 className="text-sm font-bold text-white border-b border-slate-800 pb-2.5 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-cyan-400" />
                <span>{cat.title}</span>
              </h3>

              <div className="space-y-3.5">
                {items.map(setting => (
                  <div key={setting.key} className="space-y-1">
                    <label
                      htmlFor={setting.key}
                      className="block text-xs font-semibold text-slate-300 flex items-center justify-between"
                    >
                      <span>{setting.description}</span>
                      <span className="text-[10px] font-mono text-slate-400">{setting.key}</span>
                    </label>

                    {setting.key === 'demo_mode' ? (
                      <select
                        id={setting.key}
                        value={setting.value}
                        onChange={e => updateSettingValue(setting.key, e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100 font-medium focus:outline-none focus:border-cyan-500"
                      >
                        <option value="true">Enabled (Simulate Sensor Telemetry)</option>
                        <option value="false">Disabled (Strict Production Mode)</option>
                      </select>
                    ) : (
                      <input
                        id={setting.key}
                        type="text"
                        value={setting.value}
                        onChange={e => updateSettingValue(setting.key, e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100 font-mono focus:outline-none focus:border-cyan-500"
                      />
                    )}
                  </div>
                ))}
              </div>
            </Card>
          );
        })}
      </div>

      {/* Action Bar */}
      <Card className="flex flex-wrap items-center justify-between gap-4 bg-slate-900/90">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Changes take immediate effect across automation triggers and calculation engines.</span>
        </div>

        <div className="flex items-center gap-3">
          {confirmReset ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-amber-300">Reset to factory defaults?</span>
              <Button
                type="button"
                variant="danger"
                size="xs"
                onClick={handleReset}
                isLoading={isSaving}
              >
                Yes, Reset
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="xs"
                onClick={() => setConfirmReset(false)}
              >
                Cancel
              </Button>
            </div>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setConfirmReset(true)}
              icon={<RotateCcw className="w-4 h-4" />}
            >
              Reset to Defaults
            </Button>
          )}

          <Button
            type="submit"
            variant="primary"
            size="sm"
            isLoading={isSaving}
            icon={<Save className="w-4 h-4" />}
          >
            Save All Changes
          </Button>
        </div>
      </Card>
    </form>
  );
};
