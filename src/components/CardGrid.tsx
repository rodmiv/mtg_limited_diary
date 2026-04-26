import { useAppStore } from '../store/useAppStore';
import { getCardColors } from '../lib/scryfall';
import CardTile from './CardTile';
import type { ScryfallCard } from '../types';

function applyFilters(cards: ScryfallCard[], filters: ReturnType<typeof useAppStore>['filters'], reviews: ReturnType<typeof useAppStore>['reviews']): ScryfallCard[] {
  return cards.filter(card => {
    if (filters.search) {
      const q = filters.search.toLowerCase();
      if (!card.name.toLowerCase().includes(q)) return false;
    }

    if (filters.rarities.length > 0) {
      if (!filters.rarities.includes(card.rarity as never)) return false;
    }

    if (filters.colors.length > 0) {
      const cardColors = getCardColors(card);
      const matches = filters.colors.some(c => {
        if (c === 'C') return cardColors.length === 0;
        return cardColors.includes(c);
      });
      if (!matches) return false;
    }

    if (filters.onlyUngraded) {
      if (reviews[card.id]?.my_grade != null) return false;
    }

    if (filters.onlyNoPro) {
      if (reviews[card.id]?.pro_grade != null) return false;
    }

    return true;
  });
}

export default function CardGrid() {
  const { cards, filters, reviews, cardsLoading, selectedSet } = useAppStore();

  if (!selectedSet) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-600 gap-3 py-24">
        <span className="text-5xl">🃏</span>
        <p className="text-lg font-medium">Select a set to start reviewing</p>
        <p className="text-sm">Use the set picker in the header to get started.</p>
      </div>
    );
  }

  if (cardsLoading) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400 dark:text-gray-600 py-24">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm">Loading cards...</p>
        </div>
      </div>
    );
  }

  const filtered = applyFilters(cards, filters, reviews);

  if (filtered.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400 dark:text-gray-600 py-24">
        <p className="text-sm">No cards match the current filters.</p>
      </div>
    );
  }

  const gradedCount = cards.filter(c => reviews[c.id]?.my_grade != null).length;
  const progress = cards.length > 0 ? Math.round((gradedCount / cards.length) * 100) : 0;

  return (
    <div className="p-4">
      {/* Progress bar */}
      <div className="mb-4 flex items-center gap-3">
        <div className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-indigo-500 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
          {gradedCount}/{cards.length} graded ({progress}%)
        </span>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8 gap-2">
        {filtered.map(card => (
          <CardTile key={card.id} card={card} />
        ))}
      </div>
    </div>
  );
}
