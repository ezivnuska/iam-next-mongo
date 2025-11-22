// app/poker/lib/server/step-manager.ts

/**
 * Step Manager - Controls game flow advancement through stages and steps
 *
 * Responsibilities:
 * - Track current step in database
 * - Validate step completion requirements
 * - Advance to next step when requirements met
 * - Handle early completion (skip to winner)
 * - Execute step actions
 */

import { PokerGame } from '../../models/poker-game';
import {
  getStepDefinition,
  getCurrentStep,
  getNextStep,
  isLastStepInStage,
  StepType,
  RequirementType,
  type GameStep
} from './step-definitions';
import { queueCardsDealtNotification } from '../notifications/notification-queue-manager';
import { POKER_TIMERS } from '../../config/poker-constants';

/**
 * Initialize step tracking for a new game
 */
export async function initializeStepTracking(gameId: string): Promise<void> {
  const game = await PokerGame.findById(gameId);
  if (!game) throw new Error('Game not found');

  // Start at Stage 0, Step 1 (Pre-Flop stage notification)
  game.currentStep = {
    stageNumber: 0,
    stepNumber: 1,
    stepId: 'stage_0_step_1',
    startedAt: new Date(),
    completedRequirements: []
  };

  await game.save();
  console.log('[StepManager] Initialized step tracking:', game.currentStep);
}

/**
 * Mark a requirement as complete for the current step
 */
export async function completeRequirement(
  gameId: string,
  requirementType: RequirementType
): Promise<boolean> {
  const game = await PokerGame.findById(gameId);
  if (!game || !game.currentStep) {
    console.error('[StepManager] Cannot complete requirement - no current step');
    return false;
  }

  // Add requirement to completed list if not already there
  if (!game.currentStep.completedRequirements.includes(requirementType)) {
    game.currentStep.completedRequirements.push(requirementType);
    game.markModified('currentStep');
    await game.save();
    console.log(`[StepManager] Completed requirement: ${requirementType}`);
  }

  // Check if all requirements are met
  const step = getCurrentStep(game.currentStep.stageNumber, game.currentStep.stepNumber);
  if (!step) return false;

  const allRequirementsMet = step.requirements.every(req =>
    game.currentStep!.completedRequirements.includes(req.type)
  );

  return allRequirementsMet;
}

/**
 * Advance to the next step in the game flow
 */
export async function advanceToNextStep(gameId: string): Promise<{
  advanced: boolean;
  nextStep?: GameStep;
  stageChanged: boolean;
}> {
  const game = await PokerGame.findById(gameId);
  if (!game || !game.currentStep) {
    console.error('[StepManager] Cannot advance - no current step');
    return { advanced: false, stageChanged: false };
  }

  const currentStageNumber = game.currentStep.stageNumber;
  const currentStepNumber = game.currentStep.stepNumber;

  // Get next step
  const nextStepInfo = getNextStep(currentStageNumber, currentStepNumber);
  if (!nextStepInfo) {
    console.log('[StepManager] No more steps - game complete');
    return { advanced: false, stageChanged: false };
  }

  const stageChanged = nextStepInfo.stage !== currentStageNumber;

  // Update game step
  game.currentStep = {
    stageNumber: nextStepInfo.stage,
    stepNumber: nextStepInfo.step,
    stepId: nextStepInfo.stepId,
    startedAt: new Date(),
    completedRequirements: []
  };

  // Update game.stage if stage changed
  if (stageChanged) {
    game.stage = nextStepInfo.stage;
    console.log(`[StepManager] Stage changed: ${currentStageNumber} → ${nextStepInfo.stage}`);
  }

  game.markModified('currentStep');
  await game.save();

  const nextStep = getStepDefinition(nextStepInfo.stepId);
  console.log(`[StepManager] Advanced to step ${nextStepInfo.stage}.${nextStepInfo.step}: ${nextStep?.description}`);

  return {
    advanced: true,
    nextStep,
    stageChanged
  };
}

/**
 * Check if the current step's requirements are all met
 */
export async function areRequirementsMet(gameId: string): Promise<boolean> {
  const game = await PokerGame.findById(gameId);
  if (!game || !game.currentStep) return false;

  const step = getCurrentStep(game.currentStep.stageNumber, game.currentStep.stepNumber);
  if (!step) return false;

  return step.requirements.every(req =>
    game.currentStep!.completedRequirements.includes(req.type)
  );
}

/**
 * Get the current step definition
 */
export async function getCurrentStepInfo(gameId: string): Promise<GameStep | null> {
  const game = await PokerGame.findById(gameId);
  if (!game || !game.currentStep) return null;

  return getCurrentStep(game.currentStep.stageNumber, game.currentStep.stepNumber) || null;
}

/**
 * Check if only one player remains (for early completion)
 * Returns true only when all other players have FOLDED (not just all-in)
 * All-in players are still in the hand and should go to showdown
 */
export async function checkEarlyCompletion(gameId: string): Promise<boolean> {
  const game = await PokerGame.findById(gameId);
  if (!game) return false;

  // Count players who haven't folded (includes all-in players)
  const playersInHand = game.players.filter((p: any) => !p.folded);

  // Early completion only if exactly one player remains (everyone else folded)
  if (playersInHand.length === 1) {
    console.log(`[StepManager] Early completion: only ${playersInHand[0].username} remains (all others folded)`);
    return true;
  }

  return false;
}

/**
 * Skip to winner determination (early completion)
 * Called when all players except one have folded
 */
export async function skipToWinner(gameId: string): Promise<void> {
  const game = await PokerGame.findById(gameId);
  if (!game) throw new Error('Game not found');

  console.log('[StepManager] Early completion detected - skipping to winner');

  // Jump directly to Stage 4 (Showdown), Step 1 (Stage notification)
  game.currentStep = {
    stageNumber: 4,
    stepNumber: 1,
    stepId: 'stage_4_step_1',
    startedAt: new Date(),
    completedRequirements: []
  };

  game.stage = 4; // Showdown
  game.markModified('currentStep');
  await game.save();

  console.log('[StepManager] Jumped to Showdown stage for winner determination');
}

/**
 * Execute the action for a specific step type
 * Returns duration to wait before advancing (ms)
 */
export async function executeStepAction(
  gameId: string,
  stepType: StepType
): Promise<number> {
  console.log(`[StepManager] Executing step action: ${stepType}`);

  switch (stepType) {
    case StepType.STAGE_NOTIFICATION:
      return await executeStageNotification(gameId);

    case StepType.POST_SMALL_BLIND:
      return await executePostSmallBlind(gameId);

    case StepType.POST_BIG_BLIND:
      return await executePostBigBlind(gameId);

    case StepType.DEAL_HOLE_CARDS:
      return await executeDealHoleCards(gameId);

    case StepType.DEAL_FLOP:
      return await executeDealFlop(gameId);

    case StepType.DEAL_TURN:
      return await executeDealTurn(gameId);

    case StepType.DEAL_RIVER:
      return await executeDealRiver(gameId);

    case StepType.BETTING_CYCLE:
      return await executeBettingCycle(gameId);

    case StepType.DETERMINE_WINNER:
      return await executeDetermineWinner(gameId);

    case StepType.RESET_GAME:
      return await executeResetGame(gameId);

    default:
      console.warn(`[StepManager] Unknown step type: ${stepType}`);
      return 0;
  }
}

/**
 * Execute stage notification step
 */
async function executeStageNotification(gameId: string): Promise<number> {
  const game = await PokerGame.findById(gameId);
  if (!game || !game.currentStep) return 0;

  const { PokerSocketEmitter } = await import('@/app/lib/utils/socket-helper');
  const { getStageDefinition } = await import('./step-definitions');

  const stage = getStageDefinition(game.currentStep.stageNumber);
  if (!stage) return 0;

  // Emit stage notification
  await PokerSocketEmitter.emitNotification({
    notificationType: 'stage_advanced',
    category: 'stage',
    stage: game.currentStep.stageNumber,
    stageName: stage.stageName,
  });

  console.log(`[StepManager] Stage notification sent: ${stage.stageName}`);

  // Mark notification requirement as complete
  await completeRequirement(gameId, RequirementType.NOTIFICATION_COMPLETE);

  return 2000; // 2 second notification duration
}

/**
 * Execute post small blind step
 */
async function executePostSmallBlind(gameId: string): Promise<number> {
  const game = await PokerGame.findById(gameId);
  if (!game) return 0;

  const { placeSmallBlind } = await import('../actions/blinds-manager');
  const { PokerSocketEmitter } = await import('@/app/lib/utils/socket-helper');

  const smallBlindInfo = placeSmallBlind(game);

  await game.save();

  // Emit notification
  await PokerSocketEmitter.emitNotification({
    notificationType: 'blind_posted',
    category: 'blind',
    playerId: smallBlindInfo.player.id,
    playerName: smallBlindInfo.player.username,
    chipAmount: smallBlindInfo.amount,
    blindType: 'small',
    pot: JSON.parse(JSON.stringify(game.pot)),
    playerBets: [...game.playerBets],
    currentPlayerIndex: -1, // No active player during blind posting
  });

  // Mark requirements as complete
  await completeRequirement(gameId, RequirementType.BLINDS_POSTED);
  await completeRequirement(gameId, RequirementType.NOTIFICATION_COMPLETE);

  console.log(`[StepManager] Small blind posted by player ${smallBlindInfo.position}: ${smallBlindInfo.amount} chips`);

  return 2000; // 2 second notification duration
}

/**
 * Execute post big blind step
 */
async function executePostBigBlind(gameId: string): Promise<number> {
  const game = await PokerGame.findById(gameId);
  if (!game) return 0;

  const { placeBigBlind } = await import('../actions/blinds-manager');
  const { PokerSocketEmitter } = await import('@/app/lib/utils/socket-helper');

  const bigBlindInfo = placeBigBlind(game);

  await game.save();

  // Emit notification
  await PokerSocketEmitter.emitNotification({
    notificationType: 'blind_posted',
    category: 'blind',
    playerId: bigBlindInfo.player.id,
    playerName: bigBlindInfo.player.username,
    chipAmount: bigBlindInfo.amount,
    blindType: 'big',
    pot: JSON.parse(JSON.stringify(game.pot)),
    playerBets: [...game.playerBets],
    currentPlayerIndex: -1, // No active player during blind posting
  });

  // Mark requirements as complete
  await completeRequirement(gameId, RequirementType.BLINDS_POSTED);
  await completeRequirement(gameId, RequirementType.NOTIFICATION_COMPLETE);

  console.log(`[StepManager] Big blind posted by player ${bigBlindInfo.position}: ${bigBlindInfo.amount} chips`);

  return 2000; // 2 second notification duration
}

/**
 * Helper function to calculate the first player to act for current betting round
 * Works for both pre-flop and post-flop stages
 * Skips folded and all-in players to find first active player
 */
export function calculateFirstToActForBettingRound(game: any): number {
  const buttonPosition = game.dealerButtonPosition || 0;
  const isHeadsUp = game.players.length === 2;

  let firstToAct: number;

  if (game.stage === 0) {
    // Pre-flop: First to act is different
    // Heads-up: Small blind (button) acts first
    // 3+: UTG (player after big blind) acts first
    const bigBlindPos = isHeadsUp
      ? (buttonPosition + 1) % game.players.length
      : (buttonPosition + 2) % game.players.length;

    firstToAct = isHeadsUp
      ? buttonPosition  // Heads-up: button (SB) acts first
      : (bigBlindPos + 1) % game.players.length;  // 3+: UTG (after BB)
  } else {
    // Post-flop: Small blind acts first (or first active player after SB)
    const smallBlindPos = isHeadsUp
      ? buttonPosition
      : (buttonPosition + 1) % game.players.length;

    firstToAct = smallBlindPos;
  }

  // Find first active player starting from firstToAct position
  // Skip any players who are folded or all-in
  let attempts = 0;
  let currentIndex = firstToAct;

  while (attempts < game.players.length) {
    const candidate = game.players[currentIndex];
    if (!candidate.isAllIn && !candidate.folded) {
      break; // Found an active player
    }
    currentIndex = (currentIndex + 1) % game.players.length;
    attempts++;
  }

  return currentIndex;
}

/**
 * Execute deal hole cards step
 */
async function executeDealHoleCards(gameId: string): Promise<number> {
  const game = await PokerGame.findById(gameId);
  if (!game) return 0;

  const { dealPlayerCards } = await import('./poker-dealer');
  const { PokerSocketEmitter } = await import('@/app/lib/utils/socket-helper');
  const { randomBytes } = await import('crypto');
  const { ActionHistoryType } = await import('../../definitions/action-history');

  dealPlayerCards(game.deck, game.players, 2);
  game.markModified('deck');
  game.markModified('players');

  // Add action history
  game.actionHistory.push({
    id: randomBytes(8).toString('hex'),
    timestamp: new Date(),
    stage: 0,
    actionType: ActionHistoryType.CARDS_DEALT,
    cardsDealt: 2,
  });
  game.markModified('actionHistory');

  await game.save();

  // Queue notification (hole cards = Pre-Flop)
  // The notification queue manager will handle timing and sequential display
  await queueCardsDealtNotification(gameId, 'PRE-FLOP');

  // Emit cards dealt event immediately (for state updates and sound effects)
  await PokerSocketEmitter.emitCardsDealt({
    stage: game.stage,
    communalCards: game.communalCards,
    players: game.players.map((p: any) => ({
      ...p.toObject(),
      hand: p.hand,
    })),
    deckCount: game.deck.length,
    currentPlayerIndex: game.currentPlayerIndex,
  });

  // Mark requirements as complete
  await completeRequirement(gameId, RequirementType.CARDS_DEALT);
  await completeRequirement(gameId, RequirementType.NOTIFICATION_COMPLETE);

  console.log('[StepManager] Hole cards dealt');

  return POKER_TIMERS.PLAYER_ACTION_NOTIFICATION_DURATION_MS;
}

/**
 * Execute deal flop step
 */
async function executeDealFlop(gameId: string): Promise<number> {
  const game = await PokerGame.findById(gameId);
  if (!game) return 0;

  const { dealCommunalCards } = await import('./poker-dealer');
  const { PokerSocketEmitter } = await import('@/app/lib/utils/socket-helper');

  dealCommunalCards(game.deck, game.communalCards, 3);
  game.markModified('deck');
  game.markModified('communalCards');

  // Calculate and set first player to act BEFORE emitting cards dealt
  // This ensures the correct player is highlighted during the dealing animation
  // But only if we're not auto-advancing (multiple players can still bet)
  const { StageManager } = await import('./stage-manager');
  if (!StageManager.shouldAutoAdvance(game)) {
    game.currentPlayerIndex = calculateFirstToActForBettingRound(game);
  } else {
    // Auto-advancing (all-in scenario) - set to -1 to hide controls
    game.currentPlayerIndex = -1;
    console.log('[StepManager] Auto-advance mode - setting currentPlayerIndex to -1');
  }
  game.markModified('currentPlayerIndex');

  await game.save();

  // Queue notification
  await queueCardsDealtNotification(gameId, 'FLOP');

  // Emit cards dealt event immediately (for state updates and sound effects)
  await PokerSocketEmitter.emitCardsDealt({
    stage: game.stage,
    communalCards: game.communalCards,
    players: game.players,
    deckCount: game.deck.length,
    currentPlayerIndex: game.currentPlayerIndex, // Now correctly points to first-to-act player
  });

  // Mark requirements
  await completeRequirement(gameId, RequirementType.CARDS_DEALT);
  await completeRequirement(gameId, RequirementType.NOTIFICATION_COMPLETE);

  console.log(`[StepManager] Flop dealt (3 cards) - first to act: player ${game.currentPlayerIndex}`);

  return POKER_TIMERS.PLAYER_ACTION_NOTIFICATION_DURATION_MS;
}

/**
 * Execute deal turn step
 */
async function executeDealTurn(gameId: string): Promise<number> {
  const game = await PokerGame.findById(gameId);
  if (!game) return 0;

  const { dealCommunalCards } = await import('./poker-dealer');
  const { PokerSocketEmitter } = await import('@/app/lib/utils/socket-helper');

  dealCommunalCards(game.deck, game.communalCards, 1);
  game.markModified('deck');
  game.markModified('communalCards');

  // Calculate and set first player to act BEFORE emitting cards dealt
  // This ensures the correct player is highlighted during the dealing animation
  // But only if we're not auto-advancing (multiple players can still bet)
  const { StageManager } = await import('./stage-manager');
  if (!StageManager.shouldAutoAdvance(game)) {
    game.currentPlayerIndex = calculateFirstToActForBettingRound(game);
  } else {
    // Auto-advancing (all-in scenario) - set to -1 to hide controls
    game.currentPlayerIndex = -1;
    console.log('[StepManager] Auto-advance mode - setting currentPlayerIndex to -1');
  }
  game.markModified('currentPlayerIndex');

  await game.save();

  // Queue notification
  await queueCardsDealtNotification(gameId, 'TURN');

  // Emit cards dealt event immediately (for state updates and sound effects)
  await PokerSocketEmitter.emitCardsDealt({
    stage: game.stage,
    communalCards: game.communalCards,
    players: game.players,
    deckCount: game.deck.length,
    currentPlayerIndex: game.currentPlayerIndex, // Now correctly points to first-to-act player
  });

  await completeRequirement(gameId, RequirementType.CARDS_DEALT);
  await completeRequirement(gameId, RequirementType.NOTIFICATION_COMPLETE);

  console.log(`[StepManager] Turn dealt (1 card) - first to act: player ${game.currentPlayerIndex}`);

  return POKER_TIMERS.PLAYER_ACTION_NOTIFICATION_DURATION_MS;
}

/**
 * Execute deal river step
 */
async function executeDealRiver(gameId: string): Promise<number> {
  const game = await PokerGame.findById(gameId);
  if (!game) return 0;

  const { dealCommunalCards } = await import('./poker-dealer');
  const { PokerSocketEmitter } = await import('@/app/lib/utils/socket-helper');

  dealCommunalCards(game.deck, game.communalCards, 1);
  game.markModified('deck');
  game.markModified('communalCards');

  // Calculate and set first player to act BEFORE emitting cards dealt
  // This ensures the correct player is highlighted during the dealing animation
  // But only if we're not auto-advancing (multiple players can still bet)
  const { StageManager } = await import('./stage-manager');
  if (!StageManager.shouldAutoAdvance(game)) {
    game.currentPlayerIndex = calculateFirstToActForBettingRound(game);
  } else {
    // Auto-advancing (all-in scenario) - set to -1 to hide controls
    game.currentPlayerIndex = -1;
    console.log('[StepManager] Auto-advance mode - setting currentPlayerIndex to -1');
  }
  game.markModified('currentPlayerIndex');

  await game.save();

  // Queue notification
  await queueCardsDealtNotification(gameId, 'RIVER');

  // Emit cards dealt event immediately (for state updates and sound effects)
  await PokerSocketEmitter.emitCardsDealt({
    stage: game.stage,
    communalCards: game.communalCards,
    players: game.players,
    deckCount: game.deck.length,
    currentPlayerIndex: game.currentPlayerIndex, // Now correctly points to first-to-act player
  });

  await completeRequirement(gameId, RequirementType.CARDS_DEALT);
  await completeRequirement(gameId, RequirementType.NOTIFICATION_COMPLETE);

  console.log(`[StepManager] River dealt (1 card) - first to act: player ${game.currentPlayerIndex}`);

  return POKER_TIMERS.PLAYER_ACTION_NOTIFICATION_DURATION_MS;
}

/**
 * Execute betting cycle step
 * This is handled by turn manager - just sets up the cycle
 */
async function executeBettingCycle(gameId: string): Promise<number> {
  const game = await PokerGame.findById(gameId);
  if (!game) return 0;

  // Reset player bets for post-flop stages (Flop, Turn, River)
  // Pre-flop (stage 0) keeps the blind bets that were already posted
  if (game.stage > 0) {
    const { initializeBets } = await import('@/app/poker/lib/utils/betting-helpers');
    game.playerBets = initializeBets(game.players.length);
    game.markModified('playerBets');
    console.log(`[StepManager] Reset playerBets for stage ${game.stage} betting cycle`);
  }

  // Calculate first player to act using shared helper function
  // This ensures consistency with dealing steps
  const currentIndex = calculateFirstToActForBettingRound(game);

  // Update currentPlayerIndex to first player to act
  game.currentPlayerIndex = currentIndex;
  game.markModified('currentPlayerIndex');
  await game.save();

  console.log(`[StepManager] Betting cycle starting - first to act: player ${currentIndex} (${game.players[currentIndex]?.username})`);

  // Emit state update so UI shows border on first player
  const { PokerSocketEmitter } = await import('@/app/lib/utils/socket-helper');
  await PokerSocketEmitter.emitStateUpdate(game.toObject());

  // Start timer for first player
  const { startActionTimer } = await import('../timers/poker-timer-controller');
  const { POKER_TIMERS } = await import('../../config/poker-constants');
  const { GameActionType } = await import('../../definitions/game-actions');

  const currentPlayer = game.players[game.currentPlayerIndex];
  if (currentPlayer) {
    await startActionTimer(
      gameId,
      POKER_TIMERS.ACTION_DURATION_SECONDS,
      GameActionType.PLAYER_BET,
      currentPlayer.id
    );

    // If AI, trigger action
    if (currentPlayer.isAI) {
      const { executeAIActionIfReady } = await import('../ai/ai-player-manager');
      setTimeout(() => {
        executeAIActionIfReady(gameId).catch(error => {
          console.error('[StepManager] AI action failed:', error);
        });
      }, 200);
    }
  }

  console.log('[StepManager] Betting cycle started with timer');

  // Betting cycle completion is handled by turn manager
  // When all players have acted, turn manager will call completeRequirement
  return 0; // No fixed duration - waits for all players to act
}

/**
 * Execute determine winner step
 */
async function executeDetermineWinner(gameId: string): Promise<number> {
  const game = await PokerGame.findById(gameId);
  if (!game) return 0;

  const { StageManager } = await import('./stage-manager');

  // Calculate winner and end game
  await StageManager.endGame(game);
  await game.save();

  await completeRequirement(gameId, RequirementType.WINNER_DETERMINED);
  await completeRequirement(gameId, RequirementType.NOTIFICATION_COMPLETE);

  console.log('[StepManager] Winner determined');

  return 10000; // 10 second winner notification
}

/**
 * Execute reset game step
 * This is called after winner determination is complete
 */
async function executeResetGame(gameId: string): Promise<number> {
  const game = await PokerGame.findById(gameId);
  if (!game) return 0;

  console.log('[StepManager] Executing RESET_GAME step - delegating to resetGameForNextRound');

  // Call resetGameForNextRound which handles:
  // 1. Dealer button advancement
  // 2. Game state reset
  // 3. Player removal (insufficient chips/away)
  // 4. Queueing game_starting notification
  const { StageManager } = await import('./stage-manager');
  await StageManager.resetGameForNextRound(game);

  await completeRequirement(gameId, RequirementType.GAME_RESET);

  console.log('[StepManager] Game reset and restart queued');

  return 0; // No wait - notification queue handles timing
}
