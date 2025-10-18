// app/api/poker/deal/route.ts

import { auth } from '@/app/lib/auth';
import { deal } from '@/app/lib/server/poker-game-controller';
import { emitViaAPI } from '@/app/api/socket/io';
import { SOCKET_EVENTS } from '@/app/lib/socket/events';

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { gameId } = await request.json();
    if (!gameId) {
      return Response.json({ error: 'gameId is required' }, { status: 400 });
    }

    const gameState = await deal(gameId);

    await emitViaAPI(SOCKET_EVENTS.POKER_STATE_UPDATE, gameState);
    return Response.json({ success: true, gameState });
  } catch (error) {
    console.error('Error dealing cards:', error);
    return Response.json({
      error: error instanceof Error ? error.message : 'Failed to deal cards'
    }, { status: 500 });
  }
}
