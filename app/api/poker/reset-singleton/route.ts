// app/api/poker/reset-singleton/route.ts

import { withAuth } from '@/app/lib/api/with-auth';
import { resetSingletonGame } from '@/app/poker/lib/server/game/singleton-game';
import { PokerSocketEmitter } from '@/app/lib/utils/socket-helper';
import { withRateLimit, RATE_LIMITS } from '@/app/lib/api/rate-limiter';

/**
 * Reset the singleton poker game to initial state
 * Only accessible to authenticated users
 */
export const POST = withRateLimit(RATE_LIMITS.DESTRUCTIVE, withAuth(async (request, context, session) => {
  try {
    const { gameId } = await request.json();

    if (!gameId) {
      return Response.json(
        { error: 'Game ID is required' },
        { status: 400 }
      );
    }

    console.log(`[ResetSingleton] Resetting game ${gameId} by user ${session.user.username}`);

    // Reset the singleton game (this also clears all timers internally)
    const resetGame = await resetSingletonGame(gameId);

    // Cancel any active notifications on clients
    await PokerSocketEmitter.emitNotificationCanceled();

    // Emit timer cleared event to sync client timers
    await PokerSocketEmitter.emitTimerCleared();

    // Emit state update to all clients
    await PokerSocketEmitter.emitStateUpdate(resetGame.toObject());

    console.log(`[ResetSingleton] Game ${gameId} reset successfully`);

    return Response.json({
      success: true,
      gameState: resetGame.toObject()
    });
  } catch (error: any) {
    const errorMessage = error?.message || 'Failed to reset game';
    console.error('[ResetSingleton] Error:', errorMessage);

    return Response.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}));
