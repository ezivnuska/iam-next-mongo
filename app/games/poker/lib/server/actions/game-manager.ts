// app/games/poker/lib/server/actions/game-manager.ts
// Simple game CRUD operations

import { PokerGame } from '@/app/games/poker/lib/models/poker-game';
import { GameStage } from '@/app/games/poker/lib/definitions/poker';
import { initializeDeck } from '../flow/poker-dealer';
import { randomBytes } from 'crypto';

/**
 * Get a game by ID
 */
export async function getGame(gameId: string) {
  return await PokerGame.findById(gameId);
}

/**
 * Get the current game for a user
 */
export async function getUserCurrentGame(userId: string) {
  const game = await PokerGame.findOne({
    'players.id': userId
  });

  return game ? game.toObject() : null;
}

/**
 * Create a new poker game
 */
export async function createGame() {
  const deck = initializeDeck();
  const code = randomBytes(3).toString('hex').toUpperCase();

  const game = await PokerGame.create({
    code,
    deck,
    communalCards: [],
    pot: [],
    players: [],
    stage: Number(GameStage.Preflop), // Ensure it's stored as number 0 (Preflop stage)
    currentPlayerIndex: 0,
    playerBets: [],
  });

  return game.toObject();
}

/**
 * Delete a game by ID
 */
export async function deleteGame(gameId: string) {
  const result = await PokerGame.findByIdAndDelete(gameId);
  if (!result) throw new Error('Game not found');
  return { success: true };
}
