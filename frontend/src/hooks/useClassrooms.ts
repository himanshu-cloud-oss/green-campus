import { useState, useEffect, useCallback } from 'react';
import { Classroom } from '../types';
import { api } from '../services/api';
import { errorMessage } from '../services/pilot';

/** Rooms with their backend status. With no date/time it follows the live clock and refreshes every 15 s. */
export function useClassrooms(params?: { date?: string; time?: string }) {
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const date = params?.date;
  const time = params?.time;

  const fetchClassrooms = useCallback(async () => {
    try {
      setClassrooms(await api.getClassrooms({ date, time }));
      setError(null);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, [date, time]);

  useEffect(() => {
    setIsLoading(true);
    fetchClassrooms();
    if (date || time) return;
    const id = setInterval(fetchClassrooms, 15000);
    return () => clearInterval(id);
  }, [fetchClassrooms, date, time]);

  return { classrooms, isLoading, error, refetch: fetchClassrooms };
}
