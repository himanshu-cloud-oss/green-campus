import { useState, useMemo } from 'react';
import { calculateSavings } from '../utils/energyUtils';
import { SavingsEstimate } from '../types';

export interface SavingsConfig {
  classroomsCount: number;
  hoursAvoided: number;
  daysPerWeek: number;
  tariffInr: number;
  loadKw: number;
  emissionFactor: number;
}

export function useSavings(initialConfig?: Partial<SavingsConfig>) {
  const [config, setConfig] = useState<SavingsConfig>({
    classroomsCount: initialConfig?.classroomsCount ?? 5,
    hoursAvoided: initialConfig?.hoursAvoided ?? 2,
    daysPerWeek: initialConfig?.daysPerWeek ?? 5,
    tariffInr: initialConfig?.tariffInr ?? 8.5,
    loadKw: initialConfig?.loadKw ?? 4.5,
    emissionFactor: initialConfig?.emissionFactor ?? 0.82,
  });

  const estimate: SavingsEstimate = useMemo(() => {
    return calculateSavings({
      classroomsCount: config.classroomsCount,
      hoursAvoided: config.hoursAvoided,
      daysPerWeek: config.daysPerWeek,
      tariffInr: config.tariffInr,
      loadKw: config.loadKw,
      emissionFactor: config.emissionFactor,
    });
  }, [config]);

  const updateConfig = (partial: Partial<SavingsConfig>) => {
    setConfig(prev => ({ ...prev, ...partial }));
  };

  return {
    config,
    estimate,
    updateConfig,
    resetToDefaults: () =>
      setConfig({
        classroomsCount: 5,
        hoursAvoided: 2,
        daysPerWeek: 5,
        tariffInr: 8.5,
        loadKw: 4.5,
        emissionFactor: 0.82,
      }),
  };
}
