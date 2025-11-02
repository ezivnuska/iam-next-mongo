// app/poker/lib/server/connection-manager.ts

import { PokerSocketEmitter } from '@/app/lib/utils/socket-helper';

/**
 * Check if a player has been disconnected for too long
 *
 * A player is considered disconnected if:
 * - Their lastHeartbeat is older than 30 seconds
 * - It's currently their turn
 */
export function isPlayerDisconnected(
  player: any,
  isCurrentTurn: boolean
): boolean {
  if (!isCurrentTurn) return false;
  if (!player.lastHeartbeat) return false;

  const timeSinceHeartbeat = Date.now() - new Date(player.lastHeartbeat).getTime();
  const disconnectThreshold = 30000; // 30 seconds

  return timeSinceHeartbeat > disconnectThreshold;
}

/**
 * Auto-fold a disconnected player
 *
 * Called when:
 * 1. It's the player's turn
 * 2. They've been disconnected for >30 seconds
 * 3. No action timer is running OR timer has expired
 */
export async function autoFoldDisconnectedPlayer(
  gameId: string,
  playerId: string
): Promise<boolean> {
  try {
    // Import the fold function from poker-game-controller
    const { fold } = await import('./poker-game-controller');

    // Call the fold function which will:
    // - Set the other player as winner
    // - Update game state
    // - Emit state updates via socket
    await fold(gameId, playerId);

    // Emit additional notification about auto-fold
    const { PokerGame } = await import('@/app/poker/lib/models/poker-game');
    const game = await PokerGame.findOne({ code: gameId });

    if (game) {
      const disconnectedPlayer = game.players.find((p: any) => p.id === playerId);
      if (disconnectedPlayer) {
        await PokerSocketEmitter.emitGameNotification({
          message: `${disconnectedPlayer.username} was auto-folded (disconnected)`,
          type: 'action',
          duration: 3000,
        });
      }
    }

    return true;
  } catch (error) {
    console.error('Error auto-folding disconnected player:', error);
    return false;
  }
}

/**
 * Monitor all active games for disconnected players
 *
 * This should be called periodically (e.g., every 10 seconds)
 * to check for stale connections and auto-fold when necessary
 */
export async function monitorDisconnectedPlayers() {
  try {
    const { PokerGame } = await import('@/app/poker/lib/models/poker-game');

    // Find all active games (locked = true, winner = null)
    const activeGames = await PokerGame.find({
      locked: true,
      winner: { $exists: false },
    });

    for (const game of activeGames) {
      const currentPlayer = game.players[game.currentPlayerIndex];

      if (currentPlayer && isPlayerDisconnected(currentPlayer, true)) {
        // Check if action timer exists and hasn't expired yet
        if (game.actionTimer) {
          const timerStartTime = new Date(game.actionTimer.startTime).getTime();
          const timerExpireTime = timerStartTime + (game.actionTimer.duration * 1000);

          if (Date.now() < timerExpireTime) {
            // Timer hasn't expired yet - let it handle the auto-action
            continue;
          }
        }

        // No timer or timer expired - auto-fold the disconnected player
        console.log(`Auto-folding disconnected player ${currentPlayer.username} in game ${game.code}`);
        await autoFoldDisconnectedPlayer(game.code, currentPlayer.id);
      }
    }
  } catch (error) {
    console.error('Error monitoring disconnected players:', error);
  }
}
