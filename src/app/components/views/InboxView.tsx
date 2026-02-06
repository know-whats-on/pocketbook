import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../lib/db';
import { ArrowLeft, Check, Trash2, Inbox as InboxIcon } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface InboxViewProps {
  onBack: () => void;
}

export function InboxView({ onBack }: InboxViewProps) {
  const unprocessedDumps = useLiveQuery(
    () => db.inboxDumps.where('processed').equals(0).reverse().sortBy('createdAt'),
    []
  ) ?? [];

  const processedDumps = useLiveQuery(
    () => db.inboxDumps.where('processed').equals(1).reverse().sortBy('processedAt'),
    []
  ) ?? [];

  const markProcessed = async (id: number) => {
    try {
      await db.inboxDumps.update(id, {
        processed: true,
        processedAt: new Date()
      });
      toast.success('Marked as processed');
    } catch (error) {
      toast.error('Failed to update');
    }
  };

  const deleteDump = async (id: number) => {
    if (!confirm('Delete this dump?')) return;
    
    try {
      await db.inboxDumps.delete(id);
      toast.success('Deleted');
    } catch (error) {
      toast.error('Failed to delete');
    }
  };

  return (
    <div className="flex flex-col h-full max-w-screen-sm mx-auto">
      <div className="border-b border-zinc-800 bg-zinc-950 p-4">
        <button 
          onClick={onBack} 
          className="flex items-center gap-2 text-zinc-400 hover:text-zinc-200 mb-4"
        >
          <ArrowLeft className="w-5 h-5" />
          Back
        </button>
        <div className="flex items-center gap-2">
          <InboxIcon className="w-6 h-6 text-purple-400" />
          <h1 className="text-2xl">Inbox</h1>
        </div>
        <p className="text-sm text-zinc-400 mt-1">
          Process your quick dumps when you have energy
        </p>
      </div>

      <div className="flex-1 overflow-y-auto pb-20 p-4 space-y-6">
        {/* Unprocessed */}
        {unprocessedDumps.length > 0 && (
          <section>
            <h2 className="text-sm uppercase tracking-wide text-zinc-500 mb-3">
              To Process ({unprocessedDumps.length})
            </h2>
            <div className="space-y-3">
              {unprocessedDumps.map(dump => (
                <div key={dump.id} className="bg-purple-950/20 border border-purple-900/50 rounded-lg p-4">
                  <p className="text-sm text-zinc-200 whitespace-pre-wrap mb-3">{dump.content}</p>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-zinc-500">
                      {format(new Date(dump.createdAt), 'MMM d, h:mm a')}
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => markProcessed(dump.id!)}
                        className="bg-purple-600 hover:bg-purple-700 text-white rounded px-3 py-1.5 text-xs font-medium transition-colors flex items-center gap-1"
                      >
                        <Check className="w-3 h-3" />
                        Done
                      </button>
                      <button
                        onClick={() => deleteDump(dump.id!)}
                        className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded px-3 py-1.5 text-xs font-medium transition-colors"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Processed */}
        {processedDumps.length > 0 && (
          <section>
            <h2 className="text-sm uppercase tracking-wide text-zinc-500 mb-3">
              Processed
            </h2>
            <div className="space-y-2">
              {processedDumps.map(dump => (
                <div key={dump.id} className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 opacity-60">
                  <p className="text-sm text-zinc-400 line-clamp-2">{dump.content}</p>
                  <p className="text-xs text-zinc-600 mt-2">
                    Processed {format(new Date(dump.processedAt!), 'MMM d')}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Empty state */}
        {unprocessedDumps.length === 0 && processedDumps.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <InboxIcon className="w-12 h-12 text-zinc-700 mb-3" />
            <p className="text-zinc-500 mb-1">Inbox is empty</p>
            <p className="text-sm text-zinc-600">
              Use Quick Dump when you're tired and need to capture something fast
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
