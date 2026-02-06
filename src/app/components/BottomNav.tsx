import { Home, Users, Calendar, Database } from 'lucide-react';

interface BottomNavProps {
  activeTab: 'today' | 'people' | 'events' | 'data';
  onTabChange: (tab: 'today' | 'people' | 'events' | 'data') => void;
}

export function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  const tabs = [
    { id: 'today' as const, label: 'Today', icon: Home },
    { id: 'people' as const, label: 'People', icon: Users },
    { id: 'events' as const, label: 'Events', icon: Calendar },
    { id: 'data' as const, label: 'Data', icon: Database },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-zinc-900 border-t border-zinc-800 safe-area-inset-bottom">
      <div className="flex justify-around items-center h-16 max-w-screen-sm mx-auto">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => onTabChange(id)}
            className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
              activeTab === id
                ? 'text-blue-400'
                : 'text-zinc-400 active:text-zinc-300'
            }`}
            aria-label={label}
            aria-current={activeTab === id ? 'page' : undefined}
          >
            <Icon className="w-6 h-6 mb-1" />
            <span className="text-xs">{label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
