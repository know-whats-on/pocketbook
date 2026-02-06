import { useState, useEffect } from 'react';
import { X, Save, Sparkles } from 'lucide-react';
import { db } from '../../lib/db';
import { toast } from 'sonner';

interface AddDumpDialogProps {
  open: boolean;
  onClose: () => void;
}

export function AddDumpDialog({ open, onClose }: AddDumpDialogProps) {
  const [content, setContent] = useState('');

  useEffect(() => {
    if (open) {
      setContent('');
    }
  }, [open]);

  const handleSave = async () => {
    if (!content.trim()) {
      toast.error('Please enter something');
      return;
    }

    try {
      await db.inboxDumps.add({
        content: content.trim(),
        type: 'text',
        status: 'new',
        processed: false,
        createdAt: new Date()
      });

      toast.success('Saved to inbox');
      onClose();
    } catch (error) {
      toast.error('Failed to save');
      console.error('Save error:', error);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleSave();
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-end sm:items-center justify-center">
      <div className="bg-zinc-900 w-full sm:max-w-md sm:rounded-lg rounded-t-2xl">
        {/* Header */}
        <div className="bg-zinc-900 border-b border-zinc-800 p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-400" />
            <h2 className="text-lg font-medium">Quick Dump</h2>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-200"
            aria-label="Close"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Info */}
        <div className="p-4 bg-purple-950/20 border-b border-zinc-800">
          <p className="text-sm text-zinc-400">
            Tired mode: Just dump everything here. Sort it out later when you have more energy.
          </p>
        </div>

        {/* Form */}
        <div className="p-4">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Names, notes, ideas, reminders... whatever you need to remember"
            autoFocus
            rows={8}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
          />
          <p className="text-xs text-zinc-500 mt-2">
            Tip: Press Cmd/Ctrl + Enter to save quickly
          </p>
        </div>

        {/* Actions */}
        <div className="bg-zinc-900 border-t border-zinc-800 p-4">
          <button
            onClick={handleSave}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white rounded-lg py-3 font-medium transition-colors flex items-center justify-center gap-2"
          >
            <Save className="w-4 h-4" />
            Save to Inbox
          </button>
        </div>
      </div>
    </div>
  );
}