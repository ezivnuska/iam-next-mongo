// app/sandbox/sections/petri-dish-section.tsx

'use client';

import PetriDish from '../../ui/petri-dish';
import { Section } from '../section';

export default function PetriDishSection() {

    return (
        <Section title='Petri Dish'>
            {/* <div className='flex flex-col flex-1 gap-1 px-2 pb-8'> */}
                <PetriDish />
            {/* </div> */}
        </Section>
    );
}
