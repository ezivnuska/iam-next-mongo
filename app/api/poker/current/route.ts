// app/api/poker/current/route.ts

import { withAuth } from '@/app/lib/api/with-auth';
import { getUserCurrentGame } from '@/app/lib/server/poker-game-controller';
import { serializeGame } from '@/app/lib/utils/game-serialization';

export const GET = withAuth(async (request, context, session) => {
  try {
    const game = await getUserCurrentGame(session.user.id);

    if (!game) {
      return Response.json({ game: null });
    }

    return Response.json({
      game: {
        ...serializeGame(game),
        gameId: game._id.toString(),
      }
    });
  } catch (error) {
    console.error('Error fetching current game:', error);
    return Response.json({
      error: error instanceof Error ? error.message : 'Failed to fetch current game'
    }, { status: 500 });
  }
});
