// app/profile/images/page.tsx

export const dynamic = 'force-dynamic';

import Breadcrumbs from '@/app/ui/layout/breadcrumbs';
import { auth } from '@/app/lib/auth';
import { redirect } from 'next/navigation';
import ImagesClient from '@/app/ui/images/images-client';
import PageContent from '@/app/ui/layout/page/page-content';

export default async function Page() {
    const session = await auth();
    if (!session) {
        redirect('/?auth=required&callbackUrl=/profile/images');
    }

    return (
        <PageContent>
            <Breadcrumbs
                breadcrumbs={[
                    { label: 'Profile', href: '/profile' },
                    { label: 'Images', href: '/profile/images', active: true },
                ]}
            />
            <div className='flex flex-1'>
                <ImagesClient authorized={true} />
            </div>
        </PageContent>
    );
}
