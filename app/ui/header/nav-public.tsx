// app/ui/header/nav-public.tsx

'use client';

import { PuzzlePieceIcon } from '@heroicons/react/24/solid';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';
import PokerNavButton from '@/app/ui/header/poker-nav-button';

export default function NavPublic() {
  
    const pathname = usePathname();
    return (
        <div className='flex flex-row items-center gap-2 min-[375px]:gap-1'>
            <Link
                key='Tiles'
                href='/tiles'
                className={clsx('flex flex-col items-center justify-center rounded-md bg-gray-50 text-sm font-medium py-1 px-1 hover:bg-sky-100 hover:text-blue-600 md:flex-none md:justify-start md:px-3',
                    {
                        'bg-sky-100 text-blue-600': pathname === '/tiles',
                    },
                )}
            >
                <PuzzlePieceIcon className="w-6 min-[375px]:w-5 self-center" />
                <p className="text-xs hidden md:block">Tiles</p>
            </Link>
            <PokerNavButton />
        </div>
    );
}
