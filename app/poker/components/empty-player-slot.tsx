// app/poker/components/empty-player-slot.tsx

'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import clsx from 'clsx';
import type { PlayerOrientation } from '@/app/poker/lib/definitions/poker';
import { useUser, createGuestUser } from '@/app/lib/providers/user-provider';
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
  const { user, status, setUser } = useUser();
  const [showGuestModal, setShowGuestModal] = useState(false);
  const orientationClasses = getOrientationClasses(orientation);

  const isAuthenticated = status === 'authenticated' || status === 'signing-out';

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

  const handleGuestSubmit = async (username: string) => {
    if (gameId) {
      // Create guest user object with the provided username
      const guestUser = createGuestUser();
      guestUser.username = username;

      // Store guest ID, username, and creation timestamp in localStorage for reconnection handling
      // Credentials expire after 30 days for privacy
      try {
        localStorage.setItem('poker_guest_id', guestUser.id);
        localStorage.setItem('poker_guest_username', username);
        localStorage.setItem('poker_guest_created_at', new Date().toISOString());
      } catch (e) {
        console.warn('[EmptySlot] Failed to store guest credentials in localStorage:', e);
      }

      // Set the guest user in context so the poker game can use it
      setUser(guestUser);

      // Wait briefly for socket registration to complete
      await new Promise(resolve => setTimeout(resolve, 100));

      // Join the game as a guest
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
          'flex h-full w-full items-center justify-center gap-2 transition-opacity focus:outline-none bg-green-400/25 border-2 border-dashed border-yellow-300/50 rounded-full',
          orientationClasses,
          {
            'cursor-pointer hover:opacity-100': isClickable,
            'cursor-default opacity-50': !isClickable,
          }
        )}
        aria-label={isClickable ? 'Join game' : 'Player slot'}
      >
        {isClickable && (
            <div className='flex flex-col items-center justify-center gap-1'>
                {/* Empty avatar circle with dashed border */}
                <div className='rounded-full border-green-400/25 w-[28px] h-[28px] flex items-center justify-center bg-gray-800/30'>
                    <span className='text-white text-lg font-bold'>+</span>
                </div>

                {/* Empty slot label */}
                {isClickable && <span className='text-xs text-white'>Join</span>}
            </div>
        )}
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
