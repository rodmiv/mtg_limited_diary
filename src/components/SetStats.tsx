import { useMemo, useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { getCardImage } from '../lib/scryfall';
import type { ScryfallCard } from '../types';

// ── helpers ────────────────────────────────────────────────────────────────

const PT_BUCKETS = ['0', '1', '2', '3', '4', '5', '6+', '*'];

const WUBRG_ORDER: Record<string, number> = { W: 0, U: 1, B: 2, R: 3, G: 4 };

function bucketPT(val: string | undefined): string | null {
  if (val == null) return null;
  const n = Number(val);
  if (isNaN(n)) return '*';
  if (n >= 6) return '6+';
  return String(n);
}

function primaryType(card: ScryfallCard): string {
  const tl = card.type_line;
  if (tl.includes('Creature')) return 'Creature';
  if (tl.includes('Planeswalker')) return 'Planeswalker';
  if (tl.includes('Instant')) return 'Instant';
  if (tl.includes('Sorcery')) return 'Sorcery';
  if (tl.includes('Enchantment')) return 'Enchantment';
  if (tl.includes('Artifact')) return 'Artifact';
  if (tl.includes('Land')) return 'Land';
  return 'Other';
}

function colorGroup(card: ScryfallCard): string {
  const cols = card.colors ?? card.color_identity ?? [];
  if (cols.length === 0) return 'C';
  if (cols.length > 1) return 'Multi';
  return cols[0];
}

function pairKey(colors: string[]): string {
  return [...colors]
    .sort((a, b) => (WUBRG_ORDER[a] ?? 9) - (WUBRG_ORDER[b] ?? 9))
    .join('');
}

// ── sub-components ─────────────────────────────────────────────────────────

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4 text-center">
      <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{value}</div>
      <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{label}</div>
    </div>
  );
}

function HBar({
  label, count, max, colorClass,
}: {
  label: string; count: number; max: number; colorClass: string;
}) {
  const pct = max > 0 ? (count / max) * 100 : 0;
  return (
    <div className="flex items-center gap-2 py-0.5">
      <span className="w-24 text-right text-xs text-gray-500 dark:text-gray-400 truncate shrink-0">{label}</span>
      <div className="flex-1 bg-gray-100 dark:bg-gray-800 rounded h-4">
        <div className={`${colorClass} h-full rounded transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className="w-7 text-xs text-gray-600 dark:text-gray-300 text-right shrink-0">{count}</span>
    </div>
  );
}

const RARITY_STYLES: Record<string, string> = {
  common: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300',
  uncommon: 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200',
  rare: 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-400',
  mythic: 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-400',
};

const TYPE_COLORS: Record<string, string> = {
  Creature: 'bg-green-500',
  Planeswalker: 'bg-orange-500',
  Instant: 'bg-blue-500',
  Sorcery: 'bg-red-500',
  Enchantment: 'bg-purple-500',
  Artifact: 'bg-slate-500',
  Land: 'bg-amber-700',
  Other: 'bg-gray-400',
};

const COLOR_STYLES: Array<{ key: string; label: string; bar: string }> = [
  { key: 'W', label: 'White', bar: 'bg-yellow-200' },
  { key: 'U', label: 'Blue', bar: 'bg-blue-500' },
  { key: 'B', label: 'Black', bar: 'bg-gray-700' },
  { key: 'R', label: 'Red', bar: 'bg-red-500' },
  { key: 'G', label: 'Green', bar: 'bg-green-600' },
  { key: 'Multi', label: 'Multicolor', bar: 'bg-yellow-400' },
  { key: 'C', label: 'Colorless', bar: 'bg-gray-400' },
];

// Color dot styles for pair buttons
const COLOR_DOT: Record<string, string> = {
  W: 'bg-yellow-100 border border-gray-300',
  U: 'bg-blue-500',
  B: 'bg-gray-800',
  R: 'bg-red-500',
  G: 'bg-green-600',
};

function ColorDot({ color }: { color: string }) {
  return <span className={`inline-block w-3 h-3 rounded-full ${COLOR_DOT[color] ?? 'bg-gray-400'}`} />;
}

// ── main component ─────────────────────────────────────────────────────────

export default function SetStats() {
  const cards = useAppStore(s => s.cards);
  const reviews = useAppStore(s => s.reviews);
  const [selectedPair, setSelectedPair] = useState<string | null>(null);
  const [keyword, setKeyword] = useState('');

  const stats = useMemo(() => {
    const rarity = { common: 0, uncommon: 0, rare: 0, mythic: 0 };
    const types: Record<string, number> = {
      Creature: 0, Planeswalker: 0, Instant: 0, Sorcery: 0,
      Enchantment: 0, Artifact: 0, Land: 0, Other: 0,
    };
    const colors: Record<string, number> = { W: 0, U: 0, B: 0, R: 0, G: 0, Multi: 0, C: 0 };
    const cmcBuckets: Record<string, number> = { '0': 0, '1': 0, '2': 0, '3': 0, '4': 0, '5': 0, '6+': 0 };
    const ptMap: Record<string, number> = {};
    const signpostsByPair: Record<string, ScryfallCard[]> = {};
    let legendaryCount = 0;
    let graded = 0;

    for (const card of cards) {
      // Rarity
      if (card.rarity in rarity) rarity[card.rarity as keyof typeof rarity]++;

      // Primary type
      const t = primaryType(card);
      types[t]++;

      // Color group
      const cg = colorGroup(card);
      colors[cg] = (colors[cg] ?? 0) + 1;

      // Mana curve (non-lands)
      if (!card.type_line.includes('Land')) {
        const cmc = card.cmc ?? 0;
        const bucket = cmc >= 6 ? '6+' : String(Math.floor(cmc));
        cmcBuckets[bucket] = (cmcBuckets[bucket] ?? 0) + 1;
      }

      // P/T heatmap
      if (card.type_line.includes('Creature')) {
        const p = bucketPT(card.power);
        const tVal = bucketPT(card.toughness);
        if (p !== null && tVal !== null) {
          const key = `${p}/${tVal}`;
          ptMap[key] = (ptMap[key] ?? 0) + 1;
        }
      }

      // Legendary creatures (count only)
      if (card.type_line.includes('Legendary') && card.type_line.includes('Creature')) {
        legendaryCount++;
      }

      // Signpost uncommons grouped by two-color pair
      if (card.rarity === 'uncommon') {
        const cols = card.colors ?? [];
        if (cols.length === 2) {
          const key = pairKey(cols);
          if (!signpostsByPair[key]) signpostsByPair[key] = [];
          signpostsByPair[key].push(card);
        }
      }

      // Graded
      if (reviews[card.id]?.my_grade != null) graded++;
    }

    return { rarity, types, colors, cmcBuckets, ptMap, signpostsByPair, legendaryCount, graded };
  }, [cards, reviews]);

  const keywordStats = useMemo(() => {
    const needle = keyword.trim().toLowerCase();
    if (!needle) return null;

    const counts: Record<string, number> = { W: 0, U: 0, B: 0, R: 0, G: 0, C: 0 };
    let total = 0;

    for (const card of cards) {
      const searchable = [
        card.type_line,
        card.oracle_text ?? '',
        ...(card.card_faces?.map(f => `${f.type_line} ${f.oracle_text ?? ''}`) ?? []),
      ].join(' ').toLowerCase();

      if (searchable.includes(needle)) {
        total++;
        const cols = card.colors ?? card.color_identity ?? [];
        if (cols.length === 0) {
          counts['C']++;
        } else {
          for (const c of cols) {
            if (c in counts) counts[c]++;
          }
        }
      }
    }

    return { counts, total };
  }, [cards, keyword]);

  if (cards.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400 p-8">
        Select a set to view stats
      </div>
    );
  }

  const maxType = Math.max(...Object.values(stats.types));
  const maxColor = Math.max(...Object.values(stats.colors));
  const maxCmc = Math.max(...Object.values(stats.cmcBuckets), 1);
  const ptMax = Math.max(...Object.values(stats.ptMap), 1);

  // Only show P/T buckets that have at least one creature in that row or column
  const activePow = PT_BUCKETS.filter(p => PT_BUCKETS.some(t => (stats.ptMap[`${p}/${t}`] ?? 0) > 0));
  const activeTou = PT_BUCKETS.filter(t => PT_BUCKETS.some(p => (stats.ptMap[`${p}/${t}`] ?? 0) > 0));

  // Signpost pairs sorted by WUBRG order
  const pairs = Object.keys(stats.signpostsByPair).sort((a, b) => {
    const scoreA = (WUBRG_ORDER[a[0]] ?? 9) * 10 + (WUBRG_ORDER[a[1]] ?? 9);
    const scoreB = (WUBRG_ORDER[b[0]] ?? 9) * 10 + (WUBRG_ORDER[b[1]] ?? 9);
    return scoreA - scoreB;
  });

  const activePair = (selectedPair && stats.signpostsByPair[selectedPair]) ? selectedPair : (pairs[0] ?? null);
  const totalSignposts = Object.values(stats.signpostsByPair).reduce((n, arr) => n + arr.length, 0);

  return (
    <div className="p-4 sm:p-6 space-y-4 max-w-5xl mx-auto overflow-auto">

      {/* Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Total Cards" value={cards.length} />
        <StatCard label="Legendary Creatures" value={stats.legendaryCount} />
        <StatCard label="Signpost Uncommons" value={totalSignposts} />
        <StatCard label="Graded" value={`${stats.graded} / ${cards.length}`} />
      </div>

      {/* Rarity + Grading progress */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
          <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Rarity</h3>
          <div className="grid grid-cols-4 gap-2">
            {(['common', 'uncommon', 'rare', 'mythic'] as const).map(r => (
              <div key={r} className={`rounded-lg p-3 text-center ${RARITY_STYLES[r]}`}>
                <div className="text-xl font-bold">{stats.rarity[r]}</div>
                <div className="text-xs mt-0.5 opacity-70 capitalize">{r.charAt(0).toUpperCase()}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
          <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
            Grading Progress — {stats.graded} / {cards.length}
          </h3>
          <div className="bg-gray-100 dark:bg-gray-800 rounded-full h-4 overflow-hidden">
            <div
              className="bg-indigo-500 h-full rounded-full transition-all"
              style={{ width: `${(stats.graded / cards.length) * 100}%` }}
            />
          </div>
          <div className="text-xs text-gray-400 mt-2">
            {Math.round((stats.graded / cards.length) * 100)}% complete
          </div>
        </div>
      </div>

      {/* Color + Type distribution */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
          <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Color Distribution</h3>
          <div className="space-y-1">
            {COLOR_STYLES.map(({ key, label, bar }) => (
              <HBar key={key} label={label} count={stats.colors[key] ?? 0} max={maxColor} colorClass={bar} />
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
          <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Card Types</h3>
          <div className="space-y-1">
            {Object.entries(stats.types)
              .filter(([, v]) => v > 0)
              .sort((a, b) => b[1] - a[1])
              .map(([type, count]) => (
                <HBar key={type} label={type} count={count} max={maxType} colorClass={TYPE_COLORS[type] ?? 'bg-indigo-500'} />
              ))}
          </div>
        </div>
      </div>

      {/* Mana curve */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
        <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Mana Curve (non-lands)</h3>
        <div className="flex items-end gap-1.5 h-36 px-2">
          {(['0', '1', '2', '3', '4', '5', '6+'] as const).map(bucket => {
            const count = stats.cmcBuckets[bucket] ?? 0;
            const heightPct = (count / maxCmc) * 100;
            return (
              <div key={bucket} className="flex-1 flex flex-col items-center">
                <span className="text-xs text-gray-500 dark:text-gray-400 mb-1 h-4">{count > 0 ? count : ''}</span>
                <div className="w-full flex items-end" style={{ height: '96px' }}>
                  <div
                    className="w-full bg-indigo-500 hover:bg-indigo-400 rounded-t transition-all"
                    style={{ height: `${heightPct}%`, minHeight: count > 0 ? '3px' : '0' }}
                    title={`CMC ${bucket}: ${count} cards`}
                  />
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">{bucket}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* P/T Heatmap */}
      {activePow.length > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
          <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
            Creature P/T Heatmap
          </h3>
          <div className="overflow-x-auto">
            <table className="text-xs border-collapse">
              <thead>
                <tr>
                  <th className="pr-2 pb-1 text-gray-400 font-normal text-right">P \ T</th>
                  {activeTou.map(t => (
                    <th key={t} className="w-8 h-8 text-center text-gray-400 font-normal pb-1">{t}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {activePow.map(p => (
                  <tr key={p}>
                    <td className="pr-2 text-gray-400 text-right">{p}</td>
                    {activeTou.map(t => {
                      const count = stats.ptMap[`${p}/${t}`] ?? 0;
                      const intensity = count > 0 ? 0.15 + (count / ptMax) * 0.85 : 0;
                      return (
                        <td
                          key={t}
                          className="w-8 h-8 text-center rounded"
                          style={{ backgroundColor: count > 0 ? `rgba(99,102,241,${intensity})` : undefined }}
                          title={count > 0 ? `${p}/${t}: ${count} creatures` : undefined}
                        >
                          {count > 0 && (
                            <span className={count / ptMax > 0.5 ? 'text-white font-medium' : 'text-gray-700 dark:text-gray-200'}>
                              {count}
                            </span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-xs text-gray-400 mt-2">Row = Power, Column = Toughness. Darker = more creatures.</p>
          </div>
        </div>
      )}

      {/* Keyword search */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
        <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
          Keyword Search
        </h3>
        <input
          type="text"
          value={keyword}
          onChange={e => setKeyword(e.target.value)}
          placeholder="e.g. flying, Zombie, enters the battlefield…"
          className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-gray-400 dark:placeholder-gray-500"
        />

        {keywordStats && (
          <div className="mt-4 space-y-1">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
              <span className="font-semibold text-gray-700 dark:text-gray-200">{keywordStats.total}</span>
              {' '}card{keywordStats.total !== 1 ? 's' : ''} match &ldquo;{keyword.trim()}&rdquo;
            </p>
            {keywordStats.total === 0 ? (
              <p className="text-xs text-gray-400 italic">No cards found.</p>
            ) : (
              COLOR_STYLES.map(({ key, label, bar }) =>
                keywordStats.counts[key] > 0 ? (
                  <HBar
                    key={key}
                    label={label}
                    count={keywordStats.counts[key]}
                    max={keywordStats.total}
                    colorClass={bar}
                  />
                ) : null
              )
            )}
          </div>
        )}
      </div>

      {/* Signpost uncommons by color pair */}
      {pairs.length > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
          <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
            Signpost Uncommons
          </h3>

          {/* Pair selector buttons */}
          <div className="flex flex-wrap gap-2 mb-4">
            {pairs.map(pair => (
              <button
                key={pair}
                onClick={() => setSelectedPair(pair)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                  pair === activePair
                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                    : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-400 dark:hover:border-gray-500'
                }`}
              >
                {pair.split('').map(c => <ColorDot key={c} color={c} />)}
                <span>{pair}</span>
                <span className="text-xs opacity-60">({stats.signpostsByPair[pair].length})</span>
              </button>
            ))}
          </div>

          {/* Cards for selected pair */}
          {activePair && (
            <div className="flex flex-wrap gap-3">
              {stats.signpostsByPair[activePair].map(card => (
                <img
                  key={card.id}
                  src={getCardImage(card, 'normal')}
                  alt={card.name}
                  title={card.name}
                  className="h-56 rounded-lg shadow-md hover:scale-105 transition-transform"
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
