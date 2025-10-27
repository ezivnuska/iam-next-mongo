// app/api/poker/fold/route.ts

import { withAuth } from '@/app/lib/api/with-auth';
import { fold } from '@/app/lib/server/poker-game-controller';
import { serializeGame } from '@/app/lib/utils/game-serialization';
import { PokerSocketEmitter } from '@/app/lib/utils/socket-helper';

export const POST = withAuth(async (request, context, session) => {
  const { gameId } = await request.json();
  if (!gameId) {
    return Response.json({ error: 'gameId is required' }, { status: 400 });
  }

  try {
    const gameState = await fold(gameId, session.user.id);
    const serialized = serializeGame(gameState);
    await PokerSocketEmitter.emitStateUpdate(gameState);
    return Response.json({ success: true, gameState: serialized });
  } catch (error) {
    console.error('Error folding:', error);
    return Response.json({
      error: error instanceof Error ? error.message : 'Failed to fold'
    }, { status: 500 });
  }
});
