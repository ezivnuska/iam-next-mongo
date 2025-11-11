// app/poker/lib/definitions/validation.ts
/**
 * Validation types and interfaces for stage and turn management
 */

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface StageTransitionContext {
  fromStage: number;
  toStage: number;
  reason: string;
  timestamp: Date;
}

export interface TurnContext {
  playerId: string;
  playerIndex: number;
  turnNumber: number;
  stage: number;
  actionRequired: 'bet' | 'check' | 'call' | 'raise' | 'fold';
}

export interface BettingRoundState {
  startingPlayerIndex: number;
  playersActed: Set<string>;
  playerActions: Map<string, PlayerActionType>;
  bettingComplete: boolean;
}

export type PlayerActionType =
  | 'bet'
  | 'raise'
  | 'call'
  | 'check'
  | 'fold'
  | 'all-in'
  | 'small-blind'
  | 'big-blind';

/**
 * Helper function to create a successful validation result
 */
export function validationSuccess(warnings: string[] = []): ValidationResult {
  return {
    valid: true,
    errors: [],
    warnings,
  };
}

/**
 * Helper function to create a failed validation result
 */
export function validationFailure(errors: string[], warnings: string[] = []): ValidationResult {
  return {
    valid: false,
    errors,
    warnings,
  };
}

/**
 * Combine multiple validation results
 */
export function combineValidations(...results: ValidationResult[]): ValidationResult {
  const allErrors = results.flatMap(r => r.errors);
  const allWarnings = results.flatMap(r => r.warnings);

  return {
    valid: allErrors.length === 0,
    errors: allErrors,
    warnings: allWarnings,
  };
}
