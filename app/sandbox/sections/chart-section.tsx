// app/sandbox/sections/chart-section.tsx

'use client';

import Chart from '../../ui/chart';
import { useEffect, useState } from 'react';
import { Button } from '../../ui/button';
import { Section } from '../section';

export default function ChartSection() {

    const [numValues, setNumValues] = useState<number>(10);
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
        <Section title='Chart'>
            <div className='flex flex-col flex-1 gap-1 px-2 pb-8'>
                <div className='flex flex-row items-center justify-center gap-2 px-2 mb-2'>
                    <Button onClick={() => setJustification(justification === 'center' ? 'default' : 'center')}>{justification === 'center' ? 'Default' : 'Center'}</Button>
                    <Button onClick={() => setDirection(direction === 'col' ? 'row' : 'col')}>{direction === 'col' ? 'Vertical' : 'Horizontal'}</Button>
                    <div className='flex flex-row items-center justify-evenly gap-2'>
                        <Button onClick={() => setNumValues(numValues - 1)} disabled={numValues === 0}>-</Button>
                        <Button onClick={() => setNumValues(numValues + 1)}>+</Button>
                    </div>
                </div>
                {values.length && <Chart cols={values} direction={direction} justification={justification} />}
            </div>
        </Section>
    );
}
