import { useState, useEffect } from 'react';
import { X, Save, User as UserIcon } from 'lucide-react';
import { db } from '../../lib/db';
import { toast } from 'sonner';
import { useLiveQuery } from 'dexie-react-hooks';

interface AddMeetDialogProps {
  open: boolean;
  onClose: () => void;
}

export function AddMeetDialog({ open, onClose }: AddMeetDialogProps) {
  const [name, setName] = useState('');
  const [where, setWhere] = useState('');
  const [context, setContext] = useState('');
  const [nextStep, setNextStep] = useState('');
  const [isDraft, setIsDraft] = useState(false);

  const events = useLiveQuery(() => 
    db.events.orderBy('date').reverse().limit(5).toArray()
  ) ?? [];

  const [selectedEventId, setSelectedEventId] = useState<number | undefined>();

  useEffect(() => {
    if (open) {
      // Reset form when opened
      setName('');
      setWhere('');
      setContext('');
      setNextStep('');
      setIsDraft(false);
      setSelectedEventId(undefined);
    }
  }, [open]);

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Please enter a name');
      return;
    }

    try {
      // Create or find person
      let person = await db.people.where('name').equalsIgnoreCase(name.trim()).first();
      
      if (!person) {
        const personId = await db.people.add({
          name: name.trim(),
          createdAt: new Date(),
          updatedAt: new Date()
        });
        person = await db.people.get(personId);
      }

      // Create meet
      const meetId = await db.meets.add({
        personId: person!.id,
        eventId: selectedEventId,
        where: where.trim() || undefined,
        when: new Date(),
        context: context.trim() || undefined,
        nextStep: nextStep.trim() || undefined,
        isDraft,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      // Create follow-up if next step exists
      if (nextStep.trim()) {
        await db.followUps.add({
          meetId,
          personId: person!.id,
          description: nextStep.trim(),
          completed: false,
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }

      // Update person's updatedAt
      await db.people.update(person!.id!, { updatedAt: new Date() });

      toast.success(isDraft ? 'Draft saved' : 'Meet saved');
      onClose();
    } catch (error) {
      toast.error('Failed to save meet');
      console.error('Save error:', error);
    }
  };

  const handleQuickSave = async () => {
    setIsDraft(true);
    await handleSave();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-end sm:items-center justify-center">
      <div className="bg-zinc-900 w-full sm:max-w-md sm:rounded-lg rounded-t-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-zinc-900 border-b border-zinc-800 p-4 flex items-center justify-between">
          <h2 className="text-lg font-medium">Quick Meet</h2>
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
          {/* Name - Primary field */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-zinc-300 mb-1.5">
              Who did you meet? *
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Sarah Chen"
              autoFocus
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Where - Context */}
          <div>
            <label htmlFor="where" className="block text-sm font-medium text-zinc-300 mb-1.5">
              Where?
            </label>
            <input
              id="where"
              type="text"
              value={where}
              onChange={(e) => setWhere(e.target.value)}
              placeholder="e.g., Coffee chat at Grounds"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Event picker */}
          {events.length > 0 && (
            <div>
              <label htmlFor="event" className="block text-sm font-medium text-zinc-300 mb-1.5">
                Part of an event?
              </label>
              <select
                id="event"
                value={selectedEventId ?? ''}
                onChange={(e) => setSelectedEventId(e.target.value ? Number(e.target.value) : undefined)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">No event</option>
                {events.map(event => (
                  <option key={event.id} value={event.id}>
                    {event.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Context - What happened */}
          <div>
            <label htmlFor="context" className="block text-sm font-medium text-zinc-300 mb-1.5">
              What did you talk about?
            </label>
            <textarea
              id="context"
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="Quick notes about the conversation..."
              rows={3}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {/* Next Step */}
          <div>
            <label htmlFor="nextStep" className="block text-sm font-medium text-zinc-300 mb-1.5">
              Next step?
            </label>
            <input
              id="nextStep"
              type="text"
              value={nextStep}
              onChange={(e) => setNextStep(e.target.value)}
              placeholder="e.g., Send them the article I mentioned"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="sticky bottom-0 bg-zinc-900 border-t border-zinc-800 p-4 flex gap-3">
          <button
            onClick={handleQuickSave}
            className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg py-3 font-medium transition-colors"
          >
            Save Draft
          </button>
          <button
            onClick={handleSave}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-3 font-medium transition-colors flex items-center justify-center gap-2"
          >
            <Save className="w-4 h-4" />
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
