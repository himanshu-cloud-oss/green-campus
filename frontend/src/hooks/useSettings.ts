import { useState, useEffect, useCallback } from 'react';
import { Setting } from '../types';
import { api } from '../services/api';

export function useSettings() {
  const [settings, setSettings] = useState<Setting[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fetchSettings = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await api.getSettings();
      setSettings(data);
      setError(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load settings';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const updateSettingValue = (key: string, value: string) => {
    setSettings(prev =>
      prev.map(s => (s.key === key ? { ...s, value } : s))
    );
  };

  const saveSettings = async (customSettings?: Setting[]) => {
    setIsSaving(true);
    try {
      const toSave = customSettings || settings;
      const updated = await api.updateSettings(toSave);
      setSettings(updated);
      setSuccessMessage('Settings updated successfully');
      setTimeout(() => setSuccessMessage(null), 3500);
      return updated;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save settings';
      setError(msg);
      throw err;
    } finally {
      setIsSaving(false);
    }
  };

  const resetToDefaults = async () => {
    setIsSaving(true);
    try {
      const reset = await api.resetSettings();
      setSettings(reset);
      setSuccessMessage('Settings reset to system defaults');
      setTimeout(() => setSuccessMessage(null), 3500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to reset settings';
      setError(msg);
    } finally {
      setIsSaving(false);
    }
  };

  return {
    settings,
    isLoading,
    isSaving,
    error,
    successMessage,
    updateSettingValue,
    saveSettings,
    resetToDefaults,
    refetch: fetchSettings,
  };
}
