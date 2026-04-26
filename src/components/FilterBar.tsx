import clsx from 'clsx';
import { useAppStore } from '../store/useAppStore';
import type { ColorFilter, Rarity } from '../types';

const COLORS: { id: ColorFilter; label: string; bg: string }[] = [
  { id: 'W', label: 'W', bg: 'bg-yellow-100 dark:bg-yellow-200 text-gray-800' },
  { id: 'U', label: 'U', bg: 'bg-blue-500 text-white' },
  { id: 'B', label: 'B', bg: 'bg-gray-800 text-white dark:bg-gray-600' },
  { id: 'R', label: 'R', bg: 'bg-red-500 text-white' },
  { id: 'G', label: 'G', bg: 'bg-green-600 text-white' },
  { id: 'C', label: 'C', bg: 'bg-gray-400 text-white' },
];

const RARITIES: { id: Rarity; label: string }[] = [
  { id: 'common', label: 'Common' },
  { id: 'uncommon', label: 'Uncommon' },
  { id: 'rare', label: 'Rare' },
  { id: 'mythic', label: 'Mythic' },
];

export default function FilterBar() {
  const { filters, setFilter, resetFilters, cards, reviews } = useAppStore();

  const toggleColor = (c: ColorFilter) => {
    const next = filters.colors.includes(c)
      ? filters.colors.filter(x => x !== c)
      : [...filters.colors, c];
    setFilter('colors', next);
  };

  const toggleRarity = (r: Rarity) => {
    const next = filters.rarities.includes(r)
      ? filters.rarities.filter(x => x !== r)
      : [...filters.rarities, r];
    setFilter('rarities', next);
  };

  const hasActiveFilters =
    filters.colors.length > 0 ||
    filters.rarities.length > 0 ||
    filters.search !== '' ||
    filters.onlyUngraded ||
    filters.onlyNoPro;

  const ungradedCount = cards.filter(c => !reviews[c.id]?.my_grade).length;
  const noProCount = cards.filter(c => reviews[c.id]?.pro_grade == null).length;

  return (
    <div className="border-b border-gray-200 dark:border-gray-800 px-4 py-2 flex flex-wrap items-center gap-3 bg-white dark:bg-gray-900">
      {/* Color filters */}
      <div className="flex gap-1">
        {COLORS.map(c => (
          <button
            key={c.id}
            onClick={() => toggleColor(c.id)}
            className={clsx(
              'w-7 h-7 rounded-full text-xs font-bold transition-all border-2',
              filters.colors.includes(c.id)
                ? clsx(c.bg, 'border-white shadow-md scale-110')
                : 'bg-gray-200 dark:bg-gray-700 text-gray-500 border-transparent hover:border-gray-400'
            )}
            title={c.id === 'C' ? 'Colorless' : c.id}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div className="h-5 w-px bg-gray-200 dark:bg-gray-700" />

      {/* Rarity filters */}
      <div className="flex gap-1">
        {RARITIES.map(r => (
          <button
            key={r.id}
            onClick={() => toggleRarity(r.id)}
            className={clsx(
              'px-2 py-0.5 rounded text-xs font-medium transition-all border',
              filters.rarities.includes(r.id)
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'bg-transparent border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-500'
            )}
          >
            {r.label}
          </button>
        ))}
      </div>

      <div className="h-5 w-px bg-gray-200 dark:bg-gray-700" />

      {/* Search */}
      <input
        type="text"
        placeholder="Search cards..."
        value={filters.search}
        onChange={e => setFilter('search', e.target.value)}
        className="px-2 py-1 text-sm rounded border border-gray-300 dark:border-gray-600 bg-transparent focus:outline-none focus:ring-1 focus:ring-indigo-500 w-40"
      />

      {/* Ungraded toggle */}
      <button
        onClick={() => setFilter('onlyUngraded', !filters.onlyUngraded)}
        className={clsx(
          'px-2 py-0.5 rounded text-xs font-medium border transition-all',
          filters.onlyUngraded
            ? 'bg-indigo-600 text-white border-indigo-600'
            : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-500'
        )}
      >
        Ungraded ({ungradedCount})
      </button>

      {/* No pro grade toggle */}
      <button
        onClick={() => setFilter('onlyNoPro', !filters.onlyNoPro)}
        className={clsx(
          'px-2 py-0.5 rounded text-xs font-medium border transition-all',
          filters.onlyNoPro
            ? 'bg-amber-600 text-white border-amber-600'
            : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-500'
        )}
      >
        No Pro Grade ({noProCount})
      </button>

      {hasActiveFilters && (
        <button
          onClick={resetFilters}
          className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 underline"
        >
          Clear
        </button>
      )}
    </div>
  );
}
