// app/layout.tsx

import '@/app/ui/global.css';
import { ubuntu } from '@/app/ui/fonts';
import { auth } from "@/app/lib/auth";
import { UserProvider } from "@/app/lib/providers/user-provider";
import { SocketProvider } from './lib/providers/socket-provider';
import { TileProvider } from './lib/providers/tile-provider';
import Main from '@/app/ui/layout/main';

export default async function RootLayout({ children }: { children: React.ReactNode }) {
    const session = await auth();
    return (
        <html lang="en">
            <body className={`${ubuntu.className} antialiased flex min-h-screen flex-col`}>
                <UserProvider initialUser={session?.user ?? null}>
                    <SocketProvider>
                        <TileProvider>
                            {children}
                        </TileProvider>
                    </SocketProvider>
                </UserProvider>
            </body>
        </html>
    );
}
