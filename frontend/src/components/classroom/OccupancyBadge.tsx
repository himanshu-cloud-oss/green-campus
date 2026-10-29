import React from 'react';
import { OccupancyStatus } from '../../types';
import { Badge } from '../ui/Badge';

export interface OccupancyBadgeProps {
  status: OccupancyStatus;
  size?: 'sm' | 'md';
}

export const OccupancyBadge: React.FC<OccupancyBadgeProps> = ({ status, size = 'md' }) => {
  switch (status) {
    case 'SCHEDULED_OCCUPIED':
      return (
        <Badge variant="info" size={size} dot pulse>
          Scheduled Occupied
        </Badge>
      );
    case 'VACANT':
      return (
        <Badge variant="neutral" size={size}>
          Vacant
        </Badge>
      );
    case 'EXTRA_CLASS':
      return (
        <Badge variant="violet" size={size} dot>
          Extra Class
        </Badge>
      );
    case 'NO_SHOW_SIMULATED':
      return (
        <Badge variant="warning" size={size} dot pulse>
          No-Show Detected
        </Badge>
      );
    case 'LUNCH':
      return (
        <Badge variant="success" size={size}>
          Lunch Break
        </Badge>
      );
    case 'UNKNOWN':
    default:
      return (
        <Badge variant="neutral" size={size}>
          Unknown
        </Badge>
      );
  }
};
