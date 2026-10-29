import { useState, useEffect, useCallback } from 'react';
import { SimulationEvent } from '../types';
import { api } from '../services/api';
import { getSecondsRemaining } from '../utils/timeUtils';

export function useSimulations() {
  const [simulations, setSimulations] = useState<SimulationEvent[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSimulations = useCallback(async (isSilent: boolean = false) => {
    if (!isSilent) setIsLoading(true);
    try {
      const data = await api.getSimulations();
      // recalculate seconds remaining
      const updated = data.map(s => ({
        ...s,
        seconds_remaining: s.status === 'PENDING' ? getSecondsRemaining(s.scheduled_action_at) : 0,
      }));
      setSimulations(updated);
      setError(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch simulations';
      setError(msg);
    } finally {
      if (!isSilent) setIsLoading(false);
    }
  }, []);

  // Poll backend every 10 seconds
  useEffect(() => {
    fetchSimulations(false);
    const pollInterval = setInterval(() => {
      fetchSimulations(true);
    }, 10000);

    return () => clearInterval(pollInterval);
  }, [fetchSimulations]);

  // Live countdown update every 1 second locally
  useEffect(() => {
    const timer = setInterval(() => {
      setSimulations(prev =>
        prev.map(s => {
          if (s.status !== 'PENDING') return s;
          const remaining = getSecondsRemaining(s.scheduled_action_at);
          if (remaining <= 0 && s.status === 'PENDING') {
            return { ...s, seconds_remaining: 0, status: 'EXECUTED' as const };
          }
          return { ...s, seconds_remaining: remaining };
        })
      );
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const triggerNoShow = async (
    classroomId: number,
    periodLabel: string = 'Current Period',
    delaySeconds: number = 180
  ) => {
    try {
      const sim = await api.triggerNoShow(classroomId, periodLabel, delaySeconds);
      setSimulations(prev => [sim, ...prev]);
      return sim;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Simulation trigger failed';
      throw new Error(msg);
    }
  };

  const cancelSimulation = async (id: number) => {
    try {
      await api.cancelSimulation(id);
      setSimulations(prev =>
        prev.map(s => (s.id === id ? { ...s, status: 'CANCELLED' as const } : s))
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to cancel simulation';
      throw new Error(msg);
    }
  };

  return {
    simulations,
    pendingSimulations: simulations.filter(s => s.status === 'PENDING'),
    isLoading,
    error,
    triggerNoShow,
    cancelSimulation,
    refetch: () => fetchSimulations(false),
  };
}
