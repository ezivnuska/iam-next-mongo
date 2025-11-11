// app/ui/layout/page/default-page.tsx

import Header from '@/app/ui/header/header';

export default function DefaultPage({ children }: { children: React.ReactNode }) {
    return (
        <>
            <Header />
            <main className="flex grow flex-col py-2 px-3 max-[375px]:px-1">
                {children}
            </main>
        </>
    )
}