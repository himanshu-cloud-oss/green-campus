import React from 'react';
import { Button } from '../ui/Button';
import { Download, Printer } from 'lucide-react';
import { exportToCsv } from '../../utils/energyUtils';

export interface ExportButtonsProps {
  data: Record<string, unknown>[];
  filename: string;
  label?: string;
  onPrint?: () => void;
  showPrint?: boolean;
}

export const ExportButtons: React.FC<ExportButtonsProps> = ({
  data,
  filename,
  label = 'Export CSV',
  onPrint,
  showPrint = false,
}) => {
  const handleExport = () => {
    exportToCsv(filename, data);
  };

  const handlePrint = () => {
    if (onPrint) {
      onPrint();
    } else {
      window.print();
    }
  };

  return (
    <div className="inline-flex items-center gap-2">
      <Button
        variant="outline"
        size="xs"
        onClick={handleExport}
        icon={<Download className="w-3.5 h-3.5" />}
      >
        {label}
      </Button>

      {showPrint && (
        <Button
          variant="secondary"
          size="xs"
          onClick={handlePrint}
          icon={<Printer className="w-3.5 h-3.5" />}
        >
          Print Report
        </Button>
      )}
    </div>
  );
};
