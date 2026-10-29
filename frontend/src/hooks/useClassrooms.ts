import { useState, useEffect, useCallback } from 'react';
import { Classroom } from '../types';
import { api } from '../services/api';

interface UseClassroomsParams {
  weekday?: string;
  date?: string;
  time?: string;
}

export function useClassrooms(params?: UseClassroomsParams) {
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const weekday = params?.weekday;
  const date = params?.date;
  const time = params?.time;

  const fetchClassrooms = useCallback(async (isSilent: boolean = false) => {
    if (!isSilent) setIsLoading(true);
    try {
      const data = await api.getClassrooms({ weekday, date, time });
      setClassrooms(data);
      setError(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch classrooms';
      setError(msg);
    } finally {
      if (!isSilent) setIsLoading(false);
    }
  }, [weekday, date, time]);

  useEffect(() => {
    fetchClassrooms(false);
    const interval = setInterval(() => {
      fetchClassrooms(true);
    }, 30000);

    return () => clearInterval(interval);
  }, [fetchClassrooms]);

  const updateDeviceState = async (
    classroomId: number,
    state: { ac_on?: boolean; fan_on?: boolean; lights_on?: boolean }
  ) => {
    try {
      const updated = await api.updateDeviceState(classroomId, {
        ...state,
        source: 'OVERRIDE',
      });
      setClassrooms(prev => prev.map(c => (c.id === classroomId ? updated : c)));
      return updated;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update device state';
      setError(msg);
      throw err;
    }
  };

  return {
    classrooms,
    isLoading,
    error,
    refetch: () => fetchClassrooms(false),
    updateDeviceState,
  };
}
