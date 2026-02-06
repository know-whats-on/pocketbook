import { useLiveQuery } from 'dexie-react-hooks';
import { db, Person } from '../../lib/db';
import { ArrowLeft, Calendar, MapPin, MessageSquare, Trash2, Edit, ExternalLink, Play, Pause } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { useState, useRef } from 'react';
import { EditPersonDialog } from '../dialogs/EditPersonDialog';

interface PersonDetailViewProps {
  personId: number;
  onBack: () => void;
}

export function PersonDetailView({ personId, onBack }: PersonDetailViewProps) {
  const [playingAudioId, setPlayingAudioId] = useState<number | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const person = useLiveQuery(() => db.people.get(personId), [personId]);
  
  const meets = useLiveQuery(
    () => db.meets
      .where('personId').equals(personId)
      .reverse()
      .sortBy('when'),
    [personId]
  ) ?? [];

  const followUps = useLiveQuery(
    () => db.followUps
      .where('personId').equals(personId)
      .and(f => !f.completed)
      .toArray(),
    [personId]
  ) ?? [];

  const promises = useLiveQuery(
    () => db.promises
      .where('personId').equals(personId)
      .and(p => !p.completed)
      .toArray(),
    [personId]
  ) ?? [];

  const handleDelete = async () => {
    if (!confirm(`Delete ${person?.name}? This will remove all associated meets, follow-ups, and promises.`)) {
      return;
    }

    try {
      // Delete associated records
      await db.meets.where('personId').equals(personId).delete();
      await db.followUps.where('personId').equals(personId).delete();
      await db.promises.where('personId').equals(personId).delete();
      
      // Delete person
      await db.people.delete(personId);
      
      toast.success('Person deleted');
      onBack();
    } catch (error) {
      toast.error('Failed to delete person');
      console.error(error);
    }
  };

  const handlePlayVoiceNote = (meetId: number, voiceNoteUrl: string) => {
    if (playingAudioId === meetId) {
      // Stop playing
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      setPlayingAudioId(null);
    } else {
      // Stop previous audio if any
      if (audioRef.current) {
        audioRef.current.pause();
      }

      // Play new audio
      const audio = new Audio(voiceNoteUrl);
      audioRef.current = audio;
      setPlayingAudioId(meetId);

      audio.onended = () => {
        setPlayingAudioId(null);
        audioRef.current = null;
      };

      audio.onerror = () => {
        toast.error('Failed to play voice note');
        setPlayingAudioId(null);
        audioRef.current = null;
      };

      audio.play().catch(error => {
        console.error('Error playing audio:', error);
        toast.error('Failed to play voice note');
        setPlayingAudioId(null);
        audioRef.current = null;
      });
    }
  };

  if (!person) {
    return (
      <div className="p-4 max-w-screen-sm mx-auto">
        <button onClick={onBack} className="flex items-center gap-2 text-zinc-400 mb-4">
          <ArrowLeft className="w-5 h-5" />
          Back
        </button>
        <p className="text-zinc-500">Person not found</p>
      </div>
    );
  }

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

          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center flex-shrink-0">
              {person.photoUrl ? (
                <img 
                  src={person.photoUrl} 
                  alt={person.name}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <span className="text-white text-2xl font-medium">
                  {person.name.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-medium mb-1 break-words">{person.name}</h1>
              {(person.role || person.company) && (
                <p className="text-zinc-400 mb-2 text-sm break-words">
                  {[person.role, person.company].filter(Boolean).join(' at ')}
                </p>
              )}
              {person.linkedInUrl && (
                <a
                  href={person.linkedInUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm text-blue-400 hover:text-blue-300"
                >
                  LinkedIn
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
              {person.notes && (
                <p className="text-sm text-zinc-500 mt-2 break-words line-clamp-3">{person.notes}</p>
              )}
            </div>
          </div>

          <div className="flex gap-2 mt-4">
            <button 
              onClick={() => setShowEditDialog(true)}
              className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg py-2 text-sm font-medium transition-colors flex items-center justify-center gap-2"
            >
              <Edit className="w-4 h-4" />
              Edit
            </button>
            <button 
              onClick={handleDelete}
              className="bg-red-950 hover:bg-red-900 text-red-200 rounded-lg px-4 py-2 text-sm font-medium transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto pb-20 p-4 space-y-6">
        {/* Notes from triaged dumps */}
        {person.notes && (
          <section>
            <h2 className="text-sm uppercase tracking-wide text-zinc-500 mb-3">Notes</h2>
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
              <p className="text-sm text-zinc-200 whitespace-pre-wrap">{person.notes}</p>
            </div>
          </section>
        )}

        {/* Active Follow-ups */}
        {followUps.length > 0 && (
          <section>
            <h2 className="text-sm uppercase tracking-wide text-zinc-500 mb-3">Active Follow-ups</h2>
            <div className="space-y-2">
              {followUps.map(followUp => (
                <div key={followUp.id} className="bg-zinc-900 border border-zinc-800 rounded-lg p-3">
                  <p className="text-sm text-zinc-200">{followUp.description}</p>
                  {followUp.dueDate && (
                    <p className="text-xs text-zinc-500 mt-1">
                      Due {format(new Date(followUp.dueDate), 'MMM d')}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Active Promises */}
        {promises.length > 0 && (
          <section>
            <h2 className="text-sm uppercase tracking-wide text-zinc-500 mb-3">My Promises</h2>
            <div className="space-y-2">
              {promises.map(promise => (
                <div key={promise.id} className="bg-zinc-900 border border-zinc-800 rounded-lg p-3">
                  <p className="text-sm text-zinc-200">{promise.description}</p>
                  {promise.dueDate && (
                    <p className="text-xs text-zinc-500 mt-1">
                      Due {format(new Date(promise.dueDate), 'MMM d')}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Meet History */}
        <section>
          <h2 className="text-sm uppercase tracking-wide text-zinc-500 mb-3">
            Meet History ({meets.length})
          </h2>
          {meets.length === 0 ? (
            <p className="text-sm text-zinc-600 italic">No meets recorded yet</p>
          ) : (
            <div className="space-y-3">
              {meets.map(meet => (
                <div key={meet.id} className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
                  <div className="flex items-start gap-2 mb-2">
                    <Calendar className="w-4 h-4 text-zinc-500 mt-0.5" />
                    <p className="text-sm text-zinc-400">
                      {format(new Date(meet.when), 'EEEE, MMMM d, yyyy')}
                    </p>
                  </div>
                  {meet.where && (
                    <div className="flex items-start gap-2 mb-2">
                      <MapPin className="w-4 h-4 text-zinc-500 mt-0.5" />
                      <p className="text-sm text-zinc-400">{meet.where}</p>
                    </div>
                  )}
                  {meet.context && (
                    <div className="flex items-start gap-2 mb-2">
                      <MessageSquare className="w-4 h-4 text-zinc-500 mt-0.5" />
                      <p className="text-sm text-zinc-200">{meet.context}</p>
                    </div>
                  )}
                  {meet.voiceNoteUrl && (
                    <div className="mt-2">
                      <button 
                        onClick={() => handlePlayVoiceNote(meet.id!, meet.voiceNoteUrl!)}
                        className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 transition-colors"
                      >
                        {playingAudioId === meet.id ? (
                          <>
                            <Pause className="w-4 h-4" />
                            Stop voice note
                          </>
                        ) : (
                          <>
                            <Play className="w-4 h-4" />
                            Play voice note
                          </>
                        )}
                      </button>
                    </div>
                  )}
                  {meet.nextStep && (
                    <div className="mt-3 pt-3 border-t border-zinc-800">
                      <p className="text-xs text-zinc-500 mb-1">Next step:</p>
                      <p className="text-sm text-blue-400">{meet.nextStep}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Edit Person Dialog */}
      {showEditDialog && person && (
        <EditPersonDialog
          open={showEditDialog}
          onClose={() => setShowEditDialog(false)}
          personId={personId}
          person={person}
        />
      )}
    </div>
  );
}