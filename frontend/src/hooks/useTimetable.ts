import { useState, useEffect, useCallback, useMemo } from 'react';
import { TimetableEntry, PeriodDefinition } from '../types';
import { api } from '../services/api';
import { STANDARD_PERIODS, getCurrentPeriod } from '../utils/timeUtils';

export function useTimetable(weekday?: string, classroomId?: number) {
  const [entries, setEntries] = useState<TimetableEntry[]>([]);
  const [periods, setPeriods] = useState<PeriodDefinition[]>(STANDARD_PERIODS);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTimetable = useCallback(async () => {
    setIsLoading(true);
    try {
      const [tableData, periodsData] = await Promise.all([
        api.getTimetable({ weekday, classroom_id: classroomId }),
        api.getPeriods(),
      ]);
      setEntries(tableData);
      setPeriods(periodsData);
      setError(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch timetable data';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [weekday, classroomId]);

  useEffect(() => {
    fetchTimetable();
  }, [fetchTimetable]);

  const currentPeriod = useMemo(() => getCurrentPeriod(), []);

  return {
    entries,
    periods,
    currentPeriod,
    isLoading,
    error,
    refetch: fetchTimetable,
  };
}
