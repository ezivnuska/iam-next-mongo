import clsx from 'clsx';

interface PageContentProps {
    children: React.ReactNode;
    header?: React.ReactNode;
    fullscreen?: boolean;
}

export default function PageContent({ children, header, fullscreen = false }: PageContentProps) {
    return (
        <div className={clsx('flex flex-1 flex-col min-h-0 min-w-0 w-full mx-auto', {
            'max-w-content': !fullscreen,
        })}>
            {header && (
                <div className='shrink-0 px-4 py-2'>
                    {header}
                </div>
            )}
            <div className='flex-1 overflow-y-auto min-h-0 px-4'>
                {children}
            </div>
        </div>
    );
}
