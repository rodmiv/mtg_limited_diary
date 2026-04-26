import { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { useAppStore } from '../store/useAppStore';
import { getCardImage, getCardOracleText } from '../lib/scryfall';
import { upsertReview } from '../lib/supabase';
import GradeSelector, { gradeColorClass } from './GradeSelector';
import type { CardReview } from '../types';

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export default function CardPanel() {
  const { selectedCard, selectedSet, setSelectedCard, reviews, updateReview } = useAppStore();
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const card = selectedCard!;
  const review: CardReview = reviews[card.id] ?? {
    set_code: selectedSet!.code,
    card_id: card.id,
    card_name: card.name,
    my_grade: null,
    my_review: '',
    pro_grade: null,
    pro_review: '',
  };

  // Reset save status when switching cards
  useEffect(() => {
    setSaveStatus('idle');
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [card.id]);

  const save = (updated: CardReview) => {
    updateReview(card.id, updated);
    setSaveStatus('saving');

    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try {
        const saved = await upsertReview(updated);
        updateReview(card.id, saved);
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
      } catch {
        setSaveStatus('error');
      }
    }, 800);
  };

  const imgSrc = getCardImage(card, 'normal');
  const oracleText = getCardOracleText(card);

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-900">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-800">
        <h2 className="font-semibold text-sm truncate">{card.name}</h2>
        <div className="flex items-center gap-2">
          {saveStatus === 'saving' && (
            <span className="text-xs text-gray-400">Saving…</span>
          )}
          {saveStatus === 'saved' && (
            <span className="text-xs text-green-500">Saved</span>
          )}
          {saveStatus === 'error' && (
            <span className="text-xs text-red-500">Save failed</span>
          )}
          <button
            onClick={() => setSelectedCard(null)}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-lg leading-none"
            aria-label="Close panel"
          >
            ×
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {/* Card image */}
        {imgSrc && (
          <div className="px-4 pt-4">
            <img
              src={imgSrc}
              alt={card.name}
              className="w-full rounded-lg shadow-lg"
            />
          </div>
        )}

        {/* Card details */}
        <div className="px-4 pt-3 pb-1">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">{card.type_line}</p>
              {card.mana_cost && (
                <p className="text-xs text-gray-400 dark:text-gray-500 font-mono">
                  {card.mana_cost}
                </p>
              )}
            </div>
            <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-500 capitalize flex-shrink-0">
              {card.rarity}
            </span>
          </div>
          {oracleText && (
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-2 leading-relaxed whitespace-pre-line">
              {oracleText}
            </p>
          )}
          {(card.power || card.toughness) && (
            <p className="text-xs font-bold text-gray-700 dark:text-gray-300 mt-1">
              {card.power}/{card.toughness}
            </p>
          )}
        </div>

        <div className="border-t border-gray-100 dark:border-gray-800 mx-4 my-3" />

        {/* My Review */}
        <div className="px-4 pb-4 space-y-4">
          <div>
            <GradeSelector
              label="My Grade"
              value={review.my_grade}
              onChange={g => save({ ...review, my_grade: g })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1.5">
              My Review
            </label>
            <textarea
              value={review.my_review}
              onChange={e => save({ ...review, my_review: e.target.value })}
              placeholder="Write your thoughts on this card in limited…"
              rows={4}
              className="w-full text-sm px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
            />
          </div>

          <div className="border-t border-gray-100 dark:border-gray-800 pt-3">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Pro Grade</p>
            {review.pro_grade != null ? (
              <div className="flex items-center gap-2">
                <span
                  className={clsx(
                    'text-lg font-bold px-3 py-1 rounded-lg',
                    gradeColorClass(review.pro_grade)
                  )}
                >
                  {review.pro_grade}
                </span>
                <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className={clsx('h-full rounded-full', gradeColorClass(review.pro_grade))}
                    style={{ width: `${(review.pro_grade / 5) * 100}%` }}
                  />
                </div>
                <span className="text-xs text-gray-400">/5</span>
              </div>
            ) : (
              <p className="text-xs text-gray-400 dark:text-gray-600">
                Import pro grades via the header button.
              </p>
            )}
            {review.pro_review && (
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400 italic leading-relaxed">
                "{review.pro_review}"
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
