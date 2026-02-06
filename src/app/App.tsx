import { useState, useEffect } from 'react';
import { Toaster } from 'sonner';
import { BottomNav } from './components/BottomNav';
import { FAB } from './components/FAB';
import { TodayViewV2 } from './components/views/TodayViewV2';
import { PeopleViewV2 } from './components/views/PeopleViewV2';
import { EventsViewV2 } from './components/views/EventsViewV2';
import { DataViewV2 } from './components/views/DataViewV2';
import { PersonDetailView } from './components/views/PersonDetailView';
import { EventDetailViewV2 } from './components/views/EventDetailViewV2';
import { InboxViewV2 } from './components/views/InboxViewV2';
import { DumpsListView } from './components/views/DumpsListView';
import { MeetsListView } from './components/views/MeetsListView';
import { FollowUpsListView } from './components/views/FollowUpsListView';
import { PromisesListView } from './components/views/PromisesListView';
import { AddMeetDialogV2 } from './components/dialogs/AddMeetDialogV2';
import { AddDumpDialog } from './components/dialogs/AddDumpDialog';
import { AddEventDialog } from './components/dialogs/AddEventDialog';
import { OnboardingFlow } from './components/onboarding/OnboardingFlow';
import { storage } from './lib/storage';
import { registerServiceWorker } from './lib/pwa';

type ViewState = 
  | { type: 'today' }
  | { type: 'people' }
  | { type: 'events' }
  | { type: 'data' }
  | { type: 'personDetail'; personId: number }
  | { type: 'eventDetail'; eventId: number }
  | { type: 'inbox' }
  | { type: 'dumpsList' }
  | { type: 'meetsList' }
  | { type: 'followUpsList' }
  | { type: 'promisesList' };

type DialogState = 
  | { type: 'addMeet' }
  | { type: 'addDump' }
  | { type: 'addEvent' }
  | { type: null };

export default function App() {
  const [activeTab, setActiveTab] = useState<'today' | 'people' | 'events' | 'data'>('today');
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [viewState, setViewState] = useState<ViewState>({ type: 'today' });
  const [fabOpen, setFabOpen] = useState(false);
  const [dialogState, setDialogState] = useState<DialogState>({ type: null });

  useEffect(() => {
    // Register service worker for offline functionality
    registerServiceWorker();

    // Check if user has completed onboarding
    const hasOnboarded = storage.getHasOnboarded();
    if (!hasOnboarded) {
      setShowOnboarding(true);
    }
  }, []);

  const handleOnboardingComplete = () => {
    storage.setHasOnboarded(true);
    setShowOnboarding(false);
  };

  const getActiveTab = () => {
    if (viewState.type === 'today' || viewState.type === 'inbox') return 'today';
    if (viewState.type === 'people' || viewState.type === 'personDetail') return 'people';
    if (viewState.type === 'events' || viewState.type === 'eventDetail') return 'events';
    return 'data';
  };

  const handleTabChange = (tab: 'today' | 'people' | 'events' | 'data') => {
    setViewState({ type: tab });
  };

  const renderView = () => {
    switch (viewState.type) {
      case 'today':
        return <TodayViewV2 onInboxClick={() => setViewState({ type: 'inbox' })} />;
      case 'people':
        return <PeopleViewV2 onPersonSelect={(id) => setViewState({ type: 'personDetail', personId: id })} />;
      case 'events':
        return <EventsViewV2 onEventSelect={(id) => setViewState({ type: 'eventDetail', eventId: id })} />;
      case 'data':
        return <DataViewV2 
          onDumpsClick={() => setViewState({ type: 'dumpsList' })}
          onPeopleClick={() => setViewState({ type: 'people' })}
          onMeetsClick={() => setViewState({ type: 'meetsList' })}
          onEventsClick={() => setViewState({ type: 'events' })}
          onFollowUpsClick={() => setViewState({ type: 'followUpsList' })}
          onPromisesClick={() => setViewState({ type: 'promisesList' })}
        />;
      case 'personDetail':
        return (
          <PersonDetailView 
            personId={viewState.personId} 
            onBack={() => setViewState({ type: 'people' })} 
          />
        );
      case 'eventDetail':
        return (
          <EventDetailViewV2 
            eventId={viewState.eventId} 
            onBack={() => setViewState({ type: 'events' })}
            onPersonSelect={(id) => setViewState({ type: 'personDetail', personId: id })}
          />
        );
      case 'inbox':
        return <InboxViewV2 onBack={() => setViewState({ type: 'today' })} />;
      case 'dumpsList':
        return <DumpsListView onBack={() => setViewState({ type: 'data' })} />;
      case 'meetsList':
        return <MeetsListView onBack={() => setViewState({ type: 'data' })} onPersonSelect={(id) => setViewState({ type: 'personDetail', personId: id })} />;
      case 'followUpsList':
        return <FollowUpsListView onBack={() => setViewState({ type: 'data' })} onPersonSelect={(id) => setViewState({ type: 'personDetail', personId: id })} />;
      case 'promisesList':
        return <PromisesListView onBack={() => setViewState({ type: 'data' })} onPersonSelect={(id) => setViewState({ type: 'personDetail', personId: id })} />;
      default:
        return <TodayViewV2 />;
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {showOnboarding && <OnboardingFlow onComplete={handleOnboardingComplete} />}
      
      {!showOnboarding && (
        <>
          <main className="h-screen overflow-hidden">
            {renderView()}
          </main>

          <BottomNav activeTab={getActiveTab()} onTabChange={handleTabChange} />
          
          <FAB
            onAddMeet={() => setDialogState({ type: 'addMeet' })}
            onAddDump={() => setDialogState({ type: 'addDump' })}
            onAddEvent={() => setDialogState({ type: 'addEvent' })}
          />

          <AddMeetDialogV2 open={dialogState.type === 'addMeet'} onClose={() => setDialogState({ type: null })} />
          <AddDumpDialog open={dialogState.type === 'addDump'} onClose={() => setDialogState({ type: null })} />
          <AddEventDialog open={dialogState.type === 'addEvent'} onClose={() => setDialogState({ type: null })} />
        </>
      )}

      <Toaster 
        position="top-center" 
        theme="dark"
        toastOptions={{
          style: {
            background: '#18181b',
            border: '1px solid #27272a',
            color: '#fafafa',
          },
        }}
      />
    </div>
  );
}