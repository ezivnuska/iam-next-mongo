// app/api/poker/timer/clear/route.ts

import { withAuth } from '@/app/lib/api/with-auth';
import { clearActionTimer } from '@/app/lib/server/poker-game-controller';
import { serializeGame } from '@/app/lib/utils/game-serialization';

export const POST = withAuth(async (request, context, session) => {
  const { gameId } = await request.json();
  const id = gameId || process.env.DEFAULT_GAME_ID!;

  try {
    const game = await clearActionTimer(id);
    return Response.json({ success: true, game: serializeGame(game) });
  } catch (error) {
    console.error('[Clear Timer API] Error:', error);
    return Response.json(
      { error: error instanceof Error ? error.message : 'Failed to clear timer' },
      { status: 500 }
    );
  }
});
