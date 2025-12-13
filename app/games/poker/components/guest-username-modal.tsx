// app/poker/components/guest-username-modal.tsx

'use client';

import { useState } from 'react';
import Modal from '@/app/ui/modal';
import { Button } from '@/app/ui/button';
import { validateGuestUsername } from '@/app/games/poker/lib/definitions/validation';

interface GuestUsernameModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (username: string) => void;
  isGameLocked: boolean;
}

/**
 * Modal for guest users to enter their username before joining a poker game
 * If the game is locked, informs the user they'll be queued
 */
export default function GuestUsernameModal({
  isOpen,
  onClose,
  onSubmit,
  isGameLocked,
}: GuestUsernameModalProps) {
  const [guestUsername, setGuestUsername] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = () => {
    // Validate username using shared validation function
    const validation = validateGuestUsername(guestUsername);

    if (!validation.valid) {
      setError(validation.error || 'Invalid username');
      return;
    }

    // Clear error and submit
    setError('');
    onSubmit(guestUsername.trim());

    // Reset form
    setGuestUsername('');
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  };

  const handleClose = () => {
    setGuestUsername('');
    setError('');
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      contentClassName='relative w-full max-w-sm rounded-lg bg-green-900 p-6 shadow-lg border-2 border-green-600'
    >
      <div className='flex flex-col gap-4'>
        {/* Header */}
        <div className='flex flex-row items-center justify-between'>
          <h2 className='text-xl font-semibold text-white'>
            {isGameLocked ? 'Join Queue' : 'Join Game'}
          </h2>
          <button
            className='text-white hover:text-green-300 text-2xl leading-none cursor-pointer'
            onClick={handleClose}
            aria-label='Close'
          >
            ✕
          </button>
        </div>

        {/* Message */}
        {isGameLocked && (
          <p className='text-sm text-green-200'>
            Game is currently in progress. You'll be added to the queue and join when the current round ends.
          </p>
        )}

        {/* Username Input */}
        <div className='flex flex-col gap-2'>
          <label htmlFor='guest-username' className='text-sm font-medium text-white'>
            Choose your username
          </label>
          <input
            id='guest-username'
            type='text'
            value={guestUsername}
            onChange={(e) => {
              setGuestUsername(e.target.value);
              setError(''); // Clear error on input
            }}
            onKeyDown={handleKeyPress}
            placeholder='Enter username'
            className='px-3 py-2 rounded-lg bg-white text-green-950 placeholder-green-950/50 border-2 border-green-700 focus:outline-none focus:border-green-400'
            maxLength={20}
            autoFocus
          />
          {error && (
            <p className='text-red-400 text-xs'>{error}</p>
          )}
        </div>

        {/* Action Buttons */}
        <div className='flex flex-row gap-2 justify-end'>
          <Button
            size='sm'
            onClick={handleClose}
            className='bg-gray-600 hover:bg-gray-700 text-white'
            variant='ghost'
          >
            Cancel
          </Button>
          <Button
            size='sm'
            onClick={handleSubmit}
            className='bg-green-600 hover:bg-green-500 text-white'
            disabled={!guestUsername.trim()}
          >
            {isGameLocked ? 'Join Queue' : 'Join Game'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
