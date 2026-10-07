'use client';
import React from 'react';
import { X } from 'lucide-react';

interface RemoveBadgeProps {
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  /** Testo del tooltip e dell'etichetta per i lettori di schermo. */
  title?: string;
}

/**
 * Pallino rosso con la X per rimuovere un'etichetta, un allergene o un
 * ingrediente da un chip. Va dentro un contenitore `relative`: si appoggia
 * all'angolo in alto a destra.
 *
 * 20 px con icona vera: il vecchio carattere ✕ a 7-8 px era quasi invisibile.
 */
export default function RemoveBadge({ onClick, title }: RemoveBadgeProps) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick(e);
      }}
      title={title}
      aria-label={title || 'Rimuovi'}
      className="absolute -top-2 -right-2 flex h-5 w-5 cursor-pointer items-center justify-center rounded-full bg-red-500 text-white shadow-md ring-2 ring-white transition-transform hover:scale-110 hover:bg-red-600 active:scale-95 dark:ring-card"
    >
      <X size={12} strokeWidth={3} />
    </button>
  );
}
