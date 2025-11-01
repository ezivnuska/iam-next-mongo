// app/lib/utils/socket-helper.ts

import { emitViaAPI } from '@/app/api/socket/io';
import { SOCKET_EVENTS } from '@/app/lib/socket/events';
import { serializeGame } from './game-serialization';
import type { PokerGameDocument } from '@/app/lib/models/poker-game';

/**
 * Centralized poker game socket event emitter
 *
 * Handles all socket emissions for poker games with proper serialization
 */
export class PokerSocketEmitter {
  /**
   * Emit full game state update
   * Used for: join, leave, restart, general updates
   */
  static async emitStateUpdate(game: PokerGameDocument | any) {
    const serialized = serializeGame(game);
    await emitViaAPI(SOCKET_EVENTS.POKER_STATE_UPDATE, serialized);
  }

  /**
   * Emit game created event
   */
  static async emitGameCreated(game: PokerGameDocument | any) {
    const serialized = serializeGame(game);
    await emitViaAPI(SOCKET_EVENTS.POKER_GAME_CREATED, serialized);
  }

  /**
   * Emit game deleted event
   */
  static async emitGameDeleted(gameId: string) {
    await emitViaAPI(SOCKET_EVENTS.POKER_GAME_DELETED, { gameId });
  }

  /**
   * Emit player joined event
   */
  static async emitPlayerJoined(payload: {
    player: any;
    players: any[];
    playerCount: number;
    lockTime?: string;
    actionHistory: any[];
  }) {
    await emitViaAPI(SOCKET_EVENTS.POKER_PLAYER_JOINED, payload);
  }

  /**
   * Emit player left event
   */
  static async emitPlayerLeft(payload: {
    playerId: string;
    players: any[];
    playerCount: number;
    gameReset?: boolean;
    actionHistory: any[];
  }) {
    await emitViaAPI(SOCKET_EVENTS.POKER_PLAYER_LEFT, payload);
  }

  /**
   * Emit game locked event (game starting)
   */
  static async emitGameLocked(payload: {
    locked: true;
    stage: number;
    players: any[];
    currentPlayerIndex: number;
    lockTime?: string;
    pot?: any[];
    playerBets?: number[];
    actionHistory?: any[];
  }) {
    await emitViaAPI(SOCKET_EVENTS.POKER_GAME_LOCKED, payload);
  }

  /**
   * Emit bet placed event
   */
  static async emitBetPlaced(payload: {
    playerIndex: number;
    chipCount: number;
    pot: any[];
    playerBets: number[];
    currentPlayerIndex: number;
    actionHistory: any[];
  }) {
    await emitViaAPI(SOCKET_EVENTS.POKER_BET_PLACED, payload);
  }

  /**
   * Emit cards dealt event
   */
  static async emitCardsDealt(payload: {
    stage: number;
    communalCards: any[];
    deckCount: number;
  }) {
    await emitViaAPI(SOCKET_EVENTS.POKER_CARDS_DEALT, payload);
  }

  /**
   * Emit round complete event (winner determined)
   */
  static async emitRoundComplete(payload: {
    winner: any;
    players: any[];
  }) {
    await emitViaAPI(SOCKET_EVENTS.POKER_ROUND_COMPLETE, payload);
  }

  /**
   * Emit action timer started event
   */
  static async emitTimerStarted(payload: {
    startTime: string;
    duration: number;
    currentActionIndex: number;
    totalActions: number;
    actionType: string;
    targetPlayerId?: string;
  }) {
    await emitViaAPI(SOCKET_EVENTS.POKER_ACTION_TIMER_STARTED, payload);
  }

  /**
   * Emit action timer paused event
   */
  static async emitTimerPaused(payload: {
    pausedAt: string;
    remainingSeconds: number;
  }) {
    await emitViaAPI(SOCKET_EVENTS.POKER_ACTION_TIMER_PAUSED, payload);
  }

  /**
   * Emit action timer resumed event
   */
  static async emitTimerResumed(payload: {
    resumedAt: string;
    duration: number;
    currentActionIndex: number;
    totalActions: number;
    actionType: string;
    targetPlayerId?: string;
  }) {
    await emitViaAPI(SOCKET_EVENTS.POKER_ACTION_TIMER_RESUMED, payload);
  }

  /**
   * Emit action timer cleared event
   */
  static async emitTimerCleared() {
    await emitViaAPI(SOCKET_EVENTS.POKER_ACTION_TIMER_CLEARED, {});
  }

  /**
   * Emit action timer action set event
   */
  static async emitTimerActionSet(payload: {
    playerId: string;
    action: 'fold' | 'call' | 'check' | 'bet' | 'raise';
  }) {
    await emitViaAPI(SOCKET_EVENTS.POKER_ACTION_TIMER_ACTION_SET, payload);
  }

  /**
   * Emit game action results (bet, round complete, cards dealt)
   * Convenience method for handling placeBet results
   */
  static async emitGameActionResults(results: {
    betPlaced?: any;
    cardsDealt?: any;
    roundComplete?: any;
  }) {
    if (results.betPlaced) {
      await this.emitBetPlaced(results.betPlaced);
    }
    if (results.cardsDealt) {
      await this.emitCardsDealt(results.cardsDealt);
    }
    if (results.roundComplete) {
      await this.emitRoundComplete(results.roundComplete);
    }
  }
}
