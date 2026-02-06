import { useLiveQuery } from 'dexie-react-hooks';
import { db, FollowUp } from '../../lib/db';
import { Plus, Inbox, Calendar, Copy, Check, Clock, Edit, Download, ChevronRight } from 'lucide-react';
import { format, isPast, isToday, addDays } from 'date-fns';
import { useState } from 'react';
import { toast } from 'sonner';
import { storage } from '../../lib/storage';
import { exportFollowUpToCalendar, exportAllPendingFollowUps, exportEventToCalendar } from '../../lib/calendar-export';
import { ImageWithFallback } from '../figma/ImageWithFallback';

interface TodayViewV2Props {
  onInboxClick: () => void;
  onMessageDraft?: (followUpId: number) => void;
  onEditPromise?: (promiseId: number) => void;
}

export function TodayViewV2({ onInboxClick, onMessageDraft, onEditPromise }: TodayViewV2Props) {
  const [snoozeMenuOpen, setSnoozeMenuOpen] = useState<number | null>(null);
  const [snoozePromiseMenuOpen, setSnoozePromiseMenuOpen] = useState<number | null>(null);
  const [editingPromise, setEditingPromise] = useState<number | null>(null);

  const followUps = useLiveQuery(
    async () => {
      const allFollowUps = await db.followUps.toArray();
      return allFollowUps.filter(f => !f.completed);
    },
    []
  ) ?? [];

  const upcomingEvents = useLiveQuery(
    async () => {
      const now = new Date();
      const allEvents = await db.events.toArray();
      
      // Get future events (including today)
      return allEvents
        .filter(event => {
          const eventDate = new Date(event.date);
          return eventDate >= now || isToday(eventDate);
        })
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    },
    []
  ) ?? [];

  // Create unified timeline items
  const timelineItems = useLiveQuery(
    async () => {
      const allFollowUps = await db.followUps.toArray();
      const activeFollowUps = allFollowUps.filter(f => !f.completed);

      const allPromises = await db.promises.toArray();
      const activePromises = allPromises.filter(p => !p.completed);

      const now = new Date();
      const allEvents = await db.events.toArray();
      
      const futureEvents = allEvents
        .filter(event => {
          const eventDate = new Date(event.date);
          return eventDate >= now || isToday(eventDate);
        });

      // Combine into timeline
      const timeline: Array<{
        type: 'followup' | 'event' | 'promise';
        date: Date;
        data: any;
      }> = [];

      activeFollowUps.forEach(followUp => {
        timeline.push({
          type: 'followup',
          date: new Date(followUp.dueDate),
          data: followUp
        });
      });

      activePromises.forEach(promise => {
        if (promise.dueDate) {
          timeline.push({
            type: 'promise',
            date: new Date(promise.dueDate),
            data: promise
          });
        }
      });

      futureEvents.forEach(event => {
        timeline.push({
          type: 'event',
          date: new Date(event.date),
          data: event
        });
      });

      // Sort by date
      timeline.sort((a, b) => a.date.getTime() - b.date.getTime());

      return timeline;
    },
    []
  ) ?? [];

  const dumpItems = useLiveQuery(
    () => db.inboxDumps.where('status').equals('new').count()
  ) ?? 0;

  const promises = useLiveQuery(
    async () => {
      const allPromises = await db.promises.toArray();
      const activePromises = allPromises.filter(p => !p.completed);
      
      return activePromises.filter(p => 
        p.dueDate && isPast(new Date(p.dueDate)) && !isToday(new Date(p.dueDate))
      );
    },
    []
  ) ?? [];

  // Get nudge cap based on intensity - apply to follow-ups only
  const nudgeIntensity = storage.getNudgeIntensity();
  const maxNudges = nudgeIntensity === 'low' ? 1 : 3;
  const overdueFollowUps = followUps.filter(f => 
    isPast(new Date(f.dueDate)) && !isToday(new Date(f.dueDate))
  );
  const dueTodayFollowUps = followUps.filter(f => isToday(new Date(f.dueDate)));
  const nudgeFollowUps = [...overdueFollowUps, ...dueTodayFollowUps].slice(0, maxNudges);

  const handleComplete = async (followUpId: number) => {
    await db.followUps.update(followUpId, {
      completed: true,
      completedAt: new Date(),
      updatedAt: new Date()
    });
    toast.success('Follow-up completed');
  };

  const handleSnooze = async (followUpId: number, days: number) => {
    const newDate = addDays(new Date(), days);
    await db.followUps.update(followUpId, {
      dueDate: newDate,
      snoozedCount: (await db.followUps.get(followUpId))?.snoozedCount ? 
        (await db.followUps.get(followUpId))!.snoozedCount! + 1 : 1,
      updatedAt: new Date()
    });
    setSnoozeMenuOpen(null);
    toast.success(`Snoozed until ${format(newDate, 'MMM d')}`);
  };

  const handleCopyMessage = async (followUpId: number) => {
    const followUp = await db.followUps.get(followUpId);
    if (!followUp) return;

    const person = await db.people.get(followUp.personId);
    const meet = followUp.meetId ? await db.meets.get(followUp.meetId) : null;

    // Simple template
    const message = generateMessage(person!, meet, followUp);
    
    try {
      if (!navigator.clipboard) {
        // Fallback for browsers without clipboard API
        const textArea = document.createElement('textarea');
        textArea.value = message;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        document.body.appendChild(textArea);
        textArea.select();
        try {
          document.execCommand('copy');
          toast.success('Message copied to clipboard');
        } catch (err) {
          toast.error('Failed to copy message');
        }
        document.body.removeChild(textArea);
      } else {
        await navigator.clipboard.writeText(message);
        toast.success('Message copied to clipboard');
      }
    } catch (error) {
      console.error('Copy error:', error);
      toast.error('Failed to copy message');
    }
  };

  const generateMessage = (person: any, meet: any, followUp: FollowUp): string => {
    const parts = [`Hi ${person.name},\n\n`];
    
    if (meet?.where) {
      parts.push(`It was great meeting you at ${meet.where}. `);
    } else {
      parts.push(`It was great meeting you. `);
    }

    if (meet?.context) {
      parts.push(`I enjoyed our conversation about ${meet.context}. `);
    }

    parts.push(`\n\n${followUp.description || 'I wanted to follow up with you.'}`);
    parts.push(`\n\nLooking forward to connecting!`);

    return parts.join('');
  };

  const handleDownloadICS = async (followUpId: number) => {
    try {
      await exportFollowUpToCalendar(followUpId);
      toast.success('Calendar event downloaded');
    } catch (error) {
      console.error('Failed to export calendar event:', error);
      toast.error('Failed to export calendar event');
    }
  };

  const handleSnoozePromise = async (promiseId: number, days: number) => {
    const newDate = addDays(new Date(), days);
    await db.promises.update(promiseId, {
      dueDate: newDate
    });
    setSnoozePromiseMenuOpen(null);
    toast.success(`Snoozed until ${format(newDate, 'MMM d')}`);
  };

  const handleEditPromise = async (promiseId: number, description: string, dueDate: Date | null) => {
    await db.promises.update(promiseId, {
      description,
      dueDate: dueDate || undefined
    });
    setEditingPromise(null);
    toast.success('Promise updated');
  };

  // Show empty state only if timeline is truly empty
  if (timelineItems.length === 0 && dumpItems === 0) {
    return (
      <div className="flex flex-col h-full max-w-screen-sm mx-auto">
        <div className="p-4 border-b border-zinc-800 bg-zinc-950">
          <h1 className="text-2xl mb-3">Today</h1>
        </div>
        
        <div className="flex-1 overflow-y-auto pb-20 p-4">
          {/* Timeline always visible */}
          <section>
            <h2 className="text-sm font-medium text-zinc-300 mb-3">Timeline</h2>
            <div className="flex flex-col items-center py-12 px-4">
              <div className="w-16 h-16 rounded-full bg-green-950/30 flex items-center justify-center mb-4">
                <Check className="w-8 h-8 text-green-400" />
              </div>
              <h3 className="text-xl font-medium mb-2">You're all caught up</h3>
              <p className="text-zinc-500 mb-6">No follow-ups or promises due right now.</p>
              <p className="text-sm text-zinc-600">Tap + to save a new meet</p>
            </div>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full max-w-screen-sm mx-auto">
      <div className="p-4 border-b border-zinc-800 bg-zinc-950">
        <h1 className="text-2xl mb-3">Today</h1>
        
        {/* Nudge count */}
        {nudgeFollowUps.length > 0 && (
          <div className="mb-3">
            <p className="text-sm text-zinc-400">
              You've got <span className="text-blue-400 font-medium">{nudgeFollowUps.length}</span> gentle {nudgeFollowUps.length === 1 ? 'nudge' : 'nudges'}
            </p>
          </div>
        )}

        {/* Dumps badge */}
        {dumpItems > 0 && (
          <button
            onClick={onInboxClick}
            className="w-full mt-3 bg-purple-950/30 border border-purple-900/50 rounded-lg p-2.5 flex items-center justify-between text-sm text-purple-200 hover:bg-purple-950/50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Inbox className="w-4 h-4" />
              <span>{dumpItems} item{dumpItems !== 1 ? 's' : ''} in Dumps</span>
            </div>
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto pb-20 p-4 space-y-3">
        {/* Overdue promises */}
        {promises.length > 0 && (
          <section className="mb-6">
            <h2 className="text-sm font-medium text-amber-400 mb-3 flex items-center gap-2">
              <span className="w-2 h-2 bg-amber-400 rounded-full"></span>
              Overdue Promises
            </h2>
            {promises.map(promise => (
              <PromiseCard 
                key={promise.id} 
                promise={promise} 
                onSnooze={handleSnoozePromise}
                snoozeMenuOpen={snoozePromiseMenuOpen === promise.id}
                setSnoozeMenuOpen={() => setSnoozePromiseMenuOpen(snoozePromiseMenuOpen === promise.id ? null : promise.id!)}
                onEdit={() => setEditingPromise(promise.id!)}
                isEditing={editingPromise === promise.id}
                onSaveEdit={handleEditPromise}
                onCancelEdit={() => setEditingPromise(null)}
              />
            ))}
          </section>
        )}

        {/* Timeline */}
        <section>
          <h2 className="text-sm font-medium text-zinc-300 mb-3">Timeline</h2>
          {timelineItems.length === 0 ? (
            <div className="flex flex-col items-center py-12 px-4">
              <p className="text-sm text-zinc-400 text-center max-w-xs mb-1">
                Add your first meet in 10 seconds.
              </p>
              <p className="text-xs text-zinc-600 mt-2">Tap the + button to start</p>
            </div>
          ) : (
            <div className="space-y-3">
              {timelineItems.map((item, index) => {
                const dateLabel = isToday(item.date) 
                  ? 'Today' 
                  : isPast(item.date) && !isToday(item.date)
                  ? 'Overdue'
                  : format(item.date, 'EEE, MMM d');

                const showDateDivider = index === 0 || 
                  format(item.date, 'yyyy-MM-dd') !== format(timelineItems[index - 1].date, 'yyyy-MM-dd');

                return (
                  <div key={`${item.type}-${item.data.id}`}>
                    {showDateDivider && (
                      <div className="flex items-center gap-2 mb-3 mt-4 first:mt-0">
                        <div className={`h-px flex-1 ${
                          isToday(item.date) ? 'bg-blue-500' : 
                          isPast(item.date) && !isToday(item.date) ? 'bg-red-500' :
                          'bg-zinc-800'
                        }`} />
                        <span className={`text-xs font-medium ${
                          isToday(item.date) ? 'text-blue-400' : 
                          isPast(item.date) && !isToday(item.date) ? 'text-red-400' :
                          'text-zinc-500'
                        }`}>
                          {dateLabel}
                        </span>
                        <div className={`h-px flex-1 ${
                          isToday(item.date) ? 'bg-blue-500' : 
                          isPast(item.date) && !isToday(item.date) ? 'bg-red-500' :
                          'bg-zinc-800'
                        }`} />
                      </div>
                    )}

                    {item.type === 'followup' ? (
                      <FollowUpCard
                        followUp={item.data}
                        onComplete={handleComplete}
                        onSnooze={handleSnooze}
                        onCopyMessage={handleCopyMessage}
                        onDownloadICS={handleDownloadICS}
                        snoozeMenuOpen={snoozeMenuOpen === item.data.id}
                        setSnoozeMenuOpen={() => setSnoozeMenuOpen(snoozeMenuOpen === item.data.id ? null : item.data.id!)}
                      />
                    ) : item.type === 'event' ? (
                      <EventCard event={item.data} />
                    ) : (
                      <PromiseCardTimeline 
                        promise={item.data} 
                        onSnooze={handleSnoozePromise}
                        snoozeMenuOpen={snoozePromiseMenuOpen === item.data.id}
                        setSnoozeMenuOpen={() => setSnoozePromiseMenuOpen(snoozePromiseMenuOpen === item.data.id ? null : item.data.id!)}
                        onEdit={() => setEditingPromise(item.data.id!)}
                        isEditing={editingPromise === item.data.id}
                        onSaveEdit={handleEditPromise}
                        onCancelEdit={() => setEditingPromise(null)}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

interface FollowUpCardProps {
  followUp: any;
  onComplete: (id: number) => void;
  onSnooze: (id: number, days: number) => void;
  onCopyMessage: (id: number) => void;
  onDownloadICS: (id: number) => void;
  snoozeMenuOpen: boolean;
  setSnoozeMenuOpen: () => void;
}

function FollowUpCard({
  followUp,
  onComplete,
  onSnooze,
  onCopyMessage,
  onDownloadICS,
  snoozeMenuOpen,
  setSnoozeMenuOpen
}: FollowUpCardProps) {
  const person = useLiveQuery(
    () => followUp.personId ? db.people.get(followUp.personId) : Promise.resolve(null),
    [followUp.personId]
  );

  const meet = useLiveQuery(
    () => followUp.meetId ? db.meets.get(followUp.meetId) : Promise.resolve(null),
    [followUp.meetId]
  );

  if (!person) return null;

  const isOverdue = isPast(new Date(followUp.dueDate)) && !isToday(new Date(followUp.dueDate));
  const isDueToday = isToday(new Date(followUp.dueDate));

  return (
    <div className={`bg-zinc-900 border rounded-lg p-4 ${
      isOverdue ? 'border-red-900/50' : isDueToday ? 'border-blue-900/50' : 'border-zinc-800'
    }`}>
      {/* Person info */}
      <div className="flex items-start gap-3 mb-3">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center flex-shrink-0">
          {person.photoUrl ? (
            <ImageWithFallback
              src={person.photoUrl}
              alt={person.name}
              className="w-full h-full rounded-full object-cover"
              fallback={<span className="text-white font-medium">{person.name.charAt(0).toUpperCase()}</span>}
            />
          ) : (
            <span className="text-white font-medium">{person.name.charAt(0).toUpperCase()}</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-zinc-100 mb-0.5">{person.name}</h3>
          {meet?.where && (
            <p className="text-sm text-zinc-400 mb-1">Met at {meet.where}</p>
          )}
          <p className="text-sm text-blue-400">{followUp.description}</p>
          <p className={`text-xs mt-1 ${
            isOverdue ? 'text-red-400' : isDueToday ? 'text-blue-400' : 'text-zinc-500'
          }`}>
            {isOverdue ? 'Overdue' : isDueToday ? 'Due today' : `Due ${format(new Date(followUp.dueDate), 'MMM d')}`}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => onCopyMessage(followUp.id)}
          className="bg-blue-950 hover:bg-blue-900 border border-blue-900 text-blue-100 rounded-lg py-2 text-sm font-medium transition-colors flex items-center justify-center gap-2"
        >
          <Copy className="w-4 h-4" />
          Copy message
        </button>
        <button
          onClick={() => onComplete(followUp.id)}
          className="bg-green-950 hover:bg-green-900 border border-green-900 text-green-100 rounded-lg py-2 text-sm font-medium transition-colors flex items-center justify-center gap-2"
        >
          <Check className="w-4 h-4" />
          Done
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2 mt-2">
        <button
          onClick={() => onDownloadICS(followUp.id)}
          className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg py-2 text-sm font-medium transition-colors flex items-center justify-center gap-1.5"
        >
          <Download className="w-3.5 h-3.5" />
          Add to Cal
        </button>
        <button
          onClick={setSnoozeMenuOpen}
          className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg py-2 text-sm font-medium transition-colors flex items-center justify-center gap-1.5"
        >
          <Clock className="w-3.5 h-3.5" />
          Snooze
        </button>
      </div>

      {/* Snooze menu */}
      {snoozeMenuOpen && (
        <div className="mt-2 pt-2 border-t border-zinc-800 flex gap-2">
          <button
            onClick={() => onSnooze(followUp.id, 1)}
            className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded py-1.5 text-xs transition-colors"
          >
            Tomorrow
          </button>
          <button
            onClick={() => onSnooze(followUp.id, 3)}
            className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded py-1.5 text-xs transition-colors"
          >
            3 days
          </button>
          <button
            onClick={() => onSnooze(followUp.id, 7)}
            className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded py-1.5 text-xs transition-colors"
          >
            Next week
          </button>
        </div>
      )}
    </div>
  );
}

function EventCard({ event }: { event: any }) {
  const attendees = useLiveQuery(
    async () => {
      if (!event.id) return [];
      const meets = await db.meets.where('eventId').equals(event.id).toArray();
      const peopleIds = [...new Set(meets.map(m => m.personId))];
      const people = await Promise.all(peopleIds.map(id => db.people.get(id)));
      return people.filter(Boolean);
    },
    [event.id]
  ) ?? [];

  const handleDownloadICS = async () => {
    try {
      await exportEventToCalendar(event.id);
      toast.success('Calendar event downloaded');
    } catch (error) {
      console.error('Failed to export calendar event:', error);
      toast.error('Failed to export calendar event');
    }
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
      <div className="flex items-start gap-3 mb-3">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-500 to-teal-500 flex items-center justify-center flex-shrink-0">
          <Calendar className="w-6 h-6 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-zinc-100 mb-0.5">{event.name}</h3>
          {event.location && (
            <p className="text-sm text-zinc-400 mb-1">at {event.location}</p>
          )}
          {attendees.length > 0 && (
            <p className="text-xs text-zinc-500 mb-2">
              {attendees.length} {attendees.length === 1 ? 'person' : 'people'}
            </p>
          )}
          <p className="text-xs text-zinc-500">
            {format(new Date(event.date), 'h:mm a')}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 mt-2">
        <button
          onClick={handleDownloadICS}
          className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg py-2 text-sm font-medium transition-colors flex items-center justify-center gap-1.5"
        >
          <Download className="w-3.5 h-3.5" />
          Add to Cal
        </button>
      </div>
    </div>
  );
}

function PromiseCard({ 
  promise, 
  onSnooze, 
  snoozeMenuOpen, 
  setSnoozeMenuOpen,
  onEdit,
  isEditing,
  onSaveEdit,
  onCancelEdit
}: { 
  promise: any;
  onSnooze: (id: number, days: number) => void;
  snoozeMenuOpen: boolean;
  setSnoozeMenuOpen: () => void;
  onEdit: () => void;
  isEditing: boolean;
  onSaveEdit: (id: number, description: string, dueDate: Date | null) => void;
  onCancelEdit: () => void;
}) {
  const person = useLiveQuery(
    () => promise.personId ? db.people.get(promise.personId) : Promise.resolve(null),
    [promise.personId]
  );

  const [editDescription, setEditDescription] = useState(promise.description);
  const [editDueDate, setEditDueDate] = useState(promise.dueDate ? format(new Date(promise.dueDate), 'yyyy-MM-dd') : '');

  const handleComplete = async () => {
    await db.promises.update(promise.id, {
      completed: true,
      completedAt: new Date()
    });
    toast.success('Promise completed');
  };

  const handleSave = () => {
    onSaveEdit(promise.id, editDescription, editDueDate ? new Date(editDueDate) : null);
  };

  if (!person) return null;

  if (isEditing) {
    return (
      <div className="bg-amber-950/20 border border-amber-900/50 rounded-lg p-4 mb-2">
        <div className="space-y-3">
          <div>
            <label className="text-xs text-amber-300 mb-1 block">Promise</label>
            <input
              type="text"
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
              placeholder="What did you promise?"
            />
          </div>
          <div>
            <label className="text-xs text-amber-300 mb-1 block">Due Date</label>
            <input
              type="date"
              value={editDueDate}
              onChange={(e) => setEditDueDate(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              className="flex-1 bg-amber-900 hover:bg-amber-800 text-amber-100 rounded-lg py-2 text-sm font-medium transition-colors"
            >
              Save
            </button>
            <button
              onClick={onCancelEdit}
              className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg py-2 text-sm font-medium transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-amber-950/20 border border-amber-900/50 rounded-lg p-4 mb-2">
      <div className="flex items-start gap-3 mb-3">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center flex-shrink-0">
          <span className="text-white font-medium">{person.name.charAt(0).toUpperCase()}</span>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-amber-100 mb-0.5">{person.name}</h3>
          <p className="text-sm text-amber-200">{promise.description}</p>
          {promise.dueDate && (
            <p className="text-xs text-amber-400 mt-1">
              Due {format(new Date(promise.dueDate), 'MMM d')}
            </p>
          )}
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={handleComplete}
          className="bg-amber-900 hover:bg-amber-800 text-amber-100 rounded-lg py-2 text-sm font-medium transition-colors flex items-center justify-center gap-2"
        >
          <Check className="w-4 h-4" />
          Done
        </button>
        <button
          onClick={onEdit}
          className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg py-2 text-sm font-medium transition-colors flex items-center justify-center gap-2"
        >
          <Edit className="w-4 h-4" />
          Edit
        </button>
      </div>

      <div className="mt-2">
        <button
          onClick={setSnoozeMenuOpen}
          className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg py-2 text-sm font-medium transition-colors flex items-center justify-center gap-1.5"
        >
          <Clock className="w-3.5 h-3.5" />
          Snooze
        </button>
      </div>

      {/* Snooze menu */}
      {snoozeMenuOpen && (
        <div className="mt-2 pt-2 border-t border-amber-900/50 flex gap-2">
          <button
            onClick={() => onSnooze(promise.id, 1)}
            className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded py-1.5 text-xs transition-colors"
          >
            Tomorrow
          </button>
          <button
            onClick={() => onSnooze(promise.id, 3)}
            className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded py-1.5 text-xs transition-colors"
          >
            3 days
          </button>
          <button
            onClick={() => onSnooze(promise.id, 7)}
            className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded py-1.5 text-xs transition-colors"
          >
            Next week
          </button>
        </div>
      )}
    </div>
  );
}

function PromiseCardTimeline({ 
  promise, 
  onSnooze, 
  snoozeMenuOpen, 
  setSnoozeMenuOpen,
  onEdit,
  isEditing,
  onSaveEdit,
  onCancelEdit
}: { 
  promise: any;
  onSnooze: (id: number, days: number) => void;
  snoozeMenuOpen: boolean;
  setSnoozeMenuOpen: () => void;
  onEdit: () => void;
  isEditing: boolean;
  onSaveEdit: (id: number, description: string, dueDate: Date | null) => void;
  onCancelEdit: () => void;
}) {
  const person = useLiveQuery(
    () => promise.personId ? db.people.get(promise.personId) : Promise.resolve(null),
    [promise.personId]
  );

  const [editDescription, setEditDescription] = useState(promise.description);
  const [editDueDate, setEditDueDate] = useState(promise.dueDate ? format(new Date(promise.dueDate), 'yyyy-MM-dd') : '');

  const handleComplete = async () => {
    await db.promises.update(promise.id, {
      completed: true,
      completedAt: new Date()
    });
    toast.success('Promise completed');
  };

  const handleSave = () => {
    onSaveEdit(promise.id, editDescription, editDueDate ? new Date(editDueDate) : null);
  };

  if (!person) return null;

  const isOverdue = promise.dueDate && isPast(new Date(promise.dueDate)) && !isToday(new Date(promise.dueDate));
  const isDueToday = promise.dueDate && isToday(new Date(promise.dueDate));

  if (isEditing) {
    return (
      <div className={`bg-zinc-900 border rounded-lg p-4 ${
        isOverdue ? 'border-amber-900/50' : isDueToday ? 'border-amber-900/50' : 'border-zinc-800'
      }`}>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Promise</label>
            <input
              type="text"
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="What did you promise?"
            />
          </div>
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Due Date</label>
            <input
              type="date"
              value={editDueDate}
              onChange={(e) => setEditDueDate(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              className="flex-1 bg-purple-900 hover:bg-purple-800 text-purple-100 rounded-lg py-2 text-sm font-medium transition-colors"
            >
              Save
            </button>
            <button
              onClick={onCancelEdit}
              className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg py-2 text-sm font-medium transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-zinc-900 border rounded-lg p-4 ${
      isOverdue ? 'border-amber-900/50' : isDueToday ? 'border-purple-900/50' : 'border-zinc-800'
    }`}>
      {/* Person info */}
      <div className="flex items-start gap-3 mb-3">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
          {person.photoUrl ? (
            <ImageWithFallback
              src={person.photoUrl}
              alt={person.name}
              className="w-full h-full rounded-full object-cover"
              fallback={<span className="text-white font-medium">{person.name.charAt(0).toUpperCase()}</span>}
            />
          ) : (
            <span className="text-white font-medium">{person.name.charAt(0).toUpperCase()}</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-zinc-100 mb-0.5">{person.name}</h3>
          <p className="text-sm text-purple-400">{promise.description}</p>
          {promise.dueDate && (
            <p className={`text-xs mt-1 ${
              isOverdue ? 'text-amber-400' : isDueToday ? 'text-purple-400' : 'text-zinc-500'
            }`}>
              {isOverdue ? 'Overdue' : isDueToday ? 'Due today' : `Due ${format(new Date(promise.dueDate), 'MMM d')}`}
            </p>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={handleComplete}
          className="bg-green-950 hover:bg-green-900 border border-green-900 text-green-100 rounded-lg py-2 text-sm font-medium transition-colors flex items-center justify-center gap-2"
        >
          <Check className="w-4 h-4" />
          Done
        </button>
        <button
          onClick={onEdit}
          className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg py-2 text-sm font-medium transition-colors flex items-center justify-center gap-2"
        >
          <Edit className="w-4 h-4" />
          Edit
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2 mt-2">
        <button
          className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg py-2 text-sm font-medium transition-colors flex items-center justify-center gap-1.5"
        >
          <Download className="w-3.5 h-3.5" />
          Add to Cal
        </button>
        <button
          onClick={setSnoozeMenuOpen}
          className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg py-2 text-sm font-medium transition-colors flex items-center justify-center gap-1.5"
        >
          <Clock className="w-3.5 h-3.5" />
          Snooze
        </button>
      </div>

      {/* Snooze menu */}
      {snoozeMenuOpen && (
        <div className="mt-2 pt-2 border-t border-zinc-800 flex gap-2">
          <button
            onClick={() => onSnooze(promise.id, 1)}
            className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded py-1.5 text-xs transition-colors"
          >
            Tomorrow
          </button>
          <button
            onClick={() => onSnooze(promise.id, 3)}
            className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded py-1.5 text-xs transition-colors"
          >
            3 days
          </button>
          <button
            onClick={() => onSnooze(promise.id, 7)}
            className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded py-1.5 text-xs transition-colors"
          >
            Next week
          </button>
        </div>
      )}
    </div>
  );
}