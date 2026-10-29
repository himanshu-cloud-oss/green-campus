import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  glow?: 'cyan' | 'green' | 'amber' | 'violet' | 'none';
  interactive?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({
  glow = 'none',
  interactive = false,
  padding = 'md',
  className = '',
  children,
  ...props
}) => {
  const paddingClasses = {
    none: 'p-0',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  };

  const glowClasses = {
    none: '',
    cyan: 'shadow-lg shadow-cyan-500/10 hover:shadow-cyan-500/20 border-cyan-500/30',
    green: 'shadow-lg shadow-emerald-500/10 hover:shadow-emerald-500/20 border-emerald-500/30',
    amber: 'shadow-lg shadow-amber-500/10 hover:shadow-amber-500/20 border-amber-500/30',
    violet: 'shadow-lg shadow-violet-500/10 hover:shadow-violet-500/20 border-violet-500/30',
  };

  const interactiveClasses = interactive
    ? 'transition-all duration-200 hover:-translate-y-0.5 hover:bg-slate-800/70 hover:border-slate-600/60 cursor-pointer'
    : '';

  return (
    <div
      className={`bg-slate-900/60 backdrop-blur-md border border-slate-700/50 rounded-xl ${paddingClasses[padding]} ${glowClasses[glow]} ${interactiveClasses} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
