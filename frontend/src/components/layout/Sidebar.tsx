import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  School,
  Calendar,
  Bell,
  Calculator,
  FileBarChart,
  Settings,
  ChevronLeft,
  ChevronRight,
  Leaf,
} from 'lucide-react';
import { useAlerts } from '../../hooks/useAlerts';

export interface SidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isCollapsed,
  onToggleCollapse,
  isMobileOpen,
  onCloseMobile,
}) => {
  const { unreadCount } = useAlerts();

  const navItems = [
    { name: 'Overview', to: '/', icon: LayoutDashboard },
    { name: 'Classroom Monitoring', to: '/classrooms', icon: School },
    { name: 'Timetable', to: '/timetable', icon: Calendar },
    {
      name: 'Alerts & Events',
      to: '/alerts',
      icon: Bell,
      count: unreadCount,
    },
    { name: 'Savings Calculator', to: '/savings', icon: Calculator },
    { name: 'Reports & Export', to: '/reports', icon: FileBarChart },
    { name: 'Settings', to: '/settings', icon: Settings },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 left-0 z-40 h-screen transition-all duration-300 ease-in-out border-r border-slate-800/80 bg-[#070d1a]/95 backdrop-blur-xl flex flex-col justify-between
          ${isCollapsed ? 'w-20' : 'w-64'}
          ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Brand Header */}
        <div>
          <div className="h-16 flex items-center justify-between px-4 border-b border-slate-800/70">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-cyan-500 to-emerald-500 flex items-center justify-center shrink-0 shadow-lg shadow-cyan-500/20">
                <Leaf className="w-5 h-5 text-slate-950 font-bold" />
              </div>
              {!isCollapsed && (
                <div className="flex flex-col min-w-0">
                  <span className="font-bold text-sm tracking-tight text-white whitespace-nowrap">
                    Green Campus AI
                  </span>
                  <span className="text-[11px] text-cyan-400 font-mono tracking-wider">
                    MRU SMART BMS
                  </span>
                </div>
              )}
            </div>

            {/* Collapse button on desktop */}
            <button
              onClick={onToggleCollapse}
              className="hidden lg:flex p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors"
              title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="p-3 space-y-1.5 mt-2">
            {navItems.map(item => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={onCloseMobile}
                  className={({ isActive }) =>
                    `flex items-center gap-3.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group relative ${
                      isActive
                        ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 shadow-sm shadow-cyan-500/20 font-semibold'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent'
                    }`
                  }
                  title={isCollapsed ? item.name : undefined}
                >
                  <Icon className="w-5 h-5 shrink-0 transition-transform group-hover:scale-105" />

                  {!isCollapsed && (
                    <span className="truncate flex-1">{item.name}</span>
                  )}

                  {!isCollapsed && item.count !== undefined && item.count > 0 && (
                    <span className="px-2 py-0.5 text-xs font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/40 rounded-full">
                      {item.count}
                    </span>
                  )}

                  {/* Collapsed dot/badge */}
                  {isCollapsed && item.count !== undefined && item.count > 0 && (
                    <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Footer info in sidebar */}
        {!isCollapsed && (
          <div className="p-4 m-3 rounded-xl bg-slate-900/50 border border-slate-800/80">
            <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
              Campus Facilities
            </div>
            <div className="text-xs text-slate-300 font-semibold mt-1">
              Block A • 5 Smart Classrooms
            </div>
            <div className="text-[10px] text-emerald-400 flex items-center gap-1.5 mt-2">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
              Automated Energy Controls Active
            </div>
          </div>
        )}
      </aside>
    </>
  );
};
