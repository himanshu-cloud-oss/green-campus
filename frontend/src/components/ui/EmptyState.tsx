import React from 'react';

export interface EmptyStateProps {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

/** A plain line of text in the panel, with an optional text action. */
export const EmptyState: React.FC<EmptyStateProps> = ({ title, description, actionLabel, onAction, className = '' }) => (
  <div className={`px-4 py-6 text-[13px] ${className}`}>
    <p className="text-panel-ink">{title}</p>
    {description && <p className="text-xs text-panel-muted mt-1 max-w-prose">{description}</p>}
    {actionLabel && onAction && (
      <button onClick={onAction} className="mt-2 text-xs text-panel-ink underline underline-offset-4 hover:text-accent">
        {actionLabel}
      </button>
    )}
  </div>
);
