import React from 'react';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'success' | 'warning' | 'error' | 'info' | 'neutral' | 'violet';
  size?: 'sm' | 'md';
  dot?: boolean;
  pulse?: boolean;
  children: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'neutral',
  size = 'md',
  dot = false,
  pulse = false,
  className = '',
  children,
  ...props
}) => {
  const variantStyles = {
    success: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    warning: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    error: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
    info: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
    neutral: 'bg-slate-800 text-slate-300 border-slate-700',
    violet: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
  };

  const dotColors = {
    success: 'bg-emerald-400',
    warning: 'bg-amber-400',
    error: 'bg-rose-400',
    info: 'bg-cyan-400',
    neutral: 'bg-slate-400',
    violet: 'bg-purple-400',
  };

  const sizeStyles = {
    sm: 'text-xs px-2 py-0.5 gap-1.5',
    md: 'text-xs font-medium px-2.5 py-1 gap-1.5',
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      {...props}
    >
      {dot && (
        <span
          className={`h-1.5 w-1.5 rounded-full ${dotColors[variant]} ${
            pulse ? 'animate-pulse' : ''
          }`}
        />
      )}
      {children}
    </span>
  );
};
