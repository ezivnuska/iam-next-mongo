// app/feed/page.tsx

import { Metadata } from 'next';
import PageHeader from '../ui/layout/page-header';
import { getPublicContent } from '../lib/actions/public-content';
import UserContentFeed from '../ui/user/user-content-feed';

export const metadata: Metadata = {
    title: 'Feed',
    description: ' Public Posts',
};

export default async function SocialPage() {
    const content = await getPublicContent();
    return (
        <>
            <PageHeader
                title='Feed'
                subtitle='Public Posts'
            />

            <div className="space-y-8 px-2 pb-8">
                <UserContentFeed initialContent={content} />
            </div>
        </>
    );
}
