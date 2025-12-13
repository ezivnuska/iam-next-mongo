// app/ui/layout/page/new-page.tsx

'use client';

import SplitPanel from '@/app/ui/split-panel';
import { Suspense } from "react";
import AuthRedirectHandler from '../../auth/auth-redirect-handler';

interface NewPageProps {
  children: React.ReactNode;
}

export default function NewPage({ children }: NewPageProps) {
  return (
    <div className="relative w-full h-screen overflow-hidden">
        <Suspense fallback={null}>
            <AuthRedirectHandler />
        </Suspense>
      {/* Page Content - renders behind the split panel */}
      <div className="absolute inset-0 w-full h-full overflow-auto">
        <main className="w-full h-full">
          {children}
        </main>
      </div>

      {/* Split Panel Overlay */}
      <SplitPanel />
    </div>
  );
}
