// app/ui/layout/fullscreen-page-with-header.tsx

import { clsx } from 'clsx';
import Header from '../../header/header';

interface FullscreenPageProps {
  children: React.ReactNode;
  className?: string;
}

export default function FullscreenPageWithHeader({ children, className }: FullscreenPageProps) {
    return (
        <div className={clsx('flex flex-1 flex-col h-dvh items-center justify-center overflow-hidden', className)}>
            <Header />
            <main className="flex flex-1 w-full flex-col items-stretch justify-center py-2 px-3 max-[375px]:px-1 max-w-[600px] min-h-0 overflow-hidden">
                {children}
            </main>
        </div>
    );
}
