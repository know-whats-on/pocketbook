import { useLiveQuery } from 'dexie-react-hooks';
import { db, InboxDump } from '../../lib/db';
import { ArrowLeft, FileText, Mic, Image as ImageIcon, Calendar, Play, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { useState } from 'react';
import { toast } from 'sonner';
import { addDays } from 'date-fns';
import { storage } from '../../lib/storage';

interface InboxViewV2Props {
  onBack: () => void;
}

type TriageAction = 'meet' | 'promise' | 'attach' | 'archive';

export function InboxViewV2({ onBack }: InboxViewV2Props) {
  const [isTriaging, setIsTriaging] = useState(false);
  const [currentBatchIndex, setCurrentBatchIndex] = useState(0);
  const [currentDumpIndex, setCurrentDumpIndex] = useState(0);
  const [triageAction, setTriageAction] = useState<TriageAction | null>(null);
  
  // Triage form state
  const [name, setName] = useState('');
  const [context, setContext] = useState('');
  const [promiseText, setPromiseText] = useState('');
  const [promiseDueDate, setPromiseDueDate] = useState<Date | null>(null);
  const [selectedPersonId, setSelectedPersonId] = useState<number | null>(null);

  const dumps = useLiveQuery(
    () => db.inboxDumps.where('status').equals('new').toArray(),
    []
  ) ?? [];

  const people = useLiveQuery(() => db.people.toArray()) ?? [];

  const BATCH_SIZE = 3;
  const currentBatch = dumps.slice(currentBatchIndex * BATCH_SIZE, (currentBatchIndex + 1) * BATCH_SIZE);
  const currentDump = isTriaging ? currentBatch[currentDumpIndex] : null;

  const handleStartTriage = () => {
    if (currentBatch.length === 0) {
      toast.error('No items to triage');
      return;
    }
    setIsTriaging(true);
    setCurrentDumpIndex(0);
    setTriageAction(null);
  };

  const handleSelectAction = (action: TriageAction) => {
    setTriageAction(action);
    
    // Pre-fill context if it's text dump
    if (currentDump && currentDump.type === 'text') {
      setContext(currentDump.content);
    }
  };

  const handleProcessDump = async () => {
    if (!currentDump || !triageAction) return;

    try {
      switch (triageAction) {
        case 'meet':
          await convertToMeet(currentDump);
          break;
        case 'promise':
          await convertToPromise(currentDump);
          break;
        case 'attach':
          await attachToPerson(currentDump);
          break;
        case 'archive':
          await archiveDump(currentDump);
          break;
      }

      // Move to next item
      await db.inboxDumps.update(currentDump.id!, { 
        status: 'triaged', 
        processed: true, 
        processedAt: new Date() 
      });

      // Reset state
      setTriageAction(null);
      setName('');
      setContext('');
      setPromiseText('');
      setPromiseDueDate(null);
      setSelectedPersonId(null);

      // Check if we have more in this batch
      if (currentDumpIndex + 1 < currentBatch.length) {
        setCurrentDumpIndex(currentDumpIndex + 1);
      } else {
        // Batch complete
        setIsTriaging(false);
        setCurrentBatchIndex(0);
        setCurrentDumpIndex(0);
        toast.success('Batch triaged!');
      }
    } catch (error) {
      toast.error('Failed to process dump');
      console.error(error);
    }
  };

  const convertToMeet = async (dump: InboxDump) => {
    if (!name.trim()) {
      toast.error('Please enter a name');
      return;
    }

    // Create or find person
    let person = await db.people.where('name').equalsIgnoreCase(name.trim()).first();
    
    if (!person) {
      const personId = await db.people.add({
        name: name.trim(),
        createdAt: new Date(),
        updatedAt: new Date()
      });
      person = await db.people.get(personId);
    }

    // Create meet
    const meetId = await db.meets.add({
      personId: person!.id,
      eventId: dump.eventId,
      when: dump.createdAt,
      context: context.trim() || undefined,
      voiceNoteUrl: dump.type === 'voice' ? dump.blobUrl : undefined,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    toast.success('Converted to meet');
  };

  const convertToPromise = async (dump: InboxDump) => {
    if (!selectedPersonId || !promiseText.trim()) {
      toast.error('Please select a person and enter promise text');
      return;
    }

    await db.promises.add({
      personId: selectedPersonId,
      description: promiseText.trim(),
      status: 'pending',
      completed: false,
      dueDate: promiseDueDate,
      createdAt: new Date()
    });

    toast.success('Promise created');
  };

  const attachToPerson = async (dump: InboxDump) => {
    if (!selectedPersonId) {
      toast.error('Please select a person');
      return;
    }

    const person = await db.people.get(selectedPersonId);
    if (!person) return;

    // Append dump content to person notes
    const updatedNotes = person.notes 
      ? `${person.notes}\n\n${dump.content}`
      : dump.content;

    await db.people.update(selectedPersonId, {
      notes: updatedNotes,
      updatedAt: new Date()
    });

    toast.success('Attached to person');
  };

  const archiveDump = async (dump: InboxDump) => {
    // Just mark as processed
    toast.success('Archived');
  };

  const handleDeleteDump = async (dumpId: number) => {
    await db.inboxDumps.delete(dumpId);
    toast.success('Dump deleted');
  };

  return (
    <div className="flex flex-col h-full max-w-screen-sm mx-auto">
      <div className="p-4 border-b border-zinc-800 bg-zinc-950">
        <div className="flex items-center gap-3 mb-3">
          <button
            onClick={onBack}
            className="text-zinc-400 hover:text-zinc-200"
            aria-label="Back"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-xl font-medium">Dumps</h1>
        </div>

        {!isTriaging && dumps.length > 0 && (
          <button
            onClick={handleStartTriage}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-3 font-medium transition-colors"
          >
            Triage {Math.min(BATCH_SIZE, dumps.length)} Item{Math.min(BATCH_SIZE, dumps.length) !== 1 ? 's' : ''}
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto pb-20">
        {isTriaging && currentDump ? (
          <TriageFlow
            dump={currentDump}
            remaining={currentBatch.length - currentDumpIndex - 1}
            action={triageAction}
            onSelectAction={handleSelectAction}
            name={name}
            setName={setName}
            context={context}
            setContext={setContext}
            promiseText={promiseText}
            setPromiseText={setPromiseText}
            promiseDueDate={promiseDueDate}
            setPromiseDueDate={setPromiseDueDate}
            selectedPersonId={selectedPersonId}
            setSelectedPersonId={setSelectedPersonId}
            people={people}
            onProcess={handleProcessDump}
            onCancel={() => {
              setIsTriaging(false);
              setTriageAction(null);
              setCurrentDumpIndex(0);
            }}
          />
        ) : dumps.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-8 text-center">
            <FileText className="w-12 h-12 text-zinc-700 mb-3" />
            <p className="text-zinc-500 mb-1">Dumps are empty</p>
            <p className="text-sm text-zinc-600">
              Use Dump to quickly capture things when you're tired
            </p>
          </div>
        ) : (
          <div className="p-4">
            <p className="text-sm text-zinc-500 mb-4">
              {dumps.length} item{dumps.length !== 1 ? 's' : ''} waiting to be triaged
            </p>
            <div className="space-y-2">
              {dumps.map(dump => (
                <DumpItem key={dump.id} dump={dump} onDelete={handleDeleteDump} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function DumpItem({ dump, onDelete }: { dump: InboxDump; onDelete: (id: number) => void }) {
  const event = useLiveQuery(
    () => dump.eventId ? db.events.get(dump.eventId) : Promise.resolve(null),
    [dump.eventId]
  );

  const getIcon = () => {
    switch (dump.type) {
      case 'voice': return <Mic className="w-4 h-4" />;
      case 'photo': return <ImageIcon className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 flex items-start gap-3">
      <div className="text-zinc-500 mt-0.5">
        {getIcon()}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-zinc-200 mb-1 line-clamp-2">{dump.content}</p>
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <span>{format(new Date(dump.createdAt), 'MMM d, h:mma')}</span>
          {event && (
            <>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {event.name}
              </span>
            </>
          )}
        </div>
      </div>
      <button
        onClick={() => onDelete(dump.id!)}
        className="text-zinc-600 hover:text-red-400 transition-colors"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}

interface TriageFlowProps {
  dump: InboxDump;
  remaining: number;
  action: TriageAction | null;
  onSelectAction: (action: TriageAction) => void;
  name: string;
  setName: (name: string) => void;
  context: string;
  setContext: (context: string) => void;
  promiseText: string;
  setPromiseText: (text: string) => void;
  promiseDueDate: Date | null;
  setPromiseDueDate: (date: Date | null) => void;
  selectedPersonId: number | null;
  setSelectedPersonId: (id: number | null) => void;
  people: any[];
  onProcess: () => void;
  onCancel: () => void;
}

function TriageFlow({
  dump,
  remaining,
  action,
  onSelectAction,
  name,
  setName,
  context,
  setContext,
  promiseText,
  setPromiseText,
  promiseDueDate,
  setPromiseDueDate,
  selectedPersonId,
  setSelectedPersonId,
  people,
  onProcess,
  onCancel
}: TriageFlowProps) {
  return (
    <div className="p-4">
      {/* Progress */}
      <div className="mb-4">
        <p className="text-sm text-zinc-500">
          {remaining === 0 ? 'Last item' : `${remaining} left after this`}
        </p>
      </div>

      {/* Dump preview */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 mb-4">
        <p className="text-sm text-zinc-300 mb-2">{dump.content}</p>
        <p className="text-xs text-zinc-600">{format(new Date(dump.createdAt), 'MMM d, h:mma')}</p>
        {dump.type === 'voice' && (
          <button className="mt-2 flex items-center gap-2 text-sm text-blue-400">
            <Play className="w-4 h-4" />
            Play voice note
          </button>
        )}
      </div>

      {/* Step 1: Choose action */}
      {!action && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-zinc-300 mb-3">What is this?</h3>
          <button
            onClick={() => onSelectAction('meet')}
            className="w-full bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-200 rounded-lg p-3 text-left transition-colors"
          >
            <div className="font-medium mb-1">Convert to Meet</div>
            <div className="text-xs text-zinc-500">Create a new person and meet entry</div>
          </button>
          <button
            onClick={() => onSelectAction('promise')}
            className="w-full bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-200 rounded-lg p-3 text-left transition-colors"
          >
            <div className="font-medium mb-1">Convert to Promise</div>
            <div className="text-xs text-zinc-500">Track a commitment to follow through</div>
          </button>
          <button
            onClick={() => onSelectAction('attach')}
            className="w-full bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-200 rounded-lg p-3 text-left transition-colors"
          >
            <div className="font-medium mb-1">Attach to Person</div>
            <div className="text-xs text-zinc-500">Add as notes to existing contact</div>
          </button>
          <button
            onClick={() => onSelectAction('archive')}
            className="w-full bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-200 rounded-lg p-3 text-left transition-colors"
          >
            <div className="font-medium mb-1">Archive</div>
            <div className="text-xs text-zinc-500">Dismiss without saving</div>
          </button>

          <button
            onClick={onCancel}
            className="w-full bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 rounded-lg py-2 text-sm transition-colors mt-4"
          >
            Cancel Triage
          </button>
        </div>
      )}

      {/* Step 2: Action-specific forms */}
      {action === 'meet' && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-zinc-300 mb-3">Convert to Meet</h3>
          <div>
            <label htmlFor="name" className="block text-sm text-zinc-400 mb-1">
              Name *
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Person's name"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label htmlFor="context" className="block text-sm text-zinc-400 mb-1">
              Context (optional)
            </label>
            <textarea
              id="context"
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="What was discussed..."
              rows={3}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex gap-2 pt-2">
            <button
              onClick={() => onSelectAction(null as any)}
              className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg py-2 text-sm transition-colors"
            >
              Back
            </button>
            <button
              onClick={onProcess}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-2 text-sm font-medium transition-colors"
            >
              Save Meet
            </button>
          </div>
        </div>
      )}

      {action === 'promise' && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-zinc-300 mb-3">Convert to Promise</h3>
          <div>
            <label htmlFor="person" className="block text-sm text-zinc-400 mb-1">
              For who? *
            </label>
            <select
              id="person"
              value={selectedPersonId ?? ''}
              onChange={(e) => setSelectedPersonId(e.target.value ? Number(e.target.value) : null)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select a person</option>
              {people.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="promise" className="block text-sm text-zinc-400 mb-1">
              Promise *
            </label>
            <input
              id="promise"
              type="text"
              value={promiseText}
              onChange={(e) => setPromiseText(e.target.value)}
              placeholder="I promised to..."
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label htmlFor="due-date" className="block text-sm text-zinc-400 mb-1">
              Due Date (optional)
            </label>
            <input
              id="due-date"
              type="date"
              value={promiseDueDate ? format(promiseDueDate, 'yyyy-MM-dd') : ''}
              onChange={(e) => setPromiseDueDate(e.target.value ? new Date(e.target.value) : null)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex gap-2 pt-2">
            <button
              onClick={() => onSelectAction(null as any)}
              className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg py-2 text-sm transition-colors"
            >
              Back
            </button>
            <button
              onClick={onProcess}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-2 text-sm font-medium transition-colors"
            >
              Save Promise
            </button>
          </div>
        </div>
      )}

      {action === 'attach' && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-zinc-300 mb-3">Attach to Person</h3>
          <div>
            <label htmlFor="attach-person" className="block text-sm text-zinc-400 mb-1">
              Select person *
            </label>
            <select
              id="attach-person"
              value={selectedPersonId ?? ''}
              onChange={(e) => setSelectedPersonId(e.target.value ? Number(e.target.value) : null)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select a person</option>
              {people.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-2 pt-2">
            <button
              onClick={() => onSelectAction(null as any)}
              className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg py-2 text-sm transition-colors"
            >
              Back
            </button>
            <button
              onClick={onProcess}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-2 text-sm font-medium transition-colors"
            >
              Attach
            </button>
          </div>
        </div>
      )}

      {action === 'archive' && (
        <div className="space-y-3">
          <p className="text-sm text-zinc-500">This item will be archived without saving.</p>
          <div className="flex gap-2">
            <button
              onClick={() => onSelectAction(null as any)}
              className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg py-2 text-sm transition-colors"
            >
              Back
            </button>
            <button
              onClick={onProcess}
              className="flex-1 bg-zinc-700 hover:bg-zinc-600 text-zinc-300 rounded-lg py-2 text-sm transition-colors"
            >
              Confirm Archive
            </button>
          </div>
        </div>
      )}
    </div>
  );
}