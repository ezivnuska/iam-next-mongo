// app/poker/lib/server/ai-player-manager.ts

import { PokerGame } from '@/app/poker/lib/models/poker-game';
import { PokerBalance } from '@/app/poker/lib/models/poker-balance';
import { makeAIDecision, AggressionLevel } from './ai-decision-engine';
import { getPotTotal } from '@/app/poker/lib/utils/poker';
import { POKER_GAME_CONFIG } from '@/app/poker/lib/config/poker-constants';
import type { Player } from '@/app/poker/lib/definitions/poker';

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
//   const aiName = name || `${AI_PLAYER_CONFIG.DEFAULT_NAME} ${Math.floor(Math.random() * 100)}`;
  const aiName = name || `${AI_PLAYER_CONFIG.DEFAULT_NAME}`;

  // Create balance for AI player
  await PokerBalance.findOneAndUpdate(
    { userId: aiId },
    { chipCount: POKER_GAME_CONFIG.DEFAULT_STARTING_CHIPS },
    { upsert: true }
  );

  console.log(`[AI Manager] Created AI player: ${aiName} (${aiId})`);

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
    console.log('[AI Manager] AI player already exists in game');
    return;
  }

  const aiPlayer = await createAIPlayer(name);
  game.players.push(aiPlayer);
  game.markModified('players');
  await game.save();

  console.log(`[AI Manager] Added AI player ${aiPlayer.username} to game ${gameId}`);
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

  console.log(`[AI Manager] Executing AI action for ${currentPlayer.username} (timer already started)`);

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

    // Timer already started in checkAndExecuteAITurn
    // Now the AI makes its decision immediately

    // Calculate current game state
    const potSize = getPotTotal(game.pot);
    const playerBet = game.playerBets[game.currentPlayerIndex] || 0;

    // Find the highest bet to determine currentBet
    const maxBet = Math.max(...game.playerBets);
    const currentBet = maxBet - playerBet;

    // Get AI decision
    const decision = makeAIDecision(
      currentPlayer,
      game.communalCards,
      currentBet,
      potSize,
      playerBet,
      game.stage,
      AI_PLAYER_CONFIG.DEFAULT_AGGRESSION
    );

    console.log(`[AI Manager] AI decision:`, decision);

    // Execute the actual action using game controllers
    // The controllers will emit notifications and clear timers automatically
    const { placeBet: placeBetController, fold: foldController } = await import('./poker-game-controller');

    let result;

    switch (decision.action) {
      case 'fold':
        result = await foldController(gameId, currentPlayer.id);
        console.log(`[AI Manager] AI folded`);
        break;

      case 'check':
        // Check means bet 0, but only if no bet to call
        if (currentBet > 0) {
          console.warn(`[AI Manager] AI tried to check with bet to call, calling instead`);
          result = await placeBetController(gameId, currentPlayer.id, currentBet);
        } else {
          result = await placeBetController(gameId, currentPlayer.id, 0);
          console.log(`[AI Manager] AI checked`);
        }
        break;

      case 'call':
        result = await placeBetController(gameId, currentPlayer.id, currentBet);
        console.log(`[AI Manager] AI called ${currentBet}`);
        break;

      case 'bet':
      case 'raise':
        result = await placeBetController(gameId, currentPlayer.id, decision.amount);
        console.log(`[AI Manager] AI ${decision.action} ${decision.amount}`);
        break;

      case 'all-in':
        result = await placeBetController(gameId, currentPlayer.id, currentPlayer.chipCount);
        console.log(`[AI Manager] AI went all-in with ${currentPlayer.chipCount}`);
        break;
    }

    // Socket events and notifications are emitted by the controllers
    console.log(`[AI Manager] AI action executed successfully`);
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
    console.log('[AI Manager] Cannot modify AI during active game');
    return;
  }

  const humanCount = countHumanPlayers(game.players);
  const hasAI = game.players.some((p: Player) => p.isAI);

  console.log(`[AI Manager] Auto-managing AI: ${humanCount} human players, hasAI: ${hasAI}`);

  // If we have 2+ human players and AI exists, remove AI
  if (humanCount >= 2 && hasAI) {
    console.log('[AI Manager] Removing AI - sufficient human players');
    await removeAIPlayerFromGame(gameId);
  }
  // If we have less than 2 total players and no AI, add AI
  else if (game.players.length < 2 && !hasAI) {
    console.log('[AI Manager] Adding AI - insufficient players');
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
    console.log('[AI Manager] Cannot remove AI from locked game');
    return;
  }

  const aiIndex = game.players.findIndex((p: Player) => p.isAI);
  if (aiIndex === -1) return;

  const aiPlayer = game.players[aiIndex];
  game.players.splice(aiIndex, 1);
  game.markModified('players');
  await game.save();

  console.log(`[AI Manager] Removed AI player ${aiPlayer.username} from game`);
}
