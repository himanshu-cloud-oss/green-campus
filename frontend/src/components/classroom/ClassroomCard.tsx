import React from 'react';
import { Classroom, OccupancyStatus } from '../../types';
import { Card } from '../ui/Card';
import { OccupancyBadge } from './OccupancyBadge';
import { DeviceStateIndicator } from './DeviceStateIndicator';
import { Button } from '../ui/Button';
import { formatDateTime } from '../../utils/formatters';
import { BookOpen, User, Users, AlertTriangle, PlusCircle, CheckCircle2, Zap } from 'lucide-react';

export interface ClassroomCardProps {
  classroom: Classroom;
  onSimulateEmpty: (classroomId: number) => void;
  onOpenBookingModal: (classroom: Classroom) => void;
  onToggleDevice?: (classroomId: number, device: 'ac_on' | 'fan_on' | 'lights_on', newValue: boolean) => void;
}

export const ClassroomCard: React.FC<ClassroomCardProps> = ({
  classroom,
  onSimulateEmpty,
  onOpenBookingModal,
  onToggleDevice,
}) => {
  const currentStatus = classroom.current_status;
  const occupancy: OccupancyStatus = currentStatus?.occupancy_status || 'UNKNOWN';
  const entry = currentStatus?.timetable_entry;
  const booking = currentStatus?.active_booking;
  const simulation = currentStatus?.active_simulation;

  const isScheduledOccupied = occupancy === 'SCHEDULED_OCCUPIED';
  const isSimulatedNoShow = occupancy === 'NO_SHOW_SIMULATED';
  const isExtraClass = occupancy === 'EXTRA_CLASS';

  // Card border glow color depending on status
  const glow = isSimulatedNoShow
    ? 'amber'
    : isScheduledOccupied
    ? 'cyan'
    : isExtraClass
    ? 'violet'
    : 'none';

  return (
    <Card
      glow={glow}
      className="flex flex-col justify-between transition-all duration-200 hover:border-slate-600/70"
    >
      <div>
        {/* Card Header: Room Name & Status */}
        <div className="flex items-start justify-between gap-2 border-b border-slate-800 pb-3 mb-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-white tracking-tight">{classroom.name}</h3>
              <span className="text-[11px] font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                Cap: {classroom.capacity}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-1">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>Base Load: {classroom.connected_load_kw} kW</span>
            </div>
          </div>

          <div className="flex flex-col items-end gap-1">
            <OccupancyBadge status={occupancy} size="sm" />
            {classroom.device_state?.source && (
              <span className="text-[9px] font-mono text-slate-400 uppercase tracking-wider">
                Source: {classroom.device_state.source}
              </span>
            )}
          </div>
        </div>

        {/* Schedule / Class Info Banner */}
        <div className="mb-4 bg-slate-950/40 rounded-xl p-3 border border-slate-800/80">
          {isExtraClass && booking ? (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-purple-400 font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-purple-400" />
                  Extra Class Session
                </span>
                <span className="text-slate-400 font-mono text-[11px]">
                  {booking.start_time} - {booking.end_time}
                </span>
              </div>
              <div className="text-sm font-medium text-slate-100">{booking.subject}</div>
              <div className="text-xs text-slate-400 flex items-center gap-2">
                <Users className="w-3.5 h-3.5" />
                <span>~{booking.expected_students} attendees</span>
                {booking.notes && <span className="italic text-slate-400">({booking.notes})</span>}
              </div>
            </div>
          ) : entry ? (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-cyan-400 font-semibold font-mono">
                  {entry.period_number} ({entry.start_time} - {entry.end_time})
                </span>
                {entry.section && (
                  <span className="text-[11px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded">
                    Sec: {entry.section}
                  </span>
                )}
              </div>
              <div className="text-sm font-medium text-slate-100 flex items-center gap-1.5 truncate">
                <BookOpen className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span className="truncate">{entry.subject}</span>
              </div>
              <div className="text-xs text-slate-400 flex items-center gap-1.5 truncate">
                <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="truncate">{entry.teacher}</span>
              </div>
            </div>
          ) : occupancy === 'LUNCH' ? (
            <div className="text-center py-2">
              <div className="text-sm font-medium text-emerald-400">Lunch Break Active</div>
              <div className="text-xs text-slate-400">HVAC running in eco/standby mode</div>
            </div>
          ) : (
            <div className="text-center py-2">
              <div className="text-sm font-medium text-slate-400">No scheduled class currently</div>
              <div className="text-xs text-slate-400">Classroom vacant • Energy saved</div>
            </div>
          )}

          {/* Active simulation warning tag */}
          {isSimulatedNoShow && simulation && (
            <div className="mt-2.5 p-2 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 animate-bounce" />
                <span className="font-semibold">Simulated Empty</span>
              </div>
              <span className="font-mono text-[11px]">
                {simulation.seconds_remaining && simulation.seconds_remaining > 0
                  ? `${simulation.seconds_remaining}s to cutoff`
                  : 'Action pending'}
              </span>
            </div>
          )}
        </div>

        {/* Device State Indicator */}
        <div className="mb-4">
          <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider mb-2 flex justify-between">
            <span>Connected Devices</span>
            <span className="text-slate-400 font-normal">Click icon to override</span>
          </div>
          <DeviceStateIndicator
            deviceState={classroom.device_state}
            interactive={true}
            onToggleDevice={(dev, val) => onToggleDevice?.(classroom.id, dev, val)}
          />
        </div>
      </div>

      {/* Card Footer: Action Buttons & Last Updated */}
      <div className="pt-3 border-t border-slate-800/80 mt-2">
        <div className="flex items-center gap-2">
          {isScheduledOccupied ? (
            <Button
              variant="outline"
              size="xs"
              className="flex-1 border-amber-500/40 text-amber-400 hover:bg-amber-500/10 hover:border-amber-400 text-xs"
              onClick={() => onSimulateEmpty(classroom.id)}
              icon={<AlertTriangle className="w-3.5 h-3.5" />}
            >
              Simulate Empty
            </Button>
          ) : null}

          <Button
            variant="secondary"
            size="xs"
            className="flex-1 text-xs"
            onClick={() => onOpenBookingModal(classroom)}
            icon={<PlusCircle className="w-3.5 h-3.5 text-cyan-400" />}
          >
            Extra Class
          </Button>
        </div>

        <div className="mt-2 text-right">
          <span className="text-[10px] text-slate-400">
            Updated: {classroom.device_state?.updated_at ? formatDateTime(classroom.device_state.updated_at) : 'Just now'}
          </span>
        </div>
      </div>
    </Card>
  );
};
