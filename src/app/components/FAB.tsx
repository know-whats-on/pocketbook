import { Plus, User, FileText, Calendar } from 'lucide-react';
import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface FABProps {
  onAddMeet: () => void;
  onAddDump: () => void;
  onAddEvent: () => void;
}

export function FAB({ onAddMeet, onAddDump, onAddEvent }: FABProps) {
  const [isOpen, setIsOpen] = useState(false);

  const actions = [
    { id: 'meet', label: 'Meet', icon: User, onClick: onAddMeet, color: 'bg-blue-500' },
    { id: 'dump', label: 'Dump', icon: FileText, onClick: onAddDump, color: 'bg-purple-500' },
    { id: 'event', label: 'Event', icon: Calendar, onClick: onAddEvent, color: 'bg-green-500' },
  ];

  const handleAction = (action: typeof actions[0]) => {
    action.onClick();
    setIsOpen(false);
  };

  return (
    <div className="fixed bottom-20 right-4 z-50">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="flex flex-col gap-3 mb-3"
          >
            {actions.map((action, index) => (
              <motion.button
                key={action.id}
                initial={{ opacity: 0, scale: 0.8, y: 20 }}
                animate={{ 
                  opacity: 1, 
                  scale: 1, 
                  y: 0,
                  transition: { delay: index * 0.05 }
                }}
                exit={{ opacity: 0, scale: 0.8, y: 20 }}
                onClick={() => handleAction(action)}
                className={`${action.color} text-white rounded-full p-4 shadow-lg flex items-center gap-2 pr-5`}
                aria-label={`Add ${action.label}`}
              >
                <action.icon className="w-5 h-5" />
                <span className="text-sm font-medium">{action.label}</span>
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className={`${
          isOpen ? 'bg-zinc-600 rotate-45' : 'bg-blue-500'
        } text-white rounded-full p-4 shadow-lg transition-all duration-200`}
        aria-label="Add"
        aria-expanded={isOpen}
      >
        <Plus className="w-6 h-6" />
      </motion.button>
    </div>
  );
}
