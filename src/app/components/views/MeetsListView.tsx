import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../lib/db';
import { ArrowLeft, Calendar, MapPin, MessageSquare, User } from 'lucide-react';
import { format } from 'date-fns';

interface MeetsListViewProps {
  onBack: () => void;
  onPersonSelect?: (id: number) => void;
}

export function MeetsListView({ onBack, onPersonSelect }: MeetsListViewProps) {
  const meets = useLiveQuery(() => 
    db.meets.orderBy('when').reverse().toArray()
  ) ?? [];

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
          <div className="flex items-center gap-2">
            <Calendar className="w-6 h-6 text-purple-400" />
            <h1 className="text-2xl font-medium">All Meets</h1>
          </div>
          <p className="text-sm text-zinc-400 mt-1">
            {meets.length} meet{meets.length !== 1 ? 's' : ''} recorded
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto pb-20 p-4">
        {meets.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <Calendar className="w-12 h-12 text-zinc-700 mb-3" />
            <p className="text-zinc-500 mb-1">No meets yet</p>
            <p className="text-sm text-zinc-600">
              Meets will appear here when you create them
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {meets.map(meet => (
              <MeetCard key={meet.id} meet={meet} onPersonSelect={onPersonSelect} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function MeetCard({ meet, onPersonSelect }: { meet: any; onPersonSelect?: (id: number) => void }) {
  const person = useLiveQuery(
    () => meet.personId ? db.people.get(meet.personId) : Promise.resolve(null),
    [meet.personId]
  );

  const event = useLiveQuery(
    () => meet.eventId ? db.events.get(meet.eventId) : Promise.resolve(null),
    [meet.eventId]
  );

  if (!person) return null;

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
      <div className="flex items-start gap-3 mb-3">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center flex-shrink-0">
          <span className="text-white font-medium">{person.name.charAt(0).toUpperCase()}</span>
        </div>
        <div className="flex-1 min-w-0">
          <button
            onClick={() => onPersonSelect?.(person.id!)}
            className="font-medium text-zinc-100 hover:text-purple-400 transition-colors text-left"
          >
            {person.name}
          </button>
          <p className="text-xs text-zinc-500">
            {format(new Date(meet.when), 'MMM d, yyyy')}
          </p>
        </div>
      </div>
      
      {meet.where && (
        <div className="flex items-start gap-2 mb-2">
          <MapPin className="w-4 h-4 text-zinc-500 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-zinc-400">{meet.where}</p>
        </div>
      )}
      
      {event && (
        <div className="flex items-start gap-2 mb-2">
          <Calendar className="w-4 h-4 text-zinc-500 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-zinc-400">{event.name}</p>
        </div>
      )}
      
      {meet.context && (
        <div className="flex items-start gap-2">
          <MessageSquare className="w-4 h-4 text-zinc-500 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-zinc-300">{meet.context}</p>
        </div>
      )}
    </div>
  );
}
