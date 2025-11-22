// app/poker/lib/server/notification-queue-manager.ts

/**
 * Notification Queue Manager
 *
 * Handles sequential processing of game notifications:
 * - Player joined notifications (2s each)
 * - Game starting countdown (10s)
 * - Card dealing notifications (2s each)
 *
 * Ensures proper ordering and cancellation when new players join during countdown
 */

import { PokerSocketEmitter } from '@/app/lib/utils/socket-helper';
import { POKER_GAME_CONFIG, POKER_TIMERS } from '../../config/poker-constants';
import { scheduleGameLock, cancelGameLock } from '../locking/game-lock-manager';

interface NotificationQueueItem {
  type: 'player_joined' | 'game_starting' | 'cards_dealt';
  playerName?: string;
  playerId?: string;
  gameId?: string;
  stageName?: string; // For cards_dealt: 'PRE-FLOP', 'FLOP', 'TURN', 'RIVER'
}

// Store queue per game
const gameQueues = new Map<string, NotificationQueueItem[]>();
const processingGames = new Set<string>();

// Track currently displaying notification and its cancellation
const activeNotifications = new Map<string, {
  type: 'player_joined' | 'game_starting' | 'cards_dealt';
  cancelFn?: () => void;
}>();

/**
 * Add a player joined notification to the queue
 */
export async function queuePlayerJoinedNotification(
  gameId: string,
  playerName: string,
  playerId: string
): Promise<void> {
  console.log(`[NotificationQueue] Adding player_joined notification for ${playerName} (${playerId}) to game ${gameId}`);

  // Initialize queue if doesn't exist
  if (!gameQueues.has(gameId)) {
    gameQueues.set(gameId, []);
  }

  const queue = gameQueues.get(gameId)!;
  const activeNotification = activeNotifications.get(gameId);

  // Check if there's a game_starting in queue or active - need to cancel on client
  const hasQueuedGameStarting = queue.some(item => item.type === 'game_starting');
  const hasActiveGameStarting = activeNotification?.type === 'game_starting';
  const needsClientCancellation = hasQueuedGameStarting || hasActiveGameStarting;

  // IMMEDIATELY emit notification canceled to client FIRST if there's any game_starting
  // This ensures the client UI updates instantly when player joins
  if (needsClientCancellation) {
    const { PokerSocketEmitter } = await import('@/app/lib/utils/socket-helper');
    await PokerSocketEmitter.emitNotificationCanceled();
    console.log(`[NotificationQueue] ⚡ IMMEDIATE cancellation sent to client (player joined during ${hasActiveGameStarting ? 'active' : 'queued'} game_starting)`);
  }

  // ALWAYS cancel any pending game lock timer
  // This handles the edge case where countdown completed but lock hasn't fired yet
  cancelGameLock(gameId);

  // CRITICAL FIX: Also cancel any restart timer (from resetGameForNextRound)
  // This prevents the game from auto-locking when a player joins during restart countdown
  const { cancelGameRestart } = await import('../locking/game-lock-manager');
  cancelGameRestart(gameId);

  // ALWAYS remove any existing game_starting from queue first (prevents duplicates)
  for (let i = queue.length - 1; i >= 0; i--) {
    if (queue[i].type === 'game_starting') {
      queue.splice(i, 1);
    }
  }

  // Add player joined notification
  queue.push({
    type: 'player_joined',
    playerName,
    playerId,
  });

  // Add NEW game_starting notification at the end
  queue.push({
    type: 'game_starting',
    gameId,
  });

  // If there's an active game_starting notification, cancel it via the queue system
  if (hasActiveGameStarting) {
    console.log('[NotificationQueue] Canceling active game_starting countdown');
    if (activeNotification.cancelFn) {
      activeNotification.cancelFn();
    }
  }

  console.log(`[NotificationQueue] Queue updated: ${queue.length} items (added player_joined + new game_starting)`);

  // Start processing if not already processing
  if (!processingGames.has(gameId)) {
    processQueue(gameId);
  }
}

/**
 * Reset the game starting timer when a player leaves
 * Cancels any active game_starting notification and queues a new one
 */
export async function resetGameStartingOnPlayerLeave(gameId: string): Promise<void> {
  console.log(`[NotificationQueue] Resetting game_starting timer due to player leave in game ${gameId}`);

  // Initialize queue if doesn't exist
  if (!gameQueues.has(gameId)) {
    gameQueues.set(gameId, []);
  }

  const queue = gameQueues.get(gameId)!;
  const activeNotification = activeNotifications.get(gameId);

  // Check if there's a game_starting active or in queue - need to cancel on client
  const hasQueuedGameStarting = queue.some(item => item.type === 'game_starting');
  const hasActiveGameStarting = activeNotification?.type === 'game_starting';
  const needsClientCancellation = hasQueuedGameStarting || hasActiveGameStarting;

  // IMMEDIATELY emit notification canceled to client FIRST if there's any game_starting
  // This ensures the client UI updates instantly when player leaves
  if (needsClientCancellation) {
    await PokerSocketEmitter.emitNotificationCanceled();
    console.log(`[NotificationQueue] ⚡ IMMEDIATE cancellation sent to client (player left during ${hasActiveGameStarting ? 'active' : 'queued'} game_starting)`);
  }

  // ALWAYS cancel any pending game lock timer
  // This handles the edge case where countdown completed but lock hasn't fired yet
  cancelGameLock(gameId);

  // CRITICAL FIX: Also cancel any restart timer (from resetGameForNextRound)
  // This prevents the game from auto-locking when a player leaves during restart countdown
  const { cancelGameRestart } = await import('../locking/game-lock-manager');
  cancelGameRestart(gameId);

  // ALWAYS remove any existing game_starting from queue first (prevents duplicates)
  for (let i = queue.length - 1; i >= 0; i--) {
    if (queue[i].type === 'game_starting') {
      queue.splice(i, 1);
    }
  }

  // Add NEW game_starting notification
  queue.push({
    type: 'game_starting',
    gameId,
  });

  // If there's an active game_starting notification, cancel it via the queue system
  if (hasActiveGameStarting) {
    console.log('[NotificationQueue] Canceling active game_starting countdown');
    if (activeNotification.cancelFn) {
      activeNotification.cancelFn();
    }
  }

  console.log(`[NotificationQueue] Queue updated: ${queue.length} items (added new start timer)`);

  // Start processing if not already processing
  if (!processingGames.has(gameId)) {
    processQueue(gameId);
  }
}

/**
 * Add game starting notification to queue
 * This is called automatically after player joined notifications
 */
export async function queueGameStartingNotification(gameId: string): Promise<void> {
  console.log(`[NotificationQueue] Adding game_starting notification to game ${gameId}`);

  if (!gameQueues.has(gameId)) {
    gameQueues.set(gameId, []);
  }

  const queue = gameQueues.get(gameId)!;

  // Only add if not already in queue
  if (!queue.some(item => item.type === 'game_starting')) {
    queue.push({
      type: 'game_starting',
      gameId,
    });
    console.log(`[NotificationQueue] Queue updated: ${queue.length} items`);
  }

  // Start processing if not already processing
  if (!processingGames.has(gameId)) {
    processQueue(gameId);
  }
}

/**
 * Add a cards dealt notification to the queue
 */
export async function queueCardsDealtNotification(
  gameId: string,
  stageName: 'PRE-FLOP' | 'FLOP' | 'TURN' | 'RIVER'
): Promise<void> {
  console.log(`[NotificationQueue] Adding cards_dealt notification for ${stageName} to game ${gameId}`);

  // Initialize queue if doesn't exist
  if (!gameQueues.has(gameId)) {
    gameQueues.set(gameId, []);
  }

  const queue = gameQueues.get(gameId)!;

  // Add cards dealt notification
  queue.push({
    type: 'cards_dealt',
    stageName,
  });

  console.log(`[NotificationQueue] Queue updated: ${queue.length} items (added cards_dealt for ${stageName})`);

  // Start processing if not already processing
  if (!processingGames.has(gameId)) {
    processQueue(gameId);
  }
}

/**
 * Process the notification queue for a game
 */
async function processQueue(gameId: string): Promise<void> {
  if (processingGames.has(gameId)) {
    console.log(`[NotificationQueue] Already processing queue for game ${gameId}`);
    return;
  }

  processingGames.add(gameId);
  console.log(`[NotificationQueue] Started processing queue for game ${gameId}`);

  const queue = gameQueues.get(gameId);
  if (!queue) {
    processingGames.delete(gameId);
    return;
  }

  while (queue.length > 0) {
    const item = queue.shift()!;
    console.log(`[NotificationQueue] Processing ${item.type} notification (${queue.length} remaining in queue)`);

    if (item.type === 'player_joined') {
      // Track active notification
      activeNotifications.set(gameId, { type: 'player_joined' });

      // Emit player joined notification
      await PokerSocketEmitter.emitNotification({
        notificationType: 'player_joined',
        category: 'info',
        playerName: item.playerName!,
        playerId: item.playerId!,
      });

      // Wait for notification to complete (2 seconds)
      console.log(`[NotificationQueue] Waiting 2s for player_joined notification to complete`);
      await new Promise(resolve => setTimeout(resolve, POKER_GAME_CONFIG.PLAYER_JOINED_NOTIFICATION_DURATION_MS));

      // Clear active notification
      activeNotifications.delete(gameId);

    } else if (item.type === 'game_starting') {
      // Setup cancellation
      let cancelled = false;
      let timeoutId: NodeJS.Timeout;
      let resolvePromise: (() => void) | null = null;

      const cancelFn = () => {
        cancelled = true;
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        // Resolve the promise to continue processing
        if (resolvePromise) {
          resolvePromise();
        }
        console.log('[NotificationQueue] Game starting notification cancelled');
      };

      // Track active notification with cancel function
      activeNotifications.set(gameId, { type: 'game_starting', cancelFn });

      // Emit game starting notification
      await PokerSocketEmitter.emitNotification({
        notificationType: 'game_starting',
        category: 'info',
        countdownSeconds: POKER_GAME_CONFIG.AUTO_LOCK_DELAY_SECONDS,
      });

      // Wait for countdown to complete (10 seconds), but allow cancellation
      console.log(`[NotificationQueue] Waiting 10s for game_starting countdown to complete`);
      await new Promise<void>(resolve => {
        resolvePromise = resolve;
        timeoutId = setTimeout(() => {
          if (!cancelled) {
            resolve();
          }
        }, POKER_GAME_CONFIG.AUTO_LOCK_DELAY_MS);
      });

      // Clear active notification
      activeNotifications.delete(gameId);

      // If cancelled, skip the game lock scheduling and continue to next notification
      if (cancelled) {
        console.log('[NotificationQueue] Skipping game lock scheduling - notification was cancelled');
        continue;
      }

      // Check if new items were added to queue during countdown (player joined/left)
      // If so, skip scheduling lock - a new game_starting will handle it
      if (queue.length > 0) {
        console.log(`[NotificationQueue] Skipping game lock scheduling - ${queue.length} items in queue (player joined/left during countdown)`);
        continue;
      }

      // After countdown completes, schedule the actual game lock
      console.log(`[NotificationQueue] Game starting countdown complete - scheduling game lock`);
      const { PokerGame } = await import('../../models/poker-game');
      const game = await PokerGame.findById(gameId);

      if (game && !game.locked) {
        // Schedule game to lock immediately (countdown already completed)
        const lockTime = new Date(Date.now() + 100); // Lock almost immediately
        game.lockTime = lockTime;
        await game.save();
        scheduleGameLock(gameId, lockTime);
        console.log(`[NotificationQueue] Game lock scheduled`);
      }

    } else if (item.type === 'cards_dealt') {
      // Track active notification
      activeNotifications.set(gameId, { type: 'cards_dealt' });

      // Emit cards dealt notification
      await PokerSocketEmitter.emitNotification({
        notificationType: 'cards_dealt',
        category: 'deal',
        stageName: item.stageName!,
      });

      // Wait for notification to complete (2 seconds)
      console.log(`[NotificationQueue] Waiting 2s for cards_dealt notification (${item.stageName}) to complete`);
      await new Promise(resolve => setTimeout(resolve, POKER_TIMERS.PLAYER_ACTION_NOTIFICATION_DURATION_MS));

      // Clear active notification
      activeNotifications.delete(gameId);
    }
  }

  console.log(`[NotificationQueue] Finished processing queue for game ${gameId}`);
  processingGames.delete(gameId);

  // Clean up empty queue
  if (queue.length === 0) {
    gameQueues.delete(gameId);
  }
}

/**
 * Clear queue for a game (called when game starts or is deleted)
 */
export function clearQueue(gameId: string): void {
  console.log(`[NotificationQueue] Clearing queue for game ${gameId}`);

  // Cancel any active notification
  const activeNotification = activeNotifications.get(gameId);
  if (activeNotification?.cancelFn) {
    activeNotification.cancelFn();
  }

  gameQueues.delete(gameId);
  processingGames.delete(gameId);
  activeNotifications.delete(gameId);
}
