// app/layout.tsx

import '@/app/ui/global.css';
import { ubuntu } from '@/app/ui/fonts';
import Header from '@/app/ui/header/header';
import { auth } from "@/app/lib/auth";
import { UserProvider } from "@/app/lib/providers/user-provider";
import { SocketProvider } from './lib/providers/socket-provider';

export default async function RootLayout({ children }: { children: React.ReactNode }) {
    const session = await auth();
    return (
        <html lang="en">
            <body className={`${ubuntu.className} antialiased flex min-h-full flex-col`}>
                <UserProvider initialUser={session?.user ?? null}>
                    <SocketProvider>
                        <Header />
                        {children}
                    </SocketProvider>
                </UserProvider>
            </body>
        </html>
    );
}
