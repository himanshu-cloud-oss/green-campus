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
    primary: 'bg-accent hover:bg-accent-hover text-accent-on font-semibold border border-accent',
    secondary: 'bg-panel-raised hover:border-panel-wire text-panel-ink font-medium border border-panel-seam',
    danger: 'bg-transparent hover:bg-lamp-on/10 text-lamp-on font-semibold border border-lamp-on/60',
    outline: 'bg-transparent hover:border-accent hover:text-accent text-panel-ink border border-panel-wire',
    ghost: 'bg-transparent hover:bg-panel-seam text-panel-ink border border-transparent',
  };

  const sizeStyles = {
    xs: 'text-xs px-2.5 py-1 gap-1.5 rounded-[3px]',
    sm: 'text-xs px-3 py-1.5 gap-1.5 rounded-[3px]',
    md: 'text-sm px-4 py-2 gap-2 rounded-[3px]',
    lg: 'text-sm px-5 py-2.5 gap-2 rounded-[3px]',
  };

  return (
    <button
      className={`inline-flex items-center justify-center snap disabled:opacity-50 disabled:cursor-not-allowed select-none ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      disabled={disabled || isLoading}
      aria-busy={isLoading || undefined}
      {...props}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      <span>{isLoading ? 'Working…' : children}</span>
    </button>
  );
};
