import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'outline' | 'ghost';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  icon,
  className = '',
  disabled,
  children,
  ...props
}) => {
  const variantStyles = {
    primary:
      'bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-medium shadow-md shadow-cyan-500/20 active:translate-y-0.5 border border-cyan-400/40',
    secondary:
      'bg-slate-800 hover:bg-slate-700 text-slate-100 font-medium border border-slate-700 shadow-sm',
    danger:
      'bg-rose-600/80 hover:bg-rose-600 text-white font-medium border border-rose-500/50 shadow-md shadow-rose-600/20',
    outline:
      'bg-transparent hover:bg-slate-800 text-cyan-400 border border-cyan-500/50 hover:border-cyan-400',
    ghost:
      'bg-transparent hover:bg-slate-800 text-slate-300 hover:text-white border border-transparent',
  };

  const sizeStyles = {
    xs: 'text-xs px-2.5 py-1 gap-1.5 rounded-md',
    sm: 'text-xs px-3 py-1.5 gap-1.5 rounded-lg',
    md: 'text-sm px-4 py-2 gap-2 rounded-lg',
    lg: 'text-base px-5 py-2.5 gap-2.5 rounded-xl',
  };

  return (
    <button
      className={`inline-flex items-center justify-center transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed select-none ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <svg
          className="animate-spin -ml-0.5 h-4 w-4 text-current"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      ) : (
        icon && <span className="shrink-0">{icon}</span>
      )}
      <span>{children}</span>
    </button>
  );
};
