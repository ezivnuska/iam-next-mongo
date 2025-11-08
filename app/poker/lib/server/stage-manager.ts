// app/poker/lib/server/stage-manager.ts

import type { PokerGameDocument } from '../models/poker-game';
import { PokerGame } from '../models/poker-game';
import { GameStage, StageStatus, type Player } from '../definitions/poker';
import { POKER_TIMERS } from '../config/poker-constants';
import { dealCommunalCards as dealCommunalCardsFromDealer, ensureCommunalCardsComplete } from './poker-dealer';
import { determineWinner } from '../utils/poker';
import { awardPotToWinners, savePlayerBalances } from './poker-game-flow';
import { randomBytes } from 'crypto';
import { ActionHistoryType } from '../definitions/action-history';
import { getActivePlayers, getPlayersWhoCanAct } from '../utils/player-helpers';

/**
 * StageManager - Single source of truth for stage lifecycle
 *
 * Responsibilities:
 * - Track stage status (NOT_STARTED, ENTERING, ACTIVE, COMPLETING, COMPLETE)
 * - Enforce stage completion before advancement
 * - Coordinate server/client timing
 * - Handle auto-advancement for all-in scenarios
 */
export class StageManager {
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
        cardsDealt: game.stage === GameStage.Preflop, // Hole cards already dealt in preflop
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

    // If at River, game should end
    if (game.stage === GameStage.River) {
      return 'end-game';
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

    // Deal communal cards if not Preflop
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
      }
    }

    // Reset betting round
    game.playerBets = new Array(game.players.length).fill(0);
    game.markModified('playerBets');

    // Set first player to act (postflop rules) BEFORE emitting events
    this.setFirstToAct(game);

    // Emit cards dealt event AFTER setting currentPlayerIndex so clients get the correct value
    if (newStage > GameStage.Preflop) {
      await PokerSocketEmitter.emitCardsDealt({
        stage: newStage,
        communalCards: game.communalCards,
        deckCount: game.deck.length,
        players: game.players,
        currentPlayerIndex: game.currentPlayerIndex, // Include currentPlayerIndex so clients know whose turn it is
      });
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

    console.log(`[StageManager] Stage ${newStage} now ACTIVE`);
  }

  /**
   * Set first player to act according to poker rules
   */
  private static setFirstToAct(game: PokerGameDocument): void {
    const isHeadsUp = game.players.length === 2;
    const isPostflop = game.stage > GameStage.Preflop;
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
    switch (stage) {
      case GameStage.Flop:
        message = 'Dealing the Flop...';
        break;
      case GameStage.Turn:
        message = 'Dealing the Turn...';
        break;
      case GameStage.River:
        message = 'Dealing the River...';
        break;
      default:
        return; // No notification for Preflop
    }

    await PokerSocketEmitter.emitGameNotification({
      message,
      type: 'deal',
      duration: POKER_TIMERS.STAGE_TRANSITION_DELAY_MS,
    });

    console.log(`[StageManager] Notified clients about ${GameStage[stage]}`);
  }

  /**
   * Advance to next stage
   */
  static async advanceToNextStage(game: PokerGameDocument): Promise<boolean> {
    if (game.stage >= GameStage.River) {
      // Can't advance past River
      return false;
    }

    const nextStage = (game.stage + 1) as GameStage;
    await this.enterStage(game, nextStage);

    return true;
  }

  /**
   * Auto-advance through remaining stages when all players are all-in
   * Advances ONE stage at a time with delays between each
   * This ensures proper timing for notifications and card dealing
   *
   * @returns info about completion
   */
  static async autoAdvanceThroughRemainingStages(game: PokerGameDocument): Promise<{
    cardsDealt: boolean;
    gameComplete: boolean;
  }> {
    console.log('[StageManager] Auto-advancing through remaining stages (all players all-in)');

    let cardsDealt = false;
    let gameComplete = false;

    // Helper function for delays
    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    // Loop through remaining stages until River
    while (game.stage < GameStage.River && !gameComplete) {
      console.log(`[StageManager] Auto-advance: Current stage ${game.stage}, advancing...`);

      // Advance to next stage
      const advanced = await this.advanceToNextStage(game);
      if (advanced) {
        cardsDealt = true;

        // Wait for notification duration before proceeding to next stage
        // This ensures each notification completes before the next one starts
        console.log(`[StageManager] Waiting ${POKER_TIMERS.STAGE_TRANSITION_DELAY_MS}ms before next stage`);
        await delay(POKER_TIMERS.STAGE_TRANSITION_DELAY_MS);

        // Add buffer delay to ensure client has time to process
        await delay(POKER_TIMERS.CLIENT_PROCESSING_BUFFER_MS);
      } else {
        break;
      }

      // Check if we should still auto-advance after this stage
      if (!this.shouldAutoAdvance(game)) {
        console.log('[StageManager] Auto-advance stopping - players can now act');
        break;
      }
    }

    // After reaching River (or if we stopped early), determine winner if at River
    if (game.stage === GameStage.River) {
      console.log('[StageManager] Reached River during auto-advance, ending game...');
      await this.endGame(game);
      gameComplete = true;
    }

    return {
      cardsDealt,
      gameComplete
    };
  }

  /**
   * End the game and determine winner
   */
  static async endGame(game: PokerGameDocument): Promise<void> {
    console.log('[StageManager] Ending game, determining winner...');

    // Emit notification that game is ending
    const { PokerSocketEmitter } = await import('@/app/lib/utils/socket-helper');
    await PokerSocketEmitter.emitGameNotification({
      message: 'Revealing hands...',
      type: 'info',
      duration: 2000, // Short notification before showing winner
    });

    console.log('[StageManager] Notified clients about showdown');

    // Ensure we have all 5 communal cards for River
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

    // Reset all-in status for all players when round completes
    game.players = game.players.map((p: Player) => ({
      ...p,
      isAllIn: undefined,
      allInAmount: undefined,
    }));
    game.markModified('players');

    game.pot = [];
    game.locked = false;

    // Save player balances
    await savePlayerBalances(game.players);

    // Add action history
    game.actionHistory.push({
      id: randomBytes(8).toString('hex'),
      timestamp: new Date(),
      stage: game.stage,
      actionType: ActionHistoryType.GAME_ENDED,
      winnerId: winnerInfo.winnerId,
      winnerName: winnerInfo.winnerName,
    });
    game.markModified('actionHistory');

    await game.save();

    // Clear any existing action timer (game ended) - after save but before emit
    try {
      const { clearActionTimer } = await import('./poker-timer-controller');
      const gameId = String(game._id);
      await clearActionTimer(gameId);
    } catch (timerError) {
      console.error('[StageManager] Failed to clear timer:', timerError);
      // Don't fail game completion if timer clear fails
    }

    // Fetch fresh game state to ensure timer is cleared
    const freshGame = await PokerGame.findById(game._id);
    const gamePlayers = freshGame ? freshGame.players : game.players;
    const gameWinner = freshGame ? freshGame.winner : game.winner;

    // Emit winner event
    await PokerSocketEmitter.emitRoundComplete({
      winner: gameWinner,
      players: gamePlayers,
    });

    console.log(`[StageManager] Game complete. Winner: ${winnerInfo.winnerName}`);
  }
}
