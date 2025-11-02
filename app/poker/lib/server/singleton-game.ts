// app/lib/server/poker/singleton-game.ts

import { PokerGame } from '@/app/poker/lib/models/poker-game';
import { initializeDeck } from './poker-dealer';
import { GameStage } from '@/app/poker/lib/definitions/poker';

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

  // Reset all game state
  game.deck = initializeDeck();
  game.communalCards = [];
  game.pot = [];
  game.players = [];
  game.stage = Number(GameStage.Preflop);
  game.locked = false;
  game.lockTime = undefined;
  game.currentPlayerIndex = 0;
  game.playerBets = [];
  game.stages = [];
  game.actionHistory = [];
  game.winner = undefined;
  game.actionTimer = undefined;

  await game.save();
  return game;
}
