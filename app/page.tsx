// app/page.tsx

'use client';

import { useSearchParams } from 'next/navigation';
import PageContent from './ui/layout/page/page-content';
import NavLinkListAnimated from './ui/header/nav-link-list-animated';

export default function Page() {
    const searchParams = useSearchParams();
    const section = searchParams.get('section');

    return (
        <PageContent>
            <div className='flex flex-1 mb-4'>
                <NavLinkListAnimated className='py-4' initialSection={section} />
            </div>
        </PageContent>
    );
}
