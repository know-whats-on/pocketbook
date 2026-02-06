import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../lib/db';
import { Calendar, MapPin, Plus, Search, Users, Clock, TrendingUp } from 'lucide-react';
import { format, isToday, isFuture } from 'date-fns';
import { useState } from 'react';

interface EventsViewV2Props {
  onEventSelect: (eventId: number) => void;
  onQuickEvent?: () => void;
}

export function EventsViewV2({ onEventSelect, onQuickEvent }: EventsViewV2Props) {
  const [searchQuery, setSearchQuery] = useState('');

  const events = useLiveQuery(
    async () => {
      const allEvents = await db.events.orderBy('date').reverse().toArray();
      
      if (!searchQuery) return allEvents;
      
      const query = searchQuery.toLowerCase();
      return allEvents.filter(event => 
        event.name.toLowerCase().includes(query) ||
        event.location?.toLowerCase().includes(query) ||
        event.series?.toLowerCase().includes(query)
      );
    },
    [searchQuery]
  ) ?? [];

  const upcomingEvents = events.filter(e => isFuture(new Date(e.date)));
  const pastEvents = events.filter(e => !isFuture(new Date(e.date)));

  const handleQuickEvent = async () => {
    const now = new Date();
    const eventId = await db.events.add({
      name: format(now, 'EEEE, MMM d'),
      date: now,
      createdAt: now,
      updatedAt: now
    });
    onEventSelect(eventId as number);
  };

  return (
    <div className="flex flex-col h-full max-w-screen-sm mx-auto">
      <div className="p-4 border-b border-zinc-800 bg-zinc-950">
        <h1 className="text-2xl mb-3">Events</h1>
        
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
            <input
              type="search"
              placeholder="Search events..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            onClick={handleQuickEvent}
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2.5 flex items-center gap-2 transition-colors"
            title="Quick Event: Today"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-20">
        {events.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-8 text-center">
            <Calendar className="w-12 h-12 text-zinc-700 mb-3" />
            <p className="text-zinc-500 mb-1">
              {searchQuery ? 'No events found' : 'No events yet'}
            </p>
            <p className="text-sm text-zinc-600">
              {searchQuery ? 'Try a different search' : 'Create a quick event to get started'}
            </p>
          </div>
        ) : (
          <div className="p-4 space-y-6">
            {/* Upcoming Events */}
            {upcomingEvents.length > 0 && (
              <section>
                <h2 className="text-sm font-medium text-zinc-400 mb-3 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Upcoming
                </h2>
                <div className="space-y-2">
                  {upcomingEvents.map(event => (
                    <EventCard key={event.id} event={event} onSelect={onEventSelect} />
                  ))}
                </div>
              </section>
            )}

            {/* Past Events */}
            {pastEvents.length > 0 && (
              <section>
                <h2 className="text-sm font-medium text-zinc-400 mb-3">Past Events</h2>
                <div className="space-y-2">
                  {pastEvents.map(event => (
                    <EventCard key={event.id} event={event} onSelect={onEventSelect} />
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

function EventCard({ event, onSelect }: { event: any; onSelect: (id: number) => void }) {
  const peopleCount = useLiveQuery(
    () => db.meets.where('eventId').equals(event.id!).count(),
    [event.id]
  ) ?? 0;

  const followUpsCount = useLiveQuery(
    async () => {
      const meets = await db.meets.where('eventId').equals(event.id!).toArray();
      const meetIds = meets.map(m => m.id!);
      let count = 0;
      for (const meetId of meetIds) {
        count += await db.followUps
          .where('meetId')
          .equals(meetId)
          .and(f => !f.completed)
          .count();
      }
      return count;
    },
    [event.id]
  ) ?? 0;

  return (
    <button
      onClick={() => onSelect(event.id!)}
      className="w-full bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg p-4 transition-colors text-left"
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <h3 className="font-medium text-zinc-100 mb-1">{event.name}</h3>
          <div className="flex items-center gap-3 text-sm text-zinc-400">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              {isToday(new Date(event.date)) 
                ? 'Today'
                : format(new Date(event.date), 'MMM d, yyyy')}
            </div>
            {event.location && (
              <div className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5" />
                {event.location}
              </div>
            )}
          </div>
          {event.series && (
            <div className="mt-2">
              <span className="inline-block bg-purple-950/50 border border-purple-900/50 text-purple-200 text-xs px-2 py-0.5 rounded">
                {event.series}
              </span>
            </div>
          )}
        </div>
      </div>

      {(peopleCount > 0 || followUpsCount > 0) && (
        <div className="flex items-center gap-4 text-xs text-zinc-500 mt-3 pt-3 border-t border-zinc-800">
          {peopleCount > 0 && (
            <div className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" />
              {peopleCount} {peopleCount === 1 ? 'person' : 'people'}
            </div>
          )}
          {followUpsCount > 0 && (
            <div className="flex items-center gap-1.5 text-blue-400">
              <TrendingUp className="w-3.5 h-3.5" />
              {followUpsCount} follow-up{followUpsCount === 1 ? '' : 's'}
            </div>
          )}
        </div>
      )}
    </button>
  );
}