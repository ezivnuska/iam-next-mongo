// app/poker/components/empty-player-slot.tsx

'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import clsx from 'clsx';
import type { PlayerOrientation } from '@/app/poker/lib/definitions/poker';
import { useUser } from '@/app/lib/providers/user-provider';
import GuestUsernameModal from './guest-username-modal';

interface EmptyPlayerSlotProps {
  orientation: PlayerOrientation;
  gameId: string | null;
  isGameLocked: boolean;
  onJoinGame: (gameId: string, guestUsername?: string) => void;
  isClickable?: boolean;
}

/**
 * Get flex direction classes based on orientation
 * Maps orientation to Tailwind flex classes
 */
function getOrientationClasses(orientation: PlayerOrientation): string {
  const orientationMap = {
    'ltr': 'flex-row',
    'rtl': 'flex-row-reverse',
    'ttb': 'flex-col',
    'btt': 'flex-col-reverse',
  };

  return orientationMap[orientation];
}

/**
 * Empty player slot placeholder component
 * Clickable to join the game - shows modal for guest users
 */
export default function EmptyPlayerSlot({ orientation, gameId, isGameLocked, onJoinGame, isClickable = true }: EmptyPlayerSlotProps) {
  const { user, status } = useUser();
  const [showGuestModal, setShowGuestModal] = useState(false);
  const orientationClasses = getOrientationClasses(orientation);

  const isAuthenticated = status === 'authenticated';

  const handleClick = () => {
    if (!isClickable) return;
    if (!gameId) return;

    if (isAuthenticated) {
      // Authenticated user: Join immediately
      onJoinGame(gameId);
    } else {
      // Guest user: Show modal to enter username
      setShowGuestModal(true);
    }
  };

  const handleGuestSubmit = (username: string) => {
    if (gameId) {
      onJoinGame(gameId, username);
      setShowGuestModal(false);
    }
  };

  return (
    <>
      <button
        onClick={handleClick}
        disabled={!isClickable}
        className={clsx(
          'flex h-full w-full items-center justify-center gap-2 transition-opacity focus:outline-none',
          orientationClasses,
          {
            'cursor-pointer hover:opacity-100': isClickable,
            'cursor-default opacity-50': !isClickable,
          }
        )}
        aria-label={isClickable ? 'Join game' : 'Player slot'}
      >
        <div className='flex flex-col items-center justify-center gap-1'>
          {/* Empty avatar circle with dashed border */}
          <div className='rounded-full border-2 border-dashed border-green-400/25 w-[28px] h-[28px] flex items-center justify-center bg-gray-800/30'>
            {isClickable && <span className='text-white text-lg font-bold'>+</span>}
          </div>

          {/* Empty slot label */}
          {isClickable && <span className='text-xs text-white'>Join</span>}
        </div>
      </button>

      {/* Guest Username Modal - Rendered via Portal to avoid transform issues */}
      {showGuestModal && typeof document !== 'undefined' && createPortal(
        <GuestUsernameModal
          isOpen={showGuestModal}
          onClose={() => setShowGuestModal(false)}
          onSubmit={handleGuestSubmit}
          isGameLocked={isGameLocked}
        />,
        document.body
      )}
    </>
  );
}
