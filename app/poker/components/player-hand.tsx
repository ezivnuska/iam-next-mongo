// app/ui/poker/player-hand.tsx

'use client';

import Card from './card';
import type { Card as CardType } from '@/app/poker/lib/definitions/poker';

interface HandProps {
    cards: CardType[];
    hidden?: boolean;
}

export default function Hand({ cards, hidden = true }: HandProps) {
    // Stagger offset in pixels
    const staggerOffsetX = hidden ? 8 : 30;
    const staggerOffsetY = 4;

    return (
        <div className='flex flex-1 relative w-[60px] h-[60px] mx-2'>
            {cards.map((card, index) => (
                <div
                    key={`${card.id}-${index}`}
                    className='absolute transition'
                    style={{
                        top: `${index * staggerOffsetY}px`,
                        left: `${index * staggerOffsetX}px`,
                        zIndex: index + 1,
                    }}
                >
                    <Card index={index} card={card} size='sm' hidden={hidden} />
                </div>
            ))}
        </div>
    );
}
