import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../lib/db';
import { Search, User, Grid, List, AlertCircle } from 'lucide-react';
import { useState } from 'react';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import { formatDistanceToNow } from 'date-fns';

interface PeopleViewV2Props {
  onPersonSelect: (personId: number) => void;
}

export function PeopleViewV2({ onPersonSelect }: PeopleViewV2Props) {
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');

  const people = useLiveQuery(
    async () => {
      const allPeople = await db.people.orderBy('updatedAt').reverse().toArray();
      
      if (!searchQuery) return allPeople;
      
      const query = searchQuery.toLowerCase();
      return allPeople.filter(person => 
        person.name.toLowerCase().includes(query) ||
        person.company?.toLowerCase().includes(query) ||
        person.role?.toLowerCase().includes(query) ||
        person.notes?.toLowerCase().includes(query)
      );
    },
    [searchQuery]
  ) ?? [];

  const peopleNeedingRefining = people.filter(p => p.needsRefining);

  return (
    <div className="flex flex-col h-full max-w-screen-sm mx-auto">
      <div className="p-4 border-b border-zinc-800 bg-zinc-950">
        <h1 className="text-2xl mb-3">People</h1>
        
        <div className="flex gap-2 mb-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
            <input
              type="search"
              placeholder="Search people..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          {/* View toggle */}
          <div className="flex bg-zinc-900 border border-zinc-800 rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded transition-colors ${
                viewMode === 'grid' 
                  ? 'bg-zinc-700 text-zinc-100' 
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
              aria-label="Grid view"
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded transition-colors ${
                viewMode === 'list' 
                  ? 'bg-zinc-700 text-zinc-100' 
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
              aria-label="List view"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Refine later badge */}
        {peopleNeedingRefining.length > 0 && (
          <button className="w-full bg-amber-950/30 border border-amber-900/50 rounded-lg p-2.5 flex items-center gap-2 text-sm text-amber-200 hover:bg-amber-950/50 transition-colors">
            <AlertCircle className="w-4 h-4" />
            <span>{peopleNeedingRefining.length} need refining</span>
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto pb-20">
        {people.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-8 text-center">
            {searchQuery ? (
              <>
                <User className="w-12 h-12 text-zinc-700 mb-3" />
                <p className="text-zinc-500 mb-1">No people found</p>
                <p className="text-sm text-zinc-600">Try a different search</p>
              </>
            ) : (
              <>
                <User className="w-12 h-12 text-zinc-700 mb-3" />
                <p className="text-zinc-400 mb-1">Your saved people will appear here.</p>
                <p className="text-xs text-zinc-600">Tap + to save your first meet</p>
              </>
            )}
          </div>
        ) : viewMode === 'grid' ? (
          <div className="p-4 grid grid-cols-3 gap-3">
            {people.map(person => (
              <button
                key={person.id}
                onClick={() => onPersonSelect(person.id!)}
                className="flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-zinc-900 transition-colors"
              >
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center relative">
                  {person.photoUrl ? (
                    <img 
                      src={person.photoUrl} 
                      alt={person.name}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <span className="text-white font-medium text-lg">
                      {person.name.charAt(0).toUpperCase()}
                    </span>
                  )}
                  {person.needsRefining && (
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 rounded-full border-2 border-zinc-950" />
                  )}
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-zinc-100 line-clamp-1">{person.name}</p>
                  {person.company && (
                    <p className="text-xs text-zinc-500 line-clamp-1">{person.company}</p>
                  )}
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="divide-y divide-zinc-800">
            {people.map(person => (
              <button
                key={person.id}
                onClick={() => onPersonSelect(person.id!)}
                className="w-full p-4 flex items-start gap-3 hover:bg-zinc-900 transition-colors text-left"
              >
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center flex-shrink-0 relative">
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
                  {person.needsRefining && (
                    <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-amber-500 rounded-full border-2 border-zinc-950" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-zinc-100 mb-0.5">{person.name}</h3>
                  {(person.role || person.company) && (
                    <p className="text-sm text-zinc-400 mb-1">
                      {[person.role, person.company].filter(Boolean).join(' at ')}
                    </p>
                  )}
                  {person.notes && (
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