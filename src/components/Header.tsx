import { useAppStore } from '../store/useAppStore';
import SetSelector from './SetSelector';

export default function Header() {
  const { darkMode, toggleDarkMode, setLsvModalOpen, setArchetypeModalOpen, selectedSet } = useAppStore();

  return (
    <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-3 flex items-center gap-4">
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className="text-lg">🃏</span>
        <h1 className="font-bold text-base tracking-tight">MTG Limited Diary</h1>
      </div>

      <div className="flex-1" />

      <SetSelector />

      {selectedSet && (
        <>
          <button
            onClick={() => setArchetypeModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 hover:border-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
            title="Manage archetypes for this set"
          >
            <span>⚔</span>
            Archetypes
          </button>
          <button
            onClick={() => setLsvModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 hover:border-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
            title="Import LSV grades from ChannelFireball"
          >
            <span>⬇</span>
            Import LSV
          </button>
        </>
      )}

      <button
        onClick={toggleDarkMode}
        className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-300 dark:border-gray-600 hover:border-indigo-400 transition-colors text-sm"
        aria-label="Toggle dark mode"
      >
        {darkMode ? '☀' : '☾'}
      </button>
    </header>
  );
}
