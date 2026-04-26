import clsx from 'clsx';
import { useAppStore } from '../store/useAppStore';
import { getCardImage, getCardOracleText } from '../lib/scryfall';
import { gradeColorClass } from './GradeSelector';
import type { ScryfallCard } from '../types';

interface GradeBadgeProps {
  grade: number;
  label: string;
}

function GradeBadge({ grade, label }: GradeBadgeProps) {
  return (
    <span
      className={clsx(
        'text-[10px] font-bold px-1 py-0.5 rounded leading-none',
        gradeColorClass(grade)
      )}
      title={label}
    >
      {grade}
    </span>
  );
}

interface Props {
  card: ScryfallCard;
}

export default function CardTile({ card }: Props) {
  const { selectedCard, setSelectedCard, reviews } = useAppStore();
  const review = reviews[card.id];
  const isSelected = selectedCard?.id === card.id;

  const imgSrc = getCardImage(card, 'small');
  const oracleText = getCardOracleText(card);

  return (
    <div
      onClick={() => setSelectedCard(isSelected ? null : card)}
      className={clsx(
        'relative group cursor-pointer rounded-lg overflow-hidden transition-all duration-150',
        'aspect-[63/88] bg-gray-200 dark:bg-gray-800',
        isSelected
          ? 'ring-2 ring-indigo-500 scale-[1.02]'
          : 'hover:ring-2 hover:ring-indigo-400 hover:scale-[1.02]'
      )}
    >
      {/* Card image */}
      {imgSrc ? (
        <img
          src={imgSrc}
          alt={card.name}
          loading="lazy"
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center p-2">
          <span className="text-xs text-center text-gray-500 dark:text-gray-400">
            {card.name}
          </span>
        </div>
      )}

      {/* Grade badges — top right corner */}
      <div className="absolute top-1 right-1 flex flex-col gap-0.5 items-end">
        {review?.my_grade != null && (
          <GradeBadge grade={review.my_grade} label="My grade" />
        )}
        {review?.pro_grade != null && (
          <GradeBadge grade={review.pro_grade} label="Pro grade" />
        )}
      </div>

      {/* Ungraded indicator */}
      {!review?.my_grade && (
        <div className="absolute top-1 left-1 w-2 h-2 rounded-full bg-gray-400 opacity-60" title="Not yet graded" />
      )}

      {/* Hover overlay with card info */}
      <div className="absolute inset-0 bg-black/85 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-1.5 pointer-events-none">
        <p className="text-white text-[11px] font-bold leading-tight">{card.name}</p>
        <p className="text-gray-300 text-[10px] leading-tight">{card.type_line}</p>
        {oracleText && (
          <p className="text-gray-400 text-[9px] mt-1 leading-snug line-clamp-4">
            {oracleText}
          </p>
        )}
        {review?.my_review && (
          <p className="text-indigo-300 text-[9px] mt-1 italic line-clamp-2">
            {review.my_review}
          </p>
        )}
      </div>
    </div>
  );
}
