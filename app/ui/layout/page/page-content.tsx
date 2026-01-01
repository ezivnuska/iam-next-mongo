// app/ui/layout/page/page-content.tsx

import { FlexContainer } from '@/app/ui/flex-container';
import clsx from 'clsx';

interface PageContentProps {
    children: React.ReactNode;
    fullscreen?: boolean;
}

export default function PageContent({ children, fullscreen = false }: PageContentProps) {
    return (
        <div className='flex flex-1 flex-col h-full px-4'>
            <FlexContainer className={clsx('w-full mx-auto gap-2', {
                'max-w-[600px]': !fullscreen,
            })}>
                {children}
            </FlexContainer>
        </div>
    );
}
