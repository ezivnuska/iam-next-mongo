// app/about/eric/page.tsx

import { Metadata } from 'next';
import PageHeader from '@/app/ui/layout/page-header';
import PageContent from '@/app/ui/layout/page/page-content';
import { Accordion, AccordionItem } from '@/app/ui/accordion';
import { contentSections } from '../content-sections';

export const metadata: Metadata = {
    title: 'Who is Eric?',
    description: 'About Me',
};

export default function EricDetailPage() {
    return (
        <PageContent>
            <PageHeader
                useBreadcrumbs={true}
                breadcrumbs={[
                    { label: 'About Eric', href: '/about' },
                    { label: 'About Me', href: '/about/eric', active: true }
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
                                <span key={pIndex} className='block text-md'>
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
