// app/about/timeline/page.tsx

import { Metadata } from 'next';
import PageHeader from '@/app/ui/layout/page-header';
import PageContent from '@/app/ui/layout/page/page-content';
import { TimelineFeed } from './components/TimelineFeed';

export const metadata: Metadata = {
    title: 'Timeline',
    description: 'Career history and open source projects',
};

export default function TimelinePage() {
    return (
        <PageContent>
            <PageHeader
                useBreadcrumbs={true}
                breadcrumbs={[
                    { label: 'About', href: '/about' },
                    { label: 'Timeline', href: '/about/timeline', active: true }
                ]}
                subtitle='Career History'
            />
            <div className='px-2 pb-8'>
                <TimelineFeed />
            </div>
        </PageContent>
    );
}
