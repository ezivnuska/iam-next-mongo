// app/lib/providers/poker/use-auto-restart.ts

'use client';

import { useEffect } from 'react';

interface Winner {
  winnerId: string;
  winnerName: string;
  handRank: string;
  isTie: boolean;
  tiedPlayers?: string[];
}

interface Player {
  id: string;
  username: string;
  [key: string]: any;
}

interface UseAutoRestartOptions {
  winner: Winner | undefined;
  onRestart: () => Promise<void>;
  setCountdown: (value: number | null) => void;
  duration?: number; // Duration in milliseconds (default 30000)
  currentUserId?: string; // Current user's ID - only this user triggers restart
  players: Player[]; // Current players in game
}

/**
 * Custom hook to handle auto-restart functionality when a game ends
 *
 * Features:
 * - Starts a countdown when a winner is determined
 * - Decrements countdown every second
 * - Only the winner's client triggers the restart (prevents concurrent requests)
 * - Cancels restart if winner leaves before countdown completes
 * - Cancels restart if fewer than 2 players remain in the game (server handles state)
 * - Cleans up timers on unmount or when winner changes
 *
 * @param options - Configuration options
 * @param options.winner - Current winner object (undefined if no winner)
 * @param options.onRestart - Async function to call when restarting
 * @param options.setCountdown - State setter for countdown value
 * @param options.duration - Duration in milliseconds before restart (default: 30000)
 * @param options.currentUserId - Current user's ID (only winner triggers restart)
 * @param options.players - Current players in game
 *
 * @example
 * ```tsx
 * useAutoRestart({
 *   winner,
 *   onRestart: restart,
 *   setCountdown: setRestartCountdown,
 *   duration: 30000, // 30 seconds
 *   currentUserId: user?.id,
 *   players,
 * });
 * ```
 */
export function useAutoRestart({
  winner,
  onRestart,
  setCountdown,
  currentUserId,
  players,
  duration = 30000,
}: UseAutoRestartOptions) {
  useEffect(() => {
    if (winner) {
      // Check if there are enough players to restart the game
      if (players.length < 2) {
        // Not enough players - cancel auto-restart (server handles state updates)
        setCountdown(null);
        return;
      }

      // Check if winner is still in the game (handle both single winner and tie)
      let winnerStillInGame: boolean;
      if (winner.isTie && winner.tiedPlayers) {
        // For ties, check if at least one tied player is still in the game
        winnerStillInGame = winner.tiedPlayers.some(username =>
          players.some(p => p.username === username)
        );
      } else {
        // For single winner, check if winner is still in the game
        winnerStillInGame = players.some(p => p.id === winner.winnerId);
      }

      if (!winnerStillInGame) {
        // Winner has left - cancel auto-restart
        setCountdown(null);
        return;
      }

      // Start countdown from duration in seconds
      const countdownSeconds = duration / 1000;
      let currentCountdown = countdownSeconds;
      setCountdown(currentCountdown);

      // Determine if current user should trigger restart
      // For ties: first tied player (alphabetically) triggers restart to avoid race conditions
      // For single winner: only the winner triggers restart
      // Special case: If winner is AI, first human player triggers restart
      let shouldTriggerRestart: boolean;

      // Check if winner is AI
      const winnerPlayer = players.find(p => p.id === winner.winnerId);
      const isAIWinner = winnerPlayer?.isAI === true;

      if (isAIWinner) {
        // AI won - first human player (alphabetically) triggers restart
        const humanPlayers = players.filter(p => !p.isAI);
        const sortedHumans = [...humanPlayers].sort((a, b) => a.username.localeCompare(b.username));
        const firstHuman = sortedHumans[0];
        shouldTriggerRestart = currentUserId === firstHuman?.id;
      } else if (winner.isTie && winner.tiedPlayers) {
        // Tie - first tied player (alphabetically) triggers restart
        const sortedTiedPlayers = [...winner.tiedPlayers].sort();
        const firstTiedPlayer = players.find(p => p.username === sortedTiedPlayers[0]);
        shouldTriggerRestart = currentUserId === firstTiedPlayer?.id;
      } else {
        // Human won - only the winner triggers restart
        shouldTriggerRestart = currentUserId === winner.winnerId;
      }

      // Countdown timer - decrement every second and check game state
      const countdownInterval = setInterval(() => {
        // Check if there are still enough players
        if (players.length < 2) {
          setCountdown(null);
          clearInterval(countdownInterval);
          return;
        }

        // Check if winner has left during countdown (handle both single winner and tie)
        let winnerStillPresent: boolean;
        if (winner.isTie && winner.tiedPlayers) {
          // For ties, check if at least one tied player is still present
          winnerStillPresent = winner.tiedPlayers.some(username =>
            players.some(p => p.username === username)
          );
        } else {
          // For single winner, check if winner is still present
          winnerStillPresent = players.some(p => p.id === winner.winnerId);
        }
        if (!winnerStillPresent) {
          setCountdown(null);
          clearInterval(countdownInterval);
          return;
        }

        currentCountdown -= 1;
        if (currentCountdown <= 0) {
          setCountdown(null);
          clearInterval(countdownInterval);
        } else {
          setCountdown(currentCountdown);
        }
      }, 1000);

      // Schedule auto-restart - ONLY on designated client to avoid race conditions
      let restartTimeout: NodeJS.Timeout | null = null;
      if (shouldTriggerRestart) {
        restartTimeout = setTimeout(async () => {
          // Double-check there are enough players and winner is still in game before restarting
          let shouldRestart = false;
          if (winner.isTie && winner.tiedPlayers) {
            // For ties, check if at least one tied player is still in the game
            shouldRestart = players.length >= 2 && winner.tiedPlayers.some(username =>
              players.some(p => p.username === username)
            );
          } else {
            // For single winner, check if winner is still in the game
            shouldRestart = players.length >= 2 && players.some(p => p.id === winner.winnerId);
          }

          if (shouldRestart) {
            setCountdown(null);
            await onRestart();
          } else {
            setCountdown(null);
          }
        }, duration);
      }

      // Cleanup timeouts on unmount or if winner changes
      return () => {
        if (restartTimeout) clearTimeout(restartTimeout);
        clearInterval(countdownInterval);
        setCountdown(null);
      };
    } else {
      // Clear countdown if no winner
      setCountdown(null);
    }
  }, [winner, onRestart, setCountdown, duration, currentUserId, players]);
}
