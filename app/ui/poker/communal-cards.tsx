// app/ui/poker/communal-cards.tsx

'use client';

import { memo } from 'react';
import CardStack from './card-stack';
import { useGameState } from '@/app/lib/providers/poker-provider';

function CommunalCards() {
  const { communalCards } = useGameState();

  return <CardStack cards={communalCards} />;
}

export default memo(CommunalCards);
