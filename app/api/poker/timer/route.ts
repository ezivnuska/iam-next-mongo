// app/api/poker/timer/route.ts

import { withAuth } from '@/app/lib/api/with-auth';
import { setTurnTimerAction } from '@/app/poker/lib/server/poker-game-controller';
import { serializeGame } from '@/app/lib/utils/game-serialization';
import { withRateLimit, RATE_LIMITS } from '@/app/lib/api/rate-limiter';

/**
 * Timer action pre-selection endpoint
 *
 * Allows players to pre-select an action (fold/check) to execute when timer expires
 *
 * Request body:
 * {
 *   gameId: string,
 *   timerAction: 'fold' | 'call' | 'check' | 'bet' | 'raise',
 *   betAmount?: number
 * }
 */
export const POST = withRateLimit(RATE_LIMITS.TIMER, withAuth(async (request, context, session) => {
  try {
    const body = await request.json();
    const { gameId, timerAction, betAmount } = body;
    const id = gameId || process.env.DEFAULT_GAME_ID!;

    if (!timerAction || !['fold', 'call', 'check', 'bet', 'raise'].includes(timerAction)) {
      return Response.json(
        { error: 'Invalid timerAction. Must be one of: fold, call, check, bet, raise' },
        { status: 400 }
      );
    }

    const game = await setTurnTimerAction(id, session.user.id, timerAction, betAmount);
    return Response.json({ success: true, game: serializeGame(game) });
  } catch (error) {
    console.error('[Timer API] Error:', error);
    return Response.json(
      { error: error instanceof Error ? error.message : 'Failed to set timer action' },
      { status: 500 }
    );
  }
}));
