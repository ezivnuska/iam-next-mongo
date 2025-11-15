// app/ui/poker/hand.tsx

'use client';

import Card from './card';
import type { Card as CardType } from '@/app/poker/lib/definitions/poker';

interface HandProps {
    cards: CardType[];
    hidden: boolean;
}

export default function Hand({ cards, hidden = true }: HandProps) {
    return (
        <div className='flex flex-row gap-1'>
            {cards.map((card, index) => (
                <Card key={`${card.id}-${index}`} index={index} card={card} size='sm' hidden={hidden} />
            ))}
        </div>
    );
}
