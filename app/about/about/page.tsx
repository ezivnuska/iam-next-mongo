// app/about/about/page.tsx

import { Metadata } from 'next';
import PageHeader from '@/app/ui/layout/page-header';
import PageContent from '@/app/ui/layout/page/page-content';
import { Accordion, AccordionItem } from '@/app/ui/accordion';
import { contentSections } from '../content-sections';

export const metadata: Metadata = {
    title: 'About',
    description: 'About Me',
};

export default function AboutDetailPage() {
    return (
        <PageContent>
            <PageHeader
                useBreadcrumbs={true}
                breadcrumbs={[
                    { label: 'About', href: '/about' },
                    { label: 'About', href: '/about/about', active: true }
                ]}
                subtitle='Professional Background'
            />

            <div className='px-2 pb-8'>
                <Accordion>
                    {contentSections.map((section, index) => (
                        <AccordionItem
                            key={section.title}
                            title={section.title}
                            defaultOpen={index === 0}
                        >
                            {section.paragraphs.map((paragraph, pIndex) => (
                                <span key={pIndex} className='block text-md text-gray-300'>
                                    {paragraph}
                                </span>
                            ))}
                        </AccordionItem>
                    ))}
                </Accordion>
            </div>
        </PageContent>
    );
}
