// app/api/poker/bet/route.ts

import { withAuth } from '@/app/lib/api/with-auth';
import { placeBet } from '@/app/lib/server/poker-game-controller';
import { PokerSocketEmitter } from '@/app/lib/utils/socket-helper';

export const POST = withAuth(async (request, context, session) => {
  const { chipCount, gameId } = await request.json();
  const id = gameId || process.env.DEFAULT_GAME_ID!;

  const result = await placeBet(id, session.user.id, chipCount ?? 1);

  // Emit granular events based on what happened
  await PokerSocketEmitter.emitGameActionResults(result.events);

  // If cards were dealt or game completed, also send full state update
  // This ensures clients have all the updated data (hands, action history, etc.)
  if (result.events.cardsDealt || result.events.roundComplete) {
    await PokerSocketEmitter.emitStateUpdate(result.game);
  }

  return Response.json({ success: true });
});
