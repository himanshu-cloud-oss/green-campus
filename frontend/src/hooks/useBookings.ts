import { useState, useEffect, useCallback } from 'react';
import { ExtraClassBooking } from '../types';
import { api } from '../services/api';

export function useBookings() {
  const [bookings, setBookings] = useState<ExtraClassBooking[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBookings = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await api.getBookings();
      setBookings(data);
      setError(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch bookings';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  const createBooking = async (
    booking: Omit<ExtraClassBooking, 'id' | 'status' | 'created_at'>
  ) => {
    try {
      const newB = await api.createBooking(booking);
      setBookings(prev => [newB, ...prev]);
      return newB;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Booking creation failed';
      throw new Error(msg);
    }
  };

  const cancelBooking = async (id: number) => {
    try {
      await api.cancelBooking(id);
      setBookings(prev =>
        prev.map(b => (b.id === id ? { ...b, status: 'CANCELLED' as const } : b))
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to cancel booking';
      throw new Error(msg);
    }
  };

  return {
    bookings,
    isLoading,
    error,
    createBooking,
    cancelBooking,
    refetch: fetchBookings,
  };
}
