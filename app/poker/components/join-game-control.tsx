// app/poker/components/join-game-control.tsx

'use client';

import { useState } from 'react';
import { useUser } from '@/app/lib/providers/user-provider';
import { Button } from '@/app/ui/button';
import { validateGuestUsername } from '@/app/poker/lib/definitions/validation';

interface JoinGameControlProps {
  gameId: string | null;
  onJoinGame: (gameId: string, guestUsername?: string) => void;
}

/**
 * Conditionally renders game join controls based on authentication status:
 * - Authenticated users: "Start a New Game!" button
 * - Guest users: Username input + "Play" button
 */
export default function JoinGameControl({ gameId, onJoinGame }: JoinGameControlProps) {
  const { user, status } = useUser();
  const [guestUsername, setGuestUsername] = useState('');
  const [error, setError] = useState('');

  const isAuthenticated = status === 'authenticated';

  const handleGuestJoin = () => {
    // Validate username using shared validation function
    const validation = validateGuestUsername(guestUsername);

    if (!validation.valid) {
      setError(validation.error || 'Invalid username');
      return;
    }

    // Clear error and join game
    setError('');
    if (gameId) {
      onJoinGame(gameId, guestUsername.trim());
    }
  };

  const handleAuthenticatedJoin = () => {
    if (gameId) {
      onJoinGame(gameId);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleGuestJoin();
    }
  };

  if (isAuthenticated) {
    // Authenticated user: Show simple join button
    return (
      <Button
        size='md'
        onClick={handleAuthenticatedJoin}
        className='text-md text-white rounded-full bg-green-950 w-full mx-0.5 hover:bg-green-400 hover:text-green-950'
        variant='ghost'
      >
        Start a New Game!
      </Button>
    );
  }

  // Guest user: Show username input + play button
  return (
    <div className='flex flex-col gap-2 w-full px-2'>
      <div className='flex flex-row gap-2 items-center w-full'>
        <input
          type='text'
          value={guestUsername}
          onChange={(e) => {
            setGuestUsername(e.target.value);
            setError(''); // Clear error on input
          }}
          onKeyDown={handleKeyPress}
          placeholder='player name'
          className='flex-1 px-3 py-1 rounded-full bg-white text-green-950 placeholder-green-950/50 border border-green-800 focus:outline-none focus:border-green-400 text-md'
          maxLength={20}
        />
        <Button
          size='sm'
          onClick={handleGuestJoin}
          className='text-md text-white rounded-full bg-green-600 hover:bg-green-400 hover:text-green-950 px-6'
          disabled={!guestUsername.length}
        >
          Play
        </Button>
      </div>
      {error && (
        <p className='text-red-400 text-xs text-center'>{error}</p>
      )}
    </div>
  );
}
