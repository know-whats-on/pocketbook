import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../lib/db';
import { ArrowLeft, FileText, Calendar, Trash2, Archive } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface DumpsListViewProps {
  onBack: () => void;
}

export function DumpsListView({ onBack }: DumpsListViewProps) {
  const allDumps = useLiveQuery(() => 
    db.inboxDumps.orderBy('createdAt').reverse().toArray()
  ) ?? [];

  const newDumps = allDumps.filter(d => d.status === 'new');
  const triagedDumps = allDumps.filter(d => d.status === 'triaged');
  const archivedDumps = allDumps.filter(d => d.status === 'archived');

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this dump?')) return;
    
    try {
      await db.inboxDumps.delete(id);
      toast.success('Dump deleted');
    } catch (error) {
      toast.error('Failed to delete dump');
      console.error(error);
    }
  };

  const handleArchive = async (id: number) => {
    try {
      await db.inboxDumps.update(id, {
        status: 'archived',
        processedAt: new Date()
      });
      toast.success('Archived');
    } catch (error) {
      toast.error('Failed to archive');
      console.error(error);
    }
  };

  const handleUnarchive = async (id: number) => {
    try {
      await db.inboxDumps.update(id, {
        status: 'new',
        processedAt: undefined
      });
      toast.success('Restored to new');
    } catch (error) {
      toast.error('Failed to restore');
      console.error(error);
    }
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
            <FileText className="w-6 h-6 text-purple-400" />
            <h1 className="text-2xl font-medium">All Dumps</h1>
          </div>
          <p className="text-sm text-zinc-400 mt-1">
            View and manage your quick captures
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto pb-20 p-4 space-y-6">
        {/* New Dumps */}
        {newDumps.length > 0 && (
          <section>
            <h2 className="text-sm uppercase tracking-wide text-zinc-500 mb-3 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-purple-500" />
              New ({newDumps.length})
            </h2>
            <div className="space-y-2">
              {newDumps.map(dump => (
                <div key={dump.id} className="bg-purple-950/20 border border-purple-900/50 rounded-lg p-4">
                  <p className="text-sm text-zinc-200 whitespace-pre-wrap mb-3">{dump.content}</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs text-zinc-500">
                      <Calendar className="w-3 h-3" />
                      {format(new Date(dump.createdAt), 'MMM d, h:mm a')}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleArchive(dump.id!)}
                        className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded px-3 py-1.5 text-xs font-medium transition-colors flex items-center gap-1"
                      >
                        <Archive className="w-3 h-3" />
                        Archive
                      </button>
                      <button
                        onClick={() => handleDelete(dump.id!)}
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

        {/* Triaged Dumps */}
        {triagedDumps.length > 0 && (
          <section>
            <h2 className="text-sm uppercase tracking-wide text-zinc-500 mb-3 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              Triaged ({triagedDumps.length})
            </h2>
            <div className="space-y-2">
              {triagedDumps.map(dump => (
                <div key={dump.id} className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 opacity-75">
                  <p className="text-sm text-zinc-400 line-clamp-2">{dump.content}</p>
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-xs text-zinc-600">
                      {format(new Date(dump.processedAt || dump.createdAt), 'MMM d')}
                    </p>
                    <button
                      onClick={() => handleDelete(dump.id!)}
                      className="text-zinc-600 hover:text-zinc-400 transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Archived Dumps */}
        {archivedDumps.length > 0 && (
          <section>
            <h2 className="text-sm uppercase tracking-wide text-zinc-500 mb-3 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-zinc-600" />
              Archived ({archivedDumps.length})
            </h2>
            <div className="space-y-2">
              {archivedDumps.map(dump => (
                <div key={dump.id} className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 opacity-60">
                  <p className="text-sm text-zinc-500 line-clamp-2">{dump.content}</p>
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-xs text-zinc-600">
                      {format(new Date(dump.processedAt || dump.createdAt), 'MMM d')}
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleUnarchive(dump.id!)}
                        className="text-zinc-600 hover:text-zinc-400 text-xs transition-colors"
                      >
                        Restore
                      </button>
                      <button
                        onClick={() => handleDelete(dump.id!)}
                        className="text-zinc-600 hover:text-zinc-400 transition-colors"
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

        {/* Empty state */}
        {allDumps.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <FileText className="w-12 h-12 text-zinc-700 mb-3" />
            <p className="text-zinc-500 mb-1">No dumps yet</p>
            <p className="text-sm text-zinc-600">
              Quick dumps will appear here when you create them
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
