// app/api/poker/fold/route.ts

import { auth } from '@/app/lib/auth';
import { fold } from '@/app/lib/server/poker-game-controller';
import { emitViaAPI } from '@/app/api/socket/io';
import { SOCKET_EVENTS } from '@/app/lib/socket/events';

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { gameId } = await request.json();
  if (!gameId) {
    return Response.json({ error: 'gameId is required' }, { status: 400 });
  }

  try {
    const gameState = await fold(gameId, session.user.id);
    await emitViaAPI(SOCKET_EVENTS.POKER_STATE_UPDATE, gameState);
    return Response.json({ success: true, gameState });
  } catch (error) {
    console.error('Error folding:', error);
    return Response.json({
      error: error instanceof Error ? error.message : 'Failed to fold'
    }, { status: 500 });
  }
}
