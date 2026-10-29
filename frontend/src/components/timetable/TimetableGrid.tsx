import React, { useState } from 'react';
import { TimetableEntry, PeriodDefinition, Classroom } from '../../types';
import { STANDARD_PERIODS } from '../../utils/timeUtils';
import { Modal } from '../ui/Modal';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { BookOpen, User, Users, Clock, MapPin, Sparkles } from 'lucide-react';

export interface TimetableGridProps {
  entries: TimetableEntry[];
  periods?: PeriodDefinition[];
  classrooms?: Classroom[];
  activePeriodNumber?: string | null;
  onSimulateNoShow?: (classroomId: number, periodLabel: string) => void;
}

export const TimetableGrid: React.FC<TimetableGridProps> = ({
  entries,
  periods = STANDARD_PERIODS,
  classrooms = [
    { id: 1, name: 'LS-03', capacity: 65, connected_load_kw: 4.5 },
    { id: 2, name: 'LS-04', capacity: 60, connected_load_kw: 4.5 },
    { id: 3, name: 'LS-08', capacity: 70, connected_load_kw: 5.2 },
    { id: 4, name: 'LS-09', capacity: 65, connected_load_kw: 4.8 },
    { id: 5, name: 'LS-10', capacity: 75, connected_load_kw: 5.5 },
  ],
  activePeriodNumber,
  onSimulateNoShow,
}) => {
  const [selectedCell, setSelectedCell] = useState<{
    entry?: TimetableEntry;
    period: PeriodDefinition;
    classroom: Classroom;
  } | null>(null);

  const getEntry = (roomId: number, periodNum: string) => {
    return entries.find(
      e => e.classroom_id === roomId && e.period_number.toUpperCase() === periodNum.toUpperCase()
    );
  };

  return (
    <div className="w-full space-y-3">
      {/* Scrollable Matrix */}
      <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/60 backdrop-blur-md">
        <table className="w-full border-collapse text-left text-xs">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-900">
              <th className="py-3 px-3 text-slate-400 font-semibold uppercase tracking-wider w-36 sticky left-0 bg-slate-900 z-10">
                Period / Time
              </th>
              {classrooms.map(room => (
                <th key={room.id} className="py-3 px-3 text-white font-bold min-w-[170px]">
                  <div className="flex items-center justify-between">
                    <span>{room.name}</span>
                    <span className="text-[10px] text-slate-400 font-normal font-mono">
                      Cap: {room.capacity}
                    </span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {periods.map(period => {
              const isCurrent = activePeriodNumber === period.period_number;

              // Special Lunch Row
              if (period.is_break || period.period_number === 'LUNCH') {
                return (
                  <tr
                    key={period.period_number}
                    className="bg-amber-500/10 border-y border-amber-500/20 text-center"
                  >
                    <td className="py-3 px-3 font-semibold text-amber-300 sticky left-0 bg-slate-900/90 border-r border-slate-800">
                      <div className="flex flex-col">
                        <span>{period.label}</span>
                        <span className="text-[10px] text-amber-400/80 font-mono">
                          {period.start_time} - {period.end_time}
                        </span>
                      </div>
                    </td>
                    <td colSpan={classrooms.length} className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-2 text-amber-300 font-semibold tracking-wide uppercase text-[11px]">
                        <span>⚡ CAMPUS LUNCH BREAK — AUTOMATED LOW-POWER ECO MODE ACTIVE</span>
                      </div>
                    </td>
                  </tr>
                );
              }

              return (
                <tr
                  key={period.period_number}
                  className={`transition-colors hover:bg-slate-800/30 ${
                    isCurrent ? 'bg-cyan-500/5 ring-1 ring-cyan-500/30' : ''
                  }`}
                >
                  {/* Period Time Column */}
                  <td
                    className={`py-3 px-3 sticky left-0 z-10 border-r border-slate-800/80 ${
                      isCurrent ? 'bg-cyan-950/80 text-cyan-300' : 'bg-slate-900/90 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold">{period.period_number}</span>
                      {isCurrent && (
                        <span className="h-2 w-2 rounded-full bg-cyan-400 animate-ping" title="Active Now" />
                      )}
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                      {period.start_time} - {period.end_time}
                    </div>
                  </td>

                  {/* Classroom Columns */}
                  {classrooms.map(room => {
                    const entry = getEntry(room.id, period.period_number);
                    const isOccupied = !!entry;

                    return (
                      <td
                        key={`${room.id}-${period.period_number}`}
                        onClick={() => setSelectedCell({ entry, period, classroom: room })}
                        className={`p-2.5 transition-all cursor-pointer align-top border-r border-slate-800/40 last:border-r-0 ${
                          isOccupied
                            ? 'bg-cyan-950/20 hover:bg-cyan-900/30'
                            : 'bg-slate-950/20 hover:bg-slate-900/50 text-slate-500'
                        }`}
                      >
                        {entry ? (
                          <div className="space-y-1">
                            <div className="font-semibold text-slate-100 text-xs line-clamp-1 group-hover:text-cyan-300">
                              {entry.subject}
                            </div>
                            <div className="text-[11px] text-slate-400 truncate flex items-center gap-1">
                              <span>{entry.teacher}</span>
                            </div>
                            {entry.section && (
                              <div className="inline-block text-[10px] px-1.5 py-0.2 bg-slate-800 text-cyan-300 rounded border border-slate-700">
                                {entry.section}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="h-10 flex items-center justify-center text-slate-400 font-mono text-sm">
                            —
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Detail Popup Modal */}
      {selectedCell && (
        <Modal
          isOpen={!!selectedCell}
          onClose={() => setSelectedCell(null)}
          title={
            selectedCell.entry
              ? `${selectedCell.entry.subject}`
              : `Vacant Slot (${selectedCell.classroom.name})`
          }
          subtitle={`${selectedCell.classroom.name} • ${selectedCell.period.label} (${selectedCell.period.start_time} - ${selectedCell.period.end_time})`}
          maxWidth="md"
          footer={
            <>
              {selectedCell.entry && onSimulateNoShow && (
                <Button
                  variant="outline"
                  size="sm"
                  className="border-amber-500/40 text-amber-400 hover:bg-amber-500/10"
                  onClick={() => {
                    onSimulateNoShow(
                      selectedCell.classroom.id,
                      `${selectedCell.period.period_number} (${selectedCell.period.start_time})`
                    );
                    setSelectedCell(null);
                  }}
                  icon={<Sparkles className="w-3.5 h-3.5" />}
                >
                  Simulate Empty Class Cutoff
                </Button>
              )}
              <Button variant="secondary" size="sm" onClick={() => setSelectedCell(null)}>
                Close
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            {selectedCell.entry ? (
              <>
                <div className="p-3 bg-slate-800/60 rounded-xl space-y-2 border border-slate-700">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Class Status:</span>
                    <Badge variant="info" size="sm" dot>
                      Scheduled Occupied
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Faculty In-charge:</span>
                    <span className="text-slate-100 font-medium flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-cyan-400" />
                      {selectedCell.entry.teacher}
                    </span>
                  </div>
                  {selectedCell.entry.section && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">Student Section:</span>
                      <span className="text-cyan-300 font-mono font-semibold">
                        {selectedCell.entry.section}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Classroom Location:</span>
                    <span className="text-slate-200 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      Block A, Room {selectedCell.classroom.name}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Room Capacity:</span>
                    <span className="text-slate-200 font-mono">
                      {selectedCell.classroom.capacity} seats
                    </span>
                  </div>
                </div>

                <div className="p-3 bg-cyan-950/20 border border-cyan-500/20 rounded-xl text-xs text-slate-300 leading-relaxed">
                  <span className="font-semibold text-cyan-400">Smart Energy Automation:</span> HVAC
                  and lighting are pre-cooled 5 minutes prior to start ({selectedCell.period.start_time})
                  and automatically verified against occupancy sensors.
                </div>
              </>
            ) : (
              <div className="space-y-3">
                <div className="p-4 bg-slate-800/40 rounded-xl border border-slate-700/60 text-center">
                  <div className="text-emerald-400 font-semibold text-sm">Room is Currently Vacant</div>
                  <div className="text-xs text-slate-400 mt-1">
                    All HVAC cooling, ceiling fans, and LED fixtures remain in standby shutoff to prevent
                    unnecessary power drain.
                  </div>
                </div>
                <div className="flex justify-between items-center text-xs p-3 bg-slate-900 rounded-lg border border-slate-800">
                  <span className="text-slate-400">Estimated Saved Load:</span>
                  <span className="font-mono text-emerald-400 font-bold">
                    ~{selectedCell.classroom.connected_load_kw} kW / hour
                  </span>
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};
