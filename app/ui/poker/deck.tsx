// app/ui/poker/deck.tsx

'use client';

import Card from './card';
import { usePoker } from '@/app/lib/providers/poker-provider';

export default function Deck() {
  const { deck } = usePoker();

  return (
    <ul id="deck">
      {deck.map(card => (
        <Card key={card.id} card={card} />
      ))}
    </ul>
  );
}
