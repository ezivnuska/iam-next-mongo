// app/ui/poker/card.tsx

'use client';

import type { Card as CardType } from '@/app/lib/definitions/poker';

interface CardProps {
  card: CardType;
}

export default function Card({ card }: CardProps) {
  return (
    <li className="card">
      {card.label} of{' '}
      <span style={{ color: card.color }}>{card.symbol}</span>
    </li>
  );
}
