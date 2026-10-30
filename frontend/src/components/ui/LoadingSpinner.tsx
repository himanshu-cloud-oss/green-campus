import React from 'react';

export interface LoadingSpinnerProps {
  text?: string;
  className?: string;
}

/** Loading placeholder. The world has no spinners; a still raised block holds the space. */
export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ text = 'Loading…', className = '' }) => (
  <div className={`border border-panel-seam bg-panel-raised/40 px-4 py-6 text-xs text-panel-muted ${className}`} aria-busy="true">
    {text}
  </div>
);
