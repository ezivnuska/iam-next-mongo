// app/ui/header.tsx

'use client';

import Nav from './nav';
import Brand from './brand';
import UserButton from './user-button';

export default function Header() {

    return (
        <div className='flex flex-row w-full items-center justify-center min-w-[375px] max-w-[600px] gap-2 px-2 py-1'>
            <Brand />
            <Nav />
            <UserButton />
        </div>
    );
}
