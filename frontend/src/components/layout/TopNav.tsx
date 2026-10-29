import React, { useState, useEffect } from 'react';
import { Menu, Bell, Clock, User, Wifi, WifiOff } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useLiveClock } from '../../hooks/useLiveClock';
import { useAlerts } from '../../hooks/useAlerts';
import { api } from '../../services/api';
import { HealthStatus } from '../../types';
import { Badge } from '../ui/Badge';

export interface TopNavProps {
  onOpenMobileSidebar: () => void;
}

export const TopNav: React.FC<TopNavProps> = ({ onOpenMobileSidebar }) => {
  const clock = useLiveClock();
  const { unreadCount } = useAlerts();
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [isBackendConnected, setIsBackendConnected] = useState<boolean>(true);

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const res = await api.getHealth();
        setHealth(res);
        setIsBackendConnected(true);
      } catch {
        setIsBackendConnected(false);
      }
    };

    checkHealth();
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="h-16 border-b border-slate-800/80 bg-[#070d1a]/80 backdrop-blur-md sticky top-0 z-30 px-4 md:px-6 flex items-center justify-between">
      {/* Left section: mobile hamburger + title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileSidebar}
          className="lg:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5">
          <span className="hidden sm:inline-block font-semibold text-slate-200 text-sm md:text-base">
            Manav Rachna University
          </span>
          <span className="hidden sm:inline-block text-slate-600">•</span>
          <Badge variant="info" size="sm" dot>
            AI Scheduled Automation
          </Badge>
          {health?.demo_mode && (
            <Badge variant="warning" size="sm" pulse>
              Demo Mode
            </Badge>
          )}
        </div>
      </div>

      {/* Right section: live clock, status dot, notifications, profile */}
      <div className="flex items-center gap-3 md:gap-5">
        {/* Backend Connectivity Status */}
        <div
          className="hidden md:flex items-center gap-2 px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs"
          title={isBackendConnected ? 'Backend API Connected' : 'Backend Disconnected (Offline mode)'}
        >
          {isBackendConnected ? (
            <>
              <Wifi className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-slate-300">Live API</span>
            </>
          ) : (
            <>
              <WifiOff className="w-3.5 h-3.5 text-rose-400" />
              <span className="text-rose-300">Offline / Mock</span>
            </>
          )}
        </div>

        {/* Live Clock Asia/Kolkata */}
        <div className="flex items-center gap-2 text-right">
          <Clock className="w-4 h-4 text-cyan-400 hidden sm:block shrink-0" />
          <div className="flex flex-col">
            <span className="font-mono text-xs md:text-sm font-semibold text-slate-100 tracking-tight">
              {clock.time}
            </span>
            <span className="text-[10px] text-slate-400 font-medium">
              {clock.date}
            </span>
          </div>
        </div>

        {/* Alerts Bell */}
        <Link
          to="/alerts"
          className="relative p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors"
          title="Alerts and Simulation Events"
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow-md shadow-rose-500/50">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Link>

        {/* Profile Avatar / Operator */}
        <div className="flex items-center gap-2.5 pl-2 border-l border-slate-800">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-cyan-600 to-slate-800 border border-slate-700 flex items-center justify-center text-cyan-200 shadow-inner">
            <User className="w-4 h-4" />
          </div>
          <div className="hidden xl:flex flex-col text-left">
            <span className="text-xs font-semibold text-slate-200">BMS Control</span>
            <span className="text-[10px] text-slate-400">Operator</span>
          </div>
        </div>
      </div>
    </header>
  );
};
