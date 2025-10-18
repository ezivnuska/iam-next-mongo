// app/api/poker/delete/route.ts

import { auth } from '@/app/lib/auth';
import { deleteGame } from '@/app/lib/server/poker-game-controller';
import { emitViaAPI } from '@/app/api/socket/io';
import { SOCKET_EVENTS } from '@/app/lib/socket/events';

export async function DELETE(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { gameId } = await request.json();
  if (!gameId) {
    return Response.json({ error: 'gameId is required' }, { status: 400 });
  }

  try {
    await deleteGame(gameId);
    // Notify all users that the game has been deleted
    await emitViaAPI(SOCKET_EVENTS.POKER_GAME_DELETED, { gameId });
    return Response.json({ success: true });
  } catch (error) {
    console.error('Error deleting game:', error);
    return Response.json({
      error: error instanceof Error ? error.message : 'Failed to delete game'
    }, { status: 500 });
  }
}
