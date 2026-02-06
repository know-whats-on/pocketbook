import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../lib/db';
import { CheckCircle2, Circle, Clock, Sparkles, Inbox as InboxIcon } from 'lucide-react';
import { format, isToday, isPast, isFuture } from 'date-fns';

interface TodayViewProps {
  onInboxClick?: () => void;
}

export function TodayView({ onInboxClick }: TodayViewProps) {
  const followUps = useLiveQuery(
    async () => {
      const allFollowUps = await db.followUps.toArray();
      return allFollowUps.filter(f => 
        !f.completed && (!f.snoozedUntil || new Date(f.snoozedUntil) <= new Date())
      );
    }
  ) ?? [];

  const promises = useLiveQuery(
    async () => {
      const allPromises = await db.promises.toArray();
      return allPromises.filter(p => !p.completed);
    }
  ) ?? [];

  const unprocessedCount = useLiveQuery(
    () => db.inboxDumps.where('processed').equals(0).count()
  ) ?? 0;

  const upcomingFollowUps = followUps.filter(f => f.dueDate && isFuture(new Date(f.dueDate)));
  const todayFollowUps = followUps.filter(f => !f.dueDate || isToday(new Date(f.dueDate)));
  const overdueFollowUps = followUps.filter(f => f.dueDate && isPast(new Date(f.dueDate)) && !isToday(new Date(f.dueDate)));

  const toggleFollowUp = async (id: number) => {
    const followUp = await db.followUps.get(id);
    if (followUp) {
      await db.followUps.update(id, {
        completed: !followUp.completed,
        completedAt: !followUp.completed ? new Date() : undefined,
        updatedAt: new Date()
      });
    }
  };

  const togglePromise = async (id: number) => {
    const promise = await db.promises.get(id);
    if (promise) {
      await db.promises.update(id, {
        completed: !promise.completed,
        completedAt: !promise.completed ? new Date() : undefined
      });
    }
  };

  const snoozeFollowUp = async (id: number) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    await db.followUps.update(id, {
      snoozedUntil: tomorrow,
      updatedAt: new Date()
    });
  };

  return (
    <div className="p-4 pb-20 max-w-screen-sm mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl mb-1">Today</h1>
        <p className="text-sm text-zinc-400">
          {format(new Date(), 'EEEE, MMMM d, yyyy')}
        </p>
      </div>

      {/* Inbox alert */}
      {unprocessedCount > 0 && onInboxClick && (
        <button
          onClick={onInboxClick}
          className="w-full bg-purple-950/30 border border-purple-900/50 rounded-lg p-3 mb-6 flex items-center gap-3 hover:bg-purple-950/50 transition-colors"
        >
          <InboxIcon className="w-5 h-5 text-purple-400 flex-shrink-0" />
          <div className="flex-1 text-left">
            <p className="text-sm text-purple-200 font-medium">
              {unprocessedCount} {unprocessedCount === 1 ? 'item' : 'items'} in inbox
            </p>
            <p className="text-xs text-purple-300/60">Tap to process when you have energy</p>
          </div>
        </button>
      )}

      {/* Privacy reminder */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 mb-6 flex items-start gap-3">
        <Sparkles className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-sm text-zinc-300">
            All your data is stored safely on this device only.
          </p>
        </div>
      </div>

      {/* Overdue Follow-ups */}
      {overdueFollowUps.length > 0 && (
        <section className="mb-6">
          <h2 className="text-sm uppercase tracking-wide text-zinc-500 mb-3">Overdue</h2>
          <div className="space-y-2">
            {overdueFollowUps.map(followUp => (
              <FollowUpItem
                key={followUp.id}
                followUp={followUp}
                onToggle={() => toggleFollowUp(followUp.id!)}
                onSnooze={() => snoozeFollowUp(followUp.id!)}
                isOverdue
              />
            ))}
          </div>
        </section>
      )}

      {/* Today's Follow-ups */}
      <section className="mb-6">
        <h2 className="text-sm uppercase tracking-wide text-zinc-500 mb-3">
          {todayFollowUps.length > 0 ? 'Today' : 'No follow-ups for today'}
        </h2>
        {todayFollowUps.length > 0 ? (
          <div className="space-y-2">
            {todayFollowUps.map(followUp => (
              <FollowUpItem
                key={followUp.id}
                followUp={followUp}
                onToggle={() => toggleFollowUp(followUp.id!)}
                onSnooze={() => snoozeFollowUp(followUp.id!)}
              />
            ))}
          </div>
        ) : (
          <p className="text-sm text-zinc-500 italic">You're all caught up! 🎉</p>
        )}
      </section>

      {/* Upcoming Follow-ups */}
      {upcomingFollowUps.length > 0 && (
        <section className="mb-6">
          <h2 className="text-sm uppercase tracking-wide text-zinc-500 mb-3">Upcoming</h2>
          <div className="space-y-2">
            {upcomingFollowUps.map(followUp => (
              <FollowUpItem
                key={followUp.id}
                followUp={followUp}
                onToggle={() => toggleFollowUp(followUp.id!)}
                onSnooze={() => snoozeFollowUp(followUp.id!)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Promises */}
      {promises.length > 0 && (
        <section className="mb-6">
          <h2 className="text-sm uppercase tracking-wide text-zinc-500 mb-3">My Promises</h2>
          <div className="space-y-2">
            {promises.map(promise => (
              <div
                key={promise.id}
                className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 flex items-start gap-3"
              >
                <button
                  onClick={() => togglePromise(promise.id!)}
                  className="flex-shrink-0 mt-0.5"
                  aria-label={promise.completed ? 'Mark incomplete' : 'Mark complete'}
                >
                  {promise.completed ? (
                    <CheckCircle2 className="w-5 h-5 text-green-400" />
                  ) : (
                    <Circle className="w-5 h-5 text-zinc-500" />
                  )}
                </button>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm ${promise.completed ? 'line-through text-zinc-500' : 'text-zinc-200'}`}>
                    {promise.description}
                  </p>
                  {promise.dueDate && (
                    <p className="text-xs text-zinc-500 mt-1">
                      Due {format(new Date(promise.dueDate), 'MMM d')}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

interface FollowUpItemProps {
  followUp: any;
  onToggle: () => void;
  onSnooze: () => void;
  isOverdue?: boolean;
}

function FollowUpItem({ followUp, onToggle, onSnooze, isOverdue }: FollowUpItemProps) {
  return (
    <div className={`border rounded-lg p-3 flex items-start gap-3 ${
      isOverdue 
        ? 'bg-red-950/20 border-red-900/50' 
        : 'bg-zinc-900 border-zinc-800'
    }`}>
      <button
        onClick={onToggle}
        className="flex-shrink-0 mt-0.5"
        aria-label={followUp.completed ? 'Mark incomplete' : 'Mark complete'}
      >
        {followUp.completed ? (
          <CheckCircle2 className="w-5 h-5 text-green-400" />
        ) : (
          <Circle className="w-5 h-5 text-zinc-500" />
        )}
      </button>
      <div className="flex-1 min-w-0">
        <p className={`text-sm ${followUp.completed ? 'line-through text-zinc-500' : 'text-zinc-200'}`}>
          {followUp.description}
        </p>
        {followUp.dueDate && (
          <p className={`text-xs mt-1 flex items-center gap-1 ${
            isOverdue ? 'text-red-400' : 'text-zinc-500'
          }`}>
            <Clock className="w-3 h-3" />
            {format(new Date(followUp.dueDate), 'MMM d, h:mm a')}
          </p>
        )}
      </div>
      {!followUp.completed && (
        <button
          onClick={onSnooze}
          className="text-xs text-zinc-400 hover:text-zinc-200 px-2 py-1 rounded bg-zinc-800"
        >
          Tomorrow
        </button>
      )}
    </div>
  );
}