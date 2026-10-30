import React from 'react';
import { Download } from 'lucide-react';
import { exportToCsv } from '../../utils/energyUtils';

export interface ExportButtonsProps {
  data: Record<string, unknown>[];
  filename: string;
  label?: string;
}

/** Outline "Export CSV" action. Disabled when there is nothing to export. */
export const ExportButtons: React.FC<ExportButtonsProps> = ({ data, filename, label = 'Export CSV' }) => (
  <button
    onClick={() => exportToCsv(filename, data)}
    disabled={data.length === 0}
    className="flex items-center gap-1.5 text-xs border border-panel-wire hover:border-panel-ink px-3 py-1 rounded-[3px] snap disabled:opacity-40 disabled:cursor-not-allowed"
  >
    <Download className="w-3.5 h-3.5" strokeWidth={1.6} /> {label}
  </button>
);
