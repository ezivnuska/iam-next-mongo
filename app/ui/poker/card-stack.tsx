// app/ui/poker/card-stack.tsx

'use client';

import Card from './card';
import type { Card as CardType } from '@/app/lib/definitions/poker';

interface CardStackProps {
    cards: CardType[];
}

export default function CardStack({ cards }: CardStackProps) {
    // Calculate width: first card (72px) + (remaining cards * 24px offset)
    const containerWidth = cards.length > 0 ? 72 + (cards.length - 1) * 24 : 0;

    return (
        <div className='relative' style={{ width: `${containerWidth}px`, height: '108px' }}>
            {cards.map((card, index) => (
                <Card key={`${card.id}-${index}`} index={index} card={card} />
            ))}
        </div>
    );
}
