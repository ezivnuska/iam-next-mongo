// app/lib/server/poker/game-lock-manager.ts

import { PokerGame } from '@/app/poker/lib/models/poker-game';
import type { Player } from '@/app/poker/lib/definitions/poker';
import { GameActionType } from '@/app/poker/lib/definitions/game-actions';
import { initializeBets } from '@/app/poker/lib/utils/betting-helpers';
import { ActionHistoryType } from '@/app/poker/lib/definitions/action-history';
import { randomBytes } from 'crypto';
import { withRetry } from '@/app/lib/utils/retry';
import { POKER_RETRY_CONFIG, POKER_TIMERS } from '@/app/poker/lib/config/poker-constants';
import { acquireGameLock, releaseGameLock } from './game-lock-utils';
import { logGameStartedAction } from '@/app/poker/lib/utils/action-history-helpers';
import { placeSmallBlind, placeBigBlind } from './blinds-manager';
import { startActionTimer } from './poker-timer-controller';
import { dealPlayerCards } from './poker-dealer';

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

        // Initialize dealer button position if not set (first hand starts at position 0)
        if (gameToLock.dealerButtonPosition === undefined) {
          gameToLock.dealerButtonPosition = 0;
          gameToLock.markModified('dealerButtonPosition');
        }

        // Add action history for game start
        logGameStartedAction(gameToLock);

        // Players start with empty hands - cards will be dealt after first blind betting round

        // Release lock before save
        gameToLock.processing = false;
        await gameToLock.save();

        // Validate players have enough chips before placing blinds
        const { PokerSocketEmitter } = await import('@/app/lib/utils/socket-helper');
        const { getBlindConfig } = await import('./blinds-manager');
        const { smallBlind, bigBlind } = getBlindConfig();

        // Calculate which players will post blinds based on button position
        const buttonPosition = gameToLock.dealerButtonPosition || 0;
        const smallBlindPos = gameToLock.players.length === 2 ? buttonPosition : (buttonPosition + 1) % gameToLock.players.length;
        const bigBlindPos = (buttonPosition + 1) % gameToLock.players.length;

        const smallBlindPlayerChips = gameToLock.players[smallBlindPos]?.chips?.length || 0;
        const bigBlindPlayerChips = gameToLock.players[bigBlindPos]?.chips?.length || 0;

        if (smallBlindPlayerChips < smallBlind || bigBlindPlayerChips < bigBlind) {
          // At least one player doesn't have enough chips - can't lock
          console.error(`[Auto Lock] Insufficient chips - SB Player ${smallBlindPos}: ${smallBlindPlayerChips}/${smallBlind}, BB Player ${bigBlindPos}: ${bigBlindPlayerChips}/${bigBlind}`);

          // Unlock game and release lock
          gameToLock.locked = false;
          gameToLock.processing = false;
          await gameToLock.save();

          throw new Error(`Cannot start game - players do not have enough chips for blinds`);
        }

        // Emit granular game locked event to all clients
        await PokerSocketEmitter.emitGameLocked({
          locked: true,
          stage: gameToLock.stage,
          players: gameToLock.players,
          currentPlayerIndex: gameToLock.currentPlayerIndex,
          lockTime: undefined, // Cleared
          pot: gameToLock.pot,
          playerBets: gameToLock.playerBets,
          actionHistory: gameToLock.actionHistory,
        });

        // PLACE SMALL BLIND with notification
        const smallBlindInfo = placeSmallBlind(gameToLock);
        await gameToLock.save();

        // Emit bet placed event for small blind
        await PokerSocketEmitter.emitBetPlaced({
          playerIndex: smallBlindInfo.position,
          chipCount: smallBlindInfo.amount,
          pot: gameToLock.pot,
          playerBets: gameToLock.playerBets,
          currentPlayerIndex: gameToLock.currentPlayerIndex,
          actionHistory: gameToLock.actionHistory,
          players: gameToLock.players, // Include players for all-in status updates
        });

        await PokerSocketEmitter.emitGameNotification({
          message: `${smallBlindInfo.player.username} posts small blind (${smallBlindInfo.amount} chip)`,
          type: 'blind',
          duration: 2000,
        });

        await new Promise(resolve => setTimeout(resolve, 2200));

        // PLACE BIG BLIND with notification
        const bigBlindInfo = placeBigBlind(gameToLock);
        await gameToLock.save();

        // Emit bet placed event for big blind
        await PokerSocketEmitter.emitBetPlaced({
          playerIndex: bigBlindInfo.position,
          chipCount: bigBlindInfo.amount,
          pot: gameToLock.pot,
          playerBets: gameToLock.playerBets,
          currentPlayerIndex: gameToLock.currentPlayerIndex,
          actionHistory: gameToLock.actionHistory,
          players: gameToLock.players, // Include players for all-in status updates
        });

        await PokerSocketEmitter.emitGameNotification({
          message: `${bigBlindInfo.player.username} posts big blind (${bigBlindInfo.amount} chips)`,
          type: 'blind',
          duration: 2000,
        });

        await new Promise(resolve => setTimeout(resolve, 2200));

        // DEAL HOLE CARDS immediately after blinds (standard poker rules)
        dealPlayerCards(gameToLock.deck, gameToLock.players, 2);
        gameToLock.markModified('deck');
        gameToLock.markModified('players');

        // Add action history for dealing hole cards
        const { randomBytes } = await import('crypto');
        const { ActionHistoryType } = await import('@/app/poker/lib/definitions/action-history');
        gameToLock.actionHistory.push({
          id: randomBytes(8).toString('hex'),
          timestamp: new Date(),
          stage: 0, // Preflop
          actionType: ActionHistoryType.CARDS_DEALT,
          cardsDealt: 2,
        });
        gameToLock.markModified('actionHistory');

        await gameToLock.save();

        // Emit notification for dealing player cards
        await PokerSocketEmitter.emitGameNotification({
          message: 'Dealing player cards',
          type: 'deal',
          duration: 2000,
        });

        // Emit cards dealt event
        await PokerSocketEmitter.emitCardsDealt({
          stage: gameToLock.stage,
          communalCards: gameToLock.communalCards,
          deckCount: gameToLock.deck.length,
          players: gameToLock.players,
        });

        // Auto-start action timer for the current player (after blinds and cards dealt)
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
