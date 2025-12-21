// app/layout.tsx

export const dynamic = 'force-dynamic';

import '@/app/ui/global.css';
import { ubuntu } from '@/app/ui/fonts';
import { auth } from '@/app/lib/auth';
import { UserProvider } from '@/app/lib/providers/user-provider';
import { AuthModalProvider } from '@/app/lib/providers/auth-modal-provider';
import { SocketProvider } from '@/app/lib/providers/socket-provider';
import { TileProvider } from '@/app/lib/providers/tile-provider';
import type { Viewport } from 'next';
import DefaultScreen from '@/app/ui/layout/screen/default-screen';
import SimpleScreen from './ui/layout/screen/simple-screen';

export const viewport: Viewport = {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 5,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
    const session = await auth();
    return (
        <html lang='en'>
            <body className={`${ubuntu.className} antialiased flex min-h-screen flex-col overflow-x-hidden`}>
                <UserProvider initialUser={session?.user ?? null}>
                    <AuthModalProvider>
                        <SocketProvider>
                            <TileProvider>
                                <SimpleScreen>
                                    {children}
                                </SimpleScreen>
                            </TileProvider>
                        </SocketProvider>
                    </AuthModalProvider>
                </UserProvider>
            </body>
        </html>
    );
}
