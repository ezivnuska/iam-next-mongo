import { Metadata } from 'next';
import PageHeader from '@/app/ui/layout/page-header';
import PageContent from '@/app/ui/layout/page/page-content';
import { TimelineFeed } from '@/app/about/timeline/components/TimelineFeed';

export const metadata: Metadata = {
    title: 'Who is Eric?',
    description: 'Career history and open source projects',
};

export default function WhoisPage() {
    return (
        <PageContent>
            {/* <PageHeader subtitle='Who is Eric?' /> */}
            <div className='px-2 pb-8'>
                <TimelineFeed />
            </div>
        </PageContent>
    );
}
