// app/lib/server/poker/game-lock-manager.ts

import { PokerGame } from '@/app/lib/models/poker-game';
import type { Player } from '@/app/lib/definitions/poker';
import { GameActionType } from '@/app/lib/definitions/game-actions';
import { initializeBets } from '@/app/lib/utils/betting-helpers';
import { ActionHistoryType } from '@/app/lib/definitions/action-history';
import { randomBytes } from 'crypto';
import { withRetry } from '@/app/lib/utils/retry';
import { POKER_RETRY_CONFIG, POKER_TIMERS } from '@/app/lib/config/poker-constants';
import { acquireGameLock, releaseGameLock } from './game-lock-utils';
import { logGameStartedAction } from '@/app/lib/utils/action-history-helpers';
import { placeAutomaticBlinds } from './blinds-manager';
import { startActionTimer } from './poker-timer-controller';

// Store timeout references for cancellation
const lockTimers = new Map<string, NodeJS.Timeout>();

/**
 * Initialize game when it's locked (2+ players ready to play)
 * Uses distributed locking to prevent race conditions with manual "Start Now" clicks
 */
async function initializeGameAtLock(gameId: string): Promise<void> {
  try {
    await withRetry(async () => {
      // ATOMIC LOCK ACQUISITION
      const gameToLock = await acquireGameLock(gameId);

      try {
        // Check if game is already locked - if so, operation already succeeded (idempotent)
        if (gameToLock.locked) {
          gameToLock.processing = false;
          await gameToLock.save();
          return;
        }

        gameToLock.locked = true;
        gameToLock.lockTime = undefined; // Clear lock time since we're locking now
        gameToLock.stage = 0; // Preflop
        gameToLock.playerBets = initializeBets(gameToLock.players.length);
        gameToLock.currentPlayerIndex = 0;

        // Add action history for game start
        logGameStartedAction(gameToLock);

        // Place automatic blind bets
        // Small blind (1 chip) for player 0, big blind (2 chips) for player 1
        const blindInfo = placeAutomaticBlinds(gameToLock);

        // Players start with empty hands - cards will be dealt after first blind betting round

        // Release lock before save
        gameToLock.processing = false;
        await gameToLock.save();

        // Emit granular game locked event to all clients
        const { PokerSocketEmitter } = await import('@/app/lib/utils/socket-helper');
        const gameState = gameToLock.toObject();
        await PokerSocketEmitter.emitGameLocked({
          locked: true,
          stage: gameToLock.stage,
          players: gameToLock.players,
          currentPlayerIndex: gameToLock.currentPlayerIndex,
          lockTime: undefined, // Cleared
          pot: gameToLock.pot, // Include pot with blinds
          playerBets: gameToLock.playerBets, // Include player bets with blinds
          actionHistory: gameToLock.actionHistory, // Include action history with blind bets
        });

        // Emit blind notifications with delays
        await PokerSocketEmitter.emitGameNotification({
          message: `${blindInfo.smallBlindPlayer.username} posts small blind (${blindInfo.smallBlind} chip)`,
          type: 'blind',
          duration: 2000,
        });

        await new Promise(resolve => setTimeout(resolve, 2200));

        await PokerSocketEmitter.emitGameNotification({
          message: `${blindInfo.bigBlindPlayer.username} posts big blind (${blindInfo.bigBlind} chips)`,
          type: 'blind',
          duration: 2000,
        });

        await new Promise(resolve => setTimeout(resolve, 2200));

        // Auto-start action timer for the current player (after blinds)
        const currentPlayer = gameToLock.players[gameToLock.currentPlayerIndex];
        if (currentPlayer) {
          await startActionTimer(
            gameId,
            POKER_TIMERS.ACTION_DURATION_SECONDS,
            GameActionType.PLAYER_BET,
            currentPlayer.id
          );
        }
      } catch (error) {
        // Release lock on error
        await releaseGameLock(gameId);
        throw error;
      }
    }, POKER_RETRY_CONFIG);
  } catch (error) {
    console.error('[Auto Lock] Error auto-locking game:', error);
  }
}

/**
 * Schedule auto-lock when second player joins
 * Game will lock after 10 seconds to allow more players to join
 */
export function scheduleGameLock(gameId: string, lockTime: Date): void {
  // Cancel any existing timer for this game
  cancelGameLock(gameId);

  const delay = lockTime.getTime() - Date.now();

  const timeoutId = setTimeout(async () => {
    lockTimers.delete(gameId); // Clean up reference after execution
    await initializeGameAtLock(gameId);
  }, delay);

  // Store timeout reference for cancellation
  lockTimers.set(gameId, timeoutId);
}

/**
 * Cancel a scheduled game lock
 * Called when a player leaves and player count drops below 2
 */
export function cancelGameLock(gameId: string): void {
  const timeoutId = lockTimers.get(gameId);
  if (timeoutId) {
    clearTimeout(timeoutId);
    lockTimers.delete(gameId);
  }
}

/**
 * Check if game should start lock timer (2 players joined)
 */
export function shouldStartLockTimer(playerCount: number, hasLockTime: boolean): boolean {
  return playerCount === 2 && !hasLockTime;
}
