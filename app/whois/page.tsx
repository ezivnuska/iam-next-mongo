import { Metadata } from 'next';
import { PageHeader } from '@iam/ui';
import { PageContent } from '@iam/ui';
import { TimelineFeed } from '@/app/about/timeline/components/TimelineFeed';

export const metadata: Metadata = {
    title: 'Who is Eric?',
    description: 'Career history and open source projects',
};

export default function WhoisPage() {
    return (
        <PageContent header={<PageHeader subtitle='Project History' />}>
            <div className='pb-8'>
                <TimelineFeed />
            </div>
        </PageContent>
    );
}
