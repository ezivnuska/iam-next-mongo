export const dynamic = 'force-dynamic';

import { Metadata } from 'next';
import { PageContent, PageHeader } from '@iam/ui';
import FriendsView from './friends-view';

export const metadata: Metadata = {
    title: 'Friends',
    description: 'Your friends and pending friend requests',
};

export default function FriendsPage() {
    return (
        <PageContent header={<PageHeader subtitle='Friends' />}>
            <FriendsView />
        </PageContent>
    );
}
