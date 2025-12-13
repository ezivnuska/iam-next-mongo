// app/poker/lib/server/ai-player-manager.ts

import { PokerGame } from '@/app/games/poker/lib/models/poker-game';
import { PokerBalance } from '@/app/games/poker/lib/models/poker-balance';
import { makeAIDecision, AggressionLevel } from './ai-decision-engine';
import { getPotTotal } from '@/app/games/poker/lib/utils/poker';
import { POKER_GAME_CONFIG } from '@/app/games/poker/lib/config/poker-constants';
import type { Player } from '@/app/games/poker/lib/definitions/poker';

/**
 * AI Player configuration
 */
export const AI_PLAYER_CONFIG = {
  ID_PREFIX: 'ai-player-',
  DEFAULT_NAME: 'Computer',
  DEFAULT_AGGRESSION: AggressionLevel.BALANCED,
};

/**
 * Create an AI player
 */
export async function createAIPlayer(name?: string, aggression?: AggressionLevel): Promise<Player> {
  const aiId = `${AI_PLAYER_CONFIG.ID_PREFIX}${Date.now()}`;
  const aiName = name || `${AI_PLAYER_CONFIG.DEFAULT_NAME}`;

  // Create balance for AI player
  await PokerBalance.findOneAndUpdate(
    { userId: aiId },
    { chipCount: POKER_GAME_CONFIG.DEFAULT_STARTING_CHIPS },
    { upsert: true }
  );


  return {
    id: aiId,
    username: aiName,
    hand: [],
    chipCount: POKER_GAME_CONFIG.DEFAULT_STARTING_CHIPS,
    isAI: true,
    folded: false,
    isAllIn: false,
  };
}

/**
 * Add AI player to game
 */
export async function addAIPlayerToGame(gameId: string, name?: string): Promise<void> {
  const game = await PokerGame.findById(gameId);
  if (!game) {
    throw new Error('Game not found');
  }

  if (game.locked) {
    throw new Error('Cannot add AI to locked game');
  }

  // Check if AI already exists
  const hasAI = game.players.some((p: Player) => p.isAI);
  if (hasAI) {
    return;
  }

  const aiPlayer = await createAIPlayer(name);
  game.players.push(aiPlayer);
  game.markModified('players');
  await game.save();

}

// checkAndExecuteAITurn removed - no longer needed with unified timer system
// Use executeAIActionIfReady instead (timer already started by caller)

/**
 * Execute AI action if it's the AI player's turn (timer already started)
 * This is called after a timer has been started for an AI player
 */
export async function executeAIActionIfReady(gameId: string): Promise<void> {
  const game = await PokerGame.findById(gameId);
  if (!game) return;

  const currentPlayer = game.players[game.currentPlayerIndex];
  if (!currentPlayer || !currentPlayer.isAI) return;

  // Only act if game is locked and not processing
  if (!game.locked || game.processing) return;

  // Check if AI player is folded or all-in
  if (currentPlayer.folded || currentPlayer.isAllIn) return;


  // Execute AI action immediately (timer was already started by caller)
  await executeAIAction(gameId);
}

/**
 * Execute AI player action
 */
async function executeAIAction(gameId: string): Promise<void> {
  try {
    const game = await PokerGame.findById(gameId);
    if (!game) return;

    const currentPlayer = game.players[game.currentPlayerIndex];
    if (!currentPlayer || !currentPlayer.isAI) return;

    // Check if AI is still current player (game might have advanced)
    if (currentPlayer.folded || currentPlayer.isAllIn) return;

    // Emit "thinking" notification to show AI is processing
    const { PokerSocketEmitter } = await import('@/app/lib/utils/socket-helper');
    await PokerSocketEmitter.emitNotification({
      notificationType: 'player_thinking',
      category: 'action',
      playerId: currentPlayer.id,
      playerName: currentPlayer.username,
      isAI: true,
    });


    // Wait for thinking notification to display before making decision
    const { POKER_TIMERS } = await import('../../config/poker-constants');
    await new Promise(resolve => setTimeout(resolve, POKER_TIMERS.PLAYER_ACTION_NOTIFICATION_DURATION_MS));

    // Re-fetch game to ensure we have latest state after delay
    const freshGame = await PokerGame.findById(gameId);
    if (!freshGame || !freshGame.locked) {
      return;
    }

    // Calculate current game state
    const potSize = getPotTotal(freshGame.pot);
    const playerBet = freshGame.playerBets[freshGame.currentPlayerIndex] || 0;

    // Find the highest bet to determine currentBet
    const maxBet = Math.max(...freshGame.playerBets);
    const currentBet = maxBet - playerBet;

    // Get AI decision
    const decision = makeAIDecision(
      currentPlayer,
      freshGame.communalCards,
      currentBet,
      potSize,
      playerBet,
      freshGame.stage,
      AI_PLAYER_CONFIG.DEFAULT_AGGRESSION
    );


    // Execute the actual action using game controllers
    // The controllers will emit notifications and clear timers automatically
    const { placeBet: placeBetController, fold: foldController } = await import('../actions/poker-game-controller');

    let result;

    switch (decision.action) {
      case 'fold':
        result = await foldController(gameId, currentPlayer.id);
        break;

      case 'check':
        // Check means bet 0, but only if no bet to call
        if (currentBet > 0) {
          console.warn(`[AI Manager] AI tried to check with bet to call, calling instead`);
          result = await placeBetController(gameId, currentPlayer.id, currentBet);
        } else {
          result = await placeBetController(gameId, currentPlayer.id, 0);
        }
        break;

      case 'call':
        result = await placeBetController(gameId, currentPlayer.id, currentBet);
        break;

      case 'bet':
      case 'raise':
        result = await placeBetController(gameId, currentPlayer.id, decision.amount);
        break;

      case 'all-in':
        result = await placeBetController(gameId, currentPlayer.id, currentPlayer.chipCount);
        break;
    }

    // Socket events and notifications are emitted by the controllers
  } catch (error) {
    console.error('[AI Manager] Error executing AI action:', error);
  }
}

/**
 * Check if game needs AI player and add one
 */
export async function ensureAIPlayerInGame(gameId: string): Promise<void> {
  const game = await PokerGame.findById(gameId);
  if (!game) return;

  // Only add AI if game has less than 2 players and not locked
  if (game.players.length >= 2 || game.locked) return;

  const hasAI = game.players.some((p: Player) => p.isAI);
  if (!hasAI) {
    await addAIPlayerToGame(gameId);
  }
}

/**
 * Count human (non-AI) players in the game
 */
function countHumanPlayers(players: Player[]): number {
  return players.filter(p => !p.isAI).length;
}

/**
 * Automatically manage AI player based on human player count
 * - Adds AI if less than 2 total players
 * - Removes AI if 2+ human players are present
 */
export async function autoManageAIPlayer(gameId: string): Promise<void> {
  const game = await PokerGame.findById(gameId);
  if (!game) return;

  // Don't modify AI during an active game
  if (game.locked) {
    return;
  }

  const humanCount = countHumanPlayers(game.players);
  const hasAI = game.players.some((p: Player) => p.isAI);


  // If we have 2+ human players and AI exists, remove AI
  if (humanCount >= 2 && hasAI) {
    await removeAIPlayerFromGame(gameId);
  }
  // If we have less than 2 total players and no AI, add AI
  else if (game.players.length < 2 && !hasAI) {
    await addAIPlayerToGame(gameId);
  }
}

/**
 * Remove AI player from game
 */
export async function removeAIPlayerFromGame(gameId: string): Promise<void> {
  const game = await PokerGame.findById(gameId);
  if (!game) return;

  if (game.locked) {
    return;
  }

  const aiIndex = game.players.findIndex((p: Player) => p.isAI);
  if (aiIndex === -1) return;

  const aiPlayer = game.players[aiIndex];
  game.players.splice(aiIndex, 1);
  game.markModified('players');
  await game.save();

}
