// app/ui/poker/card.tsx

'use client';

import type { Card as CardType } from '@/app/lib/definitions/poker';

interface CardProps {
  card: CardType;
}

export default function Card({ card }: CardProps) {
  return (
    <li className='flex flex-row items-center gap-1 rounded-md overflow-hidden px-1 py-2 border-1'>
      <span>{card.label}</span>
      <span style={{ color: card.color }}>{card.symbol}</span>
    </li>
  );
}
