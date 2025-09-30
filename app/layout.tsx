// app/layout.tsx

import '@/app/ui/global.css';
import { inter } from '@/app/ui/fonts';
import { Metadata } from 'next';
import Header from './ui/header';
import { Providers } from "./providers";
// import { getServerSession } from "next-auth/next";
import { auth } from "./api/auth/[...nextauth]/route";
 
export const metadata: Metadata = {
  title: {
    template: '%s | iameric',
    default: 'iameric',
  },
  description: 'iameric',
  metadataBase: new URL('https://iameric.me'),
};


export default async function RootLayout({ children }: { children: React.ReactNode }) {
    const session = await auth();
  
    return (
      <html lang="en" className="h-dvh">
        <body className={`${inter.className} antialiased flex min-h-full flex-col`}>
          <Providers session={session}>
            <Header />
            {children}
        </Providers>
      </body>
    </html>
  );
}
