// app/ui/poker/card.tsx

'use client';

import type { Card as CardType } from '@/app/lib/definitions/poker';
import clsx from 'clsx';

type CardSize = 'sm' | 'md' | 'lg';

interface CardProps {
  card: CardType;
  index: number;
  size?: CardSize;
}

export default function Card({ card, index, size = 'md' }: CardProps) {
    const cardSizeClasses = {
        sm: 'w-[36px] h-[54px] items-center justify-center',
        md: 'flex w-[72px] h-[108px] py-2 justify-start items-start',
        lg: 'w-[72px] h-[108px]',
    }
    const cardTextClasses = {
        sm: 'text-lg items-center justify-evenly',
        md: 'text-xl items-center justify-center',
        lg: 'text-lg',
    }
    return (
        <div
            className={clsx(
                'flex px-1 bg-white rounded-lg border-1',
                cardSizeClasses[size],
            )}
            style={{ left: `${index * 24}px`, zIndex: index }}
        >
            {/* <div className='shrink bg-amber-600'> */}
                {/* <div className='flex flex-col shrink justify-center items-start border'> */}
                    <p className={clsx(
                        'flex flex-col items-center justify-center',
                        cardTextClasses[size],
                    )}>
                        <span>{card.label}</span>
                        <span className='-mt-2 text-2xl' style={{ color: card.color }}>{card.symbol}</span>
                    </p>
                {/* </div> */}
            {/* </div> */}
        </div>
    );
}
