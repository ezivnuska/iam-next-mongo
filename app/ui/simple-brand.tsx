// app/ui/simple-brand.tsx

'use client';

import Link from 'next/link';

export default function SimpleBrand() {

    return (
        <Link href='/' className='flex flex-row justify-center text-gray-900 dark:text-white'>
            <span className='text-[24px] leading-none sm:text-[32px] font-bold'>iam</span>
            <span className='text-[24px] leading-none sm:text-[32px] font-bold'>eric</span>
        </Link>
    );
}
