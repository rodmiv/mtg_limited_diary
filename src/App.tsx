import { useEffect, useState } from 'react';
import { useAppStore } from './store/useAppStore';
import Header from './components/Header';
import FilterBar from './components/FilterBar';
import CardGrid from './components/CardGrid';
import CardPanel from './components/CardPanel';
import SetStats from './components/SetStats';
import LSVImporter from './components/LSVImporter';
import ArchetypeModal from './components/ArchetypeModal';

type Tab = 'cards' | 'stats';

export default function App() {
  const darkMode = useAppStore(s => s.darkMode);
  const selectedCard = useAppStore(s => s.selectedCard);
  const selectedSet = useAppStore(s => s.selectedSet);
  const lsvModalOpen = useAppStore(s => s.lsvModalOpen);
  const archetypeModalOpen = useAppStore(s => s.archetypeModalOpen);

  const [tab, setTab] = useState<Tab>('cards');

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  // Reset to cards tab when the set changes
  useEffect(() => {
    setTab('cards');
  }, [selectedSet?.code]);

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 transition-colors">
      <Header />

      {selectedSet && (
        <div className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 flex gap-0">
          {(['cards', 'stats'] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors capitalize ${
                tab === t
                  ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              {t === 'cards' ? 'Cards' : 'Set Stats'}
            </button>
          ))}
        </div>
      )}

      {tab === 'cards' ? (
        <>
          <FilterBar />
          <div className="flex flex-1 overflow-hidden">
            <div className="flex-1 overflow-auto">
              <CardGrid />
            </div>
            {selectedCard && (
              <div className="w-80 flex-shrink-0 border-l border-gray-200 dark:border-gray-800 overflow-auto">
                <CardPanel />
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="flex-1 overflow-auto">
          <SetStats />
        </div>
      )}

      {lsvModalOpen && <LSVImporter />}
      {archetypeModalOpen && <ArchetypeModal />}
    </div>
  );
}
