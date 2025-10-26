// app/ui/poker/card.tsx

'use client';

import type { Card as CardType } from '@/app/lib/definitions/poker';

interface CardProps {
  card: CardType;
  index: number;
}

export default function Card({ card, index }: CardProps) {
    return (
        <div
            className='absolute w-[72px] h-[108px] py-2 px-1 bg-white rounded-lg border'
            style={{ left: `${index * 24}px`, zIndex: index }}
        >
            {/* <div className='shrink bg-amber-600'> */}
                {/* <div className='flex flex-col shrink justify-center items-start border'> */}
                    <div className='items-center justify-center'>
                        <p>{card.label}</p>
                        <p className='-mt-2' style={{ color: card.color }}>{card.symbol}</p>
                    </div>
                {/* </div> */}
            {/* </div> */}
        </div>
    );
}
