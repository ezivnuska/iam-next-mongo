// app/feed/page.tsx

export const dynamic = 'force-dynamic';

import { Metadata } from 'next';
import { getFeedContent } from '@/app/lib/actions/feed-content';
import UserContentFeed from '@/app/ui/user/user-content-feed';
import { PageContent, PageHeader, PageContentList } from '@iam/ui';

export const metadata: Metadata = {
    title: 'Feed',
    description: 'Posts and memories from you and your friends',
};

export default async function FeedPage() {
    const content = await getFeedContent();
    return (
        <PageContent header={<PageHeader subtitle='Feed' />}>
            <PageContentList>
                <UserContentFeed initialContent={content} />
            </PageContentList>
        </PageContent>
    );
}
