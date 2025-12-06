// app/ui/layout/page/default-page.tsx

import Header from '@/app/ui/header/header';

export default function DefaultPage({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex flex-col items-center justify-center">
            <Header />
            <main className="flex flex-1 w-full flex-col items-stretch justify-center py-2 px-3 max-[375px]:px-1 max-w-[600px]">
                {children}
            </main>
        </div>
    )
}