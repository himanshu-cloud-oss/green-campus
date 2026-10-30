import React from 'react';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** strong = ink outline (needs attention), neutral = wire outline, quiet = dashed muted (estimated / done). */
  variant?: 'strong' | 'neutral' | 'quiet';
  children: React.ReactNode;
}

/** Status tag: uppercase label type, 2px corners, outline only. Colour never carries the meaning. */
export const Badge: React.FC<BadgeProps> = ({ variant = 'neutral', className = '', children, ...props }) => {
  const styles = {
    strong: 'border-panel-ink text-panel-ink',
    neutral: 'border-panel-wire text-panel-ink',
    quiet: 'border-dashed border-panel-wire text-panel-muted',
  };
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap border rounded-[2px] px-1.5 py-px text-2xs font-semibold uppercase ${styles[variant]} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
};
