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
  setGameId: (id: string) => void
) => {
  return async (gameId: string) => {
    try {
      setGameId(gameId);
      const response = await fetch('/api/poker/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId }),
      });
      if (!response.ok) console.error('Failed to join game');
    } catch (error) {
      console.error('Error joining game:', error);
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
  return async (action: 'fold' | 'call' | 'check' | 'bet' | 'raise') => {
    if (!gameId) return;
    try {
      await fetch('/api/poker/timer/set-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId, action }),
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
