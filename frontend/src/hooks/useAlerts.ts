import { useState, useEffect, useCallback, useMemo } from 'react';
import { Alert } from '../types';
import { api } from '../services/api';
import { errorMessage } from '../services/pilot';

export function useAlerts() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAlerts = useCallback(async () => {
    try {
      setAlerts(await api.getAlerts());
      setError(null);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAlerts();
    const id = setInterval(fetchAlerts, 15000);
    return () => clearInterval(id);
  }, [fetchAlerts]);

  const unreadCount = useMemo(() => alerts.filter(a => a.severity !== 'RESOLVED' && !a.acknowledged_at).length, [alerts]);
  const openCount = useMemo(() => alerts.filter(a => a.severity !== 'RESOLVED').length, [alerts]);

  const run = async (fn: () => Promise<unknown>) => {
    try {
      await fn();
      await fetchAlerts();
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  return {
    alerts,
    unreadCount,
    openCount,
    isLoading,
    error,
    acknowledgeAlert: (id: number) => run(() => api.acknowledgeAlert(id)),
    resolveAlert: (id: number) => run(() => api.resolveAlert(id)),
    deleteAlert: (id: number) => run(() => api.deleteAlert(id)),
    refetch: fetchAlerts,
  };
}
