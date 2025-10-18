// app/ui/poker/communal-cards.tsx

'use client';

import Card from './card';
import { usePoker } from '@/app/lib/providers/poker-provider';

export default function CommunalCards() {
  const { communalCards } = usePoker();

  return (
    <ul className='flex flex-row items-center gap-1'>
      {communalCards.map((card, index) => (
        <Card key={`${card.id}-${index}`} card={card} />
      ))}
    </ul>
  );
}
