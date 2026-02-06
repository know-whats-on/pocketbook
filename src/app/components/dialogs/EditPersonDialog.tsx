import { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import { db, Person } from '../../lib/db';
import { toast } from 'sonner';

interface EditPersonDialogProps {
  open: boolean;
  onClose: () => void;
  personId: number;
  person: Person;
}

export function EditPersonDialog({ open, onClose, personId, person }: EditPersonDialogProps) {
  const [name, setName] = useState('');
  const [pronouns, setPronouns] = useState('');
  const [company, setCompany] = useState('');
  const [role, setRole] = useState('');
  const [linkedInUrl, setLinkedInUrl] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (open && person) {
      setName(person.name || '');
      setPronouns(person.pronouns || '');
      setCompany(person.company || '');
      setRole(person.role || '');
      setLinkedInUrl(person.linkedInUrl || '');
      setNotes(person.notes || '');
    }
  }, [open, person]);

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Name is required');
      return;
    }

    try {
      await db.people.update(personId, {
        name: name.trim(),
        pronouns: pronouns.trim() || undefined,
        company: company.trim() || undefined,
        role: role.trim() || undefined,
        linkedInUrl: linkedInUrl.trim() || undefined,
        notes: notes.trim() || undefined,
        updatedAt: new Date()
      });

      toast.success('Person updated');
      onClose();
    } catch (error) {
      toast.error('Failed to update person');
      console.error('Update error:', error);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-end sm:items-center justify-center">
      <div className="bg-zinc-900 w-full sm:max-w-md sm:rounded-lg rounded-t-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-zinc-900 border-b border-zinc-800 p-4 flex items-center justify-between flex-shrink-0">
          <h2 className="text-lg font-medium">Edit Person</h2>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-200"
            aria-label="Close"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form - Scrollable */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">
              Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Full name"
              autoFocus
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">
              Pronouns
            </label>
            <input
              type="text"
              value={pronouns}
              onChange={(e) => setPronouns(e.target.value)}
              placeholder="e.g., they/them, she/her, he/him"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">
              Company
            </label>
            <input
              type="text"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="Company name"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">
              Role
            </label>
            <input
              type="text"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="Job title or role"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">
              LinkedIn URL
            </label>
            <input
              type="url"
              value={linkedInUrl}
              onChange={(e) => setLinkedInUrl(e.target.value)}
              placeholder="https://linkedin.com/in/username"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional notes or context"
              rows={4}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="bg-zinc-900 border-t border-zinc-800 p-4 flex gap-3 flex-shrink-0">
          <button
            onClick={onClose}
            className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg py-3 font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg py-3 font-medium transition-colors flex items-center justify-center gap-2"
          >
            <Save className="w-4 h-4" />
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
