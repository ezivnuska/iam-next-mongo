// app/api/poker/restart/route.ts

import { withAuth } from '@/app/lib/api/with-auth';
import { restart } from '@/app/poker/lib/server/poker-game-controller';
import { serializeGame } from '@/app/lib/utils/game-serialization';
import { PokerSocketEmitter } from '@/app/lib/utils/socket-helper';

export const POST = withAuth(async (request, context, session) => {
  try {
    const { gameId } = await request.json();
    const id = gameId || process.env.DEFAULT_GAME_ID!;

    console.log(`[Restart API] Restarting game ${id} requested by ${session.user.username}`);

    const gameState = await restart(id);
    const serialized = serializeGame(gameState);

    await PokerSocketEmitter.emitStateUpdate(gameState);

    console.log(`[Restart API] Game ${id} successfully restarted`);
    return Response.json({ success: true, gameState: serialized });
  } catch (error: any) {
    console.error('[Restart API] Error restarting game:', error);

    // Return a proper error response
    return Response.json(
      {
        success: false,
        error: error.message || 'Failed to restart game',
        details: error.toString()
      },
      { status: 500 }
    );
  }
});
