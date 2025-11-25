// app/ui/layout/page/full-page.tsx

import SoftHeader from '@/app/ui/header/soft-header';

export default function FullPage({ children, bgColor }: { children: React.ReactNode, bgColor?: string }) {
    return (
        <main className={`flex flex-1 grow flex-col items-stretch ${bgColor}`}>
            {/* <SoftHeader /> */}
            {children}
        </main>
    )
}