// app/ui/layout/page/full-page.tsx

import SoftHeader from '@/app/ui/header/soft-header';

export default function FullPage({ children }: { children: React.ReactNode }) {
    return (
        <main className="flex flex-1 grow flex-col items-stretch">
            {/* <SoftHeader /> */}
            {children}
        </main>
    )
}