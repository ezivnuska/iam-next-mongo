// app/api/poker/delete/route.ts

import { withAuth } from '@/app/lib/api/with-auth';
import { deleteGame } from '@/app/games/poker/lib/server/actions/poker-game-controller';
import { PokerSocketEmitter } from '@/app/lib/utils/socket-helper';
import { withRateLimit, RATE_LIMITS } from '@/app/lib/api/rate-limiter';
import { UserRole } from '@/app/lib/definitions/user';

export const DELETE = withRateLimit(RATE_LIMITS.DESTRUCTIVE, withAuth(async (request, context, session) => {
  if (session.user.role !== UserRole.Admin) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { gameId } = await request.json();
  if (!gameId) {
    return Response.json({ error: 'gameId is required' }, { status: 400 });
  }

  try {
    await deleteGame(gameId);
    // Notify all users that the game has been deleted
    await PokerSocketEmitter.emitGameDeleted(gameId);
    return Response.json({ success: true });
  } catch (error) {
    console.error('Error deleting game:', error);
    return Response.json({
      error: error instanceof Error ? error.message : 'Failed to delete game'
    }, { status: 500 });
  }
}));
