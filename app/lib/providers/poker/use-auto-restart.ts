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
        // console.log('WINNER STILL IN GAME')
      // Check if winner is still in the game
      const winnerStillInGame = players.some(p => p.id === winner.winnerId);

      if (!winnerStillInGame) {
        // Winner has left - cancel auto-restart
        console.log('[Auto-restart] Winner has left the game - auto-restart cancelled');
        setCountdown(null);
        return;
      }

      // Start countdown from duration in seconds
      const countdownSeconds = duration / 1000;
      let currentCountdown = countdownSeconds;
      setCountdown(currentCountdown);

      const isWinner = currentUserId === winner.winnerId;
      console.log(`[Auto-restart] ${isWinner ? 'This client (winner) will trigger' : 'This client will wait for'} restart in ${countdownSeconds} seconds`);

      // Countdown timer - decrement every second and check if winner is still in game
      const countdownInterval = setInterval(() => {
        // Check if winner has left during countdown
        const winnerStillPresent = players.some(p => p.id === winner.winnerId);
        if (!winnerStillPresent) {
          console.log('[Auto-restart] Winner left during countdown - cancelling restart');
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
          // Double-check winner is still in game before restarting
          const stillInGame = players.some(p => p.id === winner.winnerId);
          if (stillInGame) {
            console.log('[Auto-restart] Winner client triggering restart...');
            setCountdown(null);
            await onRestart();
          } else {
            console.log('[Auto-restart] Winner left before restart could trigger');
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
