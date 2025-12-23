// app/page.tsx

export const dynamic = 'force-dynamic';

import { getPublicContent } from '@/app/lib/actions/public-content';
import PageContent from './ui/layout/page/page-content';
import SimpleBrand from './ui/simple-brand';
import NavLinkListAnimated from './ui/header/nav-link-list-animated';

export default async function Page() {
    const content = await getPublicContent();
    return (
        <PageContent>
            <div className='flex flex-1 text-gray-900 dark:text-white'>
                <NavLinkListAnimated className='py-4' />
            </div>
        </PageContent>
    );
}
