// app/api/poker/restart/route.ts

import { withAuth } from '@/app/lib/api/with-auth';
import { restart } from '@/app/lib/server/poker-game-controller';
import { serializeGame } from '@/app/lib/utils/game-serialization';
import { PokerSocketEmitter } from '@/app/lib/utils/socket-helper';

export const POST = withAuth(async (request, context, session) => {
  const { gameId } = await request.json();
  const id = gameId || process.env.DEFAULT_GAME_ID!;

  const gameState = await restart(id);
  const serialized = serializeGame(gameState);

  await PokerSocketEmitter.emitStateUpdate(gameState);
  return Response.json({ success: true, gameState: serialized });
});
