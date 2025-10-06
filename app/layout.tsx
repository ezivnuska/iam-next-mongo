// app/layout.tsx

import '@/app/ui/global.css';
import { inter } from '@/app/ui/fonts';
import Header from './ui/header';
import { auth } from "@/app/api/auth/[...nextauth]/route";
import { UserProvider } from "@/app/lib/providers/user-provider";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
    const session = await auth();
    return (
        <html lang="en">
            <body className={`${inter.className} antialiased flex min-h-full flex-col`}>
                <UserProvider initialUser={session?.user ?? null}>
                    <Header />
                    {children}
                </UserProvider>
            </body>
        </html>
    );
}
