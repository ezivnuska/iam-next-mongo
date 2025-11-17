// app/api/poker/fold/route.ts

import { withAuth } from '@/app/lib/api/with-auth';
import { fold } from '@/app/poker/lib/server/actions/poker-game-controller';
import { serializeGame } from '@/app/lib/utils/game-serialization';
import { withRateLimit, RATE_LIMITS } from '@/app/lib/api/rate-limiter';

export const POST = withRateLimit(RATE_LIMITS.GAME_ACTION, withAuth(async (request, context, session) => {
  const { gameId } = await request.json();
  if (!gameId) {
    return Response.json({ error: 'gameId is required' }, { status: 400 });
  }

  try {
    const gameState = await fold(gameId, session.user.id);
    const serialized = serializeGame(gameState);

    // Note: The fold function in poker-game-controller.ts now handles:
    // 1. Emitting fold notification
    // 2. Emitting winner notification
    // 3. Waiting for winner notification to complete
    // 4. Triggering game reset and restart flow
    // 5. Emitting round_complete with winner: undefined for restart notification
    // So we don't need to emit any additional events here

    return Response.json({ success: true, gameState: serialized });
  } catch (error) {
    console.error('Error folding:', error);
    return Response.json({
      error: error instanceof Error ? error.message : 'Failed to fold'
    }, { status: 500 });
  }
}));
