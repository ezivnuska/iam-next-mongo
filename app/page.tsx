import { auth } from '@/app/lib/auth';
import { PageContent } from '@iam/ui';
import PageDirectory from '@/app/ui/page-directory';

export default async function Page() {
    const session = await auth();
    return (
        <PageContent>
            <PageDirectory authenticated={!!session?.user} />
        </PageContent>
    );
}
