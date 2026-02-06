import { db, SCHEMA_VERSION } from './db';
import { toast } from 'sonner';

export interface ExportData {
  schemaVersion: number;
  exportDate: string;
  settings: any[];
  people: any[];
  meets: any[];
  events: any[];
  followUps: any[];
  promises: any[];
  inboxDumps: any[];
}

// ===== JSON EXPORT =====

export async function exportToJSON(includeMedia: boolean = false): Promise<string> {
  try {
    const exportData: ExportData = {
      schemaVersion: SCHEMA_VERSION,
      exportDate: new Date().toISOString(),
      settings: await db.settings.toArray(),
      people: await db.people.toArray(),
      meets: await db.meets.toArray(),
      events: await db.events.toArray(),
      followUps: await db.followUps.toArray(),
      promises: await db.promises.toArray(),
      inboxDumps: await db.inboxDumps.toArray()
    };

    // Note: Media blobs are not included for simplicity
    // In production, would need to handle blob serialization
    if (!includeMedia) {
      // Strip blob URLs from data
      exportData.people = exportData.people.map(p => ({ ...p, photoUrl: undefined }));
      exportData.meets = exportData.meets.map(m => ({ ...m, voiceNoteUrl: undefined }));
      exportData.inboxDumps = exportData.inboxDumps.map(i => ({ ...i, blobUrl: undefined }));
    }

    return JSON.stringify(exportData, null, 2);
  } catch (error) {
    console.error('Export failed:', error);
    throw new Error('Failed to export data');
  }
}

export function downloadJSON(data: string, filename: string = 'pocketnetwork-backup.json') {
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ===== JSON IMPORT =====

export async function importFromJSON(jsonString: string): Promise<{ success: boolean; message: string; stats?: any }> {
  try {
    const data: ExportData = JSON.parse(jsonString);

    // Validate schema version
    if (!data.schemaVersion) {
      throw new Error('Invalid export file: missing schema version');
    }

    if (data.schemaVersion > SCHEMA_VERSION) {
      throw new Error('Export file is from a newer version. Please update the app.');
    }

    // TODO: Handle migration if data.schemaVersion < SCHEMA_VERSION

    const stats = {
      settings: 0,
      people: 0,
      meets: 0,
      events: 0,
      followUps: 0,
      promises: 0,
      inboxDumps: 0,
      updated: 0,
      created: 0
    };

    // Import settings (merge by updating first record or creating)
    if (data.settings && data.settings.length > 0) {
      const existing = await db.settings.toArray();
      if (existing.length > 0) {
        await db.settings.update(existing[0].id!, data.settings[0]);
        stats.updated++;
      } else {
        await db.settings.add(data.settings[0]);
        stats.created++;
      }
      stats.settings = 1;
    }

    // Import people with duplicate detection
    if (data.people) {
      for (const person of data.people) {
        const existing = await findExistingPerson(person);
        if (existing) {
          await db.people.update(existing.id!, { ...person, id: existing.id });
          stats.updated++;
        } else {
          await db.people.add(person);
          stats.created++;
        }
        stats.people++;
      }
    }

    // Import events (merge by id)
    if (data.events) {
      for (const event of data.events) {
        if (event.id && await db.events.get(event.id)) {
          await db.events.update(event.id, event);
          stats.updated++;
        } else {
          await db.events.add(event);
          stats.created++;
        }
        stats.events++;
      }
    }

    // Import meets (merge by id)
    if (data.meets) {
      for (const meet of data.meets) {
        if (meet.id && await db.meets.get(meet.id)) {
          await db.meets.update(meet.id, meet);
          stats.updated++;
        } else {
          await db.meets.add(meet);
          stats.created++;
        }
        stats.meets++;
      }
    }

    // Import follow-ups (merge by id)
    if (data.followUps) {
      for (const followUp of data.followUps) {
        if (followUp.id && await db.followUps.get(followUp.id)) {
          await db.followUps.update(followUp.id, followUp);
          stats.updated++;
        } else {
          await db.followUps.add(followUp);
          stats.created++;
        }
        stats.followUps++;
      }
    }

    // Import promises (merge by id)
    if (data.promises) {
      for (const promise of data.promises) {
        if (promise.id && await db.promises.get(promise.id)) {
          await db.promises.update(promise.id, promise);
          stats.updated++;
        } else {
          await db.promises.add(promise);
          stats.created++;
        }
        stats.promises++;
      }
    }

    // Import inbox dumps (merge by id)
    if (data.inboxDumps) {
      for (const dump of data.inboxDumps) {
        if (dump.id && await db.inboxDumps.get(dump.id)) {
          await db.inboxDumps.update(dump.id, dump);
          stats.updated++;
        } else {
          await db.inboxDumps.add(dump);
          stats.created++;
        }
        stats.inboxDumps++;
      }
    }

    return {
      success: true,
      message: `Import complete: ${stats.created} created, ${stats.updated} updated`,
      stats
    };
  } catch (error: any) {
    console.error('Import failed:', error);
    return {
      success: false,
      message: error.message || 'Failed to import data'
    };
  }
}

async function findExistingPerson(person: any): Promise<any | null> {
  // First try LinkedIn URL (most unique)
  if (person.linkedInUrl && person.linkedInUrl.trim()) {
    try {
      const byLinkedIn = await db.people
        .where('linkedInUrl')
        .equals(person.linkedInUrl)
        .first();
      if (byLinkedIn) return byLinkedIn;
    } catch (error) {
      console.error('Error querying by LinkedIn URL:', error);
    }
  }

  // Then try name + company
  if (person.name && person.name.trim()) {
    try {
      const allPeople = await db.people.toArray();
      const byNameCompany = allPeople.find(p => {
        const namesMatch = p.name?.toLowerCase() === person.name?.toLowerCase();
        if (!namesMatch) return false;
        
        // If both have company, they must match
        if (person.company && p.company) {
          return p.company.toLowerCase() === person.company.toLowerCase();
        }
        
        // If only one has company, no match
        if (person.company || p.company) {
          return false;
        }
        
        // Neither has company, just match by name
        return true;
      });
      
      if (byNameCompany) return byNameCompany;
    } catch (error) {
      console.error('Error querying by name/company:', error);
    }
  }

  return null;
}

// ===== CSV EXPORT =====

export async function exportToCSV(tableName: string): Promise<string> {
  let data: any[] = [];
  let headers: string[] = [];

  switch (tableName) {
    case 'people':
      data = await db.people.toArray();
      headers = ['id', 'name', 'pronouns', 'company', 'role', 'linkedInUrl', 'notes', 'tags', 'createdAt', 'updatedAt'];
      break;
    case 'meets':
      data = await db.meets.toArray();
      headers = ['id', 'personId', 'eventId', 'when', 'where', 'context', 'nextStep', 'nextStepType', 'topics', 'energy', 'isDraft', 'needsRefining', 'createdAt', 'updatedAt'];
      break;
    case 'events':
      data = await db.events.toArray();
      headers = ['id', 'name', 'date', 'location', 'series', 'notes', 'createdAt', 'updatedAt'];
      break;
    case 'followUps':
      data = await db.followUps.toArray();
      headers = ['id', 'meetId', 'personId', 'description', 'dueDate', 'status', 'priority', 'completed', 'snoozedUntil', 'draftTone', 'createdAt', 'updatedAt'];
      break;
    case 'promises':
      data = await db.promises.toArray();
      headers = ['id', 'personId', 'meetId', 'verb', 'description', 'dueDate', 'status', 'completed', 'createdAt'];
      break;
    case 'inboxDumps':
      data = await db.inboxDumps.toArray();
      headers = ['id', 'type', 'content', 'eventId', 'status', 'processed', 'createdAt'];
      break;
    default:
      throw new Error(`Unknown table: ${tableName}`);
  }

  // Convert to CSV
  const csvRows: string[] = [];
  csvRows.push(headers.join(','));

  for (const row of data) {
    const values = headers.map(header => {
      let value = row[header];
      
      // Handle arrays
      if (Array.isArray(value)) {
        value = value.join(';');
      }
      
      // Handle dates
      if (value instanceof Date) {
        value = value.toISOString();
      }
      
      // Handle null/undefined
      if (value === null || value === undefined) {
        value = '';
      }
      
      // Escape quotes and wrap in quotes if contains comma
      value = String(value);
      if (value.includes(',') || value.includes('"') || value.includes('\n')) {
        value = `"${value.replace(/"/g, '""')}"`;
      }
      
      return value;
    });
    csvRows.push(values.join(','));
  }

  return csvRows.join('\n');
}

export function downloadCSV(data: string, filename: string) {
  const blob = new Blob([data], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function exportAllCSVs() {
  const tables = ['people', 'meets', 'events', 'followUps', 'promises', 'inboxDumps'];
  const timestamp = new Date().toISOString().split('T')[0];
  
  for (const table of tables) {
    try {
      const csv = await exportToCSV(table);
      downloadCSV(csv, `pocketnetwork-${table}-${timestamp}.csv`);
      // Small delay between downloads
      await new Promise(resolve => setTimeout(resolve, 300));
    } catch (error) {
      console.error(`Failed to export ${table}:`, error);
      toast.error(`Failed to export ${table}`);
    }
  }
}

// ===== STORAGE ESTIMATION =====

export async function getStorageEstimate(): Promise<{ used: number; quota: number; percentage: number } | null> {
  if ('storage' in navigator && 'estimate' in navigator.storage) {
    try {
      const estimate = await navigator.storage.estimate();
      const used = estimate.usage || 0;
      const quota = estimate.quota || 0;
      const percentage = quota > 0 ? (used / quota) * 100 : 0;
      
      return { used, quota, percentage };
    } catch (error) {
      console.error('Failed to estimate storage:', error);
      return null;
    }
  }
  return null;
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}