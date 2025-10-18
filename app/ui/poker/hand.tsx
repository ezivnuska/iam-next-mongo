// app/ui/poker/hand.tsx

'use client';

import Card from './card';
import type { Card as CardType } from '@/app/lib/definitions/poker';

interface HandProps {
  cards: CardType[];
}

export default function Hand({ cards }: HandProps) {
  return (
    <ul className="hand">
      {cards.map((card, index) => (
        <Card key={`${card.id}-${index}`} card={card} />
      ))}
    </ul>
  );
}
