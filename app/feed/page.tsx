// app/feed/page.tsx

export const dynamic = 'force-dynamic';

import { Metadata } from 'next';
import PageHeader from '../ui/layout/page-header';
import { getPublicContent } from '../lib/actions/public-content';
import UserContentFeed from '../ui/user/user-content-feed';
import PageContent from '../ui/layout/page/page-content';

export const metadata: Metadata = {
    title: 'Feed',
    description: ' Public Posts',
};

export default async function FeedPage() {
    const content = await getPublicContent();
    return (
        <PageContent>
            <PageHeader
                title='Feed'
                subtitle='Public Posts'
            />

            <div className="space-y-8 px-2 pb-8">
                <UserContentFeed initialContent={content} />
            </div>
        </PageContent>
    );
}
