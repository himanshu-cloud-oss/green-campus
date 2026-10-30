import React from 'react';
import { NavLink } from 'react-router-dom';
import { NAV_ITEMS } from './navItems';
import { useAlerts } from '../../hooks/useAlerts';

/** Narrow icon rail. Labels show on hover/focus; number keys jump between pages. */
export const Sidebar: React.FC = () => {
  const { unreadCount } = useAlerts();

  return (
    <nav
      aria-label="Main"
      className="fixed inset-y-0 left-0 z-30 w-14 bg-panel-rail border-r border-panel-seam flex flex-col items-center py-3 gap-1"
    >
      <div className="w-8 h-8 mb-3 grid place-items-center" aria-hidden>
        <svg viewBox="0 0 24 24" className="w-7 h-7">
          <path d="M3 7h18M7 7v10M17 7v10M12 7v6" stroke="#D9DEE5" strokeWidth="1.8" fill="none" />
          <circle cx="12" cy="15.5" r="2.4" fill="#F5A524" />
        </svg>
      </div>
      {NAV_ITEMS.map(item => {
        const Icon = item.icon;
        const badge = item.to === '/alerts' && unreadCount > 0;
        return (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            aria-label={`${item.name} (${item.key})`}
            className={({ isActive }) =>
              `group relative w-10 h-10 grid place-items-center rounded-[3px] snap ${
                isActive ? 'bg-panel-seam text-panel-ink' : 'text-panel-muted hover:text-panel-ink hover:bg-panel-raised'
              }`
            }
          >
            {({ isActive }) => (
              <>
                {isActive && <span className="absolute left-[-8px] top-2 bottom-2 w-px bg-panel-ink" />}
                <Icon className="w-[18px] h-[18px]" strokeWidth={1.6} />
                {badge && <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-lamp-on" />}
                <span
                  role="tooltip"
                  className="pointer-events-none absolute left-12 whitespace-nowrap bg-panel-raised border border-panel-wire px-2 py-1 text-xs text-panel-ink rounded-[3px] opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 snap"
                >
                  {item.name} <span className="num text-panel-muted ml-1">{item.key}</span>
                </span>
              </>
            )}
          </NavLink>
        );
      })}
    </nav>
  );
};
