// app/ui/layout/page/default-page.tsx

'use client';

import { useState, Suspense, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useScreenOrientation } from '@/app/games/poker/lib/hooks/use-screen-orientation';
import { clsx } from 'clsx';
import Brand from '@/app/ui/header/brand';
import UserButton from '@/app/ui/header/user-button';
import NavLinkList from '@/app/ui/header/nav-link-list';
import AuthRedirectHandler from '@/app/ui/auth/auth-redirect-handler';

interface DefaultPageProps {
  children: React.ReactNode;
  headerClassName?: string;
  overlayClassName?: string;
}

export default function DefaultPage({
  children,
  headerClassName = 'bg-gray-900',
  overlayClassName = 'bg-gray-900',
}: DefaultPageProps) {
  const [isOpen, setIsOpen] = useState(false);
  const orientation = useScreenOrientation();
  const isPortrait = orientation === 'portrait';
  const pathname = usePathname();
  const wasOpenBeforeRouteChange = useRef(isOpen);

  // Update ref whenever isOpen changes (but before pathname effect runs)
  useEffect(() => {
    wasOpenBeforeRouteChange.current = isOpen;
  }, [isOpen]);

  // Only animate overlay on route change if overlay was closed before the change
  useEffect(() => {
    // If overlay was closed before route change, animate the transition
    if (!wasOpenBeforeRouteChange.current) {
      setIsOpen(false); // Overlay covers screen (100%)

      // Wait for opening animation (500ms) + minimal content load before closing
      const timer = setTimeout(() => {
        setIsOpen(true); // Overlay hides (0vh/0vw)
      }, 600);

      return () => clearTimeout(timer);
    }
    // If overlay was open before route change, keep it open (no animation)
  }, [pathname]);

  return (
    <div className={clsx(
      'w-full h-screen flex overflow-hidden',
      {
        'flex-col': isPortrait,
        'flex-row': !isPortrait,
      }
    )}>
      <Suspense fallback={null}>
        <AuthRedirectHandler />
      </Suspense>

      {/* Fixed Header */}
      <header
        className={clsx(
          headerClassName,
          'shrink-0 overflow-hidden'
        )}
        style={{
          ...(isPortrait
            ? { height: '10vh', width: '100%' }
            : { width: '20vw', height: '100%' }
          )
        }}
      >
        <div className="flex flex-row flex-wrap items-center justify-center p-2 gap-2 h-full">
          <Brand />
          <UserButton />

          {/* Toggle button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="px-4 py-2 rounded-lg bg-white text-black font-semibold shrink-0 hover:bg-gray-200 active:bg-gray-300 transition-colors"
          >
            {isOpen ? 'Close' : 'Open'}
          </button>
        </div>
      </header>

      {/* Main Content Area with Animated Overlay */}
      <main className="relative flex-1 overflow-hidden bg-amber-400">
        {/* Page Content */}
        <div className="absolute inset-0 w-full h-full overflow-auto p-2 bg-blue-300">
          {children}
        </div>

        {/* Animated Overlay */}
        <div
          className={clsx(
            overlayClassName,
            'absolute pointer-events-auto',
            'transition-all duration-500 ease-in-out',
            {
              // Portrait mode - overlay from bottom
              'left-0 right-0 bottom-0': isPortrait,

              // Landscape mode - overlay from right
              'top-0 bottom-0 right-0': !isPortrait,
            }
          )}
          style={{
            ...(isPortrait
              ? { height: isOpen ? '0vh' : '100%' }
              : { width: isOpen ? '0vw' : '100%' }
            )
          }}
        >
          <NavLinkList />
        </div>
      </main>
    </div>
  );
}
