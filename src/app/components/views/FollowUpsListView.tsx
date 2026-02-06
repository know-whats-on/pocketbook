import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../lib/db';
import { ArrowLeft, CheckCircle, Calendar, Clock } from 'lucide-react';
import { format, isPast, isToday } from 'date-fns';
import { toast } from 'sonner';

interface FollowUpsListViewProps {
  onBack: () => void;
  onPersonSelect?: (id: number) => void;
}

export function FollowUpsListView({ onBack, onPersonSelect }: FollowUpsListViewProps) {
  const followUps = useLiveQuery(() => 
    db.followUps.orderBy('dueDate').toArray()
  ) ?? [];

  const activeFollowUps = followUps.filter(f => !f.completed);
  const completedFollowUps = followUps.filter(f => f.completed);

  const overdueFollowUps = activeFollowUps.filter(f => 
    isPast(new Date(f.dueDate)) && !isToday(new Date(f.dueDate))
  );
  const dueTodayFollowUps = activeFollowUps.filter(f => isToday(new Date(f.dueDate)));
  const upcomingFollowUps = activeFollowUps.filter(f => 
    !isPast(new Date(f.dueDate)) && !isToday(new Date(f.dueDate))
  );

  const handleComplete = async (followUpId: number) => {
    await db.followUps.update(followUpId, {
      completed: true,
      completedAt: new Date(),
      updatedAt: new Date()
    });
    toast.success('Follow-up completed');
  };

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
            <Clock className="w-6 h-6 text-purple-400" />
            <h1 className="text-2xl font-medium">All Follow-ups</h1>
          </div>
          <p className="text-sm text-zinc-400 mt-1">
            {activeFollowUps.length} active · {completedFollowUps.length} completed
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto pb-20 p-4 space-y-6">
        {/* Overdue */}
        {overdueFollowUps.length > 0 && (
          <section>
            <h2 className="text-sm uppercase tracking-wide text-red-400 mb-3 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-red-500" />
              Overdue ({overdueFollowUps.length})
            </h2>
            <div className="space-y-2">
              {overdueFollowUps.map(followUp => (
                <FollowUpCard 
                  key={followUp.id} 
                  followUp={followUp} 
                  onComplete={handleComplete}
                  onPersonSelect={onPersonSelect}
                  variant="overdue"
                />
              ))}
            </div>
          </section>
        )}

        {/* Due Today */}
        {dueTodayFollowUps.length > 0 && (
          <section>
            <h2 className="text-sm uppercase tracking-wide text-blue-400 mb-3 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-blue-500" />
              Due Today ({dueTodayFollowUps.length})
            </h2>
            <div className="space-y-2">
              {dueTodayFollowUps.map(followUp => (
                <FollowUpCard 
                  key={followUp.id} 
                  followUp={followUp} 
                  onComplete={handleComplete}
                  onPersonSelect={onPersonSelect}
                  variant="today"
                />
              ))}
            </div>
          </section>
        )}

        {/* Upcoming */}
        {upcomingFollowUps.length > 0 && (
          <section>
            <h2 className="text-sm uppercase tracking-wide text-zinc-500 mb-3 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-zinc-600" />
              Upcoming ({upcomingFollowUps.length})
            </h2>
            <div className="space-y-2">
              {upcomingFollowUps.map(followUp => (
                <FollowUpCard 
                  key={followUp.id} 
                  followUp={followUp} 
                  onComplete={handleComplete}
                  onPersonSelect={onPersonSelect}
                  variant="upcoming"
                />
              ))}
            </div>
          </section>
        )}

        {/* Completed */}
        {completedFollowUps.length > 0 && (
          <section>
            <h2 className="text-sm uppercase tracking-wide text-green-400 mb-3 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              Completed ({completedFollowUps.length})
            </h2>
            <div className="space-y-2">
              {completedFollowUps.map(followUp => (
                <FollowUpCard 
                  key={followUp.id} 
                  followUp={followUp} 
                  onComplete={handleComplete}
                  onPersonSelect={onPersonSelect}
                  variant="completed"
                />
              ))}
            </div>
          </section>
        )}

        {/* Empty state */}
        {followUps.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <Clock className="w-12 h-12 text-zinc-700 mb-3" />
            <p className="text-zinc-500 mb-1">No follow-ups yet</p>
            <p className="text-sm text-zinc-600">
              Follow-ups will appear here when you create them
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function FollowUpCard({ 
  followUp, 
  onComplete, 
  onPersonSelect,
  variant 
}: { 
  followUp: any; 
  onComplete: (id: number) => void;
  onPersonSelect?: (id: number) => void;
  variant: 'overdue' | 'today' | 'upcoming' | 'completed';
}) {
  const person = useLiveQuery(
    () => followUp.personId ? db.people.get(followUp.personId) : Promise.resolve(null),
    [followUp.personId]
  );

  if (!person) return null;

  const borderColors = {
    overdue: 'border-red-900/50',
    today: 'border-blue-900/50',
    upcoming: 'border-zinc-800',
    completed: 'border-green-900/50'
  };

  return (
    <div className={`bg-zinc-900 border rounded-lg p-4 ${borderColors[variant]} ${variant === 'completed' ? 'opacity-60' : ''}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <button
            onClick={() => onPersonSelect?.(person.id!)}
            className="font-medium text-zinc-100 hover:text-purple-400 transition-colors text-left mb-1"
          >
            {person.name}
          </button>
          <p className="text-sm text-zinc-300 mb-2">{followUp.description}</p>
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <Calendar className="w-3 h-3" />
            <span className={
              variant === 'overdue' ? 'text-red-400' :
              variant === 'today' ? 'text-blue-400' :
              variant === 'completed' ? 'text-green-400' :
              'text-zinc-500'
            }>
              {variant === 'completed' 
                ? `Completed ${format(new Date(followUp.completedAt), 'MMM d')}`
                : `Due ${format(new Date(followUp.dueDate), 'MMM d, yyyy')}`
              }
            </span>
          </div>
        </div>
      </div>
      
      {!followUp.completed && (
        <button
          onClick={() => onComplete(followUp.id!)}
          className="w-full bg-green-950 hover:bg-green-900 border border-green-900 text-green-100 rounded-lg py-2 text-sm font-medium transition-colors flex items-center justify-center gap-2"
        >
          <CheckCircle className="w-4 h-4" />
          Mark Complete
        </button>
      )}
    </div>
  );
}
