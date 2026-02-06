import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../lib/db';
import { ArrowLeft, Calendar, MapPin, Users, Trash2, Edit } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface EventDetailViewProps {
  eventId: number;
  onBack: () => void;
  onPersonSelect: (personId: number) => void;
}

export function EventDetailView({ eventId, onBack, onPersonSelect }: EventDetailViewProps) {
  const event = useLiveQuery(() => db.events.get(eventId), [eventId]);
  
  const meets = useLiveQuery(
    () => db.meets.where('eventId').equals(eventId).toArray(),
    [eventId]
  ) ?? [];

  // Get unique people from meets
  const peopleIds = useLiveQuery(
    async () => {
      const eventMeets = await db.meets.where('eventId').equals(eventId).toArray();
      const ids = [...new Set(eventMeets.map(m => m.personId).filter(Boolean))];
      return ids as number[];
    },
    [eventId]
  ) ?? [];

  const people = useLiveQuery(
    async () => {
      if (peopleIds.length === 0) return [];
      return await db.people.where('id').anyOf(peopleIds).toArray();
    },
    [peopleIds]
  ) ?? [];

  const handleDelete = async () => {
    if (!confirm(`Delete ${event?.name}? Meets will be kept but unlinked from this event.`)) {
      return;
    }

    try {
      // Unlink meets from this event
      await db.meets.where('eventId').equals(eventId).modify({ eventId: undefined });
      await db.events.delete(eventId);

      toast.success('Event deleted');
      onBack();
    } catch (error) {
      toast.error('Failed to delete event');
      console.error('Delete error:', error);
    }
  };

  if (!event) {
    return (
      <div className="p-4 max-w-screen-sm mx-auto">
        <button onClick={onBack} className="flex items-center gap-2 text-zinc-400 mb-4">
          <ArrowLeft className="w-5 h-5" />
          Back
        </button>
        <p className="text-zinc-500">Event not found</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full max-w-screen-sm mx-auto">
      {/* Header */}
      <div className="border-b border-zinc-800 bg-zinc-950">
        <div className="p-4">
          <button 
            onClick={onBack} 
            className="flex items-center gap-2 text-zinc-400 hover:text-zinc-200 mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            Back
          </button>

          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex flex-col items-center justify-center flex-shrink-0">
              <span className="text-xs text-white font-medium">
                {format(new Date(event.date), 'MMM')}
              </span>
              <span className="text-2xl text-white font-bold">
                {format(new Date(event.date), 'd')}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-medium mb-1">{event.name}</h1>
              <p className="text-zinc-400 mb-1">
                {format(new Date(event.date), 'EEEE, MMMM d, yyyy')}
              </p>
              {event.location && (
                <p className="text-sm text-zinc-500 flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {event.location}
                </p>
              )}
            </div>
          </div>

          {event.notes && (
            <div className="mt-4 bg-zinc-900 border border-zinc-800 rounded-lg p-3">
              <p className="text-sm text-zinc-300">{event.notes}</p>
            </div>
          )}

          <div className="flex gap-2 mt-4">
            <button className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg py-2 text-sm font-medium transition-colors flex items-center justify-center gap-2">
              <Edit className="w-4 h-4" />
              Edit
            </button>
            <button 
              onClick={handleDelete}
              className="bg-red-950 hover:bg-red-900 text-red-200 rounded-lg px-4 py-2 text-sm font-medium transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto pb-20 p-4 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
            <Users className="w-5 h-5 text-zinc-500 mb-2" />
            <div className="text-2xl font-bold text-zinc-100">{people.length}</div>
            <div className="text-sm text-zinc-400">People Met</div>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
            <Calendar className="w-5 h-5 text-zinc-500 mb-2" />
            <div className="text-2xl font-bold text-zinc-100">{meets.length}</div>
            <div className="text-sm text-zinc-400">Interactions</div>
          </div>
        </div>

        {/* People met at this event */}
        <section>
          <h2 className="text-sm uppercase tracking-wide text-zinc-500 mb-3">
            People Met
          </h2>
          {people.length === 0 ? (
            <p className="text-sm text-zinc-600 italic">No one recorded yet</p>
          ) : (
            <div className="space-y-2">
              {people.map(person => (
                <button
                  key={person.id}
                  onClick={() => onPersonSelect(person.id!)}
                  className="w-full bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 rounded-lg p-3 flex items-center gap-3 transition-colors text-left"
                >
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center flex-shrink-0">
                    {person.photoUrl ? (
                      <img 
                        src={person.photoUrl} 
                        alt={person.name}
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      <span className="text-white font-medium text-sm">
                        {person.name.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-zinc-100">{person.name}</h3>
                    {(person.role || person.company) && (
                      <p className="text-sm text-zinc-400">
                        {[person.role, person.company].filter(Boolean).join(' at ')}
                      </p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
