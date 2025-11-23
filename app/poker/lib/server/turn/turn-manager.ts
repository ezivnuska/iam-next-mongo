// app/poker/lib/server/turn-manager.ts
/**
 * Turn Manager - Handles player turn tracking and validation
 * Manages the state of the current betting round
 */

import type { PokerGameDocument } from '../../models/poker-game';
import type { Player } from '../../definitions/poker';
import type { ValidationResult, TurnContext, BettingRoundState } from '../../definitions/validation';
import { validationSuccess, validationFailure } from '../../definitions/validation';
import { getPlayersWhoCanAct, getActivePlayers } from '../../utils/player-helpers';
import { calculateFirstToActForBettingRound } from '../flow/step-manager';

export class TurnManager {
  /**
   * Get the current player whose turn it is
   */
  static getCurrentPlayer(game: PokerGameDocument): Player | null {
    if (game.currentPlayerIndex < 0 || game.currentPlayerIndex >= game.players.length) {
      return null;
    }
    return game.players[game.currentPlayerIndex];
  }

  /**
   * Get turn context for current player
   */
  static getCurrentTurnContext(game: PokerGameDocument): TurnContext | null {
    const player = this.getCurrentPlayer(game);
    if (!player) return null;

    // Count actions in current stage
    const actionsInStage = game.actionHistory.filter(
      action => action.stage === game.stage && !action.isBlind
    ).length;

    // Determine required action based on current bet state
    const playerBet = game.playerBets[game.currentPlayerIndex] || 0;
    const maxBet = Math.max(...game.playerBets);

    let actionRequired: 'bet' | 'check' | 'call' | 'raise' | 'fold';
    if (maxBet === 0) {
      actionRequired = 'check'; // Can check or bet
    } else if (playerBet === maxBet) {
      actionRequired = 'check'; // Already matched
    } else {
      actionRequired = 'call'; // Need to call or raise
    }

    return {
      playerId: player.id,
      playerIndex: game.currentPlayerIndex,
      turnNumber: actionsInStage + 1,
      stage: game.stage,
      actionRequired,
    };
  }

  /**
   * Validate that a player can take their turn
   */
  static validatePlayerCanAct(game: PokerGameDocument, playerId: string): ValidationResult {
    const errors: string[] = [];

    // Game must be locked
    if (!game.locked) {
      errors.push('Game is not locked');
    }

    // Find player
    const playerIndex = game.players.findIndex(p => p.id === playerId);
    if (playerIndex === -1) {
      errors.push('Player not in game');
      return validationFailure(errors);
    }

    const player = game.players[playerIndex];

    // Must be player's turn
    if (game.currentPlayerIndex !== playerIndex) {
      errors.push(`Not player's turn (current: ${game.currentPlayerIndex}, player: ${playerIndex})`);
    }

    // Player must not be folded
    if (player.folded) {
      errors.push('Player has folded');
    }

    // Player must not be all-in
    if (player.isAllIn) {
      errors.push('Player is all-in');
    }

    // Player must have chips (or be going all-in)
    if (player.chipCount === 0) {
      errors.push('Player has no chips');
    }

    return errors.length === 0
      ? validationSuccess()
      : validationFailure(errors);
  }

  /**
   * Get betting round state - tracks who has acted
   */
  static getBettingRoundState(game: PokerGameDocument): BettingRoundState {
    const startingPlayerIndex = calculateFirstToActForBettingRound(game);


    // Get all VOLUNTARY actions in current stage
    // IMPORTANT: Blinds are FORCED bets, not voluntary actions
    // For betting completion, only count voluntary actions (bet/call/raise/check/fold)
    // This ensures the big blind player gets "option" after action comes back to them
    const voluntaryActions = game.actionHistory.filter(
      action => action.stage === game.stage && !action.isBlind
    );

    voluntaryActions.forEach(action => {
    });

    const playersActed = new Set(
      voluntaryActions
        .map(action => action.playerId)
        .filter((id): id is string => id !== undefined)
    );

    const playerActions = new Map();
    voluntaryActions.forEach(action => {
      if (action.playerId) {
        // Store the most recent action for each player
        playerActions.set(action.playerId, this.mapActionTypeToPlayerAction(action.actionType));
      }
    });

    // Check if betting is complete
    const playersWhoCanAct = getPlayersWhoCanAct(game.players);
    const activePlayers = getActivePlayers(game.players);


    // All active players should have equal bets
    const activePlayerBets = activePlayers.map(p => {
      const idx = game.players.findIndex(player => player.id === p.id);
      return game.playerBets[idx] || 0;
    });


    const allBetsEqual = activePlayerBets.length > 0 &&
      activePlayerBets.every(bet => bet === activePlayerBets[0]);


    // Check if all players who CAN ACT have acted (not just active players)
    // Active players include all-in players who can't act, so we need to check playersWhoCanAct instead
    const playersWhoCanActIds = playersWhoCanAct.map(p => p.id);
    const allPlayersWhoCanActHaveActed = playersWhoCanActIds.every(id => playersActed.has(id));


    // Debug: Show which players who can act haven't acted
    const playersWhoCanActButHavent = playersWhoCanActIds.filter(id => !playersActed.has(id));
    if (playersWhoCanActButHavent.length > 0) {
      const notActedNames = playersWhoCanActButHavent.map(id => {
        const p = game.players.find(player => player.id === id);
        return p ? p.username : 'unknown';
      });
    }

    const bettingComplete = (allBetsEqual && allPlayersWhoCanActHaveActed) || playersWhoCanAct.length === 0;


    return {
      startingPlayerIndex,
      playersActed,
      playerActions,
      bettingComplete,
    };
  }

  /**
   * Validate that the betting round is complete
   */
  static validateBettingRoundComplete(game: PokerGameDocument): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    const roundState = this.getBettingRoundState(game);

    if (!roundState.bettingComplete) {
      errors.push('Betting round not complete');

      // Add details about what's missing
      const playersWhoCanAct = getPlayersWhoCanAct(game.players);
      const activePlayers = getActivePlayers(game.players);

      const playersNotActed = activePlayers.filter(
        p => !roundState.playersActed.has(p.id) && playersWhoCanAct.some(wp => wp.id === p.id)
      );

      if (playersNotActed.length > 0) {
        errors.push(`Players who haven't acted: ${playersNotActed.map(p => p.username).join(', ')}`);
      }

      // Check bet equality
      const activePlayerBets = activePlayers.map(p => {
        const idx = game.players.findIndex(player => player.id === p.id);
        return game.playerBets[idx] || 0;
      });

      if (!activePlayerBets.every(bet => bet === activePlayerBets[0])) {
        errors.push(`Bets not equal: [${activePlayerBets.join(', ')}]`);
      }
    }

    return errors.length === 0
      ? validationSuccess(warnings)
      : validationFailure(errors, warnings);
  }

  /**
   * Calculate turns remaining in current betting round
   */
  static getTurnsRemainingInStage(game: PokerGameDocument): number {
    const playersWhoCanAct = getPlayersWhoCanAct(game.players);
    const roundState = this.getBettingRoundState(game);

    if (roundState.bettingComplete) {
      return 0;
    }

    // Count how many players still need to act or match bets
    const activePlayers = getActivePlayers(game.players);
    const maxBet = Math.max(...game.playerBets);

    let turnsRemaining = 0;
    for (const player of playersWhoCanAct) {
      const idx = game.players.findIndex(p => p.id === player.id);
      const playerBet = game.playerBets[idx] || 0;

      // Player needs to act if they haven't matched the max bet
      if (playerBet < maxBet || !roundState.playersActed.has(player.id)) {
        turnsRemaining++;
      }
    }

    return turnsRemaining;
  }

  /**
   * Helper to map action history type to player action type
   */
  private static mapActionTypeToPlayerAction(actionType: string): string {
    const mapping: Record<string, string> = {
      'PLAYER_BET': 'bet',
      'PLAYER_RAISE': 'raise',
      'PLAYER_CALL': 'call',
      'PLAYER_CHECK': 'check',
      'PLAYER_FOLD': 'fold',
      'PLAYER_ALL_IN': 'all-in',
      'SMALL_BLIND': 'small-blind',
      'BIG_BLIND': 'big-blind',
    };
    return mapping[actionType] || 'unknown';
  }

  /**
   * Validate and advance to next player
   * Returns the new current player index, or -1 if round is complete
   */
  static advanceToNextPlayer(game: PokerGameDocument): number {
    const startIndex = game.currentPlayerIndex;
    let nextIndex = (startIndex + 1) % game.players.length;
    let attempts = 0;

    // Find next player who can act
    while (attempts < game.players.length) {
      const candidate = game.players[nextIndex];

      // Skip folded and all-in players
      if (!candidate.folded && !candidate.isAllIn) {
        return nextIndex;
      }

      nextIndex = (nextIndex + 1) % game.players.length;
      attempts++;
    }

    // No valid players found (all folded or all-in)
    return -1;
  }

  /**
   * Check if we've wrapped back to the starting position
   */
  static hasWrappedToStartingPlayer(game: PokerGameDocument): boolean {
    const startIndex = calculateFirstToActForBettingRound(game);
    const roundState = this.getBettingRoundState(game);

    // Must be back at starting position
    if (game.currentPlayerIndex !== startIndex) {
      return false;
    }

    // Must have had at least one action per active player
    const activePlayers = getActivePlayers(game.players);
    const actionsCount = game.actionHistory.filter(
      action => action.stage === game.stage && !action.isBlind
    ).length;

    return actionsCount >= activePlayers.length;
  }
}
