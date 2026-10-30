import { useState, useEffect, useCallback, useMemo } from 'react';
import { Setting } from '../types';
import { api } from '../services/api';
import { errorMessage } from '../services/pilot';

/** Settings with local edits; save() writes only the keys that changed. */
export function useSettings() {
  const [saved, setSaved] = useState<Setting[]>([]);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const fetchSettings = useCallback(async () => {
    try {
      setSaved(await api.getSettings());
      setError(null);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const changed = useMemo(
    () => saved.filter(s => draft[s.key] !== undefined && draft[s.key] !== s.value),
    [saved, draft]
  );

  const save = async () => {
    setIsSaving(true);
    setError(null);
    try {
      const updated = await Promise.all(changed.map(s => api.updateSetting(s.key, draft[s.key].trim())));
      setSaved(prev => prev.map(s => updated.find(u => u.key === s.key) ?? s));
      setDraft({});
      setSavedAt(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false }));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setIsSaving(false);
    }
  };

  return {
    settings: saved,
    valueOf: (key: string) => draft[key] ?? saved.find(s => s.key === key)?.value ?? '',
    edit: (key: string, value: string) => setDraft(d => ({ ...d, [key]: value })),
    discard: () => setDraft({}),
    changed,
    isLoading,
    isSaving,
    error,
    savedAt,
    save,
  };
}
