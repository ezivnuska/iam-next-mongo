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
import { POKER_TIMERS } from '../../config/poker-constants';
import { executeWithRetry, saveWithRetry } from '@/app/lib/utils/retry';
import { calculateFirstToActForBettingRound } from '../../utils/betting-round-helpers';

/**
 * Initialize step tracking for a new game
 */
export async function initializeStepTracking(gameId: string): Promise<void> {
  await executeWithRetry(
    async () => {
      const game = await PokerGame.findById(gameId);
      if (!game) throw new Error('Game not found');
      return game;
    },
    async (game) => {
      // Start at Stage 0, Step 1 (Pre-Flop stage notification)
      game.currentStep = {
        stageNumber: 0,
        stepNumber: 1,
        stepId: 'stage_0_step_1',
        startedAt: new Date(),
        completedRequirements: []
      };
    }
  );
}

/**
 * Mark a requirement as complete for the current step
 */
export async function completeRequirement(
  gameId: string,
  requirementType: RequirementType
): Promise<boolean> {
  const game = await executeWithRetry(
    async () => {
      const game = await PokerGame.findById(gameId);
      if (!game || !game.currentStep) {
        throw new Error('Cannot complete requirement - no current step');
      }
      return game;
    },
    async (game) => {
      // Add requirement to completed list if not already there
      if (!game.currentStep!.completedRequirements.includes(requirementType)) {
        game.currentStep!.completedRequirements.push(requirementType);
        game.markModified('currentStep');
      }
    }
  ).catch(error => {
    console.error('[StepManager]', error.message);
    return null;
  });

  if (!game || !game.currentStep) {
    return false;
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
  let nextStepInfo: { stage: number; step: number; stepId: string } | null = null;
  let stageChanged = false;

  const game = await executeWithRetry(
    async () => {
      const game = await PokerGame.findById(gameId);
      if (!game || !game.currentStep) {
        throw new Error('Cannot advance - no current step');
      }
      return game;
    },
    async (game) => {
      const currentStageNumber = game.currentStep!.stageNumber;
      const currentStepNumber = game.currentStep!.stepNumber;

      // Get next step
      nextStepInfo = getNextStep(currentStageNumber, currentStepNumber);
      if (!nextStepInfo) {
        throw new Error('No next step available');
      }

      stageChanged = nextStepInfo.stage !== currentStageNumber;

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
      }

      game.markModified('currentStep');
    }
  ).catch(error => {
    if (error.message === 'Cannot advance - no current step' || error.message === 'No next step available') {
      console.error('[StepManager]', error.message);
      return null;
    }
    throw error;
  });

  if (!game || !nextStepInfo) {
    return { advanced: false, stageChanged: false };
  }

  const nextStep = getStepDefinition((nextStepInfo as { stage: number; step: number; stepId: string }).stepId);

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
    return true;
  }

  return false;
}

/**
 * Skip to winner determination (early completion)
 * Called when all players except one have folded
 */
export async function skipToWinner(gameId: string): Promise<void> {
  await executeWithRetry(
    async () => {
      const game = await PokerGame.findById(gameId);
      if (!game) throw new Error('Game not found');
      return game;
    },
    async (game) => {
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
    }
  );
}

/**
 * Execute the action for a specific step type
 * Returns duration to wait before advancing (ms)
 */
export async function executeStepAction(
  gameId: string,
  stepType: StepType
): Promise<number> {

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

  await saveWithRetry(game);

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

  await saveWithRetry(game);

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


  return 2000; // 2 second notification duration
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

  await saveWithRetry(game);

  // Queue notification (hole cards = Pre-Flop)
  // The notification queue manager will handle timing and sequential display
  const { queueCardsDealtNotification } = await import('../notifications/notification-queue-manager');
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
  }
  game.markModified('currentPlayerIndex');

  await saveWithRetry(game);

  // Queue notification
  const { queueCardsDealtNotification: queueFlopNotification } = await import('../notifications/notification-queue-manager');
  await queueFlopNotification(gameId, 'FLOP');

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
  }
  game.markModified('currentPlayerIndex');

  await saveWithRetry(game);

  // Queue notification
  const { queueCardsDealtNotification: queueTurnNotification } = await import('../notifications/notification-queue-manager');
  await queueTurnNotification(gameId, 'TURN');

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
  }
  game.markModified('currentPlayerIndex');

  await saveWithRetry(game);

  // Queue notification
  const { queueCardsDealtNotification: queueRiverNotification } = await import('../notifications/notification-queue-manager');
  await queueRiverNotification(gameId, 'RIVER');

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
    const { initializeBets } = await import('@/app/games/poker/lib/utils/betting-helpers');
    game.playerBets = initializeBets(game.players.length);
    game.markModified('playerBets');
  }

  // Calculate first player to act using shared helper function
  // This ensures consistency with dealing steps
  const currentIndex = calculateFirstToActForBettingRound(game);

  // Update currentPlayerIndex to first player to act
  game.currentPlayerIndex = currentIndex;
  game.markModified('currentPlayerIndex');
  await saveWithRetry(game);


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
  await saveWithRetry(game);

  await completeRequirement(gameId, RequirementType.WINNER_DETERMINED);
  await completeRequirement(gameId, RequirementType.NOTIFICATION_COMPLETE);


  return 10000; // 10 second winner notification
}

/**
 * Execute reset game step
 * NOTE: This step no longer triggers the reset directly.
 * Reset is now triggered by client after winner notification completes.
 * This ensures communal cards remain visible during the winner notification.
 */
async function executeResetGame(gameId: string): Promise<number> {
  // Mark requirement as complete - actual reset will be triggered by
  // poker:winner_notification_complete event from client
  await completeRequirement(gameId, RequirementType.GAME_RESET);

  return 0; // No wait - client will trigger reset after notification
}
