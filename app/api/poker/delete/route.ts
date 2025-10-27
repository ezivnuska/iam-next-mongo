// app/api/poker/delete/route.ts

import { withAuth } from '@/app/lib/api/with-auth';
import { deleteGame } from '@/app/lib/server/poker-game-controller';
import { PokerSocketEmitter } from '@/app/lib/utils/socket-helper';

export const DELETE = withAuth(async (request, context, session) => {
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
});
