// app/lib/server/poker/singleton-game.ts

import { PokerGame } from '@/app/games/poker/lib/models/poker-game';
import { initializeDeck } from '../flow/poker-dealer';
import { GameStage } from '@/app/games/poker/lib/definitions/poker';

/**
 * Get or create the persistent singleton poker game
 * The singleton game is identified by code "MAIN"
 * This game is never deleted, only reset when empty
 */
export async function getOrCreateSingletonGame() {
  const SINGLETON_CODE = 'MAIN';

  // Try to find existing singleton game
  let game = await PokerGame.findOne({ code: SINGLETON_CODE });

  // Create if it doesn't exist
  if (!game) {
    try {
      const deck = initializeDeck();

      game = await PokerGame.create({
        code: SINGLETON_CODE,
        deck,
        communalCards: [],
        pot: [],
        players: [],
        stage: Number(GameStage.Preflop),
        locked: false,
        currentPlayerIndex: 0,
        playerBets: [],
      });

      // Add AI player to new singleton game
      try {
        const { addAIPlayerToGame } = await import('../ai/ai-player-manager');
        await addAIPlayerToGame(game._id.toString());
        // Refresh game to get updated player list
        game = await PokerGame.findById(game._id);
        if (!game) {
          throw new Error('Failed to refresh game after adding AI');
        }
      } catch (aiError) {
        console.error('[Singleton] Error adding initial AI player:', aiError);
        // Don't fail game creation if AI add fails
      }
    } catch (error: any) {
      // Handle race condition: another request created the game between our check and create
      if (error.code === 11000) {
        game = await PokerGame.findOne({ code: SINGLETON_CODE });
        if (!game) {
          throw new Error('Failed to fetch singleton game after duplicate key error');
        }
      } else {
        throw error;
      }
    }
  }

  return game;
}

/**
 * Reset the singleton game to initial state
 * Called when all players leave
 */
export async function resetSingletonGame(gameId: string) {
  const game = await PokerGame.findById(gameId);
  if (!game) throw new Error('Singleton game not found');

  // Clear all server-side timers before resetting
  try {
    const { clearActionTimer } = await import('../timers/poker-timer-controller');
    await clearActionTimer(gameId);
  } catch (timerError) {
    console.error('[ResetSingleton] Failed to clear action timer:', timerError);
    // Continue with reset even if timer clear fails
  }

  // Cancel notification queue and any active notifications
  try {
    const { clearQueue } = await import('../notifications/notification-queue-manager');
    clearQueue(gameId);
  } catch (queueError) {
    console.error('[ResetSingleton] Failed to clear notification queue:', queueError);
    // Continue with reset even if queue clear fails
  }

  // Cancel game lock timer
  try {
    const { cancelGameLock } = await import('../locking/game-lock-manager');
    cancelGameLock(gameId);
  } catch (lockError) {
    console.error('[ResetSingleton] Failed to cancel game lock timer:', lockError);
    // Continue with reset even if lock cancel fails
  }

  // Reset all game state
  game.deck = initializeDeck();
  game.communalCards = [];
  game.pot = [];
  game.pots = [];
  game.players = [];
  game.stage = Number(GameStage.Preflop);
  game.locked = false;
  game.lockTime = undefined;
  game.queuedPlayers = [];
  game.currentPlayerIndex = 0;
  game.playerBets = [];
  game.stages = [];
  game.actionHistory = [];
  game.winner = undefined;
  game.actionTimer = undefined;

  await game.save();

  // Add AI player to reset game
  try {
    const { addAIPlayerToGame } = await import('../ai/ai-player-manager');
    await addAIPlayerToGame(gameId);
    // Refresh game to get updated player list
    const refreshedGame = await PokerGame.findById(gameId);
    return refreshedGame || game;
  } catch (aiError) {
    console.error('[Singleton] Error adding AI player after reset:', aiError);
    // Don't fail reset if AI add fails
    return game;
  }
}
