export const dynamic = 'force-dynamic';

import { getPublicContent } from '@/app/lib/actions/public-content';
import UserContentFeed from '@/app/ui/user/user-content-feed';
import { PageContent } from '@iam/ui';

export default async function Page() {
    const content = await getPublicContent();
    return (
        <PageContent>
            <UserContentFeed initialContent={content} />
        </PageContent>
    );
}
