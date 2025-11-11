// app/lib/providers/poker/poker-api-actions.ts

import type { PokerStateUpdatePayload } from '@/app/lib/socket/events';

// ============= API Action Functions =============

export const createRestartAction = (
  gameId: string | null,
  updateGameState: (state: PokerStateUpdatePayload) => void
) => {
  return async () => {
    if (!gameId) return;
    try {
      const response = await fetch('/api/poker/restart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.gameState) {
          // Immediately update local state with response
          // This ensures the client who initiated restart sees updates immediately
          updateGameState(data.gameState);
        }
      } else {
        console.error('Failed to restart game');
      }
    } catch (error) {
      console.error('Error restarting game:', error);
    }
  };
};

export const fetchCurrentGame = async () => {
  try {
    const response = await fetch('/api/poker/current');
    if (response.ok) {
      const data = await response.json();
      return data.game || null;
    }
  } catch (error) {
    console.error('Error fetching current game:', error);
  }
  return null;
};

// NOTE: createAndJoinGameAction removed - using singleton game pattern instead

export const createJoinGameAction = (
  setGameId: (id: string) => void,
  socket: any,
  username?: string
) => {
  return async (gameId: string) => {
    try {
      if (!socket || !socket.connected) {
        console.error('[Join Game] Socket not connected');
        alert('Connection error. Please refresh the page.');
        return;
      }

      setGameId(gameId);

      // Emit socket event to join game
      socket.emit('poker:join_game', { gameId, username });

      // Listen for success/error responses (one-time listeners)
      const successHandler = (data: any) => {
        console.log('[Join Game] Successfully joined game via socket');
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

export const createPlaceBetAction = (gameId: string | null) => {
  return async (chipCount: number = 1) => {
    if (!gameId) return;
    try {
      const response = await fetch('/api/poker/bet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId, chipCount }),
      });
      if (!response.ok) console.error('Failed to place bet');
    } catch (error) {
      console.error('Error placing bet:', error);
    }
  };
};

export const createFoldAction = (gameId: string | null) => {
  return async () => {
    if (!gameId) return;
    try {
      const response = await fetch('/api/poker/fold', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId }),
      });
      if (!response.ok) console.error('Failed to fold');
    } catch (error) {
      console.error('Error folding:', error);
    }
  };
};

export const createLeaveGameAction = (
  gameId: string | null,
  resetGameState: () => void,
  setAvailableGames: React.Dispatch<React.SetStateAction<Array<{ id: string; code: string; creatorId: string | null }>>>
) => {
  return async () => {
    if (!gameId) {
      return;
    }
    try {
      const response = await fetch('/api/poker/leave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId }),
      });
      if (response.ok) {
        const data = await response.json();

        // If game was deleted (no players left), reset state and return to lobby
        if (data.gameState?.deleted) {
          resetGameState();
          setAvailableGames(prev => prev.filter(g => g.id !== gameId));
        }
      } else {
        console.error('Failed to leave game');
      }
    } catch (error) {
      console.error('Error leaving game:', error);
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

export const createStartTimerAction = (gameId: string | null) => {
  return async () => {
    if (!gameId) return;
    try {
      await fetch('/api/poker/timer/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId }),
      });
    } catch (error) {
      console.error('Error starting timer:', error);
    }
  };
};

export const createPauseTimerAction = (gameId: string | null) => {
  return async () => {
    if (!gameId) return;
    try {
      await fetch('/api/poker/timer/pause', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId }),
      });
    } catch (error) {
      console.error('Error pausing timer:', error);
    }
  };
};

export const createResumeTimerAction = (gameId: string | null) => {
  return async () => {
    if (!gameId) return;
    try {
      await fetch('/api/poker/timer/resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId }),
      });
    } catch (error) {
      console.error('Error resuming timer:', error);
    }
  };
};

export const createClearTimerAction = (gameId: string | null) => {
  return async () => {
    if (!gameId) return;
    try {
      await fetch('/api/poker/timer/clear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId }),
      });
    } catch (error) {
      console.error('Error clearing timer:', error);
    }
  };
};

export const createSetTurnTimerAction = (gameId: string | null) => {
  return async (action: 'fold' | 'call' | 'check' | 'bet' | 'raise', betAmount?: number) => {
    if (!gameId) return;
    try {
      await fetch('/api/poker/timer/set-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId, action, betAmount }),
      });
    } catch (error) {
      console.error('Error setting turn timer action:', error);
    }
  };
};

export const createForceLockGameAction = (gameId: string | null) => {
  return async () => {
    if (!gameId) return;
    try {
      const response = await fetch('/api/poker/lock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId }),
      });
      if (!response.ok) console.error('Failed to force lock game');
    } catch (error) {
      console.error('Error force locking game:', error);
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
          console.log('[ResetSingleton] Game reset successfully');
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
      console.error('Failed to load singleton game');
    }
  } catch (error) {
    console.error('Error initializing singleton game:', error);
  }
};
