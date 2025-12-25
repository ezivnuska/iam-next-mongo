// app/page.tsx

export const dynamic = 'force-dynamic';

// import { getPublicContent } from '@/app/lib/actions/public-content';
import PageContent from './ui/layout/page/page-content';
import NavLinkListAnimated from './ui/header/nav-link-list-animated';

export default async function Page() {
    // const content = await getPublicContent();
    return (
        <PageContent>
            <div className='flex flex-1'>
                <NavLinkListAnimated className='py-4' />
            </div>
        </PageContent>
    );
}
