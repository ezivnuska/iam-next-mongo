// app/api/poker/join/route.ts

import { withAuth } from '@/app/lib/api/with-auth';
import { handlePlayerJoin } from '@/app/poker/lib/server/poker-game-controller';

export const POST = withAuth(async (request, context, session) => {
  const { gameId } = await request.json();
  const id = gameId || process.env.DEFAULT_GAME_ID!;

  const result = await handlePlayerJoin(
    id,
    session.user.id,
    session.user.username || session.user.email || 'Guest'
  );

  if (!result.success) {
    const errorMessage = result.error || 'Failed to join game';
    console.error('[Join Game] Error:', errorMessage);

    if (errorMessage.includes('locked')) {
      return Response.json(
        { error: 'Game is locked - no new players allowed' },
        { status: 409 } // Conflict
      );
    } else if (errorMessage.includes('full')) {
      return Response.json(
        { error: 'Game is full' },
        { status: 409 } // Conflict
      );
    } else if (errorMessage.includes('not found')) {
      return Response.json(
        { error: 'Game not found' },
        { status: 404 } // Not Found
      );
    }

    // Generic error
    return Response.json(
      { error: errorMessage },
      { status: 500 }
    );
  }

  return Response.json({ success: true, gameState: result.gameState });
});
