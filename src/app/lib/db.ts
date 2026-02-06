import Dexie, { Table } from 'dexie';

export const SCHEMA_VERSION = 1;

// Data models matching PRD Section 4
export interface Settings {
  id?: number;
  theme: 'dark' | 'light' | 'auto';
  nudgeIntensity: 'low' | 'medium';
  defaultFollowUpDays: number;
  calendarExportEnabled: boolean;
  lockEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Person {
  id?: number;
  name: string; // displayName in PRD
  pronouns?: string;
  company?: string;
  role?: string;
  photoUrl?: string; // photoBlobId in PRD (we're using URLs for simplicity)
  linkedInUrl?: string;
  notes?: string;
  tags?: string[];
  needsRefining?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Event {
  id?: number;
  name: string;
  date: Date; // dateTime in PRD
  location?: string; // venue in PRD
  series?: string; // seriesKey in PRD
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Meet {
  id?: number;
  personId?: number;
  eventId?: number;
  when: Date; // timestamp in PRD
  where?: string; // Location/context
  context?: string; // contextText in PRD
  nextStep?: string; // nextStepText in PRD
  nextStepType?: 'message' | 'intro' | 'send_link' | 'coffee' | 'none';
  topics?: string[]; // max 3 per PRD
  energy?: 'calm' | 'ok' | 'chaotic'; // matches PRD
  voiceNoteUrl?: string; // artifactIds in PRD
  isDraft?: boolean;
  needsRefining?: boolean; // refineLater in PRD
  createdAt: Date;
  updatedAt: Date;
}

export interface FollowUp {
  id?: number;
  meetId?: number;
  personId: number;
  description: string;
  dueDate: Date;
  status: 'pending' | 'done'; // matches PRD
  priority: 'low' | 'medium' | 'high';
  completed: boolean;
  completedAt?: Date;
  snoozedUntil?: Date; // matches PRD
  snoozedCount?: number;
  draftTone?: 'warm' | 'direct'; // matches PRD
  createdAt: Date;
  updatedAt: Date;
}

export interface Promise {
  id?: number;
  personId: number;
  meetId?: number;
  verb?: 'intro' | 'send_link' | 'connect' | 'other'; // matches PRD
  description: string; // intentText in PRD
  dueDate?: Date;
  status: 'pending' | 'done'; // matches PRD
  completed: boolean;
  completedAt?: Date;
  createdAt: Date;
}

export interface InboxDump {
  id?: number;
  type: 'text' | 'photo' | 'audio'; // matches PRD (audio not voice)
  content: string; // text in PRD
  blobUrl?: string; // blobId in PRD (using URLs)
  eventId?: number;
  status: 'new' | 'triaged' | 'archived'; // matches PRD
  processed: boolean;
  processedAt?: Date;
  createdAt: Date; // timestamp in PRD
}

// Database
export class PocketNetworkDB extends Dexie {
  settings!: Table<Settings>;
  people!: Table<Person>;
  meets!: Table<Meet>;
  events!: Table<Event>;
  followUps!: Table<FollowUp>;
  promises!: Table<Promise>;
  inboxDumps!: Table<InboxDump>;

  constructor() {
    super('PocketNetworkDB');
    this.version(1).stores({
      settings: '++id',
      people: '++id, name, linkedInUrl, createdAt, updatedAt',
      meets: '++id, personId, eventId, when, isDraft, needsRefining, createdAt, updatedAt',
      events: '++id, name, date, series, createdAt, updatedAt',
      followUps: '++id, meetId, personId, dueDate, status, completed, snoozedUntil, createdAt, updatedAt',
      promises: '++id, personId, meetId, dueDate, status, completed, createdAt',
      inboxDumps: '++id, status, processed, createdAt'
    });
  }
}

export const db = new PocketNetworkDB();