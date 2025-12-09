// app/lib/providers/poker/poker-api-actions.ts

import type { PokerStateUpdatePayload } from '@/app/lib/socket/events';

// ============= API Action Functions =============

// NOTE: fetchCurrentGame removed - redundant with singleton pattern
// NOTE: createAndJoinGameAction removed - using singleton game pattern instead

export const createJoinGameAction = (
  setGameId: (id: string) => void,
  socket: any,
  username?: string,
  setUser?: (user: any) => void
) => {
  return async (gameId: string, guestUsername?: string) => {
    try {
      if (!socket || !socket.connected) {
        console.error('[Join Game] Socket not connected');
        alert('Connection error. Please refresh the page.');
        return;
      }

      setGameId(gameId);

      // Use provided guest username if available, otherwise fall back to user's username
      const usernameToSend = guestUsername || username;

      // Emit socket event to join game
      socket.emit('poker:join_game', { gameId, username: usernameToSend });

      // Listen for success/error responses (one-time listeners)
      const successHandler = (data: any) => {
        socket.off('poker:join_error', errorHandler);
      };

      const errorHandler = (data: any) => {
        const errorMessage = data.error || 'Failed to join game';

        // Check if error is about game being locked
        if (errorMessage.includes('locked')) {
          console.warn('[Join Game] Game is currently locked (in progress). Please wait for the current round to finish.');
          alert('Game is currently in progress. Please wait for the current round to finish and try again.');
        } else {
          console.error('[Join Game]', errorMessage);
          alert(`Failed to join game: ${errorMessage}`);
        }

        // Clear the gameId since join failed
        setGameId('');
        socket.off('poker:join_success', successHandler);
      };

      socket.once('poker:join_success', successHandler);
      socket.once('poker:join_error', errorHandler);

    } catch (error) {
      console.error('Error joining game:', error);
      alert('Error joining game. Please try again.');
      // Clear the gameId since join failed
      setGameId('');
    }
  };
};

export const createPlaceBetAction = (gameId: string | null, socket: any) => {
  return async (chipCount: number = 1) => {
    if (!gameId || !socket || !socket.connected) {
      console.error('[Place Bet] Invalid state - gameId:', gameId, 'socket connected:', socket?.connected);
      return;
    }

    try {
      // Emit socket event to place bet
      socket.emit('poker:bet', { gameId, chipCount });

      // Listen for success/error responses (one-time listeners)
      const successHandler = () => {
        socket.off('poker:bet_error', errorHandler);
      };

      const errorHandler = (data: any) => {
        const errorMessage = data.error || 'Failed to place bet';
        console.error('[Place Bet]', errorMessage);
        alert(`Failed to place bet: ${errorMessage}`);
        socket.off('poker:bet_success', successHandler);
      };

      socket.once('poker:bet_success', successHandler);
      socket.once('poker:bet_error', errorHandler);
    } catch (error) {
      console.error('Error placing bet:', error);
      alert('Error placing bet. Please try again.');
    }
  };
};

export const createFoldAction = (gameId: string | null, socket: any) => {
  return async () => {
    if (!gameId || !socket || !socket.connected) {
      console.error('[Fold] Invalid state - gameId:', gameId, 'socket connected:', socket?.connected);
      return;
    }

    try {
      // Emit socket event to fold
      socket.emit('poker:fold', { gameId });

      // Listen for success/error responses (one-time listeners)
      const successHandler = () => {
        socket.off('poker:fold_error', errorHandler);
      };

      const errorHandler = (data: any) => {
        const errorMessage = data.error || 'Failed to fold';
        console.error('[Fold]', errorMessage);
        alert(`Failed to fold: ${errorMessage}`);
        socket.off('poker:fold_success', successHandler);
      };

      socket.once('poker:fold_success', successHandler);
      socket.once('poker:fold_error', errorHandler);
    } catch (error) {
      console.error('Error folding:', error);
      alert('Error folding. Please try again.');
    }
  };
};

export const createLeaveGameAction = (
  gameId: string | null,
  resetGameState: () => void,
  setAvailableGames: React.Dispatch<React.SetStateAction<Array<{ id: string; code: string; creatorId: string | null }>>>,
  socket: any,
  user: any
) => {
  return async () => {
    if (!gameId || !socket || !socket.connected) {
      console.error('[Leave Game] Invalid state - gameId:', gameId, 'socket connected:', socket?.connected);
      return;
    }

    try {
      // Emit socket event to leave game
      socket.emit('poker:leave_game', { gameId });

      // Listen for success/error responses (one-time listeners)
      const successHandler = (data: any) => {
        // Clear guest credentials when guest explicitly leaves game
        if (user?.isGuest) {
          try {
            localStorage.removeItem('poker_guest_id');
            localStorage.removeItem('poker_guest_username');
            localStorage.removeItem('poker_guest_created_at');
          } catch (e) {
            console.warn('Failed to clear guest credentials:', e);
          }
        }

        // If game was deleted (no players left), reset state and return to lobby
        if (data.gameState?.deleted) {
          resetGameState();
          setAvailableGames(prev => prev.filter(g => g.id !== gameId));
        }
        // Note: Don't reset local state here - socket events (POKER_PLAYER_LEFT, POKER_STATE_UPDATE)
        // will update the state properly without causing visual flicker

        socket.off('poker:leave_error', errorHandler);
      };

      const errorHandler = (data: any) => {
        const errorMessage = data.error || 'Failed to leave game';
        console.error('[Leave Game]', errorMessage);
        alert(`Failed to leave game: ${errorMessage}`);
        socket.off('poker:leave_success', successHandler);
      };

      socket.once('poker:leave_success', successHandler);
      socket.once('poker:leave_error', errorHandler);

    } catch (error) {
      console.error('Error leaving game:', error);
      alert('Error leaving game. Please try again.');
    }
  };
};

export const createDeleteGameAction = (
  setAvailableGames: React.Dispatch<React.SetStateAction<Array<{ id: string; code: string; creatorId: string | null }>>>
) => {
  return async (gameIdToDelete: string) => {
    try {
      const response = await fetch('/api/poker/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId: gameIdToDelete }),
      });
      if (response.ok) {
        // Remove game from available games list
        setAvailableGames(prev => prev.filter(g => g.id !== gameIdToDelete));
      } else {
        console.error('Failed to delete game from lobby');
      }
    } catch (error) {
      console.error('Error deleting game from lobby:', error);
    }
  };
};

export const createSetTurnTimerAction = (gameId: string | null, socket: any) => {
  return async (timerAction: 'fold' | 'call' | 'check' | 'bet' | 'raise', betAmount?: number) => {
    if (!gameId || !socket || !socket.connected) {
      console.error('[Timer] Invalid state - gameId:', gameId, 'socket connected:', socket?.connected);
      return;
    }

    try {
      // Emit socket event to set timer action
      socket.emit('poker:set_timer_action', { gameId, timerAction, betAmount });

      // Listen for success/error responses (one-time listeners)
      const successHandler = () => {
        socket.off('poker:timer_error', errorHandler);
      };

      const errorHandler = (data: any) => {
        const errorMessage = data.error || 'Failed to set timer action';
        console.error('[Timer]', errorMessage);
        socket.off('poker:timer_success', successHandler);
      };

      socket.once('poker:timer_success', successHandler);
      socket.once('poker:timer_error', errorHandler);
    } catch (error) {
      console.error('Error setting turn timer action:', error);
    }
  };
};

export const createSetPresenceAction = (gameId: string | null, socket: any) => {
  return async (isAway: boolean) => {
    if (!gameId || !socket || !socket.connected) {
      console.error('[Presence] Invalid state - gameId:', gameId, 'socket connected:', socket?.connected);
      return;
    }

    try {
      // Emit socket event to set presence
      socket.emit('poker:set_presence', { gameId, isAway });
    } catch (error) {
      console.error('Error setting presence:', error);
    }
  };
};

export const createResetSingletonAction = (
  gameId: string | null,
  updateGameState: (state: PokerStateUpdatePayload) => void
) => {
  return async () => {
    if (!gameId) return;

    // Confirm with user before resetting
    const confirmed = confirm(
      'Are you sure you want to reset the game? This will:\n' +
      '• Remove all players\n' +
      '• Reset all game state\n' +
      '• Add a new AI player\n\n' +
      'This action cannot be undone.'
    );

    if (!confirmed) return;

    try {
      const response = await fetch('/api/poker/reset-singleton', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.gameState) {
          // Immediately update local state with response
          updateGameState(data.gameState);
        }
      } else {
        const errorData = await response.json();
        console.error('Failed to reset game:', errorData.error);
        alert(`Failed to reset game: ${errorData.error}`);
      }
    } catch (error) {
      console.error('Error resetting game:', error);
      alert('Error resetting game. Please try again.');
    }
  };
};

export const initializeGames = async (
  setAvailableGames: React.Dispatch<React.SetStateAction<Array<{ id: string; code: string; creatorId: string | null }>>>,
  setGameId: (id: string) => void,
  updateGameState: (state: PokerStateUpdatePayload) => void
) => {
  try {
    // Fetch the singleton game (creates if doesn't exist)
    const response = await fetch('/api/poker/singleton');

    if (response.ok) {
      const data = await response.json();
      if (data.game) {
        setGameId(data.game._id);
        updateGameState(data.game);

        // Set available games to show the singleton in any lobby UI
        setAvailableGames([{
          id: data.game._id,
          code: 'MAIN',
          creatorId: null,
        }]);
      }
    } else {
      const errorData = await response.json().catch(() => ({}));
      console.error('Failed to load singleton game:', errorData);
      console.error('Status:', response.status, response.statusText);
    }
  } catch (error) {
    console.error('Error initializing singleton game:', error);
  }
};
