// app/poker/lib/server/step-definitions.ts

/**
 * Step-Based Game Flow System
 *
 * Defines all stages and steps for the poker game flow.
 * Each stage consists of sequential steps with completion requirements.
 */

export enum StepType {
  STAGE_NOTIFICATION = 'stage_notification',
  POST_SMALL_BLIND = 'post_small_blind',
  POST_BIG_BLIND = 'post_big_blind',
  DEAL_HOLE_CARDS = 'deal_hole_cards',
  DEAL_FLOP = 'deal_flop',
  DEAL_TURN = 'deal_turn',
  DEAL_RIVER = 'deal_river',
  BETTING_CYCLE = 'betting_cycle',
  DETERMINE_WINNER = 'determine_winner',
  RESET_GAME = 'reset_game'
}

export enum RequirementType {
  NOTIFICATION_COMPLETE = 'notification_complete',
  CARDS_DEALT = 'cards_dealt',
  BLINDS_POSTED = 'blinds_posted',
  ALL_PLAYERS_ACTED = 'all_players_acted',
  WINNER_DETERMINED = 'winner_determined',
  GAME_RESET = 'game_reset'
}

export interface StepRequirement {
  type: RequirementType;
  duration?: number;  // For timed requirements (ms)
}

export interface GameStep {
  stepId: string;
  stepNumber: number;
  stepType: StepType;
  description: string;
  requirements: StepRequirement[];
  duration?: number;  // Expected duration for the step
}

export interface GameStage {
  stageNumber: number;
  stageName: string;
  steps: GameStep[];
}

// Duration constants (from POKER_TIMERS)
const STAGE_NOTIFICATION_DURATION = 2000;  // 2 seconds
const ACTION_NOTIFICATION_DURATION = 2000;  // 2 seconds
const WINNER_NOTIFICATION_DURATION = 10000; // 10 seconds

/**
 * Complete stage definitions for poker game flow
 */
export const GAME_STAGES: GameStage[] = [
  // STAGE 0: PRE-FLOP
  {
    stageNumber: 0,
    stageName: 'Pre-Flop',
    steps: [
      {
        stepId: 'stage_0_step_1',
        stepNumber: 1,
        stepType: StepType.POST_SMALL_BLIND,
        description: 'Post small blind and show notification',
        duration: ACTION_NOTIFICATION_DURATION,
        requirements: [
          { type: RequirementType.BLINDS_POSTED },
          { type: RequirementType.NOTIFICATION_COMPLETE, duration: ACTION_NOTIFICATION_DURATION }
        ]
      },
      {
        stepId: 'stage_0_step_2',
        stepNumber: 2,
        stepType: StepType.POST_BIG_BLIND,
        description: 'Post big blind and show notification',
        duration: ACTION_NOTIFICATION_DURATION,
        requirements: [
          { type: RequirementType.BLINDS_POSTED },
          { type: RequirementType.NOTIFICATION_COMPLETE, duration: ACTION_NOTIFICATION_DURATION }
        ]
      },
      {
        stepId: 'stage_0_step_3',
        stepNumber: 3,
        stepType: StepType.DEAL_HOLE_CARDS,
        description: 'Deal hole cards to all players',
        duration: ACTION_NOTIFICATION_DURATION,
        requirements: [
          { type: RequirementType.CARDS_DEALT },
          { type: RequirementType.NOTIFICATION_COMPLETE, duration: ACTION_NOTIFICATION_DURATION }
        ]
      },
      {
        stepId: 'stage_0_step_4',
        stepNumber: 4,
        stepType: StepType.BETTING_CYCLE,
        description: 'Pre-flop betting cycle',
        requirements: [
          { type: RequirementType.ALL_PLAYERS_ACTED }
        ]
      }
    ]
  },

  // STAGE 1: FLOP
  {
    stageNumber: 1,
    stageName: 'Flop',
    steps: [
      {
        stepId: 'stage_1_step_1',
        stepNumber: 1,
        stepType: StepType.DEAL_FLOP,
        description: 'Deal 3 community cards (flop)',
        duration: ACTION_NOTIFICATION_DURATION,
        requirements: [
          { type: RequirementType.CARDS_DEALT },
          { type: RequirementType.NOTIFICATION_COMPLETE, duration: ACTION_NOTIFICATION_DURATION }
        ]
      },
      {
        stepId: 'stage_1_step_2',
        stepNumber: 2,
        stepType: StepType.BETTING_CYCLE,
        description: 'Flop betting cycle',
        requirements: [
          { type: RequirementType.ALL_PLAYERS_ACTED }
        ]
      }
    ]
  },

  // STAGE 2: TURN
  {
    stageNumber: 2,
    stageName: 'Turn',
    steps: [
      {
        stepId: 'stage_2_step_1',
        stepNumber: 1,
        stepType: StepType.DEAL_TURN,
        description: 'Deal 1 community card (turn)',
        duration: ACTION_NOTIFICATION_DURATION,
        requirements: [
          { type: RequirementType.CARDS_DEALT },
          { type: RequirementType.NOTIFICATION_COMPLETE, duration: ACTION_NOTIFICATION_DURATION }
        ]
      },
      {
        stepId: 'stage_2_step_2',
        stepNumber: 2,
        stepType: StepType.BETTING_CYCLE,
        description: 'Turn betting cycle',
        requirements: [
          { type: RequirementType.ALL_PLAYERS_ACTED }
        ]
      }
    ]
  },

  // STAGE 3: RIVER
  {
    stageNumber: 3,
    stageName: 'River',
    steps: [
      {
        stepId: 'stage_3_step_1',
        stepNumber: 1,
        stepType: StepType.DEAL_RIVER,
        description: 'Deal 1 community card (river)',
        duration: ACTION_NOTIFICATION_DURATION,
        requirements: [
          { type: RequirementType.CARDS_DEALT },
          { type: RequirementType.NOTIFICATION_COMPLETE, duration: ACTION_NOTIFICATION_DURATION }
        ]
      },
      {
        stepId: 'stage_3_step_2',
        stepNumber: 2,
        stepType: StepType.BETTING_CYCLE,
        description: 'River betting cycle',
        requirements: [
          { type: RequirementType.ALL_PLAYERS_ACTED }
        ]
      }
    ]
  },

  // STAGE 4: SHOWDOWN
  {
    stageNumber: 4,
    stageName: 'Showdown',
    steps: [
      {
        stepId: 'stage_4_step_1',
        stepNumber: 1,
        stepType: StepType.DETERMINE_WINNER,
        description: 'Determine winner and award pot',
        duration: WINNER_NOTIFICATION_DURATION,
        requirements: [
          { type: RequirementType.WINNER_DETERMINED },
          { type: RequirementType.NOTIFICATION_COMPLETE, duration: WINNER_NOTIFICATION_DURATION }
        ]
      }
    ]
  },

  // STAGE 5: GAME END
  {
    stageNumber: 5,
    stageName: 'Game End',
    steps: [
      {
        stepId: 'stage_5_step_1',
        stepNumber: 1,
        stepType: StepType.RESET_GAME,
        description: 'Reset game and return to unlocked state',
        requirements: [
          { type: RequirementType.GAME_RESET }
        ]
      }
    ]
  }
];

/**
 * Get stage definition by stage number
 */
export function getStageDefinition(stageNumber: number): GameStage | undefined {
  return GAME_STAGES.find(stage => stage.stageNumber === stageNumber);
}

/**
 * Get step definition by stepId
 */
export function getStepDefinition(stepId: string): GameStep | undefined {
  for (const stage of GAME_STAGES) {
    const step = stage.steps.find(s => s.stepId === stepId);
    if (step) return step;
  }
  return undefined;
}

/**
 * Get current step from stage and step number
 */
export function getCurrentStep(stageNumber: number, stepNumber: number): GameStep | undefined {
  const stage = getStageDefinition(stageNumber);
  if (!stage) return undefined;
  return stage.steps.find(s => s.stepNumber === stepNumber);
}

/**
 * Get next step in sequence
 */
export function getNextStep(currentStageNumber: number, currentStepNumber: number): { stage: number; step: number; stepId: string } | null {
  const currentStage = getStageDefinition(currentStageNumber);
  if (!currentStage) return null;

  // Check if there's another step in current stage
  const nextStepInStage = currentStage.steps.find(s => s.stepNumber === currentStepNumber + 1);
  if (nextStepInStage) {
    return {
      stage: currentStageNumber,
      step: nextStepInStage.stepNumber,
      stepId: nextStepInStage.stepId
    };
  }

  // Move to next stage, step 1
  const nextStage = getStageDefinition(currentStageNumber + 1);
  if (nextStage && nextStage.steps.length > 0) {
    return {
      stage: nextStage.stageNumber,
      step: nextStage.steps[0].stepNumber,
      stepId: nextStage.steps[0].stepId
    };
  }

  return null; // No more steps
}

/**
 * Check if this is the last step in a stage
 */
export function isLastStepInStage(stageNumber: number, stepNumber: number): boolean {
  const stage = getStageDefinition(stageNumber);
  if (!stage) return false;
  return stepNumber === stage.steps.length;
}
