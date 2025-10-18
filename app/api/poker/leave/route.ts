// app/api/poker/leave/route.ts

import { auth } from '@/app/lib/auth';
import { removePlayer } from '@/app/lib/server/poker-game-controller';
import { emitViaAPI } from '@/app/api/socket/io';
import { SOCKET_EVENTS } from '@/app/lib/socket/events';

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { gameId } = await request.json();
  const id = gameId || process.env.DEFAULT_GAME_ID!;

  const gameState = await removePlayer(id, {
    id: session.user.id,
  });

  await emitViaAPI(SOCKET_EVENTS.POKER_STATE_UPDATE, gameState);
  return Response.json({ success: true, gameState });
}
