import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../lib/db';
import { ArrowLeft, CheckCircle, Calendar, Heart } from 'lucide-react';
import { format, isPast, isToday } from 'date-fns';
import { toast } from 'sonner';

interface PromisesListViewProps {
  onBack: () => void;
  onPersonSelect?: (id: number) => void;
}

export function PromisesListView({ onBack, onPersonSelect }: PromisesListViewProps) {
  const promises = useLiveQuery(() => 
    db.promises.orderBy('createdAt').reverse().toArray()
  ) ?? [];

  const activePromises = promises.filter(p => !p.completed);
  const completedPromises = promises.filter(p => p.completed);

  const overduePromises = activePromises.filter(p => 
    p.dueDate && isPast(new Date(p.dueDate)) && !isToday(new Date(p.dueDate))
  );
  const dueTodayPromises = activePromises.filter(p => 
    p.dueDate && isToday(new Date(p.dueDate))
  );
  const upcomingPromises = activePromises.filter(p => 
    p.dueDate && !isPast(new Date(p.dueDate)) && !isToday(new Date(p.dueDate))
  );
  const noDueDatePromises = activePromises.filter(p => !p.dueDate);

  const handleComplete = async (promiseId: number) => {
    await db.promises.update(promiseId, {
      completed: true,
      completedAt: new Date()
    });
    toast.success('Promise completed');
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
            <Heart className="w-6 h-6 text-purple-400" />
            <h1 className="text-2xl font-medium">All Promises</h1>
          </div>
          <p className="text-sm text-zinc-400 mt-1">
            {activePromises.length} active · {completedPromises.length} completed
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto pb-20 p-4 space-y-6">
        {/* Overdue */}
        {overduePromises.length > 0 && (
          <section>
            <h2 className="text-sm uppercase tracking-wide text-amber-400 mb-3 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-amber-500" />
              Overdue ({overduePromises.length})
            </h2>
            <div className="space-y-2">
              {overduePromises.map(promise => (
                <PromiseCard 
                  key={promise.id} 
                  promise={promise} 
                  onComplete={handleComplete}
                  onPersonSelect={onPersonSelect}
                  variant="overdue"
                />
              ))}
            </div>
          </section>
        )}

        {/* Due Today */}
        {dueTodayPromises.length > 0 && (
          <section>
            <h2 className="text-sm uppercase tracking-wide text-blue-400 mb-3 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-blue-500" />
              Due Today ({dueTodayPromises.length})
            </h2>
            <div className="space-y-2">
              {dueTodayPromises.map(promise => (
                <PromiseCard 
                  key={promise.id} 
                  promise={promise} 
                  onComplete={handleComplete}
                  onPersonSelect={onPersonSelect}
                  variant="today"
                />
              ))}
            </div>
          </section>
        )}

        {/* Upcoming */}
        {upcomingPromises.length > 0 && (
          <section>
            <h2 className="text-sm uppercase tracking-wide text-zinc-500 mb-3 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-zinc-600" />
              Upcoming ({upcomingPromises.length})
            </h2>
            <div className="space-y-2">
              {upcomingPromises.map(promise => (
                <PromiseCard 
                  key={promise.id} 
                  promise={promise} 
                  onComplete={handleComplete}
                  onPersonSelect={onPersonSelect}
                  variant="upcoming"
                />
              ))}
            </div>
          </section>
        )}

        {/* No Due Date */}
        {noDueDatePromises.length > 0 && (
          <section>
            <h2 className="text-sm uppercase tracking-wide text-zinc-500 mb-3 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-zinc-600" />
              No Due Date ({noDueDatePromises.length})
            </h2>
            <div className="space-y-2">
              {noDueDatePromises.map(promise => (
                <PromiseCard 
                  key={promise.id} 
                  promise={promise} 
                  onComplete={handleComplete}
                  onPersonSelect={onPersonSelect}
                  variant="upcoming"
                />
              ))}
            </div>
          </section>
        )}

        {/* Completed */}
        {completedPromises.length > 0 && (
          <section>
            <h2 className="text-sm uppercase tracking-wide text-green-400 mb-3 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              Completed ({completedPromises.length})
            </h2>
            <div className="space-y-2">
              {completedPromises.map(promise => (
                <PromiseCard 
                  key={promise.id} 
                  promise={promise} 
                  onComplete={handleComplete}
                  onPersonSelect={onPersonSelect}
                  variant="completed"
                />
              ))}
            </div>
          </section>
        )}

        {/* Empty state */}
        {promises.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <Heart className="w-12 h-12 text-zinc-700 mb-3" />
            <p className="text-zinc-500 mb-1">No promises yet</p>
            <p className="text-sm text-zinc-600">
              Promises will appear here when you create them
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function PromiseCard({ 
  promise, 
  onComplete, 
  onPersonSelect,
  variant 
}: { 
  promise: any; 
  onComplete: (id: number) => void;
  onPersonSelect?: (id: number) => void;
  variant: 'overdue' | 'today' | 'upcoming' | 'completed';
}) {
  const person = useLiveQuery(
    () => promise.personId ? db.people.get(promise.personId) : Promise.resolve(null),
    [promise.personId]
  );

  if (!person) return null;

  const borderColors = {
    overdue: 'border-amber-900/50',
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
          <p className="text-sm text-zinc-300 mb-2">{promise.description}</p>
          {promise.dueDate && (
            <div className="flex items-center gap-2 text-xs text-zinc-500">
              <Calendar className="w-3 h-3" />
              <span className={
                variant === 'overdue' ? 'text-amber-400' :
                variant === 'today' ? 'text-blue-400' :
                variant === 'completed' ? 'text-green-400' :
                'text-zinc-500'
              }>
                {variant === 'completed' && promise.completedAt
                  ? `Completed ${format(new Date(promise.completedAt), 'MMM d')}`
                  : `Due ${format(new Date(promise.dueDate), 'MMM d, yyyy')}`
                }
              </span>
            </div>
          )}
          {!promise.dueDate && variant === 'completed' && promise.completedAt && (
            <div className="flex items-center gap-2 text-xs text-green-400">
              <Calendar className="w-3 h-3" />
              Completed {format(new Date(promise.completedAt), 'MMM d')}
            </div>
          )}
        </div>
      </div>
      
      {!promise.completed && (
        <button
          onClick={() => onComplete(promise.id!)}
          className="w-full bg-green-950 hover:bg-green-900 border border-green-900 text-green-100 rounded-lg py-2 text-sm font-medium transition-colors flex items-center justify-center gap-2"
        >
          <CheckCircle className="w-4 h-4" />
          Mark Complete
        </button>
      )}
    </div>
  );
}
