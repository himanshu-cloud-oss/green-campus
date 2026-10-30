import { useState, useEffect, useCallback } from 'react';
import { SimulationEvent } from '../types';
import { api } from '../services/api';
import { errorMessage } from '../services/pilot';

/** No-show tests and their cut-off countdowns. Polls every 10 s and asks the backend to run expired cut-offs. */
export function useSimulations() {
  const [simulations, setSimulations] = useState<SimulationEvent[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fetchSimulations = useCallback(async () => {
    try {
      await api.processCountdowns();
      setSimulations(await api.getSimulations());
      setError(null);
    } catch (err) {
      setError(errorMessage(err));
    }
  }, []);

  useEffect(() => {
    fetchSimulations();
    const id = setInterval(fetchSimulations, 10000);
    return () => clearInterval(id);
  }, [fetchSimulations]);

  const run = async (fn: () => Promise<unknown>) => {
    try {
      await fn();
      await fetchSimulations();
    } catch (err) {
      throw new Error(errorMessage(err));
    }
  };

  return {
    simulations,
    pendingSimulations: simulations.filter(s => s.status === 'PENDING'),
    error,
    triggerNoShow: (classroomId: number, periodLabel: string, slotStart: string, slotEnd: string) =>
      run(() => api.triggerNoShow(classroomId, periodLabel, slotStart, slotEnd)),
    cancelSimulation: (id: number) => run(() => api.cancelSimulation(id)),
    executeSimulation: (id: number) => run(() => api.executeSimulation(id)),
    refetch: fetchSimulations,
  };
}
