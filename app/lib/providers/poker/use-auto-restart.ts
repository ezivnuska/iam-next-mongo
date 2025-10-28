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

      // Check if winner is still in the game
      const winnerStillInGame = players.some(p => p.id === winner.winnerId);

      if (!winnerStillInGame) {
        // Winner has left - cancel auto-restart
        setCountdown(null);
        return;
      }

      // Start countdown from duration in seconds
      const countdownSeconds = duration / 1000;
      let currentCountdown = countdownSeconds;
      setCountdown(currentCountdown);

      const isWinner = currentUserId === winner.winnerId;

      // Countdown timer - decrement every second and check game state
      const countdownInterval = setInterval(() => {
        // Check if there are still enough players
        if (players.length < 2) {
          setCountdown(null);
          clearInterval(countdownInterval);
          return;
        }

        // Check if winner has left during countdown
        const winnerStillPresent = players.some(p => p.id === winner.winnerId);
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

      // Schedule auto-restart - ONLY on winner's client
      let restartTimeout: NodeJS.Timeout | null = null;
      if (isWinner) {
        restartTimeout = setTimeout(async () => {
          // Double-check there are enough players and winner is still in game before restarting
          if (players.length >= 2 && players.some(p => p.id === winner.winnerId)) {
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
