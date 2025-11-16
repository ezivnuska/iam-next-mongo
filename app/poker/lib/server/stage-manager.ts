// app/poker/lib/server/stage-manager.ts

import type { PokerGameDocument } from '../models/poker-game';
import { PokerGame } from '../models/poker-game';
import { GameStage, StageStatus, type Player } from '../definitions/poker';
import { POKER_TIMERS } from '../config/poker-constants';
import { dealCommunalCardsByStage as dealCommunalCardsFromDealer, ensureCommunalCardsComplete } from './poker-dealer';
import { determineWinner } from '../utils/poker';
import { awardPotToWinners, savePlayerBalances } from './poker-game-flow';
import { randomBytes } from 'crypto';
import { ActionHistoryType } from '../definitions/action-history';
import { getActivePlayers, getPlayersWhoCanAct } from '../utils/player-helpers';
import { StageValidators } from './stage-validators';
import { TurnManager } from './turn-manager';
import type { ValidationResult } from '../definitions/validation';

/**
 * StageManager - Single source of truth for stage lifecycle
 *
 * Responsibilities:
 * - Track stage status (NOT_STARTED, ENTERING, ACTIVE, COMPLETING, COMPLETE)
 * - Enforce stage completion before advancement
 * - Coordinate server/client timing
 * - Handle auto-advancement for all-in scenarios
 * - Validate stage transitions
 */
export class StageManager {
  /**
   * Validate that current stage can be exited
   * Logs validation errors and warnings
   */
  static validateStageExit(game: PokerGameDocument): ValidationResult {
    console.log(`[StageManager] Validating stage exit for stage ${game.stage}`);
    const validation = StageValidators.validateCanExitStage(game);

    if (!validation.valid) {
      console.error('[StageManager] Stage exit validation FAILED:', validation.errors);
    }

    if (validation.warnings.length > 0) {
      console.warn('[StageManager] Stage exit warnings:', validation.warnings);
    }

    return validation;
  }

  /**
   * Validate that target stage can be entered
   * Logs validation errors and warnings
   */
  static validateStageEntry(game: PokerGameDocument, targetStage: number): ValidationResult {
    console.log(`[StageManager] Validating stage entry for stage ${targetStage}`);
    const validation = StageValidators.validateCanEnterStage(game, targetStage);

    if (!validation.valid) {
      console.error('[StageManager] Stage entry validation FAILED:', validation.errors);
    }

    if (validation.warnings.length > 0) {
      console.warn('[StageManager] Stage entry warnings:', validation.warnings);
    }

    return validation;
  }

  /**
   * Validate betting round completion using TurnManager
   */
  static validateBettingRound(game: PokerGameDocument): ValidationResult {
    console.log(`[StageManager] Validating betting round for stage ${game.stage}`);
    const validation = TurnManager.validateBettingRoundComplete(game);

    if (!validation.valid) {
      console.warn('[StageManager] Betting round validation failed:', validation.errors);
    }

    return validation;
  }

  /**
   * Initialize stage completion tracking
   */
  static initStageTracking(game: PokerGameDocument): void {
    if (!game.stageStatus) {
      game.stageStatus = StageStatus.ACTIVE;
    }
    if (!game.stageCompletionChecks) {
      game.stageCompletionChecks = {
        bettingComplete: false,
        cardsDealt: game.stage === GameStage.Preflop, // Hole cards dealt in preflop
        notificationsSent: false,
      };
    }
    game.markModified('stageStatus');
    game.markModified('stageCompletionChecks');
  }

  /**
   * Check if current stage betting round is complete
   */
  static isBettingComplete(game: PokerGameDocument): boolean {
    const activePlayers = getActivePlayers(game.players);

    // Get players who can still act (not folded, not all-in)
    const playersWhoCanAct = getPlayersWhoCanAct(game.players);

    // If no one can act, betting is complete
    if (playersWhoCanAct.length === 0) {
      console.log('[StageManager] Betting complete: All players all-in or folded');
      return true;
    }

    // If only one player can act, check if all bets are equal
    if (playersWhoCanAct.length === 1) {
      const activePlayerBets = activePlayers.map((p: Player) => {
        const idx = game.players.findIndex((player: Player) => player.id === p.id);
        return game.playerBets[idx] || 0;
      });

      const allBetsEqual = activePlayerBets.length > 0 &&
        activePlayerBets.every((bet: number) => bet === activePlayerBets[0]);

      if (allBetsEqual) {
        console.log('[StageManager] Betting complete: Only one player can act and all bets equal');
        return true;
      }
    }

    // Check if we've wrapped around to the betting start position
    // This will be expanded with proper betting round tracking
    // For now, rely on the calling code to determine this

    return false;
  }

  /**
   * Mark current stage as complete
   * Sets stage status to COMPLETING and tracks completion checks
   */
  static completeStage(game: PokerGameDocument): void {
    console.log(`[StageManager] Completing stage ${game.stage}`);

    this.initStageTracking(game);

    game.stageStatus = StageStatus.COMPLETING;
    if (game.stageCompletionChecks) {
      game.stageCompletionChecks.bettingComplete = true;
    }

    game.markModified('stageStatus');
    game.markModified('stageCompletionChecks');
  }

  /**
   * Check if stage is fully complete and ready to advance
   */
  static isStageReadyToAdvance(game: PokerGameDocument): boolean {
    if (!game.stageCompletionChecks) {
      return false;
    }

    const { bettingComplete, cardsDealt, notificationsSent } = game.stageCompletionChecks;

    // All checks must be complete
    return bettingComplete && cardsDealt && notificationsSent;
  }

  /**
   * Determine what should happen next based on game state
   */
  static getNextAction(game: PokerGameDocument): 'advance' | 'auto-advance' | 'end-game' | 'continue-betting' {
    // If stage isn't complete, continue betting
    if (game.stageStatus !== StageStatus.COMPLETING && game.stageStatus !== StageStatus.COMPLETE) {
      return 'continue-betting';
    }

    // If at Showdown, game should end (after showdown completes)
    if (game.stage === GameStage.Showdown) {
      return 'end-game';
    }

    // If at River, advance to Showdown
    if (game.stage === GameStage.River) {
      return 'advance';
    }

    // Check if we should auto-advance (all players all-in)
    if (this.shouldAutoAdvance(game)) {
      return 'auto-advance';
    }

    // Normal advancement to next stage
    return 'advance';
  }

  /**
   * Check if we should auto-advance (all active players are all-in)
   */
  static shouldAutoAdvance(game: PokerGameDocument): boolean {
    const activePlayers = getActivePlayers(game.players);
    const playersWithChips = activePlayers.filter((p: Player) => !p.isAllIn && p.chipCount > 0);

    const shouldAuto = playersWithChips.length <= 1;

    console.log('[StageManager] Auto-advance check:', {
      activePlayers: activePlayers.length,
      playersWithChips: playersWithChips.length,
      shouldAutoAdvance: shouldAuto
    });

    return shouldAuto;
  }

  // enterBlindsStage removed - blinds are now posted silently at game start

  // sendBlindNotifications, sendSmallBlindNotification, sendBigBlindNotification removed
  // Blinds are now posted silently at game start without notifications

  /**
   * Enter a new stage
   * - Emit notifications
   * - Deal cards
   * - Reset betting round
   * - Set status to ACTIVE
   */
  static async enterStage(game: PokerGameDocument, newStage: GameStage): Promise<void> {
    console.log(`[StageManager] Entering stage ${newStage}`);

    game.stageStatus = StageStatus.ENTERING;
    game.markModified('stageStatus');

    // Emit stage notification
    const { PokerSocketEmitter } = await import('@/app/lib/utils/socket-helper');
    await this.emitStageNotification(newStage);

    // Preflop stage is handled at game start - this method is for advancing BETWEEN stages
    // Preflop should never be entered via advanceToNextStage
    if (newStage === GameStage.Preflop) {
      console.error('[StageManager] ERROR: Preflop should not be entered via advanceToNextStage');
      return;
    }

    // Showdown stage: No card dealing, no betting reset - just set up stage
    if (newStage === GameStage.Showdown) {
      game.stage = newStage;
      game.markModified('stage');

      // Mark stage as active immediately - showdown has no betting
      game.stageStatus = StageStatus.ACTIVE;
      game.stageCompletionChecks = {
        bettingComplete: true,  // No betting in showdown
        cardsDealt: true,       // No new cards in showdown
        notificationsSent: true,
      };

      game.markModified('stageStatus');
      game.markModified('stageCompletionChecks');

      await game.save();

      // Emit state update to show showdown stage
      await PokerSocketEmitter.emitStateUpdate(game);

      console.log(`[StageManager] Showdown stage active - caller will handle winner determination`);

      // Return immediately - caller will handle winner determination after notification completes
      return;
    }

    // Deal communal cards if not Preflop or Showdown
    if (newStage > GameStage.Preflop) {
      const prevStage = game.stage;
      const result = dealCommunalCardsFromDealer(game.deck, game.communalCards, prevStage);

      if (result) {
        game.stage = result.newStage;
        game.markModified('deck');
        game.markModified('communalCards');
        game.markModified('stage');

        // Log card dealing
        const numCardsDealt = prevStage === GameStage.Preflop ? 3 : 1;
        game.actionHistory.push({
          id: randomBytes(8).toString('hex'),
          timestamp: new Date(),
          stage: newStage,
          actionType: ActionHistoryType.CARDS_DEALT,
          cardsDealt: numCardsDealt,
        });
        game.markModified('actionHistory');

        // Save state before emitting notification
        await game.save();

        // Reset betting round and set first player to act BEFORE emitting events
        game.playerBets = new Array(game.players.length).fill(0);
        game.markModified('playerBets');
        this.setFirstToAct(game);

        // Save game after resetting playerBets and setting currentPlayerIndex
        // This ensures timer-triggered actions read correct state from database
        await game.save();

        // Emit dealing notification for visual feedback
        if (result.stageName) {
          await PokerSocketEmitter.emitNotification({
            notificationType: 'cards_dealt',
            category: 'deal',
            stageName: result.stageName, // Include stage name for appropriate message
          });

          // Emit cards dealt event immediately so cards appear at start of notification
          await PokerSocketEmitter.emitCardsDealt({
            stage: newStage,
            communalCards: game.communalCards,
            deckCount: game.deck.length,
            players: game.players,
            currentPlayerIndex: game.currentPlayerIndex, // Include currentPlayerIndex so clients know whose turn it is
          });

          // Wait for dealing notification to display
          await new Promise(resolve => setTimeout(resolve, POKER_TIMERS.PLAYER_ACTION_NOTIFICATION_DURATION_MS));
        }
      }
    }

    // Mark stage as active
    game.stageStatus = StageStatus.ACTIVE;
    game.stageCompletionChecks = {
      bettingComplete: false,
      cardsDealt: true,
      notificationsSent: true,
    };

    game.markModified('stageStatus');
    game.markModified('stageCompletionChecks');

    // Save final stage state
    await game.save();

    console.log(`[StageManager] Stage ${newStage} now ACTIVE`);
  }

  /**
   * Set first player to act according to poker rules
   */
  private static setFirstToAct(game: PokerGameDocument): void {
    const isHeadsUp = game.players.length === 2;
    const isPostflop = game.stage > GameStage.Preflop; // Stages after Preflop (Flop, Turn, River)
    const buttonPosition = game.dealerButtonPosition || 0;

    if (isPostflop) {
      let startPosition: number;

      if (isHeadsUp) {
        // Heads-up postflop: Big blind acts first (non-button player)
        startPosition = (buttonPosition + 1) % game.players.length;
      } else {
        // 3+ players postflop: Small blind acts first (left of button)
        startPosition = (buttonPosition + 1) % game.players.length;
      }

      // Find first active player starting from startPosition
      let nextIndex = startPosition;
      let foundValidPlayer = false;
      let attempts = 0;

      while (attempts < game.players.length) {
        const candidate = game.players[nextIndex];
        if (!candidate.isAllIn && !candidate.folded) {
          foundValidPlayer = true;
          break;
        }
        nextIndex = (nextIndex + 1) % game.players.length;
        attempts++;
      }

      if (foundValidPlayer) {
        game.currentPlayerIndex = nextIndex;
        game.markModified('currentPlayerIndex');
      }
    }
  }

  /**
   * Emit stage transition notification
   */
  private static async emitStageNotification(stage: GameStage): Promise<void> {
    const { PokerSocketEmitter } = await import('@/app/lib/utils/socket-helper');

    let message = '';
    let type: 'deal' | 'info' = 'deal';
    let duration: number = POKER_TIMERS.STAGE_TRANSITION_DELAY_MS;

    switch (stage) {
      case GameStage.Preflop:
        // No notification for Preflop - handled at game start
        return; // Exit early
      case GameStage.Flop:
        message = 'Dealing the Flop...';
        break;
      case GameStage.Turn:
        message = 'Dealing the Turn...';
        break;
      case GameStage.River:
        message = 'Dealing the River...';
        break;
      case GameStage.Showdown:
        message = 'Revealing hands...';
        type = 'info';
        duration = 2000; // Shorter notification for showdown
        break;
      case GameStage.End:
        // No notification for End - winner notification already shown
        return; // Exit early
      default:
        return;
    }

    await PokerSocketEmitter.emitGameNotification({
      message,
      type,
      duration,
    });

    console.log(`[StageManager] Notified clients about ${GameStage[stage]}`);
  }

  /**
   * Advance to next stage with validation
   */
  static async advanceToNextStage(game: PokerGameDocument): Promise<boolean> {
    if (game.stage >= GameStage.Showdown) {
      // Can't advance past Showdown (endGame handles GAME_ENDED transition)
      return false;
    }

    // VALIDATION GATE: Check if current stage can be exited
    const exitValidation = this.validateStageExit(game);
    if (!exitValidation.valid) {
      console.error('[StageManager] Cannot advance - stage exit validation failed:', exitValidation.errors);
      // Log warnings even if validation passed
      if (exitValidation.warnings.length > 0) {
        console.warn('[StageManager] Stage exit warnings (non-blocking):', exitValidation.warnings);
      }
      // For now, log error but don't block (Phase 1 - monitoring only)
      // In Phase 2, we would: throw new Error(`Cannot exit stage ${game.stage}: ${exitValidation.errors.join(', ')}`);
    }

    const nextStage = (game.stage + 1) as GameStage;

    // VALIDATION GATE: Check if next stage can be entered
    const entryValidation = this.validateStageEntry(game, nextStage);
    if (!entryValidation.valid) {
      console.error('[StageManager] Cannot advance - stage entry validation failed:', entryValidation.errors);
      // Log warnings even if validation passed
      if (entryValidation.warnings.length > 0) {
        console.warn('[StageManager] Stage entry warnings (non-blocking):', entryValidation.warnings);
      }
      // For now, log error but don't block (Phase 1 - monitoring only)
      // In Phase 2, we would: throw new Error(`Cannot enter stage ${nextStage}: ${entryValidation.errors.join(', ')}`);
    }

    await this.enterStage(game, nextStage);

    return true;
  }

  /**
   * Start auto-advance sequence through remaining stages when all players are all-in
   * Automatically advances through all stages with delays for notifications
   * This ensures proper timing for card dealing and winner determination
   */
  static async startAutoAdvanceSequence(game: PokerGameDocument): Promise<void> {
    console.log('[StageManager] Starting auto-advance sequence (all players all-in)');

    const { PokerSocketEmitter } = await import('@/app/lib/utils/socket-helper');
    const { POKER_TIMERS } = await import('../config/poker-constants');

    // Mark game as in auto-advance mode
    game.autoAdvanceMode = true;
    game.markModified('autoAdvanceMode');
    await game.save();

    // Continue advancing until we reach Showdown or can no longer auto-advance
    while (game.stage < GameStage.Showdown && this.shouldAutoAdvance(game)) {
      console.log(`[StageManager] Auto-advancing from stage ${game.stage}`);

      // Advance to next stage
      const advanced = await this.advanceToNextStage(game);

      if (!advanced) {
        console.log('[StageManager] Could not advance further, stopping auto-advance');
        break;
      }

      await game.save();
      await PokerSocketEmitter.emitStateUpdate(game);

      console.log(`[StageManager] Advanced to stage ${game.stage}, waiting for stage notification to complete`);

      // Wait for stage notification to complete (5 seconds)
      await new Promise(resolve => setTimeout(resolve, POKER_TIMERS.NOTIFICATION_DURATION_MS));
    }

    // Clear auto-advance mode
    game.autoAdvanceMode = false;
    game.markModified('autoAdvanceMode');

    // Check if we reached Showdown
    if (game.stage === GameStage.Showdown) {
      console.log('[StageManager] Reached Showdown during auto-advance, ending game');
      // endGame handles all state updates, saves, and round_complete emission internally
      await this.endGame(game);
      console.log('[StageManager] endGame complete, game has been reset and round_complete emitted');
    } else {
      console.log('[StageManager] Auto-advance sequence complete, players can now act');
      await game.save();
    }
  }

  // continueAutoAdvanceSequence removed - auto-advance now handles full sequence automatically

  /**
   * End the game and determine winner
   */
  static async endGame(game: PokerGameDocument): Promise<void> {
    console.log('[StageManager] Ending game, determining winner...');

    const { PokerSocketEmitter } = await import('@/app/lib/utils/socket-helper');

    // Ensure we have all 5 communal cards for Showdown
    ensureCommunalCardsComplete(game.deck, game.communalCards, 5);
    game.markModified('deck');
    game.markModified('communalCards');

    // Determine winner
    const winnerInfo = determineWinner(
      game.players.map((p: Player) => ({
        id: p.id,
        username: p.username,
        hand: p.hand,
      })),
      game.communalCards
    );

    game.winner = winnerInfo;
    awardPotToWinners(game, winnerInfo);

    // Save player balances
    await savePlayerBalances(game.players);

    // Clear currentPlayerIndex to remove white border (round is complete, no more turns)
    game.currentPlayerIndex = -1;
    game.markModified('currentPlayerIndex');

    // Add action history for game end (for UI display only, not notifications)
    game.actionHistory.push({
      id: randomBytes(8).toString('hex'),
      timestamp: new Date(),
      stage: game.stage,
      actionType: ActionHistoryType.GAME_ENDED,
      winnerId: winnerInfo.winnerId,
      winnerName: winnerInfo.winnerName,
      handRank: winnerInfo.handRank,
      isTie: winnerInfo.isTie,
      tiedPlayers: winnerInfo.tiedPlayers,
    });
    game.markModified('actionHistory');

    await game.save();

    // Emit state update FIRST to show hands and pot distribution
    // This allows clients to see the final hands while winner notification displays
    await PokerSocketEmitter.emitStateUpdate(game);

    console.log(`[StageManager] State updated with winner and pot distribution, now emitting winner notification`);

    // Emit winner notification (event-based)
    // Note: This is called after Showdown stage notification completes,
    // ensuring all previous action notifications have finished displaying
    if (winnerInfo.isTie) {
      await PokerSocketEmitter.emitNotification({
        notificationType: 'game_tied',
        category: 'info',
        isTie: true,
        tiedPlayers: winnerInfo.tiedPlayers,
      });
    } else {
      await PokerSocketEmitter.emitNotification({
        notificationType: 'winner_determined',
        category: 'info',
        winnerId: winnerInfo.winnerId,
        winnerName: winnerInfo.winnerName,
        handRank: winnerInfo.handRank,
      });
    }

    console.log(`[StageManager] Winner notification sent: ${winnerInfo.winnerName}`);
    console.log(`[StageManager] Starting fully server-driven restart flow`);

    // FULLY SERVER-DRIVEN RESTART FLOW (eliminates client-triggered API calls that cause page refreshes):
    // 1. Server emits winner notification (done above)
    // 2. Client shows winner notification for 10s (purely visual, no callbacks)
    // 3. Server waits 10s then automatically resets game
    // 4. Server emits game_starting notification
    // 5. Client shows "Game starting!" notification for 10s (purely visual, no callbacks)
    // 6. Server waits 10s then automatically locks and starts new game

    const { POKER_GAME_CONFIG } = await import('../config/poker-constants');

    // Wait for winner notification to complete (10 seconds)
    console.log('[StageManager] Waiting 10 seconds for winner notification to display');
    await new Promise(resolve => setTimeout(resolve, POKER_GAME_CONFIG.AUTO_LOCK_DELAY_MS));

    console.log('[StageManager] Winner notification complete - starting game reset');

    // Advance to End stage
    game.stage = GameStage.End;
    game.markModified('stage');
    await game.save();

    console.log('[StageManager] Advanced to End stage - calling resetGameForNextRound');

    // Reset and restart the game (this will emit game_starting and auto-lock after 10s)
    await StageManager.resetGameForNextRound(game);

    console.log('[StageManager] Game reset and restart flow complete');
  }

  /**
   * Reset game state after End stage
   * All cleanup and reset logic lives here
   */
  static async resetGameForNextRound(game: PokerGameDocument): Promise<void> {
    console.log('[StageManager] Resetting game for next round...');

    const { PokerSocketEmitter } = await import('@/app/lib/utils/socket-helper');
    const { POKER_GAME_CONFIG } = await import('../config/poker-constants');

    // ADVANCE DEALER BUTTON FIRST (before reset) - standard poker rules
    game.dealerButtonPosition = ((game.dealerButtonPosition || 0) + 1) % game.players.length;
    game.markModified('dealerButtonPosition');
    console.log(`[StageManager] Dealer button advanced to position ${game.dealerButtonPosition}`);

    // Save and emit granular update so clients see the button move BEFORE reset
    await game.save();
    await PokerSocketEmitter.emitDealerButtonMoved({
      dealerButtonPosition: game.dealerButtonPosition,
    });
    console.log('[StageManager] Dealer button advancement emitted to clients');

    // Unlock the game
    game.locked = false;
    await game.save();

    // Clear any existing action timer (game ended)
    try {
      const { clearActionTimer } = await import('./poker-timer-controller');
      const gameId = String(game._id);
      await clearActionTimer(gameId);
    } catch (timerError) {
      console.error('[StageManager] Failed to clear timer:', timerError);
      // Don't fail game completion if timer clear fails
    }

    // Reset game for next round
    const gameToReset = await PokerGame.findById(game._id);
    if (gameToReset) {
      // Initialize a fresh shuffled deck for the new game
      const { initializeDeck } = await import('./poker-dealer');

      gameToReset.winner = undefined;
      gameToReset.stage = 0; // Back to Preflop (stage 0)
      gameToReset.communalCards = [];
      gameToReset.playerBets = [];
      gameToReset.currentPlayerIndex = 0;
      gameToReset.actionHistory = [];
      gameToReset.pot = [];
      gameToReset.deck = initializeDeck(); // Fresh shuffled deck
      gameToReset.stages = [];
      gameToReset.lockTime = undefined;

      // Remove players with insufficient balance for next game
      const { BIG_BLIND } = POKER_GAME_CONFIG;
      const playersBeforeRemoval = gameToReset.players.length;

      console.log('[StageManager] Player balances before removal check:', gameToReset.players.map((p: Player) =>
        ({ username: p.username, chipCount: p.chipCount, canPlay: p.chipCount >= BIG_BLIND })
      ));

      // Filter out players who can't afford the big blind
      gameToReset.players = gameToReset.players.filter((p: Player) => {
        if (p.chipCount < BIG_BLIND) {
          console.log(`[StageManager] Removing player ${p.username} - insufficient balance (${p.chipCount} < ${BIG_BLIND})`);
          return false;
        }
        return true;
      });

      const playersRemoved = playersBeforeRemoval - gameToReset.players.length;
      if (playersRemoved > 0) {
        console.log(`[StageManager] Removed ${playersRemoved} player(s) with insufficient balance`);
      }

      // Check if we have enough players to continue (need at least 2)
      if (gameToReset.players.length < 2) {
        console.log(`[StageManager] Insufficient players to restart (${gameToReset.players.length} remaining). Canceling restart.`);

        // Unlock the game and save
        gameToReset.locked = false;
        gameToReset.markModified('players');
        await gameToReset.save();

        // Emit state update to show players have been removed
        await PokerSocketEmitter.emitStateUpdate(gameToReset);

        console.log('[StageManager] Game unlocked - restart canceled due to insufficient players');
        return; // Exit early - no restart
      }

      // Reset player state for next game (keep their balances)
      gameToReset.players = gameToReset.players.map((p: Player) => ({
        ...p,
        hand: [],
        folded: false,
        isAllIn: undefined,
        allInAmount: undefined,
        // IMPORTANT: Keep existing chipCount - balances persist across games
      }));

      console.log('[StageManager] Player balances for next game:', gameToReset.players.map((p: Player) =>
        ({ username: p.username, chipCount: p.chipCount })
      ));

      gameToReset.markModified('winner');
      gameToReset.markModified('stage');
      gameToReset.markModified('communalCards');
      gameToReset.markModified('playerBets');
      gameToReset.markModified('currentPlayerIndex');
      gameToReset.markModified('actionHistory');
      gameToReset.markModified('pot');
      gameToReset.markModified('deck');
      gameToReset.markModified('stages');
      gameToReset.markModified('players');

      await gameToReset.save();

      console.log('[StageManager] Game reset for next round');

      // Emit "Game starting!" notification to inform players
      // NOTE: pot and playerBets are intentionally omitted here to avoid race condition.
      // These will be synced via blind notifications and state updates from step flow.
      console.log('[StageManager] ✅ Emitting game starting notification');

      await PokerSocketEmitter.emitNotification({
        notificationType: 'game_starting',
        category: 'info',
        countdownSeconds: POKER_GAME_CONFIG.AUTO_LOCK_DELAY_SECONDS, // 10 seconds
        stage: 0, // Reset to preflop
      });

      console.log('[StageManager] ✅ Game starting notification emitted');

      // Wait for notification duration, then automatically lock the game
      // This is server-driven to avoid issues with client socket disconnections during page remounts
      console.log('[StageManager] Waiting 10 seconds before auto-locking game');
      await new Promise(resolve => setTimeout(resolve, POKER_GAME_CONFIG.AUTO_LOCK_DELAY_MS));

      console.log('[StageManager] 10 second countdown complete - auto-locking game');

      // Automatically lock and start the game using internal function (bypasses auth)
      const gameId = String(gameToReset._id);
      const { lockGameInternal } = await import('./lock-game-internal');

      await lockGameInternal(gameId);
      console.log('[StageManager] ✅ Game auto-locked and started successfully');
    }
  }
}
