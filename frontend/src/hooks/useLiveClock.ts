import { useState, useEffect } from 'react';
import { formatKolkataTime, formatKolkataDate } from '../utils/timeUtils';

export interface LiveClockState {
  time: string;
  date: string;
  weekday: string;
  weekdayShort: string;
  isoDate: string;
}

export function useLiveClock(): LiveClockState {
  const [clock, setClock] = useState<LiveClockState>(() => {
    const d = new Date();
    const dateInfo = formatKolkataDate(d);
    return {
      time: formatKolkataTime(d),
      date: dateInfo.fullDate,
      weekday: dateInfo.weekday,
      weekdayShort: dateInfo.weekdayShort,
      isoDate: dateInfo.isoDate,
    };
  });

  useEffect(() => {
    const timer = setInterval(() => {
      const d = new Date();
      const dateInfo = formatKolkataDate(d);
      setClock({
        time: formatKolkataTime(d),
        date: dateInfo.fullDate,
        weekday: dateInfo.weekday,
        weekdayShort: dateInfo.weekdayShort,
        isoDate: dateInfo.isoDate,
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return clock;
}
