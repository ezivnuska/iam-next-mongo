// app/poker/lib/server/stage-validators.ts
/**
 * Validation gates for poker game stages
 * Each stage has entry and exit validation to ensure game state integrity
 */

import type { PokerGameDocument } from '../models/poker-game';
import { GameStage } from '../definitions/poker';
import type { ValidationResult } from '../definitions/validation';
import { validationSuccess, validationFailure, combineValidations } from '../definitions/validation';
import { getPlayersWhoCanAct, getActivePlayers } from '../utils/player-helpers';

export class StageValidators {
  /**
   * Validate that preflop stage can be entered (game start)
   * Preflop includes: posting blinds, dealing hole cards, and first betting round
   */
  static validatePreflopEntry(game: PokerGameDocument): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Must have at least 2 players
    if (game.players.length < 2) {
      errors.push('Need at least 2 players to start game');
    }

    // Game must be locked
    if (!game.locked) {
      errors.push('Game must be locked to start preflop');
    }

    // Deck should be full (52 cards) or at least have enough cards
    if (game.deck.length < 52) {
      warnings.push(`Deck has ${game.deck.length} cards, expected 52`);
    }

    // No community cards yet
    if (game.communalCards && game.communalCards.length > 0) {
      errors.push('Community cards should be empty at game start');
    }

    return errors.length === 0
      ? validationSuccess(warnings)
      : validationFailure(errors, warnings);
  }

  /**
   * Validate that a betting round (preflop/flop/turn/river) is complete
   */
  static validateBettingRoundComplete(game: PokerGameDocument): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Get active players (not folded, not all-in)
    const playersWhoCanAct = getPlayersWhoCanAct(game.players);
    const activePlayers = getActivePlayers(game.players);

    // Check if all active players have equal bets this round
    const activePlayerBets = activePlayers.map(p => {
      const idx = game.players.findIndex(player => player.id === p.id);
      return game.playerBets[idx] || 0;
    });

    const allBetsEqual = activePlayerBets.length > 0 &&
      activePlayerBets.every(bet => bet === activePlayerBets[0]);

    console.log('[StageValidators] Betting round validation details:', {
      stage: game.stage,
      activePlayers: activePlayers.map(p => p.username),
      activePlayerBets,
      allBetsEqual,
      playersWhoCanAct: playersWhoCanAct.length,
      totalPlayerBets: game.playerBets,
    });

    if (!allBetsEqual && playersWhoCanAct.length > 0) {
      errors.push(`Not all active players have equal bets - bets: [${activePlayerBets.join(', ')}]`);
    }

    // Count actions in current stage (excluding blind posts)
    const actionsInStage = game.actionHistory.filter(action =>
      action.stage === game.stage && !action.isBlind
    ).length;

    // Must have at least one action per active player
    const minActions = activePlayers.length;
    if (actionsInStage < minActions && playersWhoCanAct.length > 0) {
      warnings.push(`Only ${actionsInStage} actions, expected at least ${minActions}`);
    }

    // If no players can act (all folded or all-in), round is automatically complete
    if (playersWhoCanAct.length === 0) {
      return validationSuccess(['All players are all-in or folded - auto-advancing']);
    }

    return errors.length === 0
      ? validationSuccess(warnings)
      : validationFailure(errors, warnings);
  }

  /**
   * Validate that flop stage can be entered
   */
  static validateFlopEntry(game: PokerGameDocument): ValidationResult {
    const errors: string[] = [];

    // All players should have 2 hole cards (dealt in preflop)
    const playersWithoutCards = game.players.filter(p => !p.hand || p.hand.length !== 2);
    if (playersWithoutCards.length > 0) {
      errors.push(`${playersWithoutCards.length} players don't have hole cards`);
    }

    // Community cards should be empty before flop
    if (game.communalCards && game.communalCards.length > 0) {
      errors.push('Community cards already dealt');
    }

    return errors.length === 0
      ? validationSuccess()
      : validationFailure(errors);
  }

  /**
   * Validate that flop stage is complete
   */
  static validateFlopExit(game: PokerGameDocument): ValidationResult {
    const errors: string[] = [];

    // Should have 3 community cards
    if (!game.communalCards || game.communalCards.length !== 3) {
      errors.push(`Expected 3 community cards, got ${game.communalCards?.length || 0}`);
    }

    // Betting round must be complete
    const bettingValidation = this.validateBettingRoundComplete(game);
    if (!bettingValidation.valid) {
      errors.push(...bettingValidation.errors);
    }

    return errors.length === 0
      ? validationSuccess()
      : validationFailure(errors);
  }

  /**
   * Validate that turn stage can be entered
   */
  static validateTurnEntry(game: PokerGameDocument): ValidationResult {
    const errors: string[] = [];

    // Must have 3 community cards from flop
    if (!game.communalCards || game.communalCards.length !== 3) {
      errors.push('Must complete flop stage first (need 3 community cards)');
    }

    return errors.length === 0
      ? validationSuccess()
      : validationFailure(errors);
  }

  /**
   * Validate that turn stage is complete
   */
  static validateTurnExit(game: PokerGameDocument): ValidationResult {
    const errors: string[] = [];

    // Should have 4 community cards
    if (!game.communalCards || game.communalCards.length !== 4) {
      errors.push(`Expected 4 community cards, got ${game.communalCards?.length || 0}`);
    }

    // Betting round must be complete
    const bettingValidation = this.validateBettingRoundComplete(game);
    if (!bettingValidation.valid) {
      errors.push(...bettingValidation.errors);
    }

    return errors.length === 0
      ? validationSuccess()
      : validationFailure(errors);
  }

  /**
   * Validate that river stage can be entered
   */
  static validateRiverEntry(game: PokerGameDocument): ValidationResult {
    const errors: string[] = [];

    // Must have 4 community cards from turn
    if (!game.communalCards || game.communalCards.length !== 4) {
      errors.push('Must complete turn stage first (need 4 community cards)');
    }

    return errors.length === 0
      ? validationSuccess()
      : validationFailure(errors);
  }

  /**
   * Validate that river stage is complete
   */
  static validateRiverExit(game: PokerGameDocument): ValidationResult {
    const errors: string[] = [];

    // Should have 5 community cards
    if (!game.communalCards || game.communalCards.length !== 5) {
      errors.push(`Expected 5 community cards, got ${game.communalCards?.length || 0}`);
    }

    // Betting round must be complete
    const bettingValidation = this.validateBettingRoundComplete(game);
    if (!bettingValidation.valid) {
      errors.push(...bettingValidation.errors);
    }

    return errors.length === 0
      ? validationSuccess()
      : validationFailure(errors);
  }

  /**
   * Validate that showdown stage can be entered
   */
  static validateShowdownEntry(game: PokerGameDocument): ValidationResult {
    const errors: string[] = [];

    // Must have 5 community cards (or all players all-in)
    const playersWhoCanAct = getPlayersWhoCanAct(game.players);
    const allPlayersAllIn = playersWhoCanAct.length === 0;

    if (!allPlayersAllIn && (!game.communalCards || game.communalCards.length !== 5)) {
      errors.push('Must complete river stage first (need 5 community cards)');
    }

    // Must have at least 2 active players
    const activePlayers = getActivePlayers(game.players);
    if (activePlayers.length < 2) {
      errors.push('Need at least 2 active players for showdown');
    }

    return errors.length === 0
      ? validationSuccess()
      : validationFailure(errors);
  }

  /**
   * Master validation function - validates stage exit based on current stage
   */
  static validateCanExitStage(game: PokerGameDocument): ValidationResult {
    switch (game.stage) {
      case 0: // Preflop
        return this.validateBettingRoundComplete(game);
      case 1: // Flop
        return this.validateFlopExit(game);
      case 2: // Turn
        return this.validateTurnExit(game);
      case 3: // River
        return this.validateRiverExit(game);
      default:
        return validationFailure([`Unknown stage: ${game.stage}`]);
    }
  }

  /**
   * Master validation function - validates stage entry based on target stage
   */
  static validateCanEnterStage(game: PokerGameDocument, targetStage: number): ValidationResult {
    switch (targetStage) {
      case 0: // Preflop
        return this.validatePreflopEntry(game);
      case 1: // Flop
        return this.validateFlopEntry(game);
      case 2: // Turn
        return this.validateTurnEntry(game);
      case 3: // River
        return this.validateRiverEntry(game);
      case 4: // Showdown
        return this.validateShowdownEntry(game);
      default:
        return validationFailure([`Unknown target stage: ${targetStage}`]);
    }
  }
}
