import React, { useState } from 'react';
import { Classroom, ExtraClassBooking } from '../../types';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { AlertCircle, Calendar, Clock, BookOpen, Users, FileText } from 'lucide-react';

export interface ExtraClassModalProps {
  isOpen: boolean;
  onClose: () => void;
  classroom?: Classroom | null;
  allClassrooms?: Classroom[];
  onSubmitBooking: (booking: Omit<ExtraClassBooking, 'id' | 'status' | 'created_at'>) => Promise<unknown>;
}

export const ExtraClassModal: React.FC<ExtraClassModalProps> = ({
  isOpen,
  onClose,
  classroom,
  allClassrooms = [],
  onSubmitBooking,
}) => {
  const todayStr = new Date().toISOString().split('T')[0];

  const [selectedRoomId, setSelectedRoomId] = useState<number>(classroom?.id || (allClassrooms[0]?.id ?? 1));
  const [date, setDate] = useState<string>(todayStr);
  const [startTime, setStartTime] = useState<string>('14:30');
  const [endTime, setEndTime] = useState<string>('15:30');
  const [subject, setSubject] = useState<string>('');
  const [expectedStudents, setExpectedStudents] = useState<number>(40);
  const [notes, setNotes] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Sync if classroom prop changes
  React.useEffect(() => {
    if (classroom) {
      setSelectedRoomId(classroom.id);
    }
  }, [classroom]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    // Validation
    if (!subject.trim()) {
      setErrorMsg('Subject or event title is required.');
      return;
    }

    if (date < todayStr) {
      setErrorMsg('Booking date cannot be in the past.');
      return;
    }

    if (startTime >= endTime) {
      setErrorMsg('Start time must be before end time.');
      return;
    }

    if (expectedStudents <= 0 || expectedStudents > 120) {
      setErrorMsg('Expected students must be between 1 and 120.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmitBooking({
        classroom_id: selectedRoomId,
        classroom_name: allClassrooms.find(c => c.id === selectedRoomId)?.name || `Room ${selectedRoomId}`,
        date,
        start_time: startTime,
        end_time: endTime,
        subject: subject.trim(),
        expected_students: Number(expectedStudents),
        notes: notes.trim() || undefined,
      });

      // Reset form and close
      setSubject('');
      setNotes('');
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Classroom is already reserved for this slot';
      setErrorMsg(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Reserve Extra Class / Event"
      subtitle="Overrides automatic HVAC shutdown schedule with verified reservation"
      maxWidth="md"
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleSubmit}
            isLoading={isSubmitting}
          >
            Confirm Reservation
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMsg && (
          <div className="p-3 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Classroom Selection */}
        <div>
          <label htmlFor="classroom-select" className="block text-xs font-medium text-slate-300 mb-1.5">
            Select Classroom
          </label>
          <select
            id="classroom-select"
            value={selectedRoomId}
            onChange={e => setSelectedRoomId(Number(e.target.value))}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-cyan-500"
          >
            {allClassrooms.length > 0 ? (
              allClassrooms.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} — Cap: {c.capacity} students (Load: {c.connected_load_kw} kW)
                </option>
              ))
            ) : classroom ? (
              <option value={classroom.id}>{classroom.name}</option>
            ) : (
              <option value={1}>LS-03</option>
            )}
          </select>
        </div>

        {/* Date and Time */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label htmlFor="booking-date" className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-cyan-400" />
              <span>Date</span>
            </label>
            <input
              id="booking-date"
              type="date"
              value={date}
              min={todayStr}
              onChange={e => setDate(e.target.value)}
              required
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div>
            <label htmlFor="start-time" className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-cyan-400" />
              <span>Start</span>
            </label>
            <input
              id="start-time"
              type="time"
              value={startTime}
              onChange={e => setStartTime(e.target.value)}
              required
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div>
            <label htmlFor="end-time" className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-cyan-400" />
              <span>End</span>
            </label>
            <input
              id="end-time"
              type="time"
              value={endTime}
              onChange={e => setEndTime(e.target.value)}
              required
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>

        {/* Subject */}
        <div>
          <label htmlFor="booking-subject" className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center gap-1">
            <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
            <span>Subject / Session Name</span>
          </label>
          <input
            id="booking-subject"
            type="text"
            placeholder="e.g., Remedial AI Lab, Industry Guest Lecture"
            value={subject}
            onChange={e => setSubject(e.target.value)}
            required
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-cyan-500 placeholder-slate-500"
          />
        </div>

        {/* Expected Students */}
        <div>
          <label htmlFor="expected-students" className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center gap-1">
            <Users className="w-3.5 h-3.5 text-cyan-400" />
            <span>Expected Students</span>
          </label>
          <input
            id="expected-students"
            type="number"
            min={1}
            max={120}
            value={expectedStudents}
            onChange={e => setExpectedStudents(Number(e.target.value))}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-cyan-500"
          />
        </div>

        {/* Notes */}
        <div>
          <label htmlFor="booking-notes" className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center gap-1">
            <FileText className="w-3.5 h-3.5 text-slate-400" />
            <span>Special Instructions / Equipment</span>
          </label>
          <textarea
            id="booking-notes"
            rows={2}
            placeholder="e.g. Need audio visual setup, 2 fans sufficient"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-cyan-500 placeholder-slate-500 resize-none"
          />
        </div>
      </form>
    </Modal>
  );
};
