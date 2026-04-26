import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ScryfallCard, ScryfallSet, CardReview, ColorFilter, Rarity, Archetype } from '../types';

export interface Filters {
  colors: ColorFilter[];
  rarities: Rarity[];
  search: string;
  onlyUngraded: boolean;
  onlyNoPro: boolean;
}

interface AppStore {
  darkMode: boolean;
  toggleDarkMode: () => void;

  selectedSet: ScryfallSet | null;
  setSelectedSet: (set: ScryfallSet | null) => void;

  cards: ScryfallCard[];
  setCards: (cards: ScryfallCard[]) => void;
  cardsLoading: boolean;
  setCardsLoading: (v: boolean) => void;

  reviews: Record<string, CardReview>;
  loadReviews: (reviews: CardReview[]) => void;
  updateReview: (cardId: string, review: CardReview) => void;

  selectedCard: ScryfallCard | null;
  setSelectedCard: (card: ScryfallCard | null) => void;

  filters: Filters;
  setFilter: <K extends keyof Filters>(key: K, value: Filters[K]) => void;
  resetFilters: () => void;

  lsvModalOpen: boolean;
  setLsvModalOpen: (open: boolean) => void;

  archetypes: Archetype[];
  loadArchetypes: (archetypes: Archetype[]) => void;
  upsertArchetypeLocal: (archetype: Archetype) => void;
  deleteArchetypeLocal: (id: string) => void;

  archetypeModalOpen: boolean;
  setArchetypeModalOpen: (open: boolean) => void;
}

const defaultFilters: Filters = {
  colors: [],
  rarities: [],
  search: '',
  onlyUngraded: false,
  onlyNoPro: false,
};

export const useAppStore = create<AppStore>()(
  persist(
    (set) => ({
      darkMode: false,
      toggleDarkMode: () => set(s => ({ darkMode: !s.darkMode })),

      selectedSet: null,
      setSelectedSet: (selectedSet) =>
        set({ selectedSet, cards: [], reviews: {}, selectedCard: null, archetypes: [] }),

      cards: [],
      setCards: (cards) => set({ cards }),
      cardsLoading: false,
      setCardsLoading: (cardsLoading) => set({ cardsLoading }),

      reviews: {},
      loadReviews: (reviewList) =>
        set({ reviews: Object.fromEntries(reviewList.map(r => [r.card_id, r])) }),
      updateReview: (cardId, review) =>
        set(s => ({ reviews: { ...s.reviews, [cardId]: review } })),

      selectedCard: null,
      setSelectedCard: (selectedCard) => set({ selectedCard }),

      filters: defaultFilters,
      setFilter: (key, value) =>
        set(s => ({ filters: { ...s.filters, [key]: value } })),
      resetFilters: () => set({ filters: defaultFilters }),

      lsvModalOpen: false,
      setLsvModalOpen: (lsvModalOpen) => set({ lsvModalOpen }),

      archetypes: [],
      loadArchetypes: (archetypes) => set({ archetypes }),
      upsertArchetypeLocal: (archetype) =>
        set(s => {
          const exists = s.archetypes.findIndex(a => a.id === archetype.id);
          if (exists >= 0) {
            const next = [...s.archetypes];
            next[exists] = archetype;
            return { archetypes: next };
          }
          return { archetypes: [...s.archetypes, archetype] };
        }),
      deleteArchetypeLocal: (id) =>
        set(s => ({ archetypes: s.archetypes.filter(a => a.id !== id) })),

      archetypeModalOpen: false,
      setArchetypeModalOpen: (archetypeModalOpen) => set({ archetypeModalOpen }),
    }),
    {
      name: 'mtg-diary-store',
      partialize: (s) => ({ darkMode: s.darkMode }),
    }
  )
);
