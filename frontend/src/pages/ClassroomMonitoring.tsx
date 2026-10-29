import React, { useState } from 'react';
import { ExtraClassBooking } from '../types';
import { useClassrooms } from '../hooks/useClassrooms';
import { useTimetable } from '../hooks/useTimetable';
import { useSimulations } from '../hooks/useSimulations';
import { useBookings } from '../hooks/useBookings';
import { useLiveClock } from '../hooks/useLiveClock';
import { ClassroomGrid } from '../components/classroom/ClassroomGrid';
import { WeekdaySelector } from '../components/timetable/WeekdaySelector';
import { PeriodSelector } from '../components/timetable/PeriodSelector';
import { Weekday } from '../utils/timeUtils';
import { School, RefreshCw, Clock, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Button } from '../components/ui/Button';

export const ClassroomMonitoring: React.FC = () => {
  const clock = useLiveClock();
  const [selectedDay, setSelectedDay] = useState<Weekday>('Thursday');
  const [selectedDate, setSelectedDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [selectedPeriod, setSelectedPeriod] = useState<string>('P3');
  const [useCurrentTime, setUseCurrentTime] = useState<boolean>(true);
  const [notification, setNotification] = useState<{ type: 'success' | 'warn'; message: string } | null>(null);

  const { classrooms, isLoading, refetch, updateDeviceState } = useClassrooms({
    weekday: selectedDay,
    date: selectedDate,
    time: useCurrentTime ? undefined : '10:15',
  });

  const { periods, currentPeriod } = useTimetable(selectedDay);
  const { triggerNoShow } = useSimulations();
  const { createBooking } = useBookings();

  const handleSimulateEmpty = async (classroomId: number) => {
    try {
      const room = classrooms.find(c => c.id === classroomId);
      await triggerNoShow(classroomId, `${selectedPeriod} (${selectedDay})`, 180);
      setNotification({
        type: 'warn',
        message: `Simulated empty class in ${room?.name || 'Classroom'}. Auto-cutoff timer activated (180s).`,
      });
      setTimeout(() => setNotification(null), 5000);
      refetch();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to trigger simulation';
      setNotification({ type: 'warn', message: msg });
    }
  };

  const handleCreateBooking = async (
    booking: Omit<ExtraClassBooking, 'id' | 'status' | 'created_at'>
  ) => {
    try {
      await createBooking(booking);
      setNotification({
        type: 'success',
        message: `Extra class reserved successfully for ${booking.classroom_name}! Override applied.`,
      });
      setTimeout(() => setNotification(null), 5000);
      refetch();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Reservation failed';
      setNotification({ type: 'warn', message: msg });
      throw err;
    }
  };

  const handleToggleDevice = async (
    classroomId: number,
    device: 'ac_on' | 'fan_on' | 'lights_on',
    newValue: boolean
  ) => {
    await updateDeviceState(classroomId, { [device]: newValue });
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification Banner */}
      {notification && (
        <div
          className={`p-3.5 rounded-xl border text-xs flex items-center justify-between animate-fade-in shadow-lg ${
            notification.type === 'success'
              ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 shadow-emerald-500/10'
              : 'bg-amber-500/15 border-amber-500/40 text-amber-300 shadow-amber-500/10'
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-amber-400" />
            )}
            <span className="font-semibold">{notification.message}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-slate-400 hover:text-white text-xs underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Page Title & Refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <School className="w-6 h-6 text-cyan-400" />
            <span>Classroom Monitoring & HVAC Control</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Live telemetry of Block A smart classrooms with timetable-synchronized cooling and occupancy sensors.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            variant="secondary"
            size="sm"
            onClick={refetch}
            isLoading={isLoading}
            icon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Refresh Telemetry
          </Button>
        </div>
      </div>

      {/* Control Toolbar: Weekdays, Date, Period, Live Clock Toggle */}
      <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-800 backdrop-blur-md space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Weekday selector */}
          <WeekdaySelector
            selectedDay={selectedDay}
            onSelectDay={day => setSelectedDay(day)}
            currentDayName={clock.weekday}
          />

          {/* Time Sync Controls */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Live Time Toggle */}
            <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={useCurrentTime}
                onChange={e => setUseCurrentTime(e.target.checked)}
                className="rounded accent-cyan-500 w-4 h-4 bg-slate-800 border-slate-700"
              />
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-cyan-400" />
                <span>Use Live Time ({clock.time})</span>
              </span>
            </label>

            {/* Date Picker */}
            <input
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
            />

            {/* Period Selector */}
            <PeriodSelector
              periods={periods}
              selectedPeriodNumber={selectedPeriod}
              onSelectPeriod={p => setSelectedPeriod(p)}
              activePeriodNumber={currentPeriod?.period_number}
            />
          </div>
        </div>
      </div>

      {/* Classroom Grid */}
      <ClassroomGrid
        classrooms={classrooms}
        isLoading={isLoading}
        onSimulateEmpty={handleSimulateEmpty}
        onSubmitBooking={handleCreateBooking}
        onToggleDevice={handleToggleDevice}
      />
    </div>
  );
};
