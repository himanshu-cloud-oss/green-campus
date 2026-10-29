import React, { useState } from 'react';
import { Classroom, ExtraClassBooking } from '../../types';
import { ClassroomCard } from './ClassroomCard';
import { ExtraClassModal } from './ExtraClassModal';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { EmptyState } from '../ui/EmptyState';
import { School, Filter } from 'lucide-react';

export interface ClassroomGridProps {
  classrooms: Classroom[];
  isLoading: boolean;
  onSimulateEmpty: (classroomId: number) => void;
  onSubmitBooking: (booking: Omit<ExtraClassBooking, 'id' | 'status' | 'created_at'>) => Promise<unknown>;
  onToggleDevice?: (classroomId: number, device: 'ac_on' | 'fan_on' | 'lights_on', newValue: boolean) => void;
}

export const ClassroomGrid: React.FC<ClassroomGridProps> = ({
  classrooms,
  isLoading,
  onSimulateEmpty,
  onSubmitBooking,
  onToggleDevice,
}) => {
  const [filter, setFilter] = useState<string>('ALL');
  const [activeModalRoom, setActiveModalRoom] = useState<Classroom | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  const filteredRooms = classrooms.filter(c => {
    const status = c.current_status?.occupancy_status;
    if (filter === 'OCCUPIED') return status === 'SCHEDULED_OCCUPIED';
    if (filter === 'VACANT') return status === 'VACANT';
    if (filter === 'SIMULATED') return status === 'NO_SHOW_SIMULATED';
    if (filter === 'EXTRA') return status === 'EXTRA_CLASS';
    return true;
  });

  const handleOpenBooking = (room: Classroom) => {
    setActiveModalRoom(room);
    setIsModalOpen(true);
  };

  if (isLoading && classrooms.length === 0) {
    return <LoadingSpinner text="Loading classroom statuses and smart sensors..." />;
  }

  return (
    <div className="space-y-4">
      {/* Filters and Counters */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-900/40 rounded-xl border border-slate-800">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-medium text-slate-300">Filter Rooms:</span>
          <div className="flex flex-wrap gap-1.5">
            {[
              { id: 'ALL', label: `All (${classrooms.length})` },
              {
                id: 'OCCUPIED',
                label: `Occupied (${classrooms.filter(c => c.current_status?.occupancy_status === 'SCHEDULED_OCCUPIED').length})`,
              },
              {
                id: 'VACANT',
                label: `Vacant (${classrooms.filter(c => c.current_status?.occupancy_status === 'VACANT').length})`,
              },
              {
                id: 'SIMULATED',
                label: `Simulated (${classrooms.filter(c => c.current_status?.occupancy_status === 'NO_SHOW_SIMULATED').length})`,
              },
              {
                id: 'EXTRA',
                label: `Extra Class (${classrooms.filter(c => c.current_status?.occupancy_status === 'EXTRA_CLASS').length})`,
              },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setFilter(tab.id)}
                className={`text-xs px-2.5 py-1 rounded-lg transition-all ${
                  filter === tab.id
                    ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm'
                    : 'text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={() => {
            setActiveModalRoom(null);
            setIsModalOpen(true);
          }}
          className="text-xs font-medium text-cyan-400 hover:text-cyan-300 hover:underline cursor-pointer"
        >
          + Schedule Event for Any Room
        </button>
      </div>

      {/* Grid */}
      {filteredRooms.length === 0 ? (
        <EmptyState
          icon={<School className="w-8 h-8 text-cyan-400" />}
          title="No Classrooms Match Filter"
          description="Try changing the filter chips above or check the active timetable day."
          actionLabel="Show All Classrooms"
          onAction={() => setFilter('ALL')}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredRooms.map(room => (
            <ClassroomCard
              key={room.id}
              classroom={room}
              onSimulateEmpty={onSimulateEmpty}
              onOpenBookingModal={handleOpenBooking}
              onToggleDevice={onToggleDevice}
            />
          ))}
        </div>
      )}

      {/* Extra Class Booking Modal */}
      <ExtraClassModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        classroom={activeModalRoom}
        allClassrooms={classrooms}
        onSubmitBooking={onSubmitBooking}
      />
    </div>
  );
};
