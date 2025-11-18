// app/ui/poker/card.tsx

'use client';

import type { Card as CardType } from '@/app/poker/lib/definitions/poker';
import clsx from 'clsx';

type CardSize = 'sm' | 'md' | 'lg';

interface CardProps {
  card: CardType;
  index: number;
  size?: CardSize;
  hidden: boolean;
}

export default function Card({ card, index, size = 'md', hidden = false }: CardProps) {
    const cardSizeClasses = {
        sm: 'w-[36px] h-[54px] items-center justify-center',
        md: 'flex w-[72px] h-[108px] py-2 justify-start items-start',
        lg: 'w-[72px] h-[108px]',
    };
    const cardTextClasses = {
        sm: 'text-lg items-center justify-evenly',
        md: 'text-xl items-center justify-center',
        lg: 'text-lg',
    };
    return (
        <div
            className={clsx(
                'flex px-1 bg-white rounded-lg border-1',
                cardSizeClasses[size],
            )}
            style={{ left: `${index * 24}px`, zIndex: index }}
        >
            {!hidden && (
                <p className={clsx(
                    'flex flex-col',
                    cardTextClasses[size],
                )}>
                    <span className='text-black'>{card.label}</span>
                    <span className='-mt-2 text-2xl' style={{ color: card.color }}>{card.symbol}</span>
                </p>
            )}
        </div>
    );
}
