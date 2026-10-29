import React, { useMemo, useState } from 'react';
import { useTimetable } from '../hooks/useTimetable';
import { useBookings } from '../hooks/useBookings';
import { useSimulations } from '../hooks/useSimulations';
import { useLiveClock } from '../hooks/useLiveClock';
import { TimetableGrid } from '../components/timetable/TimetableGrid';
import { WeekdaySelector } from '../components/timetable/WeekdaySelector';
import { TimetableEntry } from '../types';
import { Weekday } from '../utils/timeUtils';
import { Calendar, Filter, Sparkles } from 'lucide-react';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';

export const Timetable: React.FC = () => {
  const clock = useLiveClock();
  const [selectedDay, setSelectedDay] = useState<Weekday>('Thursday');
  const [classroomFilter, setClassroomFilter] = useState<number | 'ALL'>('ALL');
  const [notification, setNotification] = useState<string | null>(null);

  const { entries, periods, currentPeriod, isLoading } = useTimetable(selectedDay);
  const { bookings, isLoading: bookingsLoading } = useBookings();
  const { triggerNoShow } = useSimulations();

  const timetableEntries = useMemo(() => {
    const toMinutes = (time: string) => {
      const [hours, minutes] = time.split(':').map(Number);
      return hours * 60 + minutes;
    };

    const bookingEntries: TimetableEntry[] = bookings
      .filter(booking => {
        const bookingDay = new Intl.DateTimeFormat('en-IN', {
          weekday: 'long',
          timeZone: 'Asia/Kolkata',
        }).format(new Date(`${booking.date}T12:00:00+05:30`));
        return booking.status === 'ACTIVE' && bookingDay === selectedDay;
      })
      .flatMap(booking =>
        periods
          .filter(period => {
            if (period.is_break) return false;
            return (
              toMinutes(booking.start_time) < toMinutes(period.end_time) &&
              toMinutes(booking.end_time) > toMinutes(period.start_time)
            );
          })
          .map(period => ({
            id: -booking.id * 100 - Number(period.period_number.replace('P', '')),
            classroom_id: booking.classroom_id,
            day_of_week: selectedDay,
            period_number: period.period_number,
            start_time: booking.start_time,
            end_time: booking.end_time,
            subject: booking.subject || 'Extra Class Booking',
            teacher: 'Extra Class Booking',
            section: 'EXTRA',
          }))
      );

    return [...entries, ...bookingEntries];
  }, [bookings, entries, periods, selectedDay]);

  const handleSimulateNoShow = async (classroomId: number, periodLabel: string) => {
    try {
      await triggerNoShow(classroomId, periodLabel, 180);
      setNotification(`Cutoff simulation active for room during ${periodLabel}. Countdown started.`);
      setTimeout(() => setNotification(null), 5000);
    } catch {
      setNotification('Failed to trigger simulation.');
    }
  };

  const allClassrooms = [
    { id: 1, name: 'LS-03', capacity: 65, connected_load_kw: 4.5 },
    { id: 2, name: 'LS-04', capacity: 60, connected_load_kw: 4.5 },
    { id: 3, name: 'LS-08', capacity: 70, connected_load_kw: 5.2 },
    { id: 4, name: 'LS-09', capacity: 65, connected_load_kw: 4.8 },
    { id: 5, name: 'LS-10', capacity: 75, connected_load_kw: 5.5 },
  ];

  const displayedClassrooms =
    classroomFilter === 'ALL'
      ? allClassrooms
      : allClassrooms.filter(c => c.id === classroomFilter);

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {notification && (
        <div className="p-3.5 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-300 text-xs flex items-center justify-between animate-fade-in shadow-md">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span className="font-semibold">{notification}</span>
          </div>
          <button onClick={() => setNotification(null)} className="underline text-slate-400">
            Dismiss
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <Calendar className="w-6 h-6 text-cyan-400" />
            <span>Academic Timetable & Automation Matrix</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Master schedule linked directly to building HVAC pre-cooling and occupancy verification cutoffs.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-mono bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg">
            Active Period: <span className="text-cyan-400 font-bold">{currentPeriod ? currentPeriod.label : 'Outside Class Hours'}</span>
          </span>
        </div>
      </div>

      {/* Filters & Weekdays Bar */}
      <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-800 backdrop-blur-md flex flex-wrap items-center justify-between gap-4">
        <WeekdaySelector
          selectedDay={selectedDay}
          onSelectDay={setSelectedDay}
          currentDayName={clock.weekday}
        />

        {/* Room Filter Dropdown */}
        <div className="flex items-center gap-2 text-xs">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-slate-300 font-medium">Show Rooms:</span>
          <select
            value={classroomFilter}
            onChange={e =>
              setClassroomFilter(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))
            }
            className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 font-medium focus:outline-none focus:border-cyan-500"
          >
            <option value="ALL">All Classrooms (5 Rooms)</option>
            {allClassrooms.map(c => (
              <option key={c.id} value={c.id}>
                {c.name} (Cap: {c.capacity})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Timetable Grid Component */}
      {isLoading || bookingsLoading ? (
        <LoadingSpinner text="Retrieving ERP timetable schedule..." />
      ) : (
        <TimetableGrid
          entries={timetableEntries}
          periods={periods}
          classrooms={displayedClassrooms}
          activePeriodNumber={currentPeriod?.period_number}
          onSimulateNoShow={handleSimulateNoShow}
        />
      )}

      {/* Timetable Legend and Info */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
        <div className="p-3 bg-slate-900/40 rounded-xl border border-slate-800 flex items-center gap-2.5">
          <div className="w-3.5 h-3.5 rounded bg-cyan-500/20 border border-cyan-500/50" />
          <span className="text-slate-300">Scheduled Occupied (HVAC Auto-On)</span>
        </div>
        <div className="p-3 bg-slate-900/40 rounded-xl border border-slate-800 flex items-center gap-2.5">
          <div className="w-3.5 h-3.5 rounded bg-slate-800 border border-slate-700" />
          <span className="text-slate-300">Vacant Period (All Power Off)</span>
        </div>
        <div className="p-3 bg-slate-900/40 rounded-xl border border-slate-800 flex items-center gap-2.5">
          <div className="w-3.5 h-3.5 rounded bg-amber-500/20 border border-amber-500/50" />
          <span className="text-slate-300">Campus Lunch Break (Eco Standby)</span>
        </div>
        <div className="p-3 bg-slate-900/40 rounded-xl border border-slate-800 flex items-center gap-2.5">
          <div className="w-3.5 h-3.5 rounded bg-purple-500/20 border border-purple-500/50" />
          <span className="text-slate-300">Extra Class Booking (Manual Override)</span>
        </div>
      </div>
    </div>
  );
};
