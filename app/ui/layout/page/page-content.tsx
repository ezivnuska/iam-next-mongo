// app/ui/layout/page/page-content.tsx

'use client';

import { useState, Suspense, useEffect } from 'react';
import LoadingSpinner from '@/app/ui/loading-spinner';
import { FlexContainer } from '@/app/ui/flex-container';

interface PageContentProps {
    children: React.ReactNode;
    showLoading?: boolean;
}

export default function PageContent({
    children,
    showLoading = true,
}: PageContentProps) {
    const [isContentLoaded, setIsContentLoaded] = useState(false);

    // Mark content as loaded after initial render
    useEffect(() => {
        const timer = setTimeout(() => {
            setIsContentLoaded(true);
        }, 100);
        return () => clearTimeout(timer);
    }, []);

    return (
        <div className='flex flex-1 flex-col'>
            {showLoading && !isContentLoaded ? (
                <LoadingSpinner />
            ) : (
                <Suspense fallback={<LoadingSpinner />}>
                    <FlexContainer className='w-full max-w-[600px] mx-auto mb-4 py-4 px-2'>
                        {children}
                    </FlexContainer>
                </Suspense>
            )}
        </div>
    );
}
