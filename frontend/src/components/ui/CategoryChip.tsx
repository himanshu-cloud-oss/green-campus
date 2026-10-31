import React from 'react';
import { CATEGORY_LABEL, Category } from '../../services/pilot';
import { alpha, categoryColor, useTheme } from '../../theme';

/** Load-type tag: coloured dot + tinted pill, label in body ink so it stays readable in both themes. */
export const CategoryChip: React.FC<{ category: Category | string; className?: string }> = ({ category, className = '' }) => {
  const { p } = useTheme();
  const c = categoryColor(p, category);
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11.5px] font-semibold text-panel-ink whitespace-nowrap ${className}`}
      style={{ background: alpha(c, 0.14) }}
    >
      <span className="w-[7px] h-[7px] rounded-full shrink-0" style={{ background: c }} aria-hidden />
      {CATEGORY_LABEL[category as Category] ?? category}
    </span>
  );
};

/** Small coloured dot for a load type (used inside dense rows). */
export const CategoryDot: React.FC<{ category: Category | string }> = ({ category }) => {
  const { p } = useTheme();
  return <span className="inline-block w-[7px] h-[7px] rounded-full shrink-0" style={{ background: categoryColor(p, category) }} aria-hidden />;
};
