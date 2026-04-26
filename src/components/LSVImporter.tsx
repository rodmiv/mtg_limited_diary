import { useState } from 'react';
import clsx from 'clsx';
import { useAppStore } from '../store/useAppStore';
import { parseTextReview, parseURLReview, type ParseResult } from '../lib/lsvParser';
import { upsertManyReviews } from '../lib/supabase';
import type { CardReview } from '../types';

type Mode = 'paste' | 'url';
type Step = 'input' | 'parsing' | 'preview' | 'saving' | 'done';

export default function LSVImporter() {
  const { setLsvModalOpen, cards, selectedSet, reviews, loadReviews } = useAppStore();
  const [mode, setMode] = useState<Mode>('paste');
  const [pasteText, setPasteText] = useState('');
  const [url, setUrl] = useState('');
  const [step, setStep] = useState<Step>('input');
  const [result, setResult] = useState<ParseResult | null>(null);
  const [error, setError] = useState('');

  const cardNames = cards.map(c => c.name);

  const handleParse = async () => {
    setStep('parsing');
    setError('');
    try {
      const parsed =
        mode === 'paste'
          ? parseTextReview(pasteText, cardNames)
          : await parseURLReview(url, cardNames);

      if (parsed.results.length === 0) {
        throw new Error(
          'No grades found. Make sure you pasted the full article text including the "Limited: X.X" lines.'
        );
      }
      setResult(parsed);
      setStep('preview');
    } catch (err) {
      setError((err as Error).message);
      setStep('input');
    }
  };

  const handleConfirm = async () => {
    if (!result || !selectedSet) return;
    setStep('saving');

    const toSave: CardReview[] = result.results
      .map((item): CardReview | null => {
        const card = cards.find(c => c.name === item.cardName);
        if (!card) return null; // article card not in this set (Special Guests, lands listed without a block, etc.)
        const existing = reviews[card.id] as CardReview | undefined;
        return {
          set_code: selectedSet.code,
          card_id: card.id,
          card_name: card.name,
          my_grade: existing?.my_grade ?? null,
          my_review: existing?.my_review ?? '',
          pro_grade: item.grade,
          pro_review: item.review,
          ...(existing?.id ? { id: existing.id } : {}),
        };
      })
      .filter((r): r is CardReview => r !== null);

    try {
      await upsertManyReviews(toSave);
      const updated = { ...reviews };
      toSave.forEach(r => { updated[r.card_id] = r; });
      loadReviews(Object.values(updated));
      setStep('done');
    } catch (err) {
      setError((err as Error).message);
      setStep('preview');
    }
  };

  const canParse =
    mode === 'paste' ? pasteText.trim().length > 50 : url.trim().length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex-shrink-0">
          <h2 className="font-semibold">Import Pro Grades</h2>
          <button
            onClick={() => setLsvModalOpen(false)}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl leading-none"
          >
            ×
          </button>
        </div>

        <div className="flex-1 overflow-auto px-6 py-5 space-y-4">
          {step === 'input' && (
            <>
              {/* Mode tabs */}
              <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg">
                {(['paste', 'url'] as Mode[]).map(m => (
                  <button
                    key={m}
                    onClick={() => setMode(m)}
                    className={clsx(
                      'flex-1 py-1.5 text-sm rounded-md font-medium transition-all',
                      mode === m
                        ? 'bg-white dark:bg-gray-700 shadow text-gray-900 dark:text-gray-100'
                        : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                    )}
                  >
                    {m === 'paste' ? 'Paste Text' : 'URL'}
                  </button>
                ))}
              </div>

              {mode === 'paste' && (
                <>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Open the set review article (e.g. on TCGPlayer), select all the text
                    (<kbd className="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-xs">Ctrl+A</kbd>),
                    copy it, and paste it below.
                  </p>
                  <textarea
                    autoFocus
                    value={pasteText}
                    onChange={e => setPasteText(e.target.value)}
                    placeholder="Paste the full article text here…"
                    rows={10}
                    className="w-full text-sm px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none font-mono"
                  />
                </>
              )}

              {mode === 'url' && (
                <>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Works for server-rendered sites (e.g. ChannelFireball).{' '}
                    <span className="text-orange-500">Does not work for TCGPlayer</span> — use
                    Paste Text instead.
                  </p>
                  <input
                    type="url"
                    autoFocus
                    placeholder="https://www.channelfireball.com/article/..."
                    value={url}
                    onChange={e => setUrl(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && canParse && handleParse()}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-transparent focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </>
              )}

              {error && <p className="text-sm text-red-500">{error}</p>}

              <div className="flex gap-2 justify-end pt-1">
                <button
                  onClick={() => setLsvModalOpen(false)}
                  className="px-4 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  Cancel
                </button>
                <button
                  onClick={handleParse}
                  disabled={!canParse}
                  className="px-4 py-2 text-sm rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Parse Grades
                </button>
              </div>
            </>
          )}

          {step === 'parsing' && (
            <div className="flex flex-col items-center gap-3 py-8">
              <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-gray-500">Parsing article…</p>
            </div>
          )}

          {step === 'preview' && result && (
            <>
              <div className="flex gap-3 text-sm">
                <div className="flex-1 bg-green-50 dark:bg-green-900/20 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-green-600">{result.results.length}</p>
                  <p className="text-green-600 text-xs">Cards parsed</p>
                </div>
                <div className="flex-1 bg-orange-50 dark:bg-orange-900/20 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-orange-500">{result.notFound.length}</p>
                  <p className="text-orange-500 text-xs">Not found</p>
                </div>
              </div>

              <div className="max-h-52 overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-700 text-sm">
                {result.results.map(r => (
                  <div
                    key={r.cardName}
                    className="flex items-center justify-between px-3 py-1.5 border-b border-gray-100 dark:border-gray-800 last:border-0"
                  >
                    <span className="truncate">{r.cardName}</span>
                    <span className="font-bold text-indigo-500 ml-2 flex-shrink-0">{r.grade}</span>
                  </div>
                ))}
              </div>

              {result.notFound.length > 0 && (
                <details className="text-xs text-gray-400">
                  <summary className="cursor-pointer hover:text-gray-600 dark:hover:text-gray-200">
                    {result.notFound.length} set cards not found in article
                  </summary>
                  <p className="mt-1 leading-relaxed">{result.notFound.join(', ')}</p>
                </details>
              )}

              {error && <p className="text-sm text-red-500">{error}</p>}

              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setStep('input')}
                  className="px-4 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  Back
                </button>
                <button
                  onClick={handleConfirm}
                  className="px-4 py-2 text-sm rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
                >
                  Save {result.results.length} Grades
                </button>
              </div>
            </>
          )}

          {step === 'saving' && (
            <div className="flex flex-col items-center gap-3 py-8">
              <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-gray-500">Saving to database…</p>
            </div>
          )}

          {step === 'done' && (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <span className="text-4xl">✓</span>
              <p className="font-medium">Grades imported!</p>
              <p className="text-sm text-gray-500">{result?.results.length} cards updated.</p>
              <button
                onClick={() => setLsvModalOpen(false)}
                className="px-4 py-2 text-sm rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
              >
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
