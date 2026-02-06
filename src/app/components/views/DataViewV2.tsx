import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../lib/db';
import { Download, FileText, Users, Calendar, Clock, Heart, Inbox, Upload, FileDown, Database, Settings as SettingsIcon, HardDrive, Trash2, AlertCircle, Info, CheckCircle2, FileJson, FileSpreadsheet } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { exportAllData } from '../../lib/data-export';
import { CSVImportDialog } from '../dialogs/CSVImportDialog';
import { exportAllPeopleToVCards } from '../../lib/vcard-export';
import { storage } from '../../lib/storage';
import { exportToJSON, downloadJSON, importFromJSON, exportAllCSVs, getStorageEstimate, formatBytes } from '../../lib/export-import';

interface DataViewV2Props {
  onDumpsClick?: () => void;
  onPeopleClick?: () => void;
  onMeetsClick?: () => void;
  onEventsClick?: () => void;
  onFollowUpsClick?: () => void;
  onPromisesClick?: () => void;
}

export function DataViewV2({ 
  onDumpsClick,
  onPeopleClick,
  onMeetsClick,
  onEventsClick,
  onFollowUpsClick,
  onPromisesClick
}: DataViewV2Props = {}) {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [showCSVImport, setShowCSVImport] = useState(false);
  const [storageInfo, setStorageInfo] = useState<{ used: number; quota: number; percentage: number } | null>(null);
  const [importResult, setImportResult] = useState<{ success: boolean; message: string; stats?: any } | null>(null);

  // Settings
  const [nudgeIntensity, setNudgeIntensity] = useState<'low' | 'medium'>(storage.getNudgeIntensity());

  // Stats
  const peopleCount = useLiveQuery(() => db.people.count()) ?? 0;
  const meetsCount = useLiveQuery(() => db.meets.count()) ?? 0;
  const eventsCount = useLiveQuery(() => db.events.count()) ?? 0;
  const followUpsCount = useLiveQuery(() => db.followUps.filter(f => !f.completed).count()) ?? 0;
  const promisesCount = useLiveQuery(() => db.promises.filter(p => !p.completed).count()) ?? 0;
  const inboxCount = useLiveQuery(() => db.inboxDumps.where('status').equals('new').count()) ?? 0;

  const handleExportJSON = async (includeMedia: boolean = false) => {
    try {
      setIsExporting(true);
      const data = await exportToJSON(includeMedia);
      downloadJSON(data, `pocketnetwork-backup-${new Date().toISOString().split('T')[0]}.json`);
      toast.success('Data exported successfully');
    } catch (error) {
      toast.error('Failed to export data');
      console.error(error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportCSVs = async () => {
    try {
      setIsExporting(true);
      await exportAllCSVs();
      toast.success('All CSV files downloaded');
    } catch (error) {
      toast.error('Failed to export CSVs');
      console.error(error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportJSON = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsImporting(true);
      setImportResult(null);
      
      const text = await file.text();
      const result = await importFromJSON(text);
      
      setImportResult(result);
      
      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error('Failed to import data');
      console.error(error);
      setImportResult({ success: false, message: 'Failed to read file' });
    } finally {
      setIsImporting(false);
      // Reset file input
      event.target.value = '';
    }
  };

  const handleCheckStorage = async () => {
    const estimate = await getStorageEstimate();
    setStorageInfo(estimate);
    
    if (estimate) {
      toast.success(`Using ${formatBytes(estimate.used)} of ${formatBytes(estimate.quota)}`);
    } else {
      toast.info('Storage estimation not available');
    }
  };

  const handleClearAllData = async () => {
    if (!confirm('⚠️ This will delete ALL your data. This cannot be undone. Are you sure?')) {
      return;
    }
    
    if (!confirm('Really delete everything? This is your last chance.')) {
      return;
    }

    try {
      await db.people.clear();
      await db.meets.clear();
      await db.events.clear();
      await db.followUps.clear();
      await db.promises.clear();
      await db.inboxDumps.clear();
      await db.settings.clear();
      
      // Clear localStorage settings
      storage.clear();
      
      toast.success('All data cleared');
      
      // Reload to reset app
      setTimeout(() => window.location.reload(), 1000);
    } catch (error) {
      toast.error('Failed to clear data');
      console.error(error);
    }
  };

  const handleNudgeIntensityChange = (value: 'low' | 'medium') => {
    setNudgeIntensity(value);
    storage.setNudgeIntensity(value);
    toast.success(`Nudge intensity set to ${value}`);
  };

  return (
    <div className="flex flex-col h-full max-w-screen-sm mx-auto">
      <div className="p-4 border-b border-zinc-800 bg-zinc-950">
        <h1 className="text-2xl">Data & Settings</h1>
      </div>

      <div className="flex-1 overflow-y-auto pb-20 p-4 space-y-6">
        {/* Stats Overview */}
        <section>
          <h2 className="text-sm font-medium text-zinc-300 mb-3 flex items-center gap-2">
            <Database className="w-4 h-4" />
            Data Overview
          </h2>
          <div className="grid grid-cols-2 gap-2">
            <StatCard label="People" value={peopleCount} onClick={onPeopleClick} clickable={!!onPeopleClick} />
            <StatCard label="Meets" value={meetsCount} onClick={onMeetsClick} clickable={!!onMeetsClick} />
            <StatCard label="Events" value={eventsCount} onClick={onEventsClick} clickable={!!onEventsClick} />
            <StatCard label="Follow-ups" value={followUpsCount} onClick={onFollowUpsClick} clickable={!!onFollowUpsClick} />
            <StatCard label="Promises" value={promisesCount} onClick={onPromisesClick} clickable={!!onPromisesClick} />
            <StatCard 
              label="Dumps" 
              value={inboxCount} 
              onClick={onDumpsClick}
              clickable={!!onDumpsClick}
            />
          </div>
        </section>

        {/* Settings */}
        <section>
          <h2 className="text-sm font-medium text-zinc-300 mb-3 flex items-center gap-2">
            <SettingsIcon className="w-4 h-4" />
            Settings
          </h2>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
            <div className="mb-4">
              <label className="block text-sm text-zinc-400 mb-2">
                Nudge Intensity
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => handleNudgeIntensityChange('low')}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                    nudgeIntensity === 'low'
                      ? 'bg-blue-600 text-white'
                      : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                  }`}
                >
                  Low (1/day)
                </button>
                <button
                  onClick={() => handleNudgeIntensityChange('medium')}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                    nudgeIntensity === 'medium'
                      ? 'bg-blue-600 text-white'
                      : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                  }`}
                >
                  Medium (3/day)
                </button>
              </div>
              <p className="text-xs text-zinc-600 mt-2">
                Controls how many follow-up nudges you see each day
              </p>
            </div>
          </div>
        </section>

        {/* Storage Info */}
        <section>
          <h2 className="text-sm font-medium text-zinc-300 mb-3 flex items-center gap-2">
            <HardDrive className="w-4 h-4" />
            Storage
          </h2>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
            {storageInfo ? (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-zinc-400">Used</span>
                  <span className="text-sm font-medium text-zinc-200">
                    {formatBytes(storageInfo.used)} / {formatBytes(storageInfo.quota)}
                  </span>
                </div>
                <div className="w-full bg-zinc-800 rounded-full h-2 mb-2">
                  <div
                    className={`h-2 rounded-full ${
                      storageInfo.percentage > 80 ? 'bg-red-500' :
                      storageInfo.percentage > 50 ? 'bg-amber-500' :
                      'bg-blue-500'
                    }`}
                    style={{ width: `${Math.min(storageInfo.percentage, 100)}%` }}
                  />
                </div>
                <p className="text-xs text-zinc-600">
                  {storageInfo.percentage.toFixed(1)}% used
                </p>
              </div>
            ) : (
              <button
                onClick={handleCheckStorage}
                className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg py-2 text-sm font-medium transition-colors"
              >
                Check Storage Usage
              </button>
            )}
          </div>
        </section>

        {/* Export */}
        <section>
          <h2 className="text-sm font-medium text-zinc-300 mb-3 flex items-center gap-2">
            <Download className="w-4 h-4" />
            Export Data
          </h2>
          <div className="space-y-2">
            <button
              onClick={() => handleExportJSON(false)}
              disabled={isExporting}
              className="w-full bg-blue-950 hover:bg-blue-900 border border-blue-900 text-blue-100 rounded-lg p-3 transition-colors text-left flex items-center gap-3"
            >
              <FileJson className="w-5 h-5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="font-medium">Export JSON (Full Backup)</div>
                <div className="text-xs text-blue-300 mt-0.5">
                  All data, fastest restore (data only)
                </div>
              </div>
            </button>

            <button
              onClick={handleExportCSVs}
              disabled={isExporting}
              className="w-full bg-green-950 hover:bg-green-900 border border-green-900 text-green-100 rounded-lg p-3 transition-colors text-left flex items-center gap-3"
            >
              <FileSpreadsheet className="w-5 h-5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="font-medium">Export CSV Files</div>
                <div className="text-xs text-green-300 mt-0.5">
                  Multiple CSV files for spreadsheets
                </div>
              </div>
            </button>

            <button
              onClick={exportAllPeopleToVCards}
              disabled={isExporting}
              className="w-full bg-purple-950 hover:bg-purple-900 border border-purple-900 text-purple-100 rounded-lg p-3 transition-colors text-left flex items-center gap-3"
            >
              <FileDown className="w-5 h-5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="font-medium">Export Contacts as vCards</div>
                <div className="text-xs text-purple-300 mt-0.5">
                  Import to phone contacts or other apps
                </div>
              </div>
            </button>
          </div>
        </section>

        {/* Import */}
        <section>
          <h2 className="text-sm font-medium text-zinc-300 mb-3 flex items-center gap-2">
            <Upload className="w-4 h-4" />
            Import Data
          </h2>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
            <div className="flex items-start gap-3 mb-3">
              <Info className="w-5 h-5 text-zinc-500 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-zinc-400">
                <p className="mb-2">Import a JSON backup file to restore or merge data.</p>
                <p className="text-xs text-zinc-600">
                  Duplicates are merged by ID. People are matched by LinkedIn URL or name+company.
                </p>
              </div>
            </div>
            
            <label className="block">
              <input
                type="file"
                accept=".json"
                onChange={handleImportJSON}
                disabled={isImporting}
                className="hidden"
              />
              <div className="w-full bg-purple-950 hover:bg-purple-900 border border-purple-900 text-purple-100 rounded-lg py-3 px-4 text-center cursor-pointer transition-colors font-medium">
                {isImporting ? 'Importing...' : 'Choose JSON File to Import'}
              </div>
            </label>

            {importResult && (
              <div className={`mt-3 p-3 rounded-lg border ${
                importResult.success
                  ? 'bg-green-950/30 border-green-900/50'
                  : 'bg-red-950/30 border-red-900/50'
              }`}>
                <div className="flex items-start gap-2">
                  {importResult.success ? (
                    <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <p className={`text-sm font-medium ${
                      importResult.success ? 'text-green-100' : 'text-red-100'
                    }`}>
                      {importResult.message}
                    </p>
                    {importResult.stats && (
                      <div className="mt-2 text-xs text-zinc-400 space-y-1">
                        <p>Created: {importResult.stats.created} items</p>
                        <p>Updated: {importResult.stats.updated} items</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={() => setShowCSVImport(true)}
              className="w-full mt-3 bg-green-950 hover:bg-green-900 border border-green-900 text-green-100 rounded-lg py-3 px-4 text-center cursor-pointer transition-colors font-medium"
            >
              Import People from CSV
            </button>
          </div>
        </section>

        {/* Danger Zone */}
        <section>
          <h2 className="text-sm font-medium text-red-400 mb-3 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            Danger Zone
          </h2>
          <div className="bg-red-950/20 border border-red-900/50 rounded-lg p-4">
            <p className="text-sm text-zinc-400 mb-3">
              This will permanently delete all your data. This cannot be undone.
            </p>
            <button
              onClick={handleClearAllData}
              className="w-full bg-red-900 hover:bg-red-800 text-red-100 rounded-lg py-2.5 px-4 text-sm font-medium transition-colors flex items-center justify-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Delete All Data
            </button>
          </div>
        </section>

        {/* Privacy Notice */}
        <section className="pb-4">
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4">
            <p className="text-xs text-zinc-500 leading-relaxed">
              <strong className="text-zinc-400">Privacy by default:</strong> All your data is stored locally on this device.
              Nothing is sent to any server. Your exports contain your personal data - store them securely.
            </p>
          </div>
        </section>
      </div>

      {/* CSV Import Dialog */}
      {showCSVImport && (
        <CSVImportDialog
          open={showCSVImport}
          onClose={() => setShowCSVImport(false)}
        />
      )}
    </div>
  );
}

function StatCard({ label, value, onClick, clickable }: { label: string; value: number; onClick?: () => void; clickable?: boolean }) {
  const baseClasses = "bg-zinc-900 border border-zinc-800 rounded-lg p-3";
  const clickableClasses = clickable ? "cursor-pointer hover:bg-zinc-800 hover:border-zinc-700 transition-colors" : "";
  
  return (
    <div 
      className={`${baseClasses} ${clickableClasses}`}
      onClick={clickable ? onClick : undefined}
    >
      <div className="text-2xl font-semibold text-zinc-100 mb-0.5">{value}</div>
      <div className="text-xs text-zinc-500">{label}</div>
    </div>
  );
}