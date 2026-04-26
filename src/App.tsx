import { useEffect } from 'react';
import { useAppStore } from './store/useAppStore';
import Header from './components/Header';
import FilterBar from './components/FilterBar';
import CardGrid from './components/CardGrid';
import CardPanel from './components/CardPanel';
import LSVImporter from './components/LSVImporter';
import ArchetypeModal from './components/ArchetypeModal';

export default function App() {
  const darkMode = useAppStore(s => s.darkMode);
  const selectedCard = useAppStore(s => s.selectedCard);
  const lsvModalOpen = useAppStore(s => s.lsvModalOpen);
  const archetypeModalOpen = useAppStore(s => s.archetypeModalOpen);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 transition-colors">
      <Header />
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
      {lsvModalOpen && <LSVImporter />}
      {archetypeModalOpen && <ArchetypeModal />}
    </div>
  );
}
