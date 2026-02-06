import { useLiveQuery } from 'dexie-react-hooks';
import { db, Event } from '../../lib/db';
import { ArrowLeft, Calendar, MapPin, Users, TrendingUp, Download, Edit, Trash2, Sparkles } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { useState } from 'react';
import { EditEventDialog } from '../dialogs/EditEventDialog';

interface EventDetailViewV2Props {
  eventId: number;
  onBack: () => void;
  onPersonSelect: (personId: number) => void;
}

export function EventDetailViewV2({ eventId, onBack, onPersonSelect }: EventDetailViewV2Props) {
  const [showEditDialog, setShowEditDialog] = useState(false);
  const event = useLiveQuery(() => db.events.get(eventId), [eventId]);

  const peopleMet = useLiveQuery(
    async () => {
      const meets = await db.meets.where('eventId').equals(eventId).toArray();
      const personIds = [...new Set(meets.map(m => m.personId).filter(Boolean))];
      const people = await Promise.all(personIds.map(id => db.people.get(id!)));
      return people.filter(Boolean);
    },
    [eventId]
  ) ?? [];

  const followUpsDue = useLiveQuery(
    async () => {
      const meets = await db.meets.where('eventId').equals(eventId).toArray();
      const meetIds = meets.map(m => m.id!);
      const followUps = [];
      
      for (const meetId of meetIds) {
        const fus = await db.followUps
          .where('meetId')
          .equals(meetId)
          .and(f => !f.completed)
          .toArray();
        followUps.push(...fus);
      }
      
      return followUps;
    },
    [eventId]
  ) ?? [];

  // Re-meet radar: suggest people likely to be at similar events
  const suggestedReMeets = useLiveQuery(
    async () => {
      if (!event) return [];
      
      // Get people from same series or location
      let candidates: any[] = [];
      
      if (event.series) {
        const seriesEvents = await db.events
          .filter(e => e.series === event.series && e.id !== eventId)
          .toArray();
        
        for (const seriesEvent of seriesEvents) {
          const meets = await db.meets.where('eventId').equals(seriesEvent.id!).toArray();
          const personIds = meets.map(m => m.personId).filter(Boolean);
          const people = await Promise.all(personIds.map(id => db.people.get(id!)));
          candidates.push(...people.filter(Boolean));
        }
      }
      
      if (event.location) {
        const locationEvents = await db.events
          .filter(e => e.location === event.location && e.id !== eventId)
          .toArray();
        
        for (const locationEvent of locationEvents) {
          const meets = await db.meets.where('eventId').equals(locationEvent.id!).toArray();
          const personIds = meets.map(m => m.personId).filter(Boolean);
          const people = await Promise.all(personIds.map(id => db.people.get(id!)));
          candidates.push(...people.filter(Boolean));
        }
      }
      
      // Dedupe and filter out people already at this event
      const alreadyMetIds = new Set(peopleMet.map(p => p.id));
      const uniqueCandidates = Array.from(
        new Map(candidates.map(p => [p.id, p])).values()
      ).filter(p => !alreadyMetIds.has(p.id));
      
      return uniqueCandidates.slice(0, 5); // Top 5 suggestions
    },
    [eventId, event, peopleMet]
  ) ?? [];

  const handleDelete = async () => {
    if (confirm('Delete this event? People and meets will not be deleted.')) {
      await db.events.delete(eventId);
      toast.success('Event deleted');
      onBack();
    }
  };

  const handleExport = async () => {
    if (!event) return;

    // Create ICS (iCalendar) file
    const eventDate = new Date(event.date);
    
    // Format date for ICS (YYYYMMDDTHHMMSS format in UTC)
    const formatICSDate = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const seconds = String(date.getSeconds()).padStart(2, '0');
      return `${year}${month}${day}T${hours}${minutes}${seconds}`;
    };

    // Calculate end time (1 hour after start by default)
    const endDate = new Date(eventDate);
    endDate.setHours(endDate.getHours() + 1);

    // Build ICS content
    let icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//PocketNetwork//Event Export//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      `DTSTART:${formatICSDate(eventDate)}`,
      `DTEND:${formatICSDate(endDate)}`,
      `DTSTAMP:${formatICSDate(new Date())}`,
      `SUMMARY:${event.name}`,
    ];

    if (event.location) {
      icsContent.push(`LOCATION:${event.location}`);
    }

    if (event.notes) {
      // Escape special characters in notes
      const escapedNotes = event.notes.replace(/[,;\\]/g, '\\$&').replace(/\n/g, '\\n');
      icsContent.push(`DESCRIPTION:${escapedNotes}`);
    }

    // Add people met as part of description
    if (peopleMet.length > 0) {
      const peopleNames = peopleMet.map(p => p.name).join(', ');
      const peopleNote = `\\n\\nPeople met: ${peopleNames}`;
      if (event.notes) {
        icsContent[icsContent.length - 1] += peopleNote;
      } else {
        icsContent.push(`DESCRIPTION:Event from PocketNetwork${peopleNote}`);
      }
    }

    icsContent.push(
      `UID:${eventId}@pocketnetwork.app`,
      'END:VEVENT',
      'END:VCALENDAR'
    );

    const icsText = icsContent.join('\r\n');
    const blob = new Blob([icsText], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${event.name.replace(/\s/g, '-')}.ics`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success('Calendar file downloaded');
  };

  if (!event) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-zinc-500">Event not found</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full max-w-screen-sm mx-auto">
      {/* Header */}
      <div className="p-4 border-b border-zinc-800 bg-zinc-950">
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={onBack}
            className="text-zinc-400 hover:text-zinc-200"
            aria-label="Back"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-xl font-medium flex-1">{event.name}</h1>
        </div>

        <div className="space-y-2 text-sm text-zinc-400 mb-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            {format(new Date(event.date), 'EEEE, MMMM d, yyyy')}
          </div>
          {event.location && (
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              {event.location}
            </div>
          )}
          {event.series && (
            <div className="mt-2">
              <span className="inline-block bg-purple-950/50 border border-purple-900/50 text-purple-200 text-xs px-2 py-1 rounded">
                {event.series}
              </span>
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleExport}
            className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg py-2 text-sm font-medium transition-colors flex items-center justify-center gap-2"
          >
            <Calendar className="w-4 h-4" />
            Add to Calendar
          </button>
          <button
            onClick={() => setShowEditDialog(true)}
            className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg px-4 py-2 text-sm font-medium transition-colors"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={handleDelete}
            className="bg-red-950 hover:bg-red-900 text-red-200 rounded-lg px-4 py-2 text-sm font-medium transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto pb-20 p-4 space-y-6">
        {/* People met here */}
        <section>
          <h2 className="text-sm font-medium text-zinc-300 mb-3 flex items-center gap-2">
            <Users className="w-4 h-4" />
            People met here ({peopleMet.length})
          </h2>
          {peopleMet.length === 0 ? (
            <p className="text-sm text-zinc-500">No people added to this event yet</p>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {peopleMet.map(person => (
                <button
                  key={person.id}
                  onClick={() => onPersonSelect(person.id!)}
                  className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg p-3 transition-colors text-left"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center flex-shrink-0">
                      {person.photoUrl ? (
                        <img src={person.photoUrl} alt={person.name} className="w-full h-full rounded-full object-cover" />
                      ) : (
                        <span className="text-white text-sm font-medium">
                          {person.name.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-zinc-100 truncate">{person.name}</p>
                    </div>
                  </div>
                  {person.company && (
                    <p className="text-xs text-zinc-500 truncate">{person.company}</p>
                  )}
                </button>
              ))}
            </div>
          )}
        </section>

        {/* Follow-ups due */}
        {followUpsDue.length > 0 && (
          <section>
            <h2 className="text-sm font-medium text-zinc-300 mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Follow-ups from this event ({followUpsDue.length})
            </h2>
            <div className="space-y-2">
              {followUpsDue.map(followUp => (
                <FollowUpItem key={followUp.id} followUp={followUp} onPersonSelect={onPersonSelect} />
              ))}
            </div>
          </section>
        )}

        {/* Likely re-meets */}
        {suggestedReMeets.length > 0 && (
          <section>
            <h2 className="text-sm font-medium text-zinc-300 mb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-400" />
              Likely re-meets
            </h2>
            <p className="text-xs text-zinc-500 mb-3">
              People you've met at similar events or venues
            </p>
            <div className="space-y-2">
              {suggestedReMeets.map(person => (
                <button
                  key={person.id}
                  onClick={() => onPersonSelect(person.id!)}
                  className="w-full bg-purple-950/20 hover:bg-purple-950/30 border border-purple-900/50 rounded-lg p-3 transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                      {person.photoUrl ? (
                        <img src={person.photoUrl} alt={person.name} className="w-full h-full rounded-full object-cover" />
                      ) : (
                        <span className="text-white font-medium">
                          {person.name.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-purple-100">{person.name}</p>
                      {person.company && (
                        <p className="text-xs text-purple-300">{person.company}</p>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

        {event.notes && (
          <section>
            <h2 className="text-sm font-medium text-zinc-300 mb-2">Notes</h2>
            <p className="text-sm text-zinc-400">{event.notes}</p>
          </section>
        )}
      </div>

      {/* Edit Event Dialog */}
      {showEditDialog && (
        <EditEventDialog
          event={event}
          open={showEditDialog}
          onClose={() => setShowEditDialog(false)}
        />
      )}
    </div>
  );
}

function FollowUpItem({ followUp, onPersonSelect }: { followUp: any; onPersonSelect: (id: number) => void }) {
  const person = useLiveQuery(
    () => followUp.personId ? db.people.get(followUp.personId) : Promise.resolve(null),
    [followUp.personId]
  );

  if (!person) return null;

  return (
    <button
      onClick={() => onPersonSelect(person.id!)}
      className="w-full bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg p-3 transition-colors text-left"
    >
      <p className="text-sm font-medium text-zinc-100 mb-1">{person.name}</p>
      <p className="text-sm text-blue-400">{followUp.description}</p>
      <p className="text-xs text-zinc-500 mt-1">
        Due {format(new Date(followUp.dueDate), 'MMM d')}
      </p>
    </button>
  );
}