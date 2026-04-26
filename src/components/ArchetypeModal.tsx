import { useState } from 'react';
import clsx from 'clsx';
import { useAppStore } from '../store/useAppStore';
import { upsertArchetype, deleteArchetype } from '../lib/supabase';
import type { Archetype, ColorFilter } from '../types';

const COLORS: { id: ColorFilter; label: string; bg: string }[] = [
  { id: 'W', label: 'W', bg: 'bg-yellow-100 dark:bg-yellow-200 text-gray-800' },
  { id: 'U', label: 'U', bg: 'bg-blue-500 text-white' },
  { id: 'B', label: 'B', bg: 'bg-gray-800 text-white dark:bg-gray-600' },
  { id: 'R', label: 'R', bg: 'bg-red-500 text-white' },
  { id: 'G', label: 'G', bg: 'bg-green-600 text-white' },
];

const COLOR_NAMES: Record<ColorFilter, string> = {
  W: 'White', U: 'Blue', B: 'Black', R: 'Red', G: 'Green', C: 'Colorless',
};

function ColorPip({ color }: { color: ColorFilter }) {
  const c = COLORS.find(x => x.id === color);
  if (!c) return null;
  return (
    <span className={clsx('w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center flex-shrink-0', c.bg)}>
      {c.label}
    </span>
  );
}

const emptyArchetype = (setCode: string): Archetype => ({
  set_code: setCode,
  name: '',
  colors: [],
  description: '',
  example_builds: [],
});

function ArchetypeForm({
  initial,
  onSave,
  onCancel,
  onDelete,
}: {
  initial: Archetype;
  onSave: (a: Archetype) => Promise<void>;
  onCancel: () => void;
  onDelete?: () => Promise<void>;
}) {
  const [draft, setDraft] = useState<Archetype>(initial);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const toggleColor = (c: ColorFilter) => {
    setDraft(d => ({
      ...d,
      colors: d.colors.includes(c) ? d.colors.filter(x => x !== c) : [...d.colors, c],
    }));
  };

  const addBuild = () => setDraft(d => ({ ...d, example_builds: [...d.example_builds, ''] }));
  const removeBuild = (i: number) =>
    setDraft(d => ({ ...d, example_builds: d.example_builds.filter((_, idx) => idx !== i) }));
  const updateBuild = (i: number, val: string) =>
    setDraft(d => {
      const next = [...d.example_builds];
      next[i] = val;
      return { ...d, example_builds: next };
    });

  const handleSave = async () => {
    if (!draft.name.trim()) return;
    setSaving(true);
    try {
      await onSave(draft);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    setDeleting(true);
    try {
      await onDelete();
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Name */}
      <div>
        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Name</label>
        <input
          type="text"
          value={draft.name}
          onChange={e => setDraft(d => ({ ...d, name: e.target.value }))}
          placeholder="e.g. Azorius Flyers"
          className="w-full px-3 py-1.5 text-sm rounded border border-gray-300 dark:border-gray-600 bg-transparent focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </div>

      {/* Colors */}
      <div>
        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Colors</label>
        <div className="flex gap-1.5">
          {COLORS.map(c => (
            <button
              key={c.id}
              type="button"
              onClick={() => toggleColor(c.id)}
              title={COLOR_NAMES[c.id]}
              className={clsx(
                'w-7 h-7 rounded-full text-xs font-bold transition-all border-2',
                draft.colors.includes(c.id)
                  ? clsx(c.bg, 'border-white shadow-md scale-110')
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-500 border-transparent hover:border-gray-400'
              )}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Description */}
      <div>
        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Description</label>
        <textarea
          value={draft.description}
          onChange={e => setDraft(d => ({ ...d, description: e.target.value }))}
          placeholder="What makes this archetype tick? Key synergies, game plan…"
          rows={3}
          className="w-full px-3 py-1.5 text-sm rounded border border-gray-300 dark:border-gray-600 bg-transparent focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-y"
        />
      </div>

      {/* Example builds */}
      <div>
        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Example Builds</label>
        <div className="flex flex-col gap-2">
          {draft.example_builds.map((build, i) => (
            <div key={i} className="flex gap-2 items-start">
              <textarea
                value={build}
                onChange={e => updateBuild(i, e.target.value)}
                placeholder={`Build ${i + 1}…`}
                rows={2}
                className="flex-1 px-3 py-1.5 text-sm rounded border border-gray-300 dark:border-gray-600 bg-transparent focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-y"
              />
              <button
                type="button"
                onClick={() => removeBuild(i)}
                className="mt-1 text-gray-400 hover:text-red-500 transition-colors text-lg leading-none"
                title="Remove build"
              >
                ×
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={addBuild}
            className="self-start text-xs text-indigo-500 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium"
          >
            + Add example build
          </button>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !draft.name.trim()}
          className="px-4 py-1.5 text-sm rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 hover:border-gray-500 transition-colors"
        >
          Cancel
        </button>
        {onDelete && (
          <div className="ml-auto">
            {confirmDelete ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">Sure?</span>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="px-3 py-1 text-xs rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
                >
                  {deleting ? 'Deleting…' : 'Yes, delete'}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="px-3 py-1 text-xs rounded border border-gray-300 dark:border-gray-600 hover:border-gray-500 transition-colors"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="text-xs text-red-500 hover:text-red-700 dark:hover:text-red-400 transition-colors"
              >
                Delete
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ArchetypeModal() {
  const { selectedSet, archetypes, upsertArchetypeLocal, deleteArchetypeLocal, setArchetypeModalOpen } =
    useAppStore();

  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  if (!selectedSet) return null;

  const handleSave = async (archetype: Archetype) => {
    const saved = await upsertArchetype(archetype);
    upsertArchetypeLocal(saved);
    setAdding(false);
    setEditingId(null);
  };

  const handleDelete = async (id: string) => {
    await deleteArchetype(id);
    deleteArchetypeLocal(id);
    setEditingId(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 backdrop-blur-sm overflow-y-auto py-12 px-4">
      <div className="w-full max-w-2xl bg-white dark:bg-gray-900 rounded-xl shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800">
          <div>
            <h2 className="font-semibold text-base">Archetypes</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{selectedSet.name}</p>
          </div>
          <button
            onClick={() => setArchetypeModalOpen(false)}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-lg"
          >
            ×
          </button>
        </div>

        <div className="px-6 py-4 flex flex-col gap-4">
          {/* Existing archetypes */}
          {archetypes.length === 0 && !adding && (
            <p className="text-sm text-gray-400 dark:text-gray-500 py-4 text-center">
              No archetypes yet. Add one to get started.
            </p>
          )}

          {archetypes.map(archetype => (
            <div key={archetype.id} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
              {editingId === archetype.id ? (
                <div className="p-4">
                  <ArchetypeForm
                    initial={archetype}
                    onSave={handleSave}
                    onCancel={() => setEditingId(null)}
                    onDelete={() => handleDelete(archetype.id!)}
                  />
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => { setAdding(false); setEditingId(archetype.id!); }}
                  className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      {archetype.colors.map(c => <ColorPip key={c} color={c} />)}
                      {archetype.colors.length === 0 && (
                        <span className="text-xs text-gray-400">Colorless</span>
                      )}
                    </div>
                    <span className="font-medium text-sm">{archetype.name}</span>
                    <span className="ml-auto text-xs text-gray-400">Edit</span>
                  </div>
                  {archetype.description && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                      {archetype.description}
                    </p>
                  )}
                  {archetype.example_builds.length > 0 && (
                    <p className="text-xs text-gray-400 mt-0.5">
                      {archetype.example_builds.length} example build{archetype.example_builds.length > 1 ? 's' : ''}
                    </p>
                  )}
                </button>
              )}
            </div>
          ))}

          {/* Add new */}
          {adding ? (
            <div className="border border-indigo-300 dark:border-indigo-700 rounded-lg p-4">
              <p className="text-xs font-medium text-indigo-600 dark:text-indigo-400 mb-3">New Archetype</p>
              <ArchetypeForm
                initial={emptyArchetype(selectedSet.code)}
                onSave={handleSave}
                onCancel={() => setAdding(false)}
              />
            </div>
          ) : (
            <button
              type="button"
              onClick={() => { setEditingId(null); setAdding(true); }}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-dashed border-gray-300 dark:border-gray-600 text-sm text-gray-500 dark:text-gray-400 hover:border-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
            >
              <span className="text-base leading-none">+</span>
              Add archetype
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
