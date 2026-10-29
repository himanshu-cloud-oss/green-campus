import React from 'react';
import { Button } from './Button';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  className = '',
}) => {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center p-8 border border-dashed border-slate-700/80 rounded-xl bg-slate-900/30 ${className}`}
    >
      {icon && (
        <div className="p-3 bg-slate-800/80 text-cyan-400 rounded-full mb-3 ring-1 ring-slate-700">
          {icon}
        </div>
      )}
      <h3 className="text-base font-semibold text-slate-200">{title}</h3>
      <p className="text-xs text-slate-400 max-w-sm mt-1 mb-4 leading-relaxed">{description}</p>
      {actionLabel && onAction && (
        <Button variant="secondary" size="sm" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
};
