import { PeriodDefinition } from '../types';

/** Mirrors /api/timetable/periods (period 5 is lunch). Used until the backend list arrives. */
export const STANDARD_PERIODS: PeriodDefinition[] = [
  { period_number: '1', label: 'Period 1', start_time: '08:10', end_time: '09:00', is_break: false },
  { period_number: '2', label: 'Period 2', start_time: '09:00', end_time: '09:50', is_break: false },
  { period_number: '3', label: 'Period 3', start_time: '09:50', end_time: '10:40', is_break: false },
  { period_number: '4', label: 'Period 4', start_time: '10:40', end_time: '11:30', is_break: false },
  { period_number: 'LUNCH', label: 'Lunch Break', start_time: '11:30', end_time: '12:20', is_break: true },
  { period_number: '6', label: 'Period 6', start_time: '12:20', end_time: '13:10', is_break: false },
  { period_number: '7', label: 'Period 7', start_time: '13:10', end_time: '14:00', is_break: false },
  { period_number: '8', label: 'Period 8', start_time: '14:00', end_time: '14:50', is_break: false },
  { period_number: '9', label: 'Period 9', start_time: '14:50', end_time: '15:40', is_break: false },
  { period_number: '10', label: 'Period 10', start_time: '15:40', end_time: '16:30', is_break: false },
];

export const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'] as const;
export type Weekday = (typeof WEEKDAYS)[number];

export function getKolkataDate(): Date {
  // Return current Date adjusted for display in Asia/Kolkata
  return new Date();
}

export function formatKolkataTime(date: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  }).format(date);
}

export function formatKolkataDate(date: Date = new Date()): {
  fullDate: string;
  weekday: string;
  weekdayShort: string;
  isoDate: string;
} {
  const options: Intl.DateTimeFormatOptions = {
    timeZone: 'Asia/Kolkata',
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  };

  const formatter = new Intl.DateTimeFormat('en-IN', options);
  const parts = formatter.formatToParts(date);
  
  const weekdayShort = parts.find(p => p.type === 'weekday')?.value || 'Thu';
  const day = parts.find(p => p.type === 'day')?.value || '29';
  const month = parts.find(p => p.type === 'month')?.value || 'Oct';
  const year = parts.find(p => p.type === 'year')?.value || '2026';

  const weekdayFull = new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    weekday: 'long',
  }).format(date);

  // ISO Date YYYY-MM-DD in Asia/Kolkata
  const isoFormatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const isoDate = isoFormatter.format(date);

  return {
    fullDate: `${weekdayShort}, ${day} ${month} ${year}`,
    weekday: weekdayFull,
    weekdayShort,
    isoDate,
  };
}

export function getCurrentPeriod(timeStr?: string): PeriodDefinition | null {
  const now = new Date();
  let currentHM = timeStr;
  
  if (!currentHM) {
    const kolkataTime = new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(now);
    currentHM = kolkataTime.trim();
  }

  const [hours, minutes] = currentHM.split(':').map(Number);
  const currentMinutes = hours * 60 + minutes;

  for (const period of STANDARD_PERIODS) {
    const [sH, sM] = period.start_time.split(':').map(Number);
    const [eH, eM] = period.end_time.split(':').map(Number);
    const startMin = sH * 60 + sM;
    const endMin = eH * 60 + eM;

    if (currentMinutes >= startMin && currentMinutes < endMin) {
      return period;
    }
  }

  return null;
}

export function getSecondsRemaining(targetIso: string): number {
  const target = new Date(targetIso).getTime();
  const now = Date.now();
  const diffMs = target - now;
  return Math.max(0, Math.floor(diffMs / 1000));
}

export function formatCountdown(totalSeconds: number): string {
  if (totalSeconds <= 0) return '0s';
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  if (mins === 0) {
    return `${secs}s`;
  }
  return `${mins}m ${secs.toString().padStart(2, '0')}s`;
}
