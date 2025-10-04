// app/layout.tsx

import '@/app/ui/global.css';
import { inter } from '@/app/ui/fonts';
import Header from './ui/header';
import { Providers } from './providers';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.className} antialiased flex min-h-full flex-col`}>
        <Providers>
          <Header />
          {children}
        </Providers>
      </body>
    </html>
  );
}
