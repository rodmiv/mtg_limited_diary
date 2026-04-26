import clsx from 'clsx';

const GRADES = [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5] as const;

const GRADE_LABELS: Record<number, string> = {
  0: 'Unplayable',
  0.5: 'Very Bad',
  1: 'Weak',
  1.5: 'Below Average',
  2: 'Filler',
  2.5: 'Playable',
  3: 'Good',
  3.5: 'Very Good',
  4: 'Exceptional',
  4.5: 'Bomb',
  5: 'Format-Best',
};

export function gradeColorClass(grade: number): string {
  if (grade <= 1) return 'bg-red-500 text-white';
  if (grade <= 2) return 'bg-orange-500 text-white';
  if (grade < 3) return 'bg-yellow-400 text-gray-900';
  if (grade <= 3.5) return 'bg-lime-500 text-white';
  if (grade <= 4.5) return 'bg-green-500 text-white';
  return 'bg-emerald-600 text-white';
}

interface Props {
  value: number | null;
  onChange?: (grade: number | null) => void;
  label?: string;
  readonly?: boolean;
  compact?: boolean;
}

export default function GradeSelector({ value, onChange, label, readonly, compact }: Props) {
  return (
    <div>
      {label && (
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">{label}</p>
      )}
      <div className="flex flex-wrap gap-1">
        {GRADES.map(g => (
          <button
            key={g}
            type="button"
            disabled={readonly}
            onClick={() => onChange?.(value === g ? null : g)}
            title={GRADE_LABELS[g]}
            className={clsx(
              'rounded font-bold transition-all',
              compact ? 'px-1.5 py-0.5 text-xs' : 'px-2.5 py-1 text-sm',
              value === g
                ? clsx(gradeColorClass(g), 'ring-2 ring-white ring-offset-1 ring-offset-transparent')
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600',
              readonly && 'cursor-default pointer-events-none'
            )}
          >
            {g}
          </button>
        ))}
      </div>
      {value !== null && value !== undefined && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">{GRADE_LABELS[value]}</p>
      )}
    </div>
  );
}
