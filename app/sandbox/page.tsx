// app/sandbox/page.tsx

'use client';

import PageHeader from '../ui/layout/page-header';
import PageContent from '../ui/layout/page/page-content';
import ChartSection from './sections/chart-section';

export default function SandboxPage() {

    return (
        <PageContent>
            <PageHeader
                useBreadcrumbs={true}
                breadcrumbs={[
                    { label: 'Sandbox', href: '/sandbox', active: true }
                ]}
                subtitle='Custom Component Playground'
            />

            <ChartSection />
        </PageContent>
    );
}
