import { useState, useEffect } from 'react';
import { X, Save, Calendar } from 'lucide-react';
import { db } from '../../lib/db';
import { toast } from 'sonner';

interface AddEventDialogProps {
  open: boolean;
  onClose: () => void;
}

export function AddEventDialog({ open, onClose }: AddEventDialogProps) {
  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (open) {
      // Set default to today
      const today = new Date();
      const dateStr = today.toISOString().split('T')[0];
      const timeStr = today.toTimeString().slice(0, 5); // HH:mm format
      setDate(dateStr);
      setTime(timeStr);
      setName('');
      setLocation('');
      setNotes('');
    }
  }, [open]);

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Please enter an event name');
      return;
    }

    if (!date) {
      toast.error('Please select a date');
      return;
    }

    try {
      // Combine date and time into a single Date object
      let eventDate = new Date(date);
      if (time) {
        const [hours, minutes] = time.split(':').map(Number);
        eventDate.setHours(hours, minutes, 0, 0);
      }

      await db.events.add({
        name: name.trim(),
        date: eventDate,
        location: location.trim() || undefined,
        notes: notes.trim() || undefined,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      toast.success('Event saved');
      onClose();
    } catch (error) {
      toast.error('Failed to save event');
      console.error('Save error:', error);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-end sm:items-center justify-center">
      <div className="bg-zinc-900 w-full sm:max-w-md sm:rounded-lg rounded-t-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-zinc-900 border-b border-zinc-800 p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-green-400" />
            <h2 className="text-lg font-medium">New Event</h2>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-200"
            aria-label="Close"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <div className="p-4 space-y-4">
          <div>
            <label htmlFor="event-name" className="block text-sm font-medium text-zinc-300 mb-1.5">
              Event name *
            </label>
            <input
              id="event-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Tech Meetup Sydney"
              autoFocus
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          <div>
            <label htmlFor="event-date" className="block text-sm font-medium text-zinc-300 mb-1.5">
              Date *
            </label>
            <input
              id="event-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          <div>
            <label htmlFor="event-time" className="block text-sm font-medium text-zinc-300 mb-1.5">
              Time
            </label>
            <input
              id="event-time"
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          <div>
            <label htmlFor="event-location" className="block text-sm font-medium text-zinc-300 mb-1.5">
              Location
            </label>
            <input
              id="event-location"
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g., WeWork Sydney"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          <div>
            <label htmlFor="event-notes" className="block text-sm font-medium text-zinc-300 mb-1.5">
              Notes
            </label>
            <textarea
              id="event-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional details..."
              rows={3}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="sticky bottom-0 bg-zinc-900 border-t border-zinc-800 p-4">
          <button
            onClick={handleSave}
            className="w-full bg-green-600 hover:bg-green-700 text-white rounded-lg py-3 font-medium transition-colors flex items-center justify-center gap-2"
          >
            <Save className="w-4 h-4" />
            Save Event
          </button>
        </div>
      </div>
    </div>
  );
}