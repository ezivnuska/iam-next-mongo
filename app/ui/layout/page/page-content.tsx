// app/ui/layout/page/page-content.tsx

import clsx from 'clsx';

interface PageContentProps {
    children: React.ReactNode;
    fullscreen?: boolean;
}

export default function PageContent({ children, fullscreen = false }: PageContentProps) {
    return (
        <div className={clsx('flex flex-1 flex-col min-h-0 min-w-0 h-full px-4 w-full mx-auto gap-2', {
            'max-w-content': !fullscreen,
        })}>
            {children}
        </div>
    );
}
