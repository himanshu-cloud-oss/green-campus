import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLElement> {
  padding?: 'none' | 'sm' | 'md';
  children: React.ReactNode;
}

/** A panel region bounded by a 1px seam. Not a card: no fill, no radius, no shadow. */
export const Card: React.FC<CardProps> = ({ padding = 'md', className = '', children, ...props }) => {
  const pad = { none: '', sm: 'p-3', md: 'px-4 py-3' }[padding];
  return (
    <section className={`border border-panel-seam ${pad} ${className}`} {...props}>
      {children}
    </section>
  );
};
