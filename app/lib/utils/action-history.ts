// app/lib/utils/action-history.ts

import { PokerGame } from '@/app/lib/models/poker-game';
import { ActionHistoryType, type GameActionHistory } from '@/app/lib/definitions/action-history';
import { randomBytes } from 'crypto';

/**
 * Log a player joining the game
 */
export async function logPlayerJoined(
  gameId: string,
  playerId: string,
  playerName: string,
  currentStage: number = -1 // -1 for pre-game
): Promise<void> {
  const game = await PokerGame.findById(gameId);
  if (!game) return;

  const action: GameActionHistory = {
    id: randomBytes(8).toString('hex'),
    timestamp: new Date(),
    stage: currentStage,
    actionType: ActionHistoryType.PLAYER_JOINED,
    playerId,
    playerName,
  };

  game.actionHistory.push(action);
  game.markModified('actionHistory');
  await game.save();
}

/**
 * Log a player leaving the game
 */
export async function logPlayerLeft(
  gameId: string,
  playerId: string,
  playerName: string,
  currentStage: number
): Promise<void> {
  const game = await PokerGame.findById(gameId);
  if (!game) return;

  const action: GameActionHistory = {
    id: randomBytes(8).toString('hex'),
    timestamp: new Date(),
    stage: currentStage,
    actionType: ActionHistoryType.PLAYER_LEFT,
    playerId,
    playerName,
  };

  game.actionHistory.push(action);
  game.markModified('actionHistory');
  await game.save();
}

/**
 * Log a player betting or raising
 */
export async function logPlayerBet(
  gameId: string,
  playerId: string,
  playerName: string,
  chipAmount: number,
  currentStage: number
): Promise<void> {
  const game = await PokerGame.findById(gameId);
  if (!game) return;

  const action: GameActionHistory = {
    id: randomBytes(8).toString('hex'),
    timestamp: new Date(),
    stage: currentStage,
    actionType: ActionHistoryType.PLAYER_BET,
    playerId,
    playerName,
    chipAmount,
  };

  game.actionHistory.push(action);
  game.markModified('actionHistory');
  await game.save();
}

/**
 * Log a player folding
 */
export async function logPlayerFold(
  gameId: string,
  playerId: string,
  playerName: string,
  currentStage: number
): Promise<void> {
  const game = await PokerGame.findById(gameId);
  if (!game) return;

  const action: GameActionHistory = {
    id: randomBytes(8).toString('hex'),
    timestamp: new Date(),
    stage: currentStage,
    actionType: ActionHistoryType.PLAYER_FOLD,
    playerId,
    playerName,
  };

  game.actionHistory.push(action);
  game.markModified('actionHistory');
  await game.save();
}

/**
 * Log community cards being dealt
 */
export async function logCardsDealt(
  gameId: string,
  cardsDealt: number,
  currentStage: number
): Promise<void> {
  const game = await PokerGame.findById(gameId);
  if (!game) return;

  const action: GameActionHistory = {
    id: randomBytes(8).toString('hex'),
    timestamp: new Date(),
    stage: currentStage,
    actionType: ActionHistoryType.CARDS_DEALT,
    cardsDealt,
  };

  game.actionHistory.push(action);
  game.markModified('actionHistory');
  await game.save();
}

/**
 * Log game stage advancement
 */
export async function logStageAdvanced(
  gameId: string,
  fromStage: number,
  toStage: number
): Promise<void> {
  const game = await PokerGame.findById(gameId);
  if (!game) return;

  const action: GameActionHistory = {
    id: randomBytes(8).toString('hex'),
    timestamp: new Date(),
    stage: toStage,
    actionType: ActionHistoryType.STAGE_ADVANCED,
    fromStage,
    toStage,
  };

  game.actionHistory.push(action);
  game.markModified('actionHistory');
  await game.save();
}

/**
 * Log game starting (when locked)
 */
export async function logGameStarted(
  gameId: string
): Promise<void> {
  const game = await PokerGame.findById(gameId);
  if (!game) return;

  const action: GameActionHistory = {
    id: randomBytes(8).toString('hex'),
    timestamp: new Date(),
    stage: 0, // Preflop
    actionType: ActionHistoryType.GAME_STARTED,
  };

  game.actionHistory.push(action);
  game.markModified('actionHistory');
  await game.save();
}

/**
 * Log game ending (winner determined)
 */
export async function logGameEnded(
  gameId: string,
  winnerId: string,
  winnerName: string,
  currentStage: number
): Promise<void> {
  const game = await PokerGame.findById(gameId);
  if (!game) return;

  const action: GameActionHistory = {
    id: randomBytes(8).toString('hex'),
    timestamp: new Date(),
    stage: currentStage,
    actionType: ActionHistoryType.GAME_ENDED,
    winnerId,
    winnerName,
  };

  game.actionHistory.push(action);
  game.markModified('actionHistory');
  await game.save();
}
