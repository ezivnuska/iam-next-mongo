// app/ui/poker/communal-cards.tsx

'use client';

import { memo } from 'react';
import { useGameState } from '@/app/lib/providers/poker-provider';
import Card from './card';

function CommunalCards() {
  const { communalCards } = useGameState();

  const containerWidth = communalCards.length > 0 ? 72 + (communalCards.length - 1) * 24 : 0;
  
return (
    <div className='relative bg-amber-200' style={{ width: `${containerWidth}px`, height: '108px' }}>
        {communalCards.map((card, index) => (
            <div
                key={`communal-card-${index}`}
                className='absolute'
                style={{ left: `${index * 24}px`, zIndex: index }}
            >
                <Card key={`${card.id}-${index}`} index={index} card={card} size='md' />
            </div>
        ))}
    </div>
);
}

export default memo(CommunalCards);
