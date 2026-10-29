import { useState, useEffect, useCallback } from 'react';
import { MonthlyEnergyRecord, EnergySummary } from '../types';
import { api } from '../services/api';
import { HISTORICAL_ENERGY_DATA, computeEnergySummary } from '../utils/energyUtils';

export function useEnergy() {
  const [records, setRecords] = useState<MonthlyEnergyRecord[]>(HISTORICAL_ENERGY_DATA);
  const [summary, setSummary] = useState<EnergySummary>(() => computeEnergySummary(HISTORICAL_ENERGY_DATA));
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEnergyData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [recData, sumData] = await Promise.all([
        api.getMonthlyEnergy(),
        api.getEnergySummary(),
      ]);
      setRecords(recData);
      setSummary(sumData);
      setError(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch energy analytics';
      setError(msg);
      // Fallback to local
      setRecords(HISTORICAL_ENERGY_DATA);
      setSummary(computeEnergySummary(HISTORICAL_ENERGY_DATA));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEnergyData();
  }, [fetchEnergyData]);

  return {
    records,
    summary,
    isLoading,
    error,
    refetch: fetchEnergyData,
  };
}
