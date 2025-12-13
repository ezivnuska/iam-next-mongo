// app/lib/utils/socket-helper.ts

import { emitViaAPI } from '@/app/api/socket/io';
import { SOCKET_EVENTS } from '@/app/lib/socket/events';
import { serializeGame } from './game-serialization';
import type { PokerGameDocument } from '@/app/games/poker/lib/models/poker-game';
import type { PokerNotificationPayload } from '@/app/lib/socket/events';

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
   * Emit player presence updated event
   */
  static async emitPlayerPresenceUpdated(payload: {
    playerId: string;
    isAway: boolean;
  }) {
    await emitViaAPI(SOCKET_EVENTS.POKER_PLAYER_PRESENCE_UPDATED, payload);
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
   * Emit game unlocked event (game ended/canceled)
   */
  static async emitGameUnlocked(payload: {
    locked: false;
    stage: number;
    dealerButtonPosition: number;
  }) {
    await emitViaAPI(SOCKET_EVENTS.POKER_GAME_UNLOCKED, payload);
  }

  /**
   * Emit game restart event (clears cards immediately)
   */
  static async emitGameRestart(payload: {
    stage: number;
    locked: boolean;
    players: any[];
    communalCards: any[];
    pot: any[];
    playerBets: number[];
    currentPlayerIndex: number;
    dealerButtonPosition?: number;
    actionHistory: any[];
    winner?: any;
  }) {
    await emitViaAPI(SOCKET_EVENTS.POKER_STATE_UPDATE, payload);
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
    players?: any[]; // Include players array for chip count and all-in status updates
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
    players?: any[];
    currentPlayerIndex?: number;
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
   * Emit dealer button moved event (granular update)
   */
  static async emitDealerButtonMoved(payload: {
    dealerButtonPosition: number;
  }) {
    await emitViaAPI(SOCKET_EVENTS.POKER_DEALER_BUTTON_MOVED, payload);
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
   * Emit game notification event
   */
  static async emitGameNotification(payload: {
    message: string;
    type: 'blind' | 'deal' | 'action' | 'info';
    duration?: number;
    excludeUserId?: string;
  }) {
    const { excludeUserId, ...data } = payload;
    await emitViaAPI(SOCKET_EVENTS.POKER_GAME_NOTIFICATION, data, undefined, excludeUserId);
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
      // Note: Stage transition notifications are already emitted by poker-game-flow.ts
      // before cards are dealt, so we don't emit duplicate notifications here
      await this.emitCardsDealt(results.cardsDealt);
    }
    if (results.roundComplete) {
      await this.emitRoundComplete(results.roundComplete);
    }
  }

  /**
   * Emit poker notification event (new event-based system)
   * This replaces action history-based notification detection
   * @param payload - The notification payload
   * @param excludeUserId - Optional user ID to exclude from receiving this notification (for optimistic updates)
   */
  static async emitNotification(payload: PokerNotificationPayload, excludeUserId?: string) {
    try {
      const result = await emitViaAPI(SOCKET_EVENTS.POKER_NOTIFICATION, payload, undefined, excludeUserId);
      return result;
    } catch (error) {
      console.error('[PokerSocketEmitter] Failed to emit notification:', error);
      throw error;
    }
  }

  /**
   * Cancel/clear any active notification
   * Used when game state changes make the notification irrelevant (e.g., player leaves during countdown)
   */
  static async emitNotificationCanceled() {
    try {
      const result = await emitViaAPI(SOCKET_EVENTS.POKER_NOTIFICATION_CANCELED, {});
      return result;
    } catch (error) {
      console.error('[PokerSocketEmitter] Failed to emit notification canceled:', error);
      throw error;
    }
  }

  /**
   * Notify clients that the game was reset due to staleness
   * Clients should show modal and reload
   */
  static async emitGameStaleReset() {
    try {
      const result = await emitViaAPI(SOCKET_EVENTS.POKER_GAME_STALE_RESET, {});
      return result;
    } catch (error) {
      console.error('[PokerSocketEmitter] Failed to emit game stale reset:', error);
      throw error;
    }
  }
}

/**
 * Check if a player is currently connected via socket.io
 * @param playerId - The player's user ID
 * @param playerUsername - Optional username for guest player fallback matching
 * @returns true if the player has an active socket connection, false otherwise
 */
export function isPlayerConnected(playerId: string, playerUsername?: string): boolean {
  const io = (global as any).io;
  if (!io) {
    console.warn('[SocketHelper] Socket.IO instance not available');
    return false;
  }

  // Check if any socket is connected with this userId
  const sockets = Array.from(io.sockets.sockets.values());
  let isConnected = sockets.some((socket: any) => socket.userId === playerId);

  // For guest players, also check by username as a fallback
  // This handles any ID mismatch scenarios (pending updates, reconnections, etc.)
  if (!isConnected && playerUsername && playerId.startsWith('guest-')) {
    isConnected = sockets.some((socket: any) =>
      socket.username === playerUsername &&
      (socket.userId === 'guest-pending' || socket.userId?.startsWith('guest-'))
    );
  }

  return isConnected;
}
