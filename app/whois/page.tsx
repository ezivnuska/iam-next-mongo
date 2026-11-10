import { Metadata } from 'next';
import { PageHeader, PageContent, PageContentList } from '@iam/ui';
import { TimelineFeed } from '@/app/about/timeline/components/TimelineFeed';

export const metadata: Metadata = {
    title: 'Who is Eric?',
    description: 'Career history and open source projects',
};

export default function WhoisPage() {
    return (
        <PageContent header={<PageHeader subtitle='Project History' />}>
            <PageContentList className='pb-8'>
                <TimelineFeed />
            </PageContentList>
        </PageContent>
    );
}
