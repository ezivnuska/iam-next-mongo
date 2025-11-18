// app/ui/poker/hand.tsx

'use client';

import clsx from 'clsx';
import Card from './card';
import type { Card as CardType } from '@/app/poker/lib/definitions/poker';

interface HandProps {
    cards: CardType[];
    hidden?: boolean;
}

export default function Hand({ cards, hidden = true }: HandProps) {
    return (
        <div className='w-[60px] h-full relative border-1'>
            {cards.map((card, index) => (
                <div className={clsx(
                    `absolute inset-x-2 inset-y-1 top-${index} left-${index} z-${index + 1}`,
                    {
                        'inset-x-7': !hidden,
                    }
                )}>
                    <Card key={`${card.id}-${index}`} index={index} card={card} size='sm' hidden={hidden} />
                </div>
            ))}
        </div>
    );
}
