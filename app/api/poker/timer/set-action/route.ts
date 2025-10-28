// app/api/poker/timer/set-action/route.ts

import { withAuth } from '@/app/lib/api/with-auth';
import { setTurnTimerAction } from '@/app/lib/server/poker-game-controller';
import { serializeGame } from '@/app/lib/utils/game-serialization';

export const POST = withAuth(async (request, context, session) => {
  const { gameId, action } = await request.json();
  const id = gameId || process.env.DEFAULT_GAME_ID!;

  if (!action || !['fold', 'call', 'check', 'bet', 'raise'].includes(action)) {
    return Response.json(
      { error: 'Invalid action. Must be one of: fold, call, check, bet, raise' },
      { status: 400 }
    );
  }

  try {
    const game = await setTurnTimerAction(id, session.user.id, action);
    return Response.json({ success: true, game: serializeGame(game) });
  } catch (error) {
    console.error('[Set Timer Action API] Error:', error);
    return Response.json(
      { error: error instanceof Error ? error.message : 'Failed to set timer action' },
      { status: 500 }
    );
  }
});
