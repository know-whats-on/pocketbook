import { Download, Upload, Trash2, Shield, Database as DatabaseIcon, Sparkles } from 'lucide-react';
import { db } from '../../lib/db';
import { toast } from 'sonner';
import { useLiveQuery } from 'dexie-react-hooks';
import { seedSampleData } from '../../lib/seedData';

export function DataView() {
  const peopleCount = useLiveQuery(() => db.people.count()) ?? 0;
  const meetsCount = useLiveQuery(() => db.meets.count()) ?? 0;
  const eventsCount = useLiveQuery(() => db.events.count()) ?? 0;
  const followUpsCount = useLiveQuery(() => db.followUps.count()) ?? 0;

  const exportData = async () => {
    try {
      const data = {
        version: 1,
        exportedAt: new Date().toISOString(),
        people: await db.people.toArray(),
        meets: await db.meets.toArray(),
        events: await db.events.toArray(),
        followUps: await db.followUps.toArray(),
        promises: await db.promises.toArray(),
        inboxDumps: await db.inboxDumps.toArray()
      };

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pocketnetwork-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('Data exported successfully');
    } catch (error) {
      toast.error('Failed to export data');
      console.error('Export error:', error);
    }
  };

  const importData = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      // Basic validation
      if (!data.version || !data.people) {
        throw new Error('Invalid backup file format');
      }

      // Import data (this will merge/overwrite)
      if (data.people) await db.people.bulkPut(data.people);
      if (data.meets) await db.meets.bulkPut(data.meets);
      if (data.events) await db.events.bulkPut(data.events);
      if (data.followUps) await db.followUps.bulkPut(data.followUps);
      if (data.promises) await db.promises.bulkPut(data.promises);
      if (data.inboxDumps) await db.inboxDumps.bulkPut(data.inboxDumps);

      toast.success('Data imported successfully');
    } catch (error) {
      toast.error('Failed to import data');
      console.error('Import error:', error);
    }

    // Reset file input
    event.target.value = '';
  };

  const clearAllData = async () => {
    if (!confirm('Are you sure you want to delete ALL data? This cannot be undone.')) {
      return;
    }

    try {
      await db.people.clear();
      await db.meets.clear();
      await db.events.clear();
      await db.followUps.clear();
      await db.promises.clear();
      await db.inboxDumps.clear();

      toast.success('All data cleared');
    } catch (error) {
      toast.error('Failed to clear data');
      console.error('Clear error:', error);
    }
  };

  const loadSampleData = async () => {
    try {
      await seedSampleData();
      toast.success('Sample data loaded');
    } catch (error) {
      toast.error('Failed to load sample data');
      console.error('Seed error:', error);
    }
  };

  return (
    <div className="flex flex-col h-full max-w-screen-sm mx-auto">
      <div className="p-4 border-b border-zinc-800 bg-zinc-950">
        <h1 className="text-2xl mb-1">Data</h1>
        <p className="text-sm text-zinc-400">Manage your local data</p>
      </div>

      <div className="flex-1 overflow-y-auto pb-20 p-4 space-y-6">
        {/* Privacy Notice */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h2 className="font-medium text-zinc-100 mb-1">Privacy First</h2>
              <p className="text-sm text-zinc-400">
                All your data is stored locally on this device only. Nothing is sent to any server.
                You have full control over your data through export and import.
              </p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div>
          <h2 className="text-sm uppercase tracking-wide text-zinc-500 mb-3">Storage Stats</h2>
          <div className="grid grid-cols-2 gap-3">
            <StatCard label="People" count={peopleCount} />
            <StatCard label="Meets" count={meetsCount} />
            <StatCard label="Events" count={eventsCount} />
            <StatCard label="Follow-ups" count={followUpsCount} />
          </div>
        </div>

        {/* Data Management */}
        <div>
          <h2 className="text-sm uppercase tracking-wide text-zinc-500 mb-3">Data Management</h2>
          <div className="space-y-3">
            {peopleCount === 0 && (
              <button
                onClick={loadSampleData}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg p-4 flex items-center gap-3 transition-colors"
              >
                <Sparkles className="w-5 h-5" />
                <div className="flex-1 text-left">
                  <div className="font-medium">Load Sample Data</div>
                  <div className="text-sm text-blue-100">Try the app with example people and meets</div>
                </div>
              </button>
            )}
            
            <button
              onClick={exportData}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg p-4 flex items-center gap-3 transition-colors"
            >
              <Download className="w-5 h-5" />
              <div className="flex-1 text-left">
                <div className="font-medium">Export Data</div>
                <div className="text-sm text-blue-100">Download a JSON backup</div>
              </div>
            </button>

            <label className="w-full bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-100 rounded-lg p-4 flex items-center gap-3 transition-colors cursor-pointer">
              <Upload className="w-5 h-5" />
              <div className="flex-1 text-left">
                <div className="font-medium">Import Data</div>
                <div className="text-sm text-zinc-400">Restore from a JSON backup</div>
              </div>
              <input
                type="file"
                accept=".json"
                onChange={importData}
                className="hidden"
              />
            </label>

            <button
              onClick={clearAllData}
              className="w-full bg-red-950 border border-red-900 hover:bg-red-900 text-red-100 rounded-lg p-4 flex items-center gap-3 transition-colors"
            >
              <Trash2 className="w-5 h-5" />
              <div className="flex-1 text-left">
                <div className="font-medium">Clear All Data</div>
                <div className="text-sm text-red-200">Permanently delete everything</div>
              </div>
            </button>
          </div>
        </div>

        {/* About */}
        <div className="text-center text-zinc-600 text-sm pt-4">
          <p>PocketNetwork v1.0</p>
          <p className="mt-1">A neurodivergent-first networking tool</p>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, count }: { label: string; count: number }) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
      <DatabaseIcon className="w-5 h-5 text-zinc-500 mb-2" />
      <div className="text-2xl font-bold text-zinc-100">{count}</div>
      <div className="text-sm text-zinc-400">{label}</div>
    </div>
  );
}