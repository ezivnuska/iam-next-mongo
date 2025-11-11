// app/ui/layout/fullscreen-layout.tsx

import Header from '@/app/ui/header/header';
import Main from '@/app/ui/layout/main';

export default async function FullscreenLayout({ children }: { children: React.ReactNode }) {
    return (
        <div>
            <Header />
            <Main>
                {children}
            </Main>
        </div>
    );
}
