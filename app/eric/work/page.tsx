// app/eric/work/page.tsx

import { Metadata } from 'next';
import PageHeader from '@/app/ui/layout/page-header';
import PageContent from '@/app/ui/layout/page/page-content';
import { WorkTimeline } from '@/app/ui/work-timeline';
import jobs from '../jobs';

export const metadata: Metadata = {
    title: 'Work',
    description: 'Professional work experience and career history',
};

export default function WorkPage() {
    return (
        <PageContent>
            <PageHeader
                useBreadcrumbs={true}
                breadcrumbs={[
                    { label: 'Eric', href: '/?section=eric' },
                    { label: 'Work', href: '/eric/work', active: true }
                ]}
                subtitle='Professional Experience'
            />

            <div className='px-2 pb-8'>
                <WorkTimeline jobs={jobs} />
            </div>
        </PageContent>
    );
}
