// app/ui/split-panel.tsx

'use client';

import { useState } from 'react';
import { useScreenOrientation } from '@/app/games/poker/lib/hooks/use-screen-orientation';
import { clsx } from 'clsx';
import Nav from './header/nav';
import Brand from './header/brand';
import UserButton from './header/user-button';
import NavLinkList from './header/nav-link-list';

interface SplitPanelProps {
  defaultOpen?: boolean;
  panelClassName?: string;
  buttonClassName?: string;
}

export default function SplitPanel({
  defaultOpen = false,
  panelClassName = 'bg-gray-900',
  buttonClassName,
}: SplitPanelProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const orientation = useScreenOrientation();

  const isPortrait = orientation === 'portrait';

  return (
    <div className="fixed inset-0 z-50 pointer-events-none">
      {/* First Panel (Top/Left) */}
      <div
        className={clsx(
          panelClassName,
          'absolute pointer-events-auto overflow-hidden',
          {
            // Portrait mode - horizontal split
            'left-0 right-0 top-0': isPortrait,

            // Landscape mode - vertical split
            'top-0 bottom-0 left-0': !isPortrait,
          }
        )}
        style={{
          ...(isPortrait
            ? { height: '10vh' }
            : { width: '20vw' }
          )
        }}
      >
        {/* Content container */}
        <div className={clsx(
          'flex flex-row flex-wrap items-center justify-center p-2 gap-2',
        //   {
        //     'flex-row flex-wrap': isPortrait, // Wrap horizontally in portrait as needed
        //     'flex-row flex-wrap': !isPortrait, // Wrap horizontally in landscape as needed
        //   }
        )}>
          <Brand />
          {/* <Nav /> */}
          <UserButton />

          {/* Toggle button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className={clsx(
              'px-4 py-2 rounded-lg bg-white text-black font-semibold shrink-0',
              'hover:bg-gray-200 active:bg-gray-300 transition-colors',
              buttonClassName
            )}
          >
            {isOpen ? 'Close' : 'Open'}
          </button>
        </div>
      </div>

      {/* Second Panel (Bottom/Right) */}
      <div
        className={clsx(
          panelClassName,
          'absolute pointer-events-auto',
          'transition-all duration-500 ease-in-out',
          {
            // Portrait mode - horizontal split
            'left-0 right-0 bottom-0': isPortrait,

            // Landscape mode - vertical split
            'top-0 bottom-0 right-0': !isPortrait,
          }
        )}
        style={{
          ...(isPortrait
            ? { height: isOpen ? '10vh' : 'calc(100vh - 10vh)' }
            : { width: isOpen ? '0vw' : 'calc(100vw - 20vw)' }
          )
        }}
      >
         <NavLinkList />
      </div>
    </div>
  );
}
