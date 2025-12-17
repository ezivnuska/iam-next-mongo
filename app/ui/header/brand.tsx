// app/ui/header/brand.tsx

'use client';

// import { useScreenOrientation } from '@/app/games/poker/lib/hooks/use-screen-orientation';
import { useHorizontalLayout } from '@/app/lib/hooks/use-horizontal-layout';
import clsx from 'clsx';
import Link from 'next/link';

export default function Brand() {

    // const orientation = useScreenOrientation();
    // const isPortrait = orientation === 'portrait';
    const horizontalLayout = useHorizontalLayout();
    return (
        <Link href='/' className={clsx('flex flex-col justify-center', {
            'flex-row justify-start': !horizontalLayout,
        })}>
            <span className='text-[24px] leading-none sm:text-[32px] font-bold text-white'>iam</span>
            <span className='text-[24px] leading-none sm:text-[32px] font-bold text-white'>eric</span>
        </Link>
    );
}
