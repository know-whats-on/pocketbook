import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../lib/db';
import { Calendar, MapPin } from 'lucide-react';
import { format, isPast } from 'date-fns';

interface EventsViewProps {
  onEventSelect: (eventId: number) => void;
}

export function EventsView({ onEventSelect }: EventsViewProps) {
  const events = useLiveQuery(
    () => db.events.orderBy('date').reverse().toArray()
  ) ?? [];

  const upcomingEvents = events.filter(e => !isPast(new Date(e.date)));
  const pastEvents = events.filter(e => isPast(new Date(e.date)));

  return (
    <div className="flex flex-col h-full max-w-screen-sm mx-auto">
      <div className="p-4 border-b border-zinc-800 bg-zinc-950">
        <h1 className="text-2xl mb-1">Events</h1>
        <p className="text-sm text-zinc-400">Places where you meet people</p>
      </div>

      <div className="flex-1 overflow-y-auto pb-20">
        {events.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-8 text-center">
            <Calendar className="w-12 h-12 text-zinc-700 mb-3" />
            <p className="text-zinc-500 mb-1">No events yet</p>
            <p className="text-sm text-zinc-600">
              Add events to group your networking meets
            </p>
          </div>
        ) : (
          <div className="p-4 space-y-6">
            {upcomingEvents.length > 0 && (
              <section>
                <h2 className="text-sm uppercase tracking-wide text-zinc-500 mb-3">Upcoming</h2>
                <div className="space-y-3">
                  {upcomingEvents.map(event => (
                    <EventCard key={event.id} event={event} onSelect={onEventSelect} />
                  ))}
                </div>
              </section>
            )}

            {pastEvents.length > 0 && (
              <section>
                <h2 className="text-sm uppercase tracking-wide text-zinc-500 mb-3">Past</h2>
                <div className="space-y-3">
                  {pastEvents.map(event => (
                    <EventCard key={event.id} event={event} onSelect={onEventSelect} isPast />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

interface EventCardProps {
  event: any;
  onSelect: (eventId: number) => void;
  isPast?: boolean;
}

function EventCard({ event, onSelect, isPast }: EventCardProps) {
  return (
    <button
      onClick={() => onSelect(event.id)}
      className={`w-full text-left border rounded-lg p-4 transition-colors ${
        isPast 
          ? 'bg-zinc-900/50 border-zinc-800 hover:bg-zinc-900' 
          : 'bg-zinc-900 border-zinc-800 hover:bg-zinc-800'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className={`w-12 h-12 rounded-lg flex flex-col items-center justify-center flex-shrink-0 ${
          isPast ? 'bg-zinc-800' : 'bg-gradient-to-br from-green-500 to-emerald-600'
        }`}>
          <span className="text-xs text-white font-medium">
            {format(new Date(event.date), 'MMM')}
          </span>
          <span className="text-lg text-white font-bold">
            {format(new Date(event.date), 'd')}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className={`font-medium mb-1 ${isPast ? 'text-zinc-400' : 'text-zinc-100'}`}>
            {event.name}
          </h3>
          {event.location && (
            <p className="text-sm text-zinc-500 flex items-center gap-1 mb-1">
              <MapPin className="w-3 h-3" />
              {event.location}
            </p>
          )}
          <p className={`text-sm ${isPast ? 'text-zinc-600' : 'text-zinc-400'}`}>
            {format(new Date(event.date), 'EEEE, MMMM d, yyyy')}
          </p>
          {event.notes && (
            <p className="text-sm text-zinc-500 mt-2 line-clamp-2">{event.notes}</p>
          )}
        </div>
      </div>
    </button>
  );
}
