// app/sandbox/page.tsx

'use client';

import PageHeader from '../ui/layout/page-header';
import PageContent from '../ui/layout/page/page-content';
import PetriDish from '../ui/petri-dish';
import ChartSection from './sections/chart-section';
import PetriDishSection from './sections/petri-dish-section';

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

            <div className='flex flex-1 w-full border border-white'>
                <div className='flex flex-col w-full border border-white'>
                    <PetriDishSection />
                    {/* <ChartSection /> */}
                </div>
            </div>
        </PageContent>
    );
}
