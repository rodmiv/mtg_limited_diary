import { useMemo } from 'react';
import { useAppStore } from '../store/useAppStore';
import { getCardImage } from '../lib/scryfall';
import type { ScryfallCard } from '../types';

// ── helpers ────────────────────────────────────────────────────────────────

const PT_BUCKETS = ['0', '1', '2', '3', '4', '5', '6+', '*'];

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

// ── main component ─────────────────────────────────────────────────────────

export default function SetStats() {
  const cards = useAppStore(s => s.cards);
  const reviews = useAppStore(s => s.reviews);

  const stats = useMemo(() => {
    const rarity = { common: 0, uncommon: 0, rare: 0, mythic: 0 };
    const types: Record<string, number> = {
      Creature: 0, Planeswalker: 0, Instant: 0, Sorcery: 0,
      Enchantment: 0, Artifact: 0, Land: 0, Other: 0,
    };
    const colors: Record<string, number> = { W: 0, U: 0, B: 0, R: 0, G: 0, Multi: 0, C: 0 };
    const cmcBuckets: Record<string, number> = { '0': 0, '1': 0, '2': 0, '3': 0, '4': 0, '5': 0, '6+': 0 };
    const ptMap: Record<string, number> = {};
    const legendaries: ScryfallCard[] = [];
    const signposts: ScryfallCard[] = [];
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

      // Legendary creatures
      if (card.type_line.includes('Legendary') && card.type_line.includes('Creature')) {
        legendaries.push(card);
      }

      // Signpost uncommons (multicolored uncommons)
      if (card.rarity === 'uncommon' && (card.colors?.length ?? 0) >= 2) {
        signposts.push(card);
      }

      // Graded
      if (reviews[card.id]?.my_grade != null) graded++;
    }

    return { rarity, types, colors, cmcBuckets, ptMap, legendaries, signposts, graded };
  }, [cards, reviews]);

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

  return (
    <div className="p-4 sm:p-6 space-y-4 max-w-5xl mx-auto overflow-auto">

      {/* Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Total Cards" value={cards.length} />
        <StatCard label="Legendary Creatures" value={stats.legendaries.length} />
        <StatCard label="Signpost Uncommons" value={stats.signposts.length} />
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

      {/* Signpost uncommons */}
      {stats.signposts.length > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
          <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
            Signpost Uncommons ({stats.signposts.length})
          </h3>
          <div className="flex flex-wrap gap-2">
            {stats.signposts.map(card => (
              <img
                key={card.id}
                src={getCardImage(card, 'small')}
                alt={card.name}
                title={card.name}
                className="h-24 rounded shadow-sm hover:scale-105 transition-transform"
              />
            ))}
          </div>
        </div>
      )}

      {/* Legendary creatures */}
      {stats.legendaries.length > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
          <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
            Legendary Creatures ({stats.legendaries.length})
          </h3>
          <div className="flex flex-wrap gap-2">
            {stats.legendaries.map(card => (
              <img
                key={card.id}
                src={getCardImage(card, 'small')}
                alt={card.name}
                title={card.name}
                className="h-24 rounded shadow-sm hover:scale-105 transition-transform"
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
