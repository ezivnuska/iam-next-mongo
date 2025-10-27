// app/ui/poker/hand.tsx

'use client';

import CardStack from './card-stack';
import type { Card as CardType } from '@/app/lib/definitions/poker';

interface HandProps {
    cards: CardType[];
}

export default function Hand({ cards }: HandProps) {
    return <CardStack cards={cards} />;
}
