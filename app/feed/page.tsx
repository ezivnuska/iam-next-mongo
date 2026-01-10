// app/feed/page.tsx

export const dynamic = 'force-dynamic';

import { Metadata } from 'next';
import PageHeader from '@/app/ui/layout/page-header';
import { getPublicContent } from '@/app/lib/actions/public-content';
import UserContentFeed from '@/app/ui/user/user-content-feed';
import PageContent from '@/app/ui/layout/page/page-content';

export const metadata: Metadata = {
    title: 'Feed',
    description: 'User Posts',
};

export default async function FeedPage() {
    const content = await getPublicContent();
    return (
        <PageContent>
            <PageHeader
                useBreadcrumbs={true}
                breadcrumbs={[
                    { label: 'Feed', href: '/feed', active: true }
                ]}
                // subtitle='User Posts'
            />

            <div className='space-y-8 pb-8'>
                <UserContentFeed initialContent={content} />
            </div>
        </PageContent>
    );
}
