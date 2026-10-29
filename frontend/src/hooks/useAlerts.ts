import { useState, useEffect, useCallback, useMemo } from 'react';
import { Alert } from '../types';
import { api } from '../services/api';

export function useAlerts(filterSeverity?: string) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAlerts = useCallback(async (isSilent: boolean = false) => {
    if (!isSilent) setIsLoading(true);
    try {
      const data = await api.getAlerts({ severity: filterSeverity });
      setAlerts(data);
      setError(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch alerts';
      setError(msg);
    } finally {
      if (!isSilent) setIsLoading(false);
    }
  }, [filterSeverity]);

  useEffect(() => {
    fetchAlerts(false);
    const interval = setInterval(() => {
      fetchAlerts(true);
    }, 15000);

    return () => clearInterval(interval);
  }, [fetchAlerts]);

  const unreadCount = useMemo(() => {
    return alerts.filter(a => a.severity !== 'RESOLVED' && !a.acknowledged_at).length;
  }, [alerts]);

  const activeAlertsCount = useMemo(() => {
    return alerts.filter(a => a.severity !== 'RESOLVED').length;
  }, [alerts]);

  const acknowledgeAlert = async (id: number) => {
    try {
      const updated = await api.acknowledgeAlert(id);
      setAlerts(prev => prev.map(a => (a.id === id ? updated : a)));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to acknowledge alert';
      setError(msg);
    }
  };

  const resolveAlert = async (id: number) => {
    try {
      const updated = await api.resolveAlert(id);
      setAlerts(prev => prev.map(a => (a.id === id ? updated : a)));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to resolve alert';
      setError(msg);
    }
  };

  const deleteAlert = async (id: number) => {
    try {
      await api.deleteAlert(id);
      setAlerts(prev => prev.filter(a => a.id !== id));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete alert';
      setError(msg);
    }
  };

  const clearResolved = async () => {
    try {
      await api.clearResolvedAlerts();
      setAlerts(prev => prev.filter(a => a.severity !== 'RESOLVED'));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to clear resolved alerts';
      setError(msg);
    }
  };

  return {
    alerts,
    unreadCount,
    activeAlertsCount,
    isLoading,
    error,
    acknowledgeAlert,
    resolveAlert,
    deleteAlert,
    clearResolved,
    refetch: () => fetchAlerts(false),
  };
}
