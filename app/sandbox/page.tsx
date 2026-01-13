// app/sandbox/page.tsx

'use client';

import PageHeader from '../ui/layout/page-header';
import PageContent from '../ui/layout/page/page-content';
import Chart from '../ui/chart';
import { useEffect, useState } from 'react';
import { Button } from '../ui/button';
import { Section } from './section';

export default function SandboxPage() {

    const numValues = 60
    const [values, setValues] = useState<number[]>([]);
    const [direction, setDirection] = useState<'col' | 'row'>('col');
    const [justification, setJustification] = useState<'center' | 'default'>('default')
    useEffect(() => {
        setValues(getValues())
    }, [])

    useEffect(() => {
        setTimeout(() => {
            setValues(getValues())
        }, 400)
    }, [values])

    const getValues = () => {
        let array = []
        while(array.length < numValues) {
            array.push(Math.floor(Math.random() * 10))
        }
        return array
    }

    return (
        <PageContent>
            <PageHeader
                useBreadcrumbs={true}
                breadcrumbs={[
                    { label: 'Sandbox', href: '/sandbox', active: true }
                ]}
                subtitle='Custom Component Playground'
            />

            <Section title='Chart'>
                <div className='flex flex-col flex-1 gap-1 px-2 pb-8'>
                    <div className='flex flex-row items-center justify-center gap-4 px-2'>
                        <Button onClick={() => setJustification(justification === 'center' ? 'default' : 'center')} variant='ghost'>{justification === 'center' ? 'Default' : 'Center'}</Button>
                        <Button onClick={() => setDirection(direction === 'col' ? 'row' : 'col')} variant='ghost'>{direction === 'col' ? 'Vertical' : 'Horizontal'}</Button>
                    </div>
                    {values.length && <Chart cols={values} direction={direction} justification={justification} />}
                </div>
            </Section>
        </PageContent>
    );
}
