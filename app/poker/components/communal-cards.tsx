// app/ui/poker/communal-cards.tsx

'use client';

import { memo } from 'react';
import { useGameState, usePlayers } from '@/app/poker/lib/providers/poker-provider';
import Card from './card';

function CommunalCards() {
  const { communalCards, locked } = useGameState();
  const { players } = usePlayers();
  const cardWidth = 72
  const cardHeight = 108

  // Check if there are any human players
  const hasHumanPlayers = players.some(p => !p.isAI);

  // Only show communal cards if:
  // - There are communal cards
  // - Game is locked (in progress) OR there are human players
  const shouldShowCards = communalCards.length > 0 && (locked || hasHumanPlayers);

  const containerWidth = shouldShowCards ? cardWidth + (communalCards.length - 1) * (cardWidth / 2) : 0;
  const containerHeight = cardHeight

return (
    <div className='relative' style={{ width: `${containerWidth}px`, height: `${containerHeight}px` }}>
        {shouldShowCards && communalCards.map((card, index) => (
            <div
                key={`communal-card-${index}`}
                className='absolute'
                style={{ left: `${index * 36}px`, zIndex: index }}
            >
                <Card key={`${card.id}-${index}`} index={index} card={card} size='md' hidden={false} />
            </div>
        ))}
    </div>
);
}

export default memo(CommunalCards);
