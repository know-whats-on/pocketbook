import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../lib/db';
import { User, Search } from 'lucide-react';
import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';

interface PeopleViewProps {
  onPersonSelect: (personId: number) => void;
}

export function PeopleView({ onPersonSelect }: PeopleViewProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const people = useLiveQuery(
    async () => {
      const allPeople = await db.people.orderBy('updatedAt').reverse().toArray();
      
      // Get active follow-ups for each person
      const peopleWithFollowUps = await Promise.all(
        allPeople.map(async (person) => {
          const followUps = await db.followUps
            .where('personId')
            .equals(person.id!)
            .and(f => !f.completed)
            .sortBy('dueDate');
          
          return {
            ...person,
            nextFollowUp: followUps[0] // Get the next follow-up (soonest due date)
          };
        })
      );
      
      if (!searchQuery) return peopleWithFollowUps;
      
      const query = searchQuery.toLowerCase();
      return peopleWithFollowUps.filter(person => 
        person.name.toLowerCase().includes(query) ||
        person.company?.toLowerCase().includes(query) ||
        person.role?.toLowerCase().includes(query) ||
        person.notes?.toLowerCase().includes(query)
      );
    },
    [searchQuery]
  ) ?? [];

  return (
    <div className="flex flex-col h-full max-w-screen-sm mx-auto">
      <div className="p-4 border-b border-zinc-800 bg-zinc-950">
        <h1 className="text-2xl mb-3">People</h1>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
          <input
            type="search"
            placeholder="Search people..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-20">
        {people.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-8 text-center">
            <User className="w-12 h-12 text-zinc-700 mb-3" />
            <p className="text-zinc-500 mb-1">
              {searchQuery ? 'No people found' : 'No people yet'}
            </p>
            <p className="text-sm text-zinc-600">
              {searchQuery ? 'Try a different search' : 'Tap + to add your first contact'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-800">
            {people.map(person => (
              <button
                key={person.id}
                onClick={() => onPersonSelect(person.id!)}
                className="w-full p-4 flex items-start gap-3 hover:bg-zinc-900 transition-colors text-left"
              >
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center flex-shrink-0">
                  {person.photoUrl ? (
                    <img 
                      src={person.photoUrl} 
                      alt={person.name}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <span className="text-white font-medium">
                      {person.name.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-zinc-100 mb-0.5">{person.name}</h3>
                  {(person.role || person.company) && (
                    <p className="text-sm text-zinc-400 mb-1">
                      {[person.role, person.company].filter(Boolean).join(' at ')}
                    </p>
                  )}
                  {person.nextFollowUp && (
                    <p className="text-sm text-blue-400 mb-1">
                      Next: {person.nextFollowUp.description}
                    </p>
                  )}
                  {person.notes && !person.nextFollowUp && (
                    <p className="text-sm text-zinc-500 line-clamp-1">{person.notes}</p>
                  )}
                  <p className="text-xs text-zinc-600 mt-1">
                    Updated {formatDistanceToNow(new Date(person.updatedAt), { addSuffix: true })}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}