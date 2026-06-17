import { useEffect, useRef, useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { fetchSets, fetchSetCards } from '../lib/scryfall';
import { fetchReviewsForSet, fetchArchetypesForSet } from '../lib/supabase';
import type { ScryfallSet } from '../types';

export default function SetSelector() {
  const { selectedSet, setSelectedSet, setCards, loadReviews, loadArchetypes, setCardsLoading } = useAppStore();
  const [sets, setSets] = useState<ScryfallSet[]>([]);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [loadingSets, setLoadingSets] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLoadingSets(true);
    fetchSets()
      .then(setSets)
      .catch(console.error)
      .finally(() => setLoadingSets(false));
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = sets.filter(s =>
    s.name.toLowerCase().includes(query.toLowerCase()) ||
    s.code.toLowerCase().includes(query.toLowerCase())
  );

  const handleSelect = async (set: ScryfallSet) => {
    setOpen(false);
    setQuery('');
    setSelectedSet(set);
    setCardsLoading(true);
    try {
      const [cardsResult, reviewsResult, archetypesResult] = await Promise.allSettled([
        fetchSetCards(set.code),
        fetchReviewsForSet(set.code),
        fetchArchetypesForSet(set.code),
      ]);

      if (cardsResult.status === 'fulfilled') {
        setCards(cardsResult.value);
      } else {
        console.error('Failed to load cards from Scryfall', cardsResult.reason);
      }

      if (reviewsResult.status === 'fulfilled') {
        loadReviews(reviewsResult.value);
      } else {
        console.error('Failed to load reviews', reviewsResult.reason);
      }

      if (archetypesResult.status === 'fulfilled') {
        loadArchetypes(archetypesResult.value);
      } else {
        console.error('Failed to load archetypes', archetypesResult.reason);
      }
    } finally {
      setCardsLoading(false);
    }
  };

  return (
    <div ref={ref} className="relative w-64">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm hover:border-indigo-400 transition-colors"
      >
        {loadingSets ? (
          <span className="text-gray-400">Loading sets…</span>
        ) : selectedSet ? (
          <>
            <img src={selectedSet.icon_svg_uri} alt="" className="w-4 h-4 object-contain" />
            <span className="flex-1 text-left truncate">{selectedSet.name}</span>
            <span className="text-gray-400 text-xs uppercase">{selectedSet.code}</span>
          </>
        ) : (
          <span className="text-gray-400 flex-1 text-left">Select a set…</span>
        )}
        <span className="text-gray-400">▾</span>
      </button>

      {open && (
        <div className="absolute top-full mt-1 left-0 right-0 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl overflow-hidden">
          <div className="p-2">
            <input
              autoFocus
              type="text"
              placeholder="Search sets…"
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="w-full px-2 py-1 text-sm rounded border border-gray-300 dark:border-gray-600 bg-transparent focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <ul className="max-h-72 overflow-y-auto">
            {filtered.slice(0, 50).map(set => (
              <li key={set.code}>
                <button
                  onClick={() => handleSelect(set)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <img src={set.icon_svg_uri} alt="" className="w-4 h-4 object-contain flex-shrink-0" />
                  <span className="flex-1 truncate">{set.name}</span>
                  <span className="text-gray-400 text-xs uppercase">{set.code}</span>
                </button>
              </li>
            ))}
            {filtered.length === 0 && (
              <li className="px-3 py-4 text-sm text-gray-400 text-center">No sets found</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
