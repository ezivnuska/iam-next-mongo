// app/ui/layout/page/page-content.tsx

import { FlexContainer } from '@/app/ui/flex-container';
import clsx from 'clsx';

interface PageContentProps {
    children: React.ReactNode;
    fullscreen?: boolean;
}

export default function PageContent({ children, fullscreen = false }: PageContentProps) {
    return (
        <div className='flex flex-1 flex-col px-2'>
            <FlexContainer className='w-full max-w-[600px] mx-auto'>
                {/* <div className={clsx('flex flex-1 w-full border border-white', {
                    'px-2': !fullscreen,
                })}> */}
                    {/* <div className='flex flex-1 w-full border-10 border-dotted border-yellow-500'> */}
                        {children}
                    {/* </div> */}
                {/* </div> */}
            </FlexContainer>
        </div>
    );
}
