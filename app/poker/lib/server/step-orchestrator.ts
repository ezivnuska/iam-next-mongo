// app/poker/lib/server/step-orchestrator.ts

/**
 * Step Orchestrator - Drives the game flow through steps
 *
 * This is the main controller that executes the game loop:
 * 1. Execute current step action
 * 2. Wait for requirements to be met
 * 3. Advance to next step
 * 4. Repeat
 */

import {
  initializeStepTracking,
  getCurrentStepInfo,
  executeStepAction,
  advanceToNextStep,
  areRequirementsMet,
  checkEarlyCompletion,
  skipToWinner,
  completeRequirement
} from './step-manager';
import { StepType, RequirementType } from './step-definitions';
import { PokerGame } from '../models/poker-game';

/**
 * Start the step-based game flow
 * Called when game locks and begins
 */
export async function startStepFlow(gameId: string): Promise<void> {
  console.log('[StepOrchestrator] Starting step-based game flow for game:', gameId);

  // Initialize step tracking
  await initializeStepTracking(gameId);

  // Execute first step (Stage 0, Step 1: Pre-Flop notification)
  await executeCurrentStep(gameId);
}

/**
 * Execute the current step and auto-advance if appropriate
 */
export async function executeCurrentStep(gameId: string): Promise<void> {
  const step = await getCurrentStepInfo(gameId);
  if (!step) {
    console.log('[StepOrchestrator] No current step - game flow complete');
    return;
  }

  console.log(`[StepOrchestrator] Executing step: ${step.description}`);

  // Execute the step action
  const duration = await executeStepAction(gameId, step.stepType);

  // For betting cycles, don't auto-advance (wait for turn manager to signal completion)
  if (step.stepType === StepType.BETTING_CYCLE) {
    console.log('[StepOrchestrator] Betting cycle started - waiting for completion signal');
    return;
  }

  // For timed steps (notifications, dealing), wait then auto-advance
  if (duration > 0) {
    setTimeout(async () => {
      await tryAdvanceStep(gameId);
    }, duration);
  } else {
    // No wait time, advance immediately
    await tryAdvanceStep(gameId);
  }
}

/**
 * Try to advance to the next step
 * Called after current step's requirements are met
 */
async function tryAdvanceStep(gameId: string): Promise<void> {
  // Check if requirements are met
  const requirementsMet = await areRequirementsMet(gameId);
  if (!requirementsMet) {
    console.log('[StepOrchestrator] Requirements not yet met - waiting');
    return;
  }

  // Check for early completion (all fold except one)
  const earlyCompletion = await checkEarlyCompletion(gameId);
  if (earlyCompletion) {
    console.log('[StepOrchestrator] Early completion detected - skipping to winner');
    await skipToWinner(gameId);
    await executeCurrentStep(gameId);
    return;
  }

  // Advance to next step
  const { advanced, nextStep, stageChanged } = await advanceToNextStep(gameId);

  if (!advanced) {
    console.log('[StepOrchestrator] Game flow complete - no more steps');
    return;
  }

  if (stageChanged) {
    console.log('[StepOrchestrator] *** STAGE CHANGED ***');
  }

  // Execute the next step
  await executeCurrentStep(gameId);
}

/**
 * Signal that a betting cycle has completed
 * Called by turn manager when all players have acted
 */
export async function onBettingCycleComplete(gameId: string): Promise<void> {
  console.log('[StepOrchestrator] Betting cycle completed');

  // Mark requirement as complete
  await completeRequirement(gameId, RequirementType.ALL_PLAYERS_ACTED);

  // Advance to next step
  await tryAdvanceStep(gameId);
}

/**
 * Signal that a player action occurred
 * Used for tracking sub-steps within betting cycle
 */
export async function onPlayerAction(
  gameId: string,
  playerId: string,
  action: string
): Promise<void> {
  console.log(`[StepOrchestrator] Player action: ${playerId} -> ${action}`);

  // NOTE: Early completion check removed from here to prevent premature stage advancement
  // The turn-handler will check for early completion when handleReadyForNextTurn is called
  // This ensures action notifications have time to display before stage advances
}

/**
 * Pause the game flow (for disconnections, etc.)
 */
export async function pauseStepFlow(gameId: string): Promise<void> {
  console.log('[StepOrchestrator] Game flow paused');
  // TODO: Implement pause logic
}

/**
 * Resume the game flow
 */
export async function resumeStepFlow(gameId: string): Promise<void> {
  console.log('[StepOrchestrator] Game flow resumed');
  await executeCurrentStep(gameId);
}
