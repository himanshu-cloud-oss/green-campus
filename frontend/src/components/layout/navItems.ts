import {
  Activity,
  School,
  CalendarPlus,
  CalendarDays,
  LayoutGrid,
  Calculator,
  Bell,
  FileBarChart,
  Settings,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  name: string;
  to: string;
  icon: LucideIcon;
  key: string;
}

/** Number keys 1-9 jump straight to each page. */
export const NAV_ITEMS: NavItem[] = [
  { name: 'Floor panel', to: '/', icon: Activity, key: '1' },
  { name: 'Classrooms', to: '/classrooms', icon: School, key: '2' },
  { name: 'Book extra class', to: '/book', icon: CalendarPlus, key: '3' },
  { name: 'Timetable', to: '/timetable', icon: CalendarDays, key: '4' },
  { name: 'Floor maps', to: '/floors', icon: LayoutGrid, key: '5' },
  { name: 'Savings model', to: '/savings', icon: Calculator, key: '6' },
  { name: 'Alerts', to: '/alerts', icon: Bell, key: '7' },
  { name: 'Reports', to: '/reports', icon: FileBarChart, key: '8' },
  { name: 'Settings', to: '/settings', icon: Settings, key: '9' },
];
