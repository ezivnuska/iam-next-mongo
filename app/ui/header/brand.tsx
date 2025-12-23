// app/ui/header/brand.tsx

'use client';

import { useHorizontalLayout } from '@/app/lib/hooks/use-horizontal-layout';
import clsx from 'clsx';
import Link from 'next/link';

export default function Brand() {

    const horizontalLayout = useHorizontalLayout();
    return (
        <Link href='/' className={clsx('flex flex-col justify-center', {
            'flex-row justify-start': !horizontalLayout,
        })}>
            <span className='text-[30px] leading-none md:text-[32px] lg:text-[40px] font-bold text-white'>iam</span>
            <span className='text-[30px] leading-none md:text-[32px] lg:text-[40px] font-bold text-white'>eric</span>
        </Link>
    );
}
